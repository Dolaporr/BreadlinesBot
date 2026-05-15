import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve('.env')
const statePath = path.resolve('data/bot-state.json')
let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

function upsert(key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  envText = pattern.test(envText) ? envText.replace(pattern, line) : `${envText.trimEnd()}\n${line}\n`
}

upsert('TWITTER_DRY_RUN', 'false')
upsert('BOT_APPROVAL_MODE', 'false')
upsert('BOT_AUTO_POST', 'true')
upsert('BOT_AUTO_REPLY', 'false')
upsert('BOT_MENTIONS_ENABLED', 'true')
upsert('BOT_SEARCH_ENABLED', 'false')
upsert('BOT_MIN_POST_INTERVAL_MINUTES', '180')
upsert('BOT_MAX_POST_INTERVAL_MINUTES', '420')
upsert('BOT_CYCLE_MINUTES_MIN', '20')
upsert('BOT_CYCLE_MINUTES_MAX', '45')

fs.writeFileSync(envPath, envText)

const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {}
state.nextPostAt = new Date(Date.now() - 60_000).toISOString()
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)

console.log('Launch mode enabled: auto-post on, replies/search off, dry-run off.')
console.log('Next post window set to now for one launch post.')
