import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'

loadEnv()

const minMinutes = Number(process.env.BOT_MIN_POST_INTERVAL_MINUTES || 180)
const maxMinutes = Number(process.env.BOT_MAX_POST_INTERVAL_MINUTES || 420)
const windowMinutes = Math.max(1, maxMinutes - minMinutes)
const delayMinutes = minMinutes + Math.floor(Math.random() * windowMinutes)
const nextAt = new Date(Date.now() + delayMinutes * 60_000)

const dataDir = path.resolve('data')
fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(
  path.join(dataDir, 'schedule.json'),
  `${JSON.stringify({ nextPostAt: nextAt.toISOString(), delayMinutes }, null, 2)}\n`
)

console.log(`Next post window set for ${nextAt.toLocaleString()} (${delayMinutes} minutes).`)
