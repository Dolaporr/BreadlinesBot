import fs from 'node:fs'
import path from 'node:path'

const repliesPath = path.resolve('data/replies.json')

if (!fs.existsSync(repliesPath)) {
  console.log('No replies yet. Run: npm run bot:cycle')
  process.exit(0)
}

const replies = JSON.parse(fs.readFileSync(repliesPath, 'utf8'))
const pending = replies.filter((item) => !item.posted)

for (const reply of pending) {
  console.log(`\n${reply.id}`)
  console.log(`source: ${reply.source} | score: ${reply.score} | approved: ${reply.approved}`)
  console.log(`target: ${reply.targetText}`)
  console.log(`reply: ${reply.text}`)
}

console.log(`\n${pending.length} unposted reply draft(s).`)
