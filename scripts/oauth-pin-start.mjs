import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, requireEnv } from './env.mjs'
import { oauthHeader, parseForm } from './oauth-pin-util.mjs'

loadEnv()
requireEnv(['TWITTER_API_KEY', 'TWITTER_API_SECRET_KEY'])

const url = 'https://api.x.com/oauth/request_token'
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: oauthHeader({
      method: 'POST',
      url,
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET_KEY,
      extra: {
        oauth_callback: 'oob',
      },
    }),
  },
})

const text = await res.text()
const data = parseForm(text)

if (!res.ok || !data.oauth_token || !data.oauth_token_secret) {
  console.error(`Could not start OAuth PIN flow: ${res.status}`)
  console.error(text)
  process.exit(1)
}

fs.writeFileSync(
  path.resolve('.oauth-request.json'),
  `${JSON.stringify(
    {
      oauth_token: data.oauth_token,
      oauth_token_secret: data.oauth_token_secret,
      createdAt: new Date().toISOString(),
    },
    null,
    2
  )}\n`
)

console.log('Open this URL while logged into the BreadLines bot account, not your main:')
console.log(`https://api.x.com/oauth/authorize?oauth_token=${data.oauth_token}`)
console.log('\nAfter approving, X will show a PIN.')
console.log('Run: npm run oauth:bot:finish -- YOUR_PIN')
