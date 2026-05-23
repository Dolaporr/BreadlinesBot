import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, requireEnv } from './env.mjs'
import { generateJson } from './openai-client.mjs'
import { cleanText, isRelevantTweet, isSafeText } from './policy.mjs'
import { createTweet, getTweetById, searchRecent } from './x-client.mjs'

loadEnv()
requireEnv(['OPENAI_API_KEY'])

const dataDir = path.resolve('data')
const seedTweetsPath = path.resolve('seed-tweets.json')
const engagedPath = path.join(dataDir, 'engaged-tweets.json')

const state = {
  seeds: [],
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    const raw = fs.readFileSync(file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function pickOneUnprocessedSeed(seeds) {
  const todo = seeds.filter((s) => !s.done && s.id)
  if (!todo.length) return null
  const idx = Math.floor(Math.random() * todo.length)
  return todo[idx]
}

function markSeedDone(seeds, seedId) {
  for (const s of seeds) {
    if (String(s.id) === String(seedId)) s.done = true
  }
}

function isEngaged(engagedSet, tweetId) {
  if (!tweetId) return false
  return engagedSet.has(String(tweetId))
}

function markEngaged(engagedSet, engagedArr, tweetId) {
  if (!tweetId) return
  const id = String(tweetId)
  if (engagedSet.has(id)) return
  engagedSet.add(id)
  engagedArr.push({
    tweetId: id,
    engagedAt: Date.now(),
  })
}

function buildWatchQuery() {
  const keywords = [
    'breadlines',
    'bread line',
    'FCFS',
    'MCP',
    'bread',
    'queue',
    'proposer',
    'leader',
    'MEV',
    'ordering',
    'latency',
  ]

  const handles = ['toly', 'mert', 'vibhu', 'slingoorio']
  const handlePart = handles.map((h) => `from:${h}`).join(' OR ')
  const kwPart = keywords.map((k) => `"${k}"`).join(' OR ')

  // Note: we rely on tweet.text + referenced_tweets for thread-ish coverage.
  return `(${handlePart}) (${kwPart}) -is:retweet lang:en`
}

async function maybeEngageWatchTweet({ tweet, mode, recentPostedTexts, engagedSet, engagedArr }) {
  if (!tweet?.id || !tweet?.text) return false
  if (isEngaged(engagedSet, tweet.id)) return false
  if (!isRelevantTweet(tweet.text)) return false

  const includeLink = false
  const quoteOrReplyPrompt = `You are BreadLinesBot on Twitter/X. Generate exactly one response.

Tweet:
${tweet.text}

Mode:
- If mode is "quote", you will quote this tweet (set quoteTweetId).
- If mode is "reply", you will reply to this tweet (set inReplyToTweetId).

Rules:
- Dry, technically sharp, occasionally satirical.
- Satirize FCFS vs champion MCP/FBO bread line frame.
- Never ask for follows. Never hype. Never be cringe.
- Output must be JSON only in this shape:
{"action":"quote"|"reply","text":"...","reason":"..."}

Constraints:
- For quote: one-liner ties it back to breadline/MCP frame.
- For reply: add something to the conversation — be sharp.
- Max 280 chars total.`

  const context = {
    mode,
    sourceTweetId: tweet.id,
    sourceTweetText: tweet.text,
    recentPostedTexts,
  }

  const parsed = await generateJson(quoteOrReplyPrompt, { context })
  const action = parsed?.action
  const text = cleanText(parsed?.text)

  if (!['quote', 'reply'].includes(action)) return false
  if (!isSafeText(text)) return false

  // Post
  if (action === 'quote') {
    await createTweet(text, { quoteTweetId: tweet.id })
  } else {
    await createTweet(text, { inReplyToTweetId: tweet.id })
  }

  // Mark engaged
  markEngaged(engagedSet, engagedArr, tweet.id)
  return true
}

async function runSeedsOnly() {
  if (!fs.existsSync(seedTweetsPath)) {
    console.log(`seed-watch: missing seed-tweets.json at ${seedTweetsPath}`)
    return { seedsDone: false }
  }

  const seedObj = JSON.parse(fs.readFileSync(seedTweetsPath, 'utf8'))
  const seeds = Array.isArray(seedObj.seed_tweets) ? seedObj.seed_tweets : []
  state.seeds = seeds

  const picked = pickOneUnprocessedSeed(seeds)
  if (!picked) {
    console.log('seed-watch: all seed tweets done.')
    return { seedsDone: true }
  }

  const engaged = readJson(engagedPath, { engaged: [], lastSeen: 0 })
  const engagedArr = Array.isArray(engaged.engaged) ? engaged.engaged : []
  const engagedSet = new Set(engagedArr.map((e) => String(e.tweetId)))

  if (isEngaged(engagedSet, picked.id)) {
    markSeedDone(seeds, picked.id)
    seedObj.seed_tweets = seeds
    writeJson(seedTweetsPath, seedObj)
    console.log(`seed-watch: seed ${picked.id} already engaged, marking done.`)
    return { seedsDone: false }
  }

  const tweet = await getTweetById(picked.id, { expansions: 'author_id' }).catch(() => null)
  if (!tweet?.data?.text) {
    console.log(`seed-watch: could not fetch seed tweet ${picked.id}`)
    return { seedsDone: false }
  }

  const sourceText = tweet.data.text
  const context = {
    mode: 'seed_quote',
    seedTweetId: picked.id,
    sourceTweetText: sourceText,
  }

  const prompt = `Quote this tweet in exactly one dry one-liner using the BreadLinesBot bread line / MCP-FBO / FCFS satire frame.

Tweet to quote:
${sourceText}

Output JSON only:
{"text":"...","reason":"..."}`
  const parsed = await generateJson(prompt, { context })
  const text = cleanText(parsed?.text)

  if (!text || !isSafeText(text)) {
    console.log('seed-watch: generated seed quote failed safety/length check.')
    return { seedsDone: false }
  }

  await createTweet(text, { quoteTweetId: picked.id })

  markSeedDone(seeds, picked.id)
  seedObj.seed_tweets = seeds
  writeJson(seedTweetsPath, seedObj)

  markEngaged(engagedSet, engagedArr, picked.id)
  writeJson(engagedPath, { engaged: engagedArr })

  console.log(`seed-watch: posted seed quote for ${picked.id}`)
  return { seedsDone: false }
}

async function runWatchLoopOnce() {
  const engaged = readJson(engagedPath, { engaged: [] })
  const engagedArr = Array.isArray(engaged.engaged) ? engaged.engaged : []
  const engagedSet = new Set(engagedArr.map((e) => String(e.tweetId)))

  const recentPostedTexts = [] // keep simple; we only dedupe by engaged-tweets.json

  const query = buildWatchQuery()
  const results = await searchRecent(query, {}).catch(() => null)
  const tweets = (results?.data || []).filter((t) => t?.text && t?.id)

  let engagedAny = false

  // Try a few candidates
  for (const tweet of tweets.slice(0, 10)) {
    // decide quote vs reply based on OpenAI
    // if it looks like a reply from the account itself, OpenAI can still decide.
    const mode = 'watch'
    const ok = await maybeEngageWatchTweet({
      tweet,
      mode,
      recentPostedTexts,
      engagedSet,
      engagedArr,
    })
    if (ok) engagedAny = true
  }

  if (engagedAny) {
    writeJson(engagedPath, { engaged: engagedArr })
  }
}

async function main() {
  // Seed quote phase: quote at most one seed tweet per invocation.
  const { seedsDone } = await runSeedsOnly()
  if (!seedsDone) {
    // After seeding one quote, also run watch once (so watch doesn't starve).
    await runWatchLoopOnce()
    return
  }

  // If seeds are done, stop entirely (per requirement).
  process.exit(0)
}

main().catch((e) => {
  console.error(`seed-watch crashed: ${e?.message || e}`)
  process.exit(1)
})
