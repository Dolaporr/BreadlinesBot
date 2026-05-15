import fs from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve('data')
const queuePath = path.join(dataDir, 'queue.json')
const archivePath = path.join(dataDir, 'queue-archive.json')
fs.mkdirSync(dataDir, { recursive: true })

const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : []
const archive = fs.existsSync(archivePath) ? JSON.parse(fs.readFileSync(archivePath, 'utf8')) : []

const keepPosted = queue.filter((item) => item.posted)
const archiveUnposted = queue
  .filter((item) => !item.posted)
  .map((item) => ({
    ...item,
    archivedAt: new Date().toISOString(),
    archiveReason: 'launch-queue-reset',
  }))

const posts = [
  'MCP in one sentence: stop making one leader own the whole slot, let multiple proposers compete, and make ordering feel more like a market.',
  'FCFS sounds fair until spam and latency games show up. Then the queue starts looking less like neutral ordering and more like a bread line with better hardware.',
  'Oracle freshness matters because stale prices are a hidden market tax. If fresh updates land late, everyone downstream pays for bad ordering.',
  'The BreadLinesMarkets simulator asks one question: what happens when queueing rules become market structure? Try the toggles: https://breadlinesmarkets.com',
  'Leader monopoly is the quiet part of the FCFS debate. MCP changes the shape of the slot by making proposers compete instead of letting one path dominate.',
  '$BREADLINES is the joke. The serious part is latency, spam resistance, oracle freshness, and who gets to shape ordering.',
  'MCP does not magically delete latency. It makes the ordering game more competitive, which is the whole point: less bread line, more market.',
  'FCFS is a line. MCP is a market trying to form around the line. That difference matters when spam, oracle updates, and taker flow all collide.',
  'If one route into the slot gets crowded, spam learns the route. MCP opens proposer competition so useful flow has a better shot at clean ordering.',
  'BreadLinesMarkets is for people who want to see the ordering argument instead of reading another abstract thread. https://breadlinesmarkets.com',
  'The future-flow question is simple: should Solana ordering feel like one queue, or like multiple proposers competing to build better markets?',
  'Bot status: still automated, still breadline-aware, still allergic to stale oracle data. MCP discourse will continue until queue morale improves.',
]

const now = new Date().toISOString()
const launchQueue = posts.map((text, index) => ({
  id: `launch-${Date.now()}-${index}`,
  text,
  reason: 'curated launch queue',
  approved: true,
  posted: false,
  source: 'launch-curated',
  createdAt: now,
}))

fs.writeFileSync(queuePath, `${JSON.stringify([...keepPosted, ...launchQueue], null, 2)}\n`)
fs.writeFileSync(archivePath, `${JSON.stringify([...archive, ...archiveUnposted], null, 2)}\n`)

console.log(`Seeded ${launchQueue.length} curated launch posts.`)
console.log(`Archived ${archiveUnposted.length} old unposted drafts.`)
