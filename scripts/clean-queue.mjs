import fs from 'node:fs'
import path from 'node:path'
import { isSafeText } from './policy.mjs'

const queuePath = path.resolve('data/queue.json')
const archivePath = path.resolve('data/queue-archive.json')

if (!fs.existsSync(queuePath)) {
  console.log('No queue found.')
  process.exit(0)
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'))
const archive = fs.existsSync(archivePath) ? JSON.parse(fs.readFileSync(archivePath, 'utf8')) : []

const badEncodingPattern = /â|Ã|Â|€|™|œ|¢/
const keep = []
const removed = []

for (const item of queue) {
  const shouldArchive =
    !item.posted &&
    !item.approved &&
    (!isSafeText(item.text) || badEncodingPattern.test(item.text))

  if (shouldArchive) {
    removed.push({
      ...item,
      archivedAt: new Date().toISOString(),
      archiveReason: badEncodingPattern.test(item.text) ? 'bad-encoding' : 'policy-filter',
    })
  } else {
    keep.push(item)
  }
}

fs.writeFileSync(queuePath, `${JSON.stringify(keep, null, 2)}\n`)
fs.writeFileSync(archivePath, `${JSON.stringify([...archive, ...removed], null, 2)}\n`)

console.log(`Archived ${removed.length} draft(s). Kept ${keep.length}.`)
