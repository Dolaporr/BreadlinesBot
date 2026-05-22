#!/usr/bin/env node

/**
 * POSITIONING UPDATE REFERENCE
 * Quick preview of new mission templates and character framing
 */

console.log(`
🔄 BREADLINES POSITIONING UPDATE
================================

✅ NEW MISSION TEMPLATES:
________________________________

1. BAGWORKING MISSION:
  "Weekly Breadlines mission:
  
  Drop a Solana tx.
  Get a breadline receipt.
  Share your FCFS vs MCP result.
  Best receipts enter the weekly bagworking rewards.
  
  FCFS is the line. MCP is the market.
  https://breadlinesmarkets.com"

2. OPEN SPRINT:
  "Open Sprint: Drop a tx, run a Breadlines receipt, share the queue dynamics.
  
  We're building ordering data with aligned communities.
  
  Came from LMAO? Run a receipt too.
  https://breadlinesmarkets.com"

3. COMMUNITY RECEIPT SPRINT:
  "Breadlines community receipt sprint:
  
  1. Drop a tx
  2. Get a receipt
  3. Share your ordering result
  
  No partnership hype. Just signal on FCFS vs MCP.
  
  https://breadlinesmarkets.com"

✅ BOT CHARACTER UPDATES:
________________________________

Bio:
  - "Mission Control for Breadlines"
  - "Running Open Sprint: weekly bagworking missions for aligned communities"
  - Removed "Automated X account" corporate framing

System Prompt:
  - "Breadlines-first framing always"
  - "LMAO is a possible aligned community, not confirmed partnership"
  - "Never claim partnerships, promise airdrops"

Knowledge:
  + "Breadlines Open Sprint: community receipt missions for aligned communities"
  + "Bagworking: weekly community rewards (no guarantees, no airdrops promised)"
  + "LMAO is optional aligned community lane"

✅ BANNED PATTERNS (NEW):
________________________________

Partnership Claims:
  ❌ "official partnership"
  ❌ "confirmed deal"
  ❌ "LMAO integration"
  
Airdrop Promises:
  ❌ "airdrop"
  ❌ "will receive rewards"
  ❌ "guaranteed"
  
Named References:
  ❌ "Fabricio"
  ❌ "Slingoor"

✅ ENVIRONMENT DEFAULTS:
________________________________

Before:
  TWITTER_DRY_RUN=false
  BOT_AUTO_POST=true
  BOT_APPROVAL_MODE=false

After:
  TWITTER_DRY_RUN=true      ← Test mode on by default
  BOT_AUTO_POST=false       ← No auto-posting
  BOT_APPROVAL_MODE=true    ← Manual approval required

✅ KEY MESSAGING RULES:
________________________________

✅ DO:
  - Lead with Breadlines narrative
  - Use "Open Sprint", "community receipt"
  - Say "aligned communities"
  - Reply only when tagged
  - Include caveat: "no guarantees, no airdrops promised"

❌ DON'T:
  - Claim LMAO partnership
  - Promise airdrops
  - Mass @-tag people
  - Name specific people (Fabricio, Slingoor)
  - Use "official", "confirmed", "integration"

🟡 ONLY IF ASKED:
  - Mention LMAO
  - Reference community relationships

✅ TEST COMMANDS:
________________________________

Dry-run test:
  TWITTER_DRY_RUN=true npm run bot:cycle

Create missions:
  npm run mission:post

Check mission templates:
  cat data/queue.json | grep -A2 "bagworking"

Check character:
  npm run check:character

Run tests:
  node scripts/test-tx-receipt.mjs

✅ NEXT STEPS:
________________________________

1. Verify .env has safe defaults
2. Run dry-run test
3. Create mission posts
4. Review in data/queue.json
5. Approve and post manually
6. Gradually enable more features

===== ALL CHANGES COMPLETE ✅ =====
`)
