import { spawn } from 'node:child_process'
import { loadEnv } from './env.mjs'

loadEnv()

const intervalMs = Number(process.env.BOT_RECEIPT_POLL_INTERVAL_MS || 60_000)
const boundedIntervalMs = Math.max(30_000, intervalMs)
const contentPostEnabled = String(process.env.BOT_CONTENT_POST_ENABLED ?? 'false').toLowerCase() === 'true'
const contentCheckIntervalMs = Number(process.env.BOT_CONTENT_CHECK_INTERVAL_MS || 60_000)
const boundedContentCheckIntervalMs = Math.max(60_000, contentCheckIntervalMs)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runReceiptPass() {
  return new Promise((resolve) => {
    const startedAt = new Date()
    console.log(`Receipt mention pass started at ${startedAt.toISOString()}`)

    const child = spawn(process.execPath, ['./scripts/bot-mentions.mjs'], {
      stdio: 'inherit',
      shell: false,
    })

    child.on('exit', (code) => {
      if (code) {
        console.error(`Receipt mention pass exited with ${code}`)
      } else {
        console.log(`Receipt mention pass completed at ${new Date().toISOString()}`)
      }
      resolve()
    })

    child.on('error', (error) => {
      console.error(`Receipt mention pass failed to start: ${error?.message || error}`)
      resolve()
    })
  })
}

function runContentPass() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['./scripts/content-post.mjs'], {
      stdio: 'inherit',
      shell: false,
    })

    child.on('exit', (code) => {
      if (code) console.error(`Content post pass exited with ${code}`)
      resolve()
    })

    child.on('error', (error) => {
      console.error(`Content post pass failed to start: ${error?.message || error}`)
      resolve()
    })
  })
}

async function runContentLoop() {
  console.log(`Content pulse enabled. Due check interval: ${boundedContentCheckIntervalMs} ms.`)
  while (true) {
    await runContentPass()
    await sleep(boundedContentCheckIntervalMs)
  }
}

console.log(`Breadlines receipt daemon started. Poll interval: ${boundedIntervalMs} ms.`)
if (contentPostEnabled) {
  void runContentLoop()
} else {
  console.log('Content pulse disabled. Receipt replies only.')
}

while (true) {
  await runReceiptPass()
  await sleep(boundedIntervalMs)
}
