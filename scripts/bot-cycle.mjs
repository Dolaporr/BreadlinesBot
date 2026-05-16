import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'
import { generateJson } from './openai-client.mjs'
import { createTweet, getMentions, searchRecent, verifyExpectedAccount } from './x-client.mjs'
import { cleanText, hasLink, isRelevantTweet, isSafeText } from './policy.mjs'

loadEnv()

const dataDir = path.resolve('data')
const queuePath = path.join(dataDir, 'queue.json')
const repliesPath = path.join(dataDir, 'replies.json')
const statePath = path.join(dataDir, 'bot-state.json')
const historyPath = path.join(dataDir, 'history.json')
fs.mkdirSync(dataDir, { recursive: true })

const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'
const autoPost = String(process.env.BOT_AUTO_POST ?? 'false').toLowerCase() === 'true'
const autoReply = String(process.env.BOT_AUTO_REPLY ?? 'false').toLowerCase() === 'true'
const approvalMode = String(process.env.BOT_APPROVAL_MODE ?? 'true').toLowerCase() !== 'false'
const mentionsEnabled = String(process.env.BOT_MENTIONS_ENABLED ?? 'true').toLowerCase() !== 'false'
const searchEnabled = String(process.env.BOT_SEARCH_ENABLED ?? 'false').toLowerCase() === 'true'
const backfillMentions = String(process.env.BOT_BACKFILL_MENTIONS ?? 'false').toLowerCase() === 'true'
const linkEvery = Number(process.env.BOT_LINK_EVERY_N_POSTS || 3)
const minMinutes = Number(process.env.BOT_MIN_POST_INTERVAL_MINUTES || 180)
const maxMinutes = Number(process.env.BOT_MAX_POST_INTERVAL_MINUTES || 420)
const replyLimit = Number(process.env.BOT_MAX_REPLIES_PER_CYCLE || 3)
const replyScoreThreshold = Number(process.env.BOT_REPLY_SCORE_THRESHOLD || 75)

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function nextPostTime() {
  const windowMinutes = Math.max(1, maxMinutes - minMinutes)
  const delayMinutes = minMinutes + Math.floor(Math.random() * windowMinutes)
  return {
    nextPostAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    delayMinutes,
  }
}

async function generatePostDrafts({ queue, history, state }) {
  const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
  const humorLevel = process.env.BOT_HUMOR_LEVEL || 'medium'
  const recent = [...queue, ...history]
    .slice(-40)
    .map((item) => item.text)
    .filter(Boolean)

  const shouldLink = ((state.postCount || 0) + 1) % linkEvery === 0
  const prompt = `Generate 6 candidate X posts for BreadLinesBot.

Voice:
- Smart Solana market-structure account with ${humorLevel} GenZ humor.
- Respect Toly and Solana builders.
- Educate on MCP/FCFS/FBO without sounding corporate.
- "Bread line" is the metaphor; avoid random food jokes.

Topics:
- MCP, FCFS, FBO, proposer competition, spam resistance, oracle freshness, latency, leader monopoly, slots, ordering.

Rules:
- 80-230 characters each.
- No financial advice, price talk, holder hype, slurs, harassment, or impersonation.
- ${shouldLink ? `Include ${site} naturally in 1 or 2 candidates.` : `Do not include a link in this batch.`}
- Avoid these recent posts:
${recent.map((text) => `- ${text}`).join('\n') || '- none'}

Return JSON only:
{"posts":[{"text":"...","reason":"..."}]}`

  const parsed = await generateJson(prompt)
  const existing = new Set(queue.map((item) => item.text))
  const createdAt = new Date().toISOString()
  const additions = (parsed.posts || [])
    .map((item) => ({
      id: `cycle-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      text: cleanText(item.text),
      reason: cleanText(item.reason),
      approved: false,
      posted: false,
      source: 'openai-cycle',
      createdAt,
    }))
    .filter((item) => isSafeText(item.text))
    .filter((item) => !existing.has(item.text))

  return additions
}

async function generateReply({ tweet, includeLink }) {
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

  const parsed = await generateJson(prompt)
  const text = cleanText(parsed.text)
  const score = Number(parsed.score || 0)
  return {
    shouldReply: Boolean(parsed.shouldReply) && score >= replyScoreThreshold && isSafeText(text),
    score,
    text,
    reason: cleanText(parsed.reason),
  }
}

async function collectReplyDrafts({ me, state, replies }) {
  const seenTweetIds = new Set(replies.map((reply) => reply.targetTweetId))
  const candidates = []

  if (mentionsEnabled) {
    try {
      const mentions = await getMentions({
        userId: me.id,
        sinceId: backfillMentions ? undefined : state.lastMentionId,
      })
      for (const tweet of mentions.data || []) {
        candidates.push({ source: 'mention', tweet })
      }
      if (mentions.meta?.newest_id) state.lastMentionId = mentions.meta.newest_id
    } catch (error) {
      console.error(`Mention fetch skipped: ${error.message}`)
    }
  }

  if (searchEnabled) {
    const raw = process.env.TWITTER_SEARCH_KEYWORDS || 'MCP,FCFS,breadlines,Solana'
    const terms = raw.split(',').map((term) => term.trim()).filter(Boolean).slice(0, 5)
    const query = `(${terms.map((term) => `"${term}"`).join(' OR ')}) -is:retweet lang:en`
    try {
      const results = await searchRecent(query, { sinceId: state.lastSearchId })
      for (const tweet of results.data || []) {
        if (tweet.author_id !== me.id) candidates.push({ source: 'search', tweet })
      }
      if (results.meta?.newest_id) state.lastSearchId = results.meta.newest_id
    } catch (error) {
      console.error(`Search fetch skipped: ${error.message}`)
    }
  }

  const additions = []
  const linkBudget = ((state.replyCount || 0) + 1) % linkEvery === 0

  for (const candidate of candidates) {
    if (additions.length >= replyLimit) break
    if (seenTweetIds.has(candidate.tweet.id)) continue
    if (!isRelevantTweet(candidate.tweet.text)) continue

    const generated = await generateReply({
      tweet: candidate.tweet,
      includeLink: linkBudget && candidate.source === 'mention',
    })

    if (!generated.shouldReply) continue
    if (!linkBudget && hasLink(generated.text)) continue

    additions.push({
      id: `reply-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      targetTweetId: candidate.tweet.id,
      targetText: candidate.tweet.text,
      text: generated.text,
      reason: generated.reason,
      score: generated.score,
      source: candidate.source,
      approved: false,
      posted: false,
      createdAt: new Date().toISOString(),
    })
  }

  return additions
}

