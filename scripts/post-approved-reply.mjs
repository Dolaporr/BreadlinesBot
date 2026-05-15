import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'
import { isSafeText } from './policy.mjs'
import { createTweet, verifyExpectedAccount } from './x-client.mjs'

loadEnv()

const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'
const repliesPath = path.resolve('data/replies.json')

if (!fs.existsSync(repliesPath)) {
  console.log('No replies found. Run: npm run bot:cycle')
  process.exit(0)
}

const replies = JSON.parse(fs.readFileSync(repliesPath, 'utf8'))
const reply = replies.find((item) => item.approved && !item.posted && isSafeText(item.text))

if (!reply) {
  console.log('No approved unposted replies found.')
  process.exit(0)
}

if (dryRun) {
  console.log('TWITTER_DRY_RUN=true, so nothing was posted.')
  console.log(`Would reply to ${reply.targetTweetId}:`)
  console.log(reply.text)
  process.exit(0)
}

await verifyExpectedAccount()
const response = await createTweet(reply.text, { inReplyToTweetId: reply.targetTweetId })
reply.posted = true
reply.postedAt = new Date().toISOString()
reply.xResponse = response
fs.writeFileSync(repliesPath, `${JSON.stringify(replies, null, 2)}\n`)

console.log(`Posted reply ${reply.id}`)
