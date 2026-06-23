import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'
import { getMentions, searchRecent, verifyExpectedAccount } from './x-client.mjs'
import { isSafeText } from './policy.mjs'
import { analyzeTweetForReceipt, generateTxReceipt } from './tx-receipt.mjs'
import { createDraftStore } from './draft-store.mjs'

loadEnv()

const dataDir = path.resolve('data')
const statePath = path.join(dataDir, 'bot-state.json')

fs.mkdirSync(dataDir, { recursive: true })

const mentionsEnabled = String(process.env.BOT_MENTIONS_ENABLED ?? 'true').toLowerCase() !== 'false'
const receiptsEnabled = String(process.env.BOT_RECEIPTS_ENABLED ?? 'true').toLowerCase() !== 'false'
const backfillMentions = String(process.env.BOT_BACKFILL_MENTIONS ?? 'false').toLowerCase() === 'true'
const threadMentionSearchEnabled = String(process.env.BOT_THREAD_MENTION_SEARCH_ENABLED ?? 'true').toLowerCase() !== 'false'
const botUsername = (process.env.TWITTER_EXPECTED_USERNAME || 'Breadlinebot').replace(/^@/, '')
const receiptLimit = Number(process.env.BOT_MAX_RECEIPT_DRAFTS_PER_CYCLE || 5)
const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
const apiUrl = process.env.BREADLINES_RECEIPT_API_URL
const urlTemplate = process.env.BREADLINES_RECEIPT_URL_TEMPLATE
const includeLink = String(process.env.BOT_RECEIPT_REPLY_LINK ?? 'true').toLowerCase() !== 'false'

const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
  : { postCount: 0, replyCount: 0 }

if (!mentionsEnabled || !receiptsEnabled) {
  console.log('Receipt mention drafting disabled. Exiting.')
  process.exit(0)
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

async function buildDraft(tweet) {
  const { txSignature } = analyzeTweetForReceipt(tweet.text)
  if (!txSignature) return null

  const generated = await generateTxReceipt(txSignature, {
    site,
    apiUrl,
    urlTemplate,
    includeLink,
  })

  if (!generated.shouldReply || !isSafeText(generated.text)) return null

  return {
    id: `receipt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    targetTweetId: tweet.id,
    targetText: tweet.text,
    authorId: tweet.author_id,
    txSignature,
    text: generated.text,
    reason: generated.reason,
    score: 100,
    receiptSummary: generated.summary,
    source: 'receipt-mention',
    approved: false,
    posted: false,
    requiresHumanApproval: true,
    createdAt: new Date().toISOString(),
  }
}

async function main() {
  const draftStore = createDraftStore()
  await draftStore.init()
  console.log(`Draft store: ${draftStore.label}`)

  const me = await verifyExpectedAccount()
  if (!me?.id) throw new Error('verifyExpectedAccount() returned no user id')

  const candidates = []
  const seenCandidateIds = new Set()

  try {
    const mentions = await getMentions({
      userId: me.id,
      sinceId: backfillMentions ? undefined : state.lastReceiptMentionId,
    })

    for (const tweet of mentions.data || []) candidates.push(tweet)
    if (mentions?.meta?.newest_id) state.lastReceiptMentionId = mentions.meta.newest_id
  } catch (error) {
    console.error(`Mentions fetch skipped: ${error?.message || error}`)
  }

  if (threadMentionSearchEnabled) {
    try {
      const query = `@${botUsername} -from:${botUsername} -is:retweet lang:en`
      const threadMentions = await searchRecent(query, {
        sinceId: backfillMentions ? undefined : state.lastReceiptThreadMentionSearchId,
      })

      for (const tweet of threadMentions.data || []) candidates.push(tweet)
      if (threadMentions?.meta?.newest_id) {
        state.lastReceiptThreadMentionSearchId = threadMentions.meta.newest_id
      }
    } catch (error) {
      console.error(`Thread mention search skipped: ${error?.message || error}`)
    }
  }

  const additions = []

  for (const tweet of candidates) {
    if (!tweet?.id || !tweet?.text) continue
    if (seenCandidateIds.has(tweet.id)) continue
    seenCandidateIds.add(tweet.id)
    if (await draftStore.hasUnpostedForTweet(tweet.id)) continue
    if (additions.length >= receiptLimit) break

    try {
      const draft = await buildDraft(tweet)
      if (draft) additions.push(draft)
    } catch (error) {
      console.error(`Receipt draft skipped for ${tweet.id}: ${error?.message || error}`)
    }
  }

  const inserted = await draftStore.addDrafts(additions)
  writeJson(statePath, state)
  await draftStore.close()

  if (!inserted.length) {
    console.log('No new tx receipt mention drafts.')
    return
  }

  console.log(`Created ${inserted.length} tx receipt draft(s). Review with: npm run replies:show`)
  for (const draft of inserted) {
    console.log(`- ${draft.id} for ${draft.txSignature.slice(0, 8)}...${draft.txSignature.slice(-6)}`)
  }
}

main().catch((e) => {
  console.error(`bot-mentions failed: ${e?.message || e}`)
  process.exit(1)
})
