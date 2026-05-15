import { spawn } from 'node:child_process'
import { loadEnv } from './env.mjs'

loadEnv()

const minMinutes = Number(process.env.BOT_CYCLE_MINUTES_MIN || 20)
const maxMinutes = Number(process.env.BOT_CYCLE_MINUTES_MAX || 45)

function delayMs() {
  const windowMinutes = Math.max(1, maxMinutes - minMinutes)
  const minutes = minMinutes + Math.floor(Math.random() * windowMinutes)
  return { minutes, ms: minutes * 60_000 }
}

function runCycle() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['./scripts/bot-cycle.mjs'], {
      stdio: 'inherit',
      shell: false,
    })

    child.on('exit', (code) => {
      if (code) console.error(`bot-cycle exited with ${code}`)
      resolve()
    })
  })
}

console.log(`BreadLines bot daemon started. Cycle window: ${minMinutes}-${maxMinutes} minutes.`)

while (true) {
  await runCycle()
  const next = delayMs()
  const at = new Date(Date.now() + next.ms).toLocaleString()
  console.log(`Next cycle in ${next.minutes} minutes (${at}).`)
  await new Promise((resolve) => setTimeout(resolve, next.ms))
}