async function maybePost({ queue, state, history }) {
  const now = new Date()
  if (state.nextPostAt && new Date(state.nextPostAt) > now) {
    console.log(`Post window not due until ${state.nextPostAt}`)
    return
  }

  let nextPost = queue.find((item) => item.approved && !item.posted && isSafeText(item.text))

  if (!nextPost && autoPost && !approvalMode) {
    nextPost = queue.find((item) => !item.posted && isSafeText(item.text))
    if (nextPost) nextPost.approved = true
  }

  if (!nextPost) {
    console.log('No approved post ready.')
    return
  }

  if (dryRun) {
    console.log('DRY RUN post:')
    console.log(nextPost.text)
    return
  }

  await verifyExpectedAccount()
  const response = await createTweet(nextPost.text)
  nextPost.posted = true
  nextPost.postedAt = new Date().toISOString()
  nextPost.xResponse = response
  state.postCount = (state.postCount || 0) + 1
  Object.assign(state, nextPostTime())
  history.push({ ...nextPost, type: 'post' })
  console.log(`Posted ${nextPost.id}; next window ${state.nextPostAt}`)
}

async function maybeReply({ replies, state, history }) {
  const ready = replies
    .filter((reply) => !reply.posted && isSafeText(reply.text))
    .filter((reply) => reply.approved || (autoReply && !approvalMode))
    .slice(0, replyLimit)

  if (!ready.length) {
    console.log('No approved replies ready.')
    return
  }

  for (const reply of ready) {
    if (dryRun) {
      console.log(`DRY RUN reply to ${reply.targetTweetId}:`)
      console.log(reply.text)
      continue
    }

    await verifyExpectedAccount()
    const response = await createTweet(reply.text, { inReplyToTweetId: reply.targetTweetId })
    reply.posted = true
    reply.postedAt = new Date().toISOString()
    reply.xResponse = response
    state.replyCount = (state.replyCount || 0) + 1
    history.push({ ...reply, type: 'reply' })
    console.log(`Replied ${reply.id}`)
  }
}

const state = readJson(statePath, {
  postCount: 0,
  replyCount: 0,
  ...nextPostTime(),
})
const queue = readJson(queuePath, [])
const replies = readJson(repliesPath, [])
const history = readJson(historyPath, [])

console.log(`Mode: dryRun=${dryRun}, approvalMode=${approvalMode}, autoPost=${autoPost}, autoReply=${autoReply}`)

if (queue.filter((item) => !item.posted).length < 6) {
  const additions = await generatePostDrafts({ queue, history, state })
  queue.push(...additions)
  console.log(`Generated ${additions.length} post drafts.`)
}

let me = null
if (mentionsEnabled || searchEnabled || (!dryRun && (autoPost || autoReply))) {
  try {
    me = await verifyExpectedAccount()
  } catch (error) {
    console.error(error.message)
  }
}

if (me && (mentionsEnabled || searchEnabled)) {
  const additions = await collectReplyDrafts({ me, state, replies })
  replies.push(...additions)
  console.log(`Generated ${additions.length} reply drafts.`)
}

await maybePost({ queue, state, history })
await maybeReply({ replies, state, history })

writeJson(queuePath, queue)
writeJson(repliesPath, replies)
writeJson(statePath, state)
writeJson(historyPath, history)

console.log('Cycle complete.')
