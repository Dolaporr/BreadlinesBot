import fs from 'node:fs'
import path from 'node:path'

const queuePath = path.resolve('data/queue.json')

if (!fs.existsSync(queuePath)) {
  console.log('No queue yet. Run: npm run draft')
  process.exit(0)
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'))
const pending = queue.filter((item) => !item.posted)

for (const item of pending) {
  console.log(`\n${item.id}`)
  console.log(`approved: ${item.approved}`)
  console.log(item.text)
}

console.log(`\n${pending.length} unposted item(s).`)
