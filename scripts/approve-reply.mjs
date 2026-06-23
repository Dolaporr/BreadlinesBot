#!/usr/bin/env node

import { loadEnv } from './env.mjs'
import { createDraftStore } from './draft-store.mjs'

loadEnv()

const id = process.argv[2]
const draftStore = createDraftStore()
await draftStore.init()

if (!id) {
  console.log('Usage: npm run replies:approve -- DRAFT_ID')
  console.log(`Draft store: ${draftStore.label}`)
  const drafts = await draftStore.listDrafts({ unpostedOnly: true })
  for (const draft of drafts.slice(0, 10)) {
    console.log(`- ${draft.id} | approved=${draft.approved} | tx=${draft.txSignature || 'n/a'}`)
  }
  await draftStore.close()
  process.exit(1)
}

const draft = await draftStore.setApproved(id, true)
await draftStore.close()

if (!draft) {
  console.error(`Draft not found: ${id}`)
  process.exit(1)
}

console.log(`Approved reply draft ${draft.id}`)
