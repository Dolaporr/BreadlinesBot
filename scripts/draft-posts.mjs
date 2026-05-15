import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'

loadEnv()

const dataDir = path.resolve('data')
const queuePath = path.join(dataDir, 'queue.json')
fs.mkdirSync(dataDir, { recursive: true })

const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
const seeds = [
  `FCFS is simple until spam learns how lines work. Then the fair queue starts looking like a bread line with faster shoes.`,
  `MCP in one sentence: stop making one leader own the whole slot, let multiple proposers compete, and make ordering feel more like a market.`,
  `The BreadLinesMarkets simulator asks one question: what happens when queueing rules become market structure? Try the toggles: ${site}`,
  `FCFS = whoever reaches the door first. MCP = multiple doors, proposer competition, better structure.`,
  `Oracle updates are not decoration. If fresh prices arrive late, the market gets taxed by stale information.`,
  `$BREADLINES is the joke. The queueing problem is the serious part.`,
]

const existing = fs.existsSync(queuePath)
  ? JSON.parse(fs.readFileSync(queuePath, 'utf8'))
  : []

const existingText = new Set(existing.map((item) => item.text))
const createdAt = new Date().toISOString()

const additions = seeds
  .filter((text) => !existingText.has(text))
  .map((text, index) => ({
    id: `draft-${Date.now()}-${index}`,
    text,
    approved: false,
    posted: false,
    createdAt,
  }))

const next = [...existing, ...additions]
fs.writeFileSync(queuePath, `${JSON.stringify(next, null, 2)}\n`)

console.log(`Added ${additions.length} drafts to ${queuePath}`)
console.log('Approve a post by setting "approved": true in data/queue.json, then run npm run post:approved')
