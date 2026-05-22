#!/usr/bin/env node

/**
 * mission-post.mjs - Create weekly mission post
 * 
 * This script adds a mission post template to the queue.
 * Usage: npm run mission:post
 * 
 * The mission post is a call to action for the community to:
 * 1. Drop a Solana tx
 * 2. Run a Breadlines receipt
 * 3. Share it
 * 4. Tag LMAO + BREADLINES
 * 
 * Posts are created as UNAPPROVED by default (approval mode ON).
 */

import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'

loadEnv()

const dataDir = path.resolve('data')
const queuePath = path.join(dataDir, 'queue.json')
fs.mkdirSync(dataDir, { recursive: true })

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const missionPosts = [
  {
    text: 'Weekly Breadlines mission:\n\nDrop a Solana tx.\nGet a breadline receipt.\nShare your FCFS vs MCP result.\nBest receipts enter the weekly bagworking rewards.\n\nFCFS is the line. MCP is the market.\nhttps://breadlinesmarkets.com',
    reason: 'weekly bagworking mission',
  },
  {
    text: 'Open Sprint: Drop a tx, run a Breadlines receipt, share the queue dynamics.\n\nWe\'re building ordering data with aligned communities.\n\nCame from LMAO? Run a receipt too.\nhttps://breadlinesmarkets.com',
    reason: 'open sprint: community receipt collection',
  },
  {
    text: 'Breadlines community receipt sprint:\n\n1. Drop a tx\n2. Get a receipt\n3. Share your ordering result\n\nNo partnership hype. Just signal on FCFS vs MCP.\n\nhttps://breadlinesmarkets.com',
    reason: 'community receipt sprint',
  },
]

const queue = readJson(queuePath, [])
const existing = new Set(queue.map((item) => item.text))

let added = 0
for (const mission of missionPosts) {
  if (existing.has(mission.text)) {
    console.log(`[SKIP] Mission already in queue: "${mission.text.slice(0, 50)}..."`)
    continue
  }

  queue.push({
    id: `mission-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    text: mission.text,
    reason: mission.reason,
    approved: false, // Require manual approval
    posted: false,
    source: 'mission-template',
    createdAt: new Date().toISOString(),
  })
  added++
}

writeJson(queuePath, queue)
console.log(`Added ${added} mission post(s) to queue.`)
console.log('Review in data/queue.json and approve before posting.')
console.log('To approve: change "approved": false to "approved": true')
console.log('To post: npm run post:approved')
