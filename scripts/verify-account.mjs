import { loadEnv, requireEnv } from './env.mjs'
import { oauthHeader } from './x-oauth.mjs'

loadEnv()
requireEnv([
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET_KEY',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
])

const url = 'https://api.x.com/2/users/me?user.fields=username,name,verified'
const res = await fetch(url, {
  headers: {
    Authorization: oauthHeader('GET', url),
  },
})

const json = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error(`X API error ${res.status}:`)
  console.error(JSON.stringify(json, null, 2))
  process.exit(1)
}

console.log(`Tokens are for @${json.data.username} (${json.data.name})`)
