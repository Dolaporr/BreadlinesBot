import { loadEnv } from './env.mjs'
import { isSafeText } from './policy.mjs'
import { createTweet, verifyExpectedAccount } from './x-client.mjs'
import { createDraftStore } from './draft-store.mjs'

loadEnv()

const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'

const draftStore = createDraftStore()
await draftStore.init()

console.log(`Draft store: ${draftStore.label}`)
const reply = (await draftStore.listDrafts({ unpostedOnly: true }))
  .filter((item) => item.approved)
  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  .find((item) => isSafeText(item.text))

if (!reply) {
  console.log('No approved unposted replies found.')
  await draftStore.close()
  process.exit(0)
}

if (dryRun) {
  console.log('TWITTER_DRY_RUN=true, so nothing was posted.')
  console.log(`Would reply to ${reply.targetTweetId}:`)
  console.log(reply.text)
  await draftStore.close()
  process.exit(0)
}

await verifyExpectedAccount()
const response = await createTweet(reply.text, { inReplyToTweetId: reply.targetTweetId })
await draftStore.markPosted(reply.id, response)
await draftStore.close()

console.log(`Posted reply ${reply.id}`)
