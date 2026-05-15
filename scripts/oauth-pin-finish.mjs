import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, requireEnv } from './env.mjs'
import { oauthHeader, parseForm } from './oauth-pin-util.mjs'

loadEnv()
requireEnv(['TWITTER_API_KEY', 'TWITTER_API_SECRET_KEY'])

const pin = process.argv[2]
if (!pin) {
  console.error('Usage: npm run oauth:bot:finish -- YOUR_PIN')
  process.exit(1)
}

const requestPath = path.resolve('.oauth-request.json')
if (!fs.existsSync(requestPath)) {
  console.error('Missing .oauth-request.json. Run npm run oauth:bot:start first.')
  process.exit(1)
}

const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'))
const url = 'https://api.x.com/oauth/access_token'
const body = new URLSearchParams({ oauth_verifier: pin }).toString()

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: oauthHeader({
      method: 'POST',
      url,
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET_KEY,
      token: request.oauth_token,
      tokenSecret: request.oauth_token_secret,
      extra: {
        oauth_verifier: pin,
      },
    }),
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body,
})

const text = await res.text()
const data = parseForm(text)

if (!res.ok || !data.oauth_token || !data.oauth_token_secret) {
  console.error(`Could not finish OAuth PIN flow: ${res.status}`)
  console.error(text)
  process.exit(1)
}

const envPath = path.resolve('.env')
let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

function upsert(key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  envText = pattern.test(envText) ? envText.replace(pattern, line) : `${envText.trimEnd()}\n${line}\n`
}

upsert('TWITTER_ACCESS_TOKEN', data.oauth_token)
upsert('TWITTER_ACCESS_TOKEN_SECRET', data.oauth_token_secret)
upsert('TWITTER_EXPECTED_USERNAME', data.screen_name || 'BreadLinesBot')
upsert('TWITTER_DRY_RUN', 'true')

fs.writeFileSync(envPath, envText)
fs.rmSync(requestPath, { force: true })

console.log(`Saved bot-owned tokens for @${data.screen_name} to .env`)
console.log('Dry run is ON. Run npm run verify:x next.')
