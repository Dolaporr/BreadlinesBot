import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, requireEnv } from './env.mjs'
import { generateJson } from './openai-client.mjs'
import { isSafeText } from './policy.mjs'

loadEnv()
requireEnv(['OPENAI_API_KEY'])

const model = process.env.BOT_MODEL || 'gpt-4.1-mini'
const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
const humorLevel = process.env.BOT_HUMOR_LEVEL || 'medium'
const linkEvery = Number(process.env.BOT_LINK_EVERY_N_POSTS || 3)
const dataDir = path.resolve('data')
const queuePath = path.join(dataDir, 'queue.json')
const historyPath = path.join(dataDir, 'history.json')

fs.mkdirSync(dataDir, { recursive: true })

const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : []
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : []
const recent = [...queue, ...history]
  .slice(-30)
  .map((item) => item.text)
  .filter(Boolean)

const prompt = `Generate 8 candidate X posts for BreadLinesBot.

Brand:
- $BREADLINES / BreadLinesMarkets
- Home base: ${site}
- Topic: Solana MCP, FCFS, FBO, proposer competition, spam resistance, oracle freshness, latency, market structure.
- Voice: smart, humanized GenZ crypto humor, ${humorLevel} spice.
- Respect Toly's vision and Solana builders.
- Educate without sounding like a textbook.
- Make bot jokes sometimes, but don't overdo it.
- Naturally combine MCP and breadlines language.
- Use "bread line" as the core metaphor, but avoid random food jokes. No chefs, bakers, loaves, baguettes, slices, ingredients, cashiers, waiters, supermarkets, or restaurants.
- Sound like a sharp Solana market-structure account, not a generic meme account.
- Prefer concrete terms: leader monopoly, proposer competition, ordering, latency, spam, oracle freshness, slot, queue, market structure.

Rules:
- Each post must be 90-240 characters.
- No hashtags unless genuinely useful.
- No slurs, harassment, impersonation, price predictions, financial advice, holder hype, buy/sell calls, or guaranteed returns.
- Mention ${site} in about 1 of every ${linkEvery} posts, not all of them.
- Do not mass-tag people.
- Do not say you are human.
- Avoid repeating these recent posts:
${recent.map((text) => `- ${text}`).join('\n') || '- none'}

Return only valid JSON:
{
  "posts": [
    { "text": "...", "reason": "short reason" }
  ]
}`

let parsed
try {
  parsed = await generateJson(prompt, { model })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const existing = new Set(queue.map((item) => item.text))
const createdAt = new Date().toISOString()
const additions = (parsed.posts || [])
  .map((item) => ({
    id: `ai-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    text: String(item.text || '').trim(),
    reason: String(item.reason || '').trim(),
    approved: false,
    posted: false,
    source: 'openai',
    createdAt,
  }))
  .filter((item) => item.text.length >= 40 && item.text.length <= 280)
  .filter((item) => isSafeText(item.text))
  .filter((item) => !existing.has(item.text))

fs.writeFileSync(queuePath, `${JSON.stringify([...queue, ...additions], null, 2)}\n`)
console.log(`Added ${additions.length} AI drafts to ${queuePath}`)
for (const item of additions) {
  console.log(`\n${item.id}`)
  console.log(item.text)
}
