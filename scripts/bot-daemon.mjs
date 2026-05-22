import { spawn } from 'node:child_process'
import { loadEnv } from './env.mjs'

loadEnv()

const minMinutes = Number(process.env.BOT_CYCLE_MINUTES_MIN || 20)
const maxMinutes = Number(process.env.BOT_CYCLE_MINUTES_MAX || 45)

const replyIntervalMs = Number(process.env.BOT_REPLY_INTERVAL_MS || 180000) // 3 minutes

function delayMs() {
  const windowMinutes = Math.max(1, maxMinutes - minMinutes)
  const minutes = minMinutes + Math.floor(Math.random() * windowMinutes)
  return { minutes, ms: minutes * 60_000 }
}

function spawnNode(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      shell: false,
    })

    child.on('exit', (code) => {
      if (code) console.error(`${scriptPath} exited with ${code}`)
      resolve()
    })
  })
}

async function runPostLoop() {
  console.log(`Post timer active. Cycle window: ${minMinutes}-${maxMinutes} minutes.`)
  while (true) {
    await spawnNode('./scripts/bot-cycle.mjs')
    const next = delayMs()
    const at = new Date(Date.now() + next.ms).toLocaleString()
    console.log(`Next post cycle in ${next.minutes} minutes (${at}).`)
    await new Promise((resolve) => setTimeout(resolve, next.ms))
  }
}

async function runReplyLoop() {
  console.log(`Reply/mentions timer active. Interval: ${replyIntervalMs} ms.`)
  while (true) {
    await spawnNode('./scripts/bot-mentions.mjs')
    await new Promise((resolve) => setTimeout(resolve, replyIntervalMs))
  }
}

console.log('BreadLines bot daemon started (split post + reply timers).')
void runPostLoop()
void runReplyLoop()
