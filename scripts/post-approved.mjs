import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, requireEnv } from './env.mjs'
import { oauthHeader } from './x-oauth.mjs'

loadEnv()

const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'
const queuePath = path.resolve('data/queue.json')

if (!fs.existsSync(queuePath)) {
  console.log('No queue found. Run: npm run draft')
  process.exit(0)
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'))
const nextPost = queue.find((item) => item.approved && !item.posted)

if (!nextPost) {
  console.log('No approved unposted drafts found.')
  console.log('Set "approved": true for one item in data/queue.json, then run this again.')
  process.exit(0)
}

if (dryRun) {
  console.log('TWITTER_DRY_RUN=true, so nothing was posted.')
  console.log('\nWould post:\n')
  console.log(nextPost.text)
  process.exit(0)
}

requireEnv([
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET_KEY',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
])

const url = 'https://api.x.com/2/tweets'
const expectedUsername = process.env.TWITTER_EXPECTED_USERNAME?.replace(/^@/, '').toLowerCase()

if (expectedUsername) {
  const meUrl = 'https://api.x.com/2/users/me?user.fields=username'
  const meRes = await fetch(meUrl, {
    headers: {
      Authorization: oauthHeader('GET', meUrl),
    },
  })
  const meJson = await meRes.json().catch(() => ({}))

  if (!meRes.ok) {
    console.error(`Could not verify X token owner ${meRes.status}:`)
    console.error(JSON.stringify(meJson, null, 2))
    process.exit(1)
  }

  const actualUsername = meJson?.data?.username?.toLowerCase()
  if (actualUsername !== expectedUsername) {
    console.error(`Refusing to post: X tokens belong to @${actualUsername}, expected @${expectedUsername}.`)
    console.error('Regenerate/authorize Access Token and Secret from the BreadLines bot account.')
    process.exit(1)
  }
}

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: oauthHeader('POST', url),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: nextPost.text }),
})

const json = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error(`X API error ${res.status}:`)
  console.error(JSON.stringify(json, null, 2))
  process.exit(1)
}

nextPost.posted = true
nextPost.postedAt = new Date().toISOString()
nextPost.xResponse = json

fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`)
console.log(`Posted ${nextPost.id}`)
