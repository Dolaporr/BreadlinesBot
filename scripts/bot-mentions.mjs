import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'
import { generateJson } from './openai-client.mjs'
import { createTweet, getMentions, verifyExpectedAccount } from './x-client.mjs'
import { cleanText, hasLink, isRelevantTweet, isSafeText } from './policy.mjs'

loadEnv()

const dataDir = path.resolve('data')
const repliesPath = path.join(dataDir, 'replies.json')
const historyPath = path.join(dataDir, 'history.json')
const repliedTweetsPath = path.join(dataDir, 'replied-tweets.json')
const statePath = path.join(dataDir, 'bot-state.json')

fs.mkdirSync(dataDir, { recursive: true })

const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'
const autoReply = String(process.env.BOT_AUTO_REPLY ?? 'false').toLowerCase() === 'true'
const approvalMode = String(process.env.BOT_APPROVAL_MODE ?? 'true').toLowerCase() !== 'false'
const mentionsEnabled = String(process.env.BOT_MENTIONS_ENABLED ?? 'true').toLowerCase() !== 'false'
const backfillMentions = String(process.env.BOT_BACKFILL_MENTIONS ?? 'false').toLowerCase() === 'true'

const replyLimit = Number(process.env.BOT_MAX_REPLIES_PER_CYCLE || 3)
const replyScoreThreshold = Number(process.env.BOT_REPLY_SCORE_THRESHOLD || 75)

const searchReplyAuthorCooldown = Number(process.env.BOT_SEARCH_REPLY_AUTHOR_COOLDOWN || 86400000) // 24 hours (used only for search; harmless here)
void searchReplyAuthorCooldown

const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
  : { postCount: 0, replyCount: 0 }

const replies = fs.existsSync(repliesPath) ? JSON.parse(fs.readFileSync(repliesPath, 'utf8')) : []
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : []
const repliedTweets = fs.existsSync(repliedTweetsPath) ? JSON.parse(fs.readFileSync(repliedTweetsPath, 'utf8')) : []

if (!mentionsEnabled) {
  console.log('Mentions disabled (BOT_MENTIONS_ENABLED=false). Exiting.')
  process.exit(0)
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function buildRecentPostedTexts(history, limit = 8) {
  const posted = (history || [])
    .filter((item) => item && (item.type === 'post' || item.type === 'reply'))
    .map((item) => item.text)
    .filter(Boolean)

  const unique = []
  const seen = new Set()
  for (const t of posted.reverse()) {
    const key = String(t)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(key)
    if (unique.length >= limit) break
  }

  return unique
}

function shouldSkipReplyDraft(replyText) {
  if (!replyText) return true
  if (!isSafeText(replyText)) return true
  return false
}

async function generateReply({ tweet, includeLink, recentPostedTexts = [] }) {
  const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
  const prompt = `Write one possible reply for BreadLinesBot.

Original tweet:
${tweet.text}

Voice:
- Short, useful, humanized GenZ crypto humor.
- Respectful. No dunking on the user.
- Explain MCP/FCFS/breadlines if relevant.
- Do not impersonate Toly/Solana/Anza/Helius.
- No financial advice, no price talk, no holder hype.
- ${includeLink ? `You may include ${site} only if it genuinely helps.` : 'Do not include a link.'}
- Max 220 characters.

Return JSON only:
{"shouldReply":true,"score":0-100,"text":"...","reason":"..."}

If the tweet is irrelevant, hostile, spammy, or not worth replying to, return shouldReply false.`

  const context = {
    mode: 'reply',
    originalTweetId: tweet.id,
    originalAuthor: tweet.author_id,
    tweetText: tweet.text,
    recentPostedTexts,
  }

  const parsed = await generateJson(prompt, { context })
  const text = cleanText(parsed.text)
  const score = Number(parsed.score || 0)
  return {
    shouldReply: Boolean(parsed.shouldReply) && score >= replyScoreThreshold && isSafeText(text),
    score,
    text,
    reason: cleanText(parsed.reason),
  }
}

async function main() {
  await verifyExpectedAccount()

  const mentionedSinceId = backfillMentions ? undefined : state.lastMentionId
  const mentions = await getMentions({
    userId: (await verifyExpectedAccount())?.id,
    sinceId: mentionedSinceId,
  })

  if (mentions?.meta?.newest_id) state.lastMentionId = mentions.meta.newest_id

  const candidates = []
  for (const tweet of mentions.data || []) {
    if (!tweet?.text) continue
    if (!isRelevantTweet(tweet.text)) continue

    // Avoid replying to same tweet again if already posted
    if (replies.some((r) => r.targetTweetId === tweet.id && r.posted)) continue

    candidates.push(tweet)
  }

  if (!candidates.length) {
    console.log('No new mention candidates.')
    writeJson(statePath, state)
    return
  }

  const recentPostedTexts = buildRecentPostedTexts(history, 8)

  // Track author cooldown for search replies; for mentions-only we skip cooldown checks to stay simple.
  const ready = []
  const linkBudget = false // mentions-only timer: keep links off by default to reduce rejections/duplicates

  for (const tweet of candidates.slice(0, replyLimit)) {
    const generated = await generateReply({
      tweet,
      includeLink: linkBudget,
      recentPostedTexts,
    })

    if (!generated.shouldReply) continue
    if (shouldSkipReplyDraft(generated.text)) continue

    ready.push({
      targetTweetId: tweet.id,
      targetText: tweet.text,
      authorId: tweet.author_id,
      text: generated.text,
      reason: generated.reason,
      score: generated.score,
    })
  }

  if (!ready.length) {
    console.log('No mention replies selected.')
    writeJson(statePath, state)
    return
  }

  if (dryRun) {
    console.log('DRY RUN mention replies:')
    for (const r of ready) {
      console.log(`- to ${r.targetTweetId}: ${r.text}`)
    }
    writeJson(statePath, state)
    return
  }

  for (const r of ready) {
    try {
      const response = await createTweet(r.text, { inReplyToTweetId: r.targetTweetId })

      // Persist reply state
      const replyRecord = {
        id: `reply-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        targetTweetId: r.targetTweetId,
        targetText: r.targetText,
        authorId: r.authorId,
        text: r.text,
        reason: r.reason,
        score: r.score,
        source: 'mention-timer',
        approved: true,
        posted: true,
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString(),
        xResponse: response,
      }

      history.push({ ...replyRecord, type: 'reply' })
      replies.push(replyRecord)

      if (r.authorId) {
        repliedTweets.push({
          tweetId: r.targetTweetId,
          authorId: r.authorId,
          repliedAt: Date.now(),
        })
        if (repliedTweets.length > 1000) repliedTweets.splice(0, repliedTweets.length - 1000)
      }

      state.replyCount = (state.replyCount || 0) + 1

      console.log(`Posted mention reply to ${r.targetTweetId}`)
    } catch (error) {
      if (error?.code === 'DUPLICATE_CONTENT') {
        console.log(`Skipped duplicate mention reply to ${r.targetTweetId}`)
        continue
      }
      throw error
    }
  }

  writeJson(repliesPath, replies)
  writeJson(historyPath, history)
  writeJson(repliedTweetsPath, repliedTweets)
  writeJson(statePath, state)
}

main().catch((e) => {
  console.error(`bot-mentions failed: ${e?.message || e}`)
  process.exit(1)
})
