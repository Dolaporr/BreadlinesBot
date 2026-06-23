import { loadEnv } from './env.mjs'
import { createDraftStore } from './draft-store.mjs'

loadEnv()

const draftStore = createDraftStore()
await draftStore.init()

console.log(`Draft store: ${draftStore.label}`)
const replies = await draftStore.listDrafts({ unpostedOnly: true })
const pending = replies.filter((item) => !item.posted)

for (const reply of pending) {
  console.log(`\n${reply.id}`)
  console.log(`source: ${reply.source} | score: ${reply.score ?? 'n/a'} | approved: ${reply.approved}`)
  if (reply.txSignature) console.log(`tx: ${reply.txSignature}`)
  if (reply.receiptSummary) {
    const summary = reply.receiptSummary
    console.log(
      `receipt: status=${summary.status} fee=${summary.feePaidSol ?? 'n/a'} SOL pressure=${summary.estimatedPressure} queue=${summary.queueSensitive} price=${summary.priceSensitive}`,
    )
  }
  console.log(`target: ${reply.targetText}`)
  console.log(`reply: ${reply.text}`)
}

console.log(`\n${pending.length} unposted reply draft(s).`)
await draftStore.close()
