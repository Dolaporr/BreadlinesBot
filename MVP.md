# Breadlines Mission Control Bot - MVP Features

## Overview

The bot has been upgraded from a general content bot to **Breadlines Mission Control**: a focused tool for helping the LMAO/Breadlines community interact with the simulator and build ordering data.

## New Features

### Feature 1: Mention-based TX Receipts ✅

**What it does:**
- Watches for mentions of the bot
- Detects Solana transaction signatures in the mention text
- Validates signatures using pattern: `/^[1-9A-HJ-NP-Za-km-z]{64,88}$/`
- Generates a receipt-style reply modeled after real order receipts

**Receipt Format:**
```
📜 breadlines receipt:
  modeled spam ahead
  FCFS wait time: ...analyzing
  MCP wait time: ...analyzing
  time saved: 234ms
  tx: 1A2B3C4D...X8Y9Z
  read more: https://breadlinesmarkets.com
```

**How it works:**
1. Bot polls mentions every cycle (via `bot:cycle`)
2. `collectTxReceiptReplies()` in `bot-cycle.mjs` scans for tx patterns
3. Replies are auto-approved (unless `BOT_APPROVAL_MODE=true`)
4. Posted replies are tracked in `data/replies.json` with `txSignature` field
5. Mentions are not duplicated (tracked via `state.lastMentionIdForReceipt`)

**Safeguards:**
- TX signature must match strict base58 pattern (not false positives)
- Reply must pass `isSafeText()` checks
- One reply per mention (deduplication via `seenTweetIds`)
- Dry-run mode available: `TWITTER_DRY_RUN=true`

### Feature 2: Mission Posts ✅

**What it does:**
- Creates 3 community-focused mission post templates
- Posts encourage community to share TX receipts
- Emphasizes data collection, not hype

**Templates:**
```
"Drop a tx → tag BreadLinesBot → get a receipt → share it → tag LMAO + BREADLINES"
"Community challenge: post your tx receipt"
"Drop a tx to @BreadLinesBot... Market structure data comes from your experiments"
```

**How to use:**
```bash
npm run mission:post
```

This adds the templates to `data/queue.json` as UNAPPROVED. You then:
1. Review in `data/queue.json`
2. Change `"approved": false` to `"approved": true` for the ones you like
3. Run `npm run post:approved` to post one

**Why manual approval?**
- These are high-signal posts that set community expectations
- No auto-spam; keeps the tone focused

### Feature 3: Bot Personality Cleanup ✅

**What changed:**
- **Bio**: Now "Mission Control for Breadlines"—direct, no fluff
- **System prompt**: Sharper, builder-coded tone; "assume builders understand Solana"
- **Adjectives**: "sharp", "builder-coded", "signal-focused", "no-nonsense"
- **New style section**: Explicit avoid list (desperate vibes, price talk, random food puns, repeated words)
- **Message examples**: Updated to be punchier, more direct
- **Post examples**: Sharper, tighter language

**Banned phrases expanded:**
- No more: `get rich`, `amazing returns`, `FOMO`, `lambos`, `gm gm`, etc.
- No: yields, staking, floor price, market cap, token value
- No: repetitive adjectives

**Result:**
The bot now sounds:
- ✅ Sharp
- ✅ Simple
- ✅ Funny (without trying)
- ✅ Builder-coded (not corporate)
- ✅ Not desperate
- ✅ Not price-promising
- ✅ Not repetitive

---

## Environment Variables (New & Updated)

```env
# TX Receipt handling (automatic, no new vars needed)
# Uses existing BOT_MENTIONS_ENABLED (default: true)
# Auto-approves receipts unless BOT_APPROVAL_MODE=true

# Bot personality/safety (used by policy.mjs)
TWITTER_DRY_RUN=false              # Test mode (default: true)
BOT_APPROVAL_MODE=true             # Require manual approval (default: true)
BOT_MENTIONS_ENABLED=true          # Watch mentions (default: true)
BOT_AUTO_REPLY=false               # Auto-reply when approved (default: false)

# Mission posts (no special vars, uses existing queue system)
```

---

## Data Files

### data/replies.json (Enhanced)
```json
{
  "id": "receipt-1234-abcd",
  "targetTweetId": "1234567890",
  "targetText": "Can you parse this tx? 1A2B3C4D...",
  "txSignature": "1A2B3C4D...X8Y9Z",
  "text": "📜 breadlines receipt: ...",
  "reason": "tx receipt",
  "source": "tx-receipt",
  "approved": true,
  "posted": true,
  "postedAt": "2026-05-21T...",
  "xResponse": { "data": { "id": "...", "text": "..." } },
  "createdAt": "2026-05-21T..."
}
```

### data/bot-state.json (Enhanced)
```json
{
  "postCount": 5,
  "replyCount": 3,
  "nextPostAt": "2026-05-21T22:00:00Z",
  "delayMinutes": 120,
  "lastMentionId": "1234567890",
  "lastMentionIdForReceipt": "1234567890",  // NEW
  "lastSearchId": "1234567890",
  "lastTolySignalId": "1234567890"
}
```

---

## Scripts

### Existing Scripts (Still Available)
```bash
npm run draft               # Draft posts manually
npm run draft:ai           # Draft with OpenAI
npm run bot:cycle          # Run one bot cycle (posts + replies)
npm run bot:daemon         # Run bot daemon (repeating)
npm run queue:show         # Show pending posts
npm run post:approved      # Post one approved item
npm run replies:show       # Show pending replies
npm run reply:approved     # Post one approved reply
npm run check:character    # Validate character.json
```

### New Scripts
```bash
npm run mission:post       # Add mission templates to queue
```

---

## Testing the MVP

### Test TX Receipt Detection
```bash
# Terminal 1: Start dry-run cycle
TWITTER_DRY_RUN=true npm run bot:cycle

# Should show:
# "Generated X tx receipt replies"
# "DRY RUN reply to [tweet_id]"
```

### Test Mission Posts
```bash
npm run mission:post
cat data/queue.json | grep -A2 '"mission-'
# Approve one:
# vim data/queue.json  # change "approved": false to true
npm run post:approved
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| False positive TX detection | Strict regex pattern; rare false positives |
| Rate limit on mentions | Only fetches 10 most recent per cycle; API limits are generous |
| Auto-approve receipts too eagerly | Can set `BOT_APPROVAL_MODE=true` to require manual approval |
| Receipts spam user | One reply per mention; deduplication prevents multi-posts |
| OPENAI_API_KEY exposed | ⚠️ **CRITICAL**: Revoke the key in .env immediately |

---

## Next Steps (Post-MVP)

### Phase 2 Ideas
- [ ] Actual on-chain integration: validate TX really happened
- [ ] Mock data from simulator: return real FCFS vs MCP wait times
- [ ] Dashboard: aggregate receipt data by community member
- [ ] Leaderboard: most txs posted, best timing insights
- [ ] Advanced missions: "Race this ordering scenario" / "Bet on MCP timing"

### Personality Improvements
- [ ] Add more Toly/builder-native references
- [ ] Test with real community feedback
- [ ] Tune MCP/FCFS metaphor usage

### Safety Improvements
- [ ] Rate-limit replies to 3-5 per user per day
- [ ] Block spam accounts from triggering receipts
- [ ] Track receipt accuracy over time

---

## Quick Start

```bash
# 1. Set up env
cp .env.example .env
# Edit .env with real Twitter OAuth + OpenAI key

# 2. Test dry-run
TWITTER_DRY_RUN=true npm run bot:cycle

# 3. Add mission posts
npm run mission:post

# 4. Approve and post
vim data/queue.json
npm run post:approved

# 5. Run full bot (mentioning enabled by default)
TWITTER_DRY_RUN=false npm run bot:daemon
```

---

## Files Modified

- ✅ `scripts/tx-receipt.mjs` — NEW: TX validation + receipt generation
- ✅ `scripts/bot-cycle.mjs` — Added TX receipt collection + integration
- ✅ `scripts/mission-post.mjs` — NEW: Mission post templates
- ✅ `characters/breadlines-bot.character.json` — Personality overhaul
- ✅ `scripts/policy.mjs` — Expanded banned patterns
- ✅ `package.json` — Added `mission:post` script

---

**Status**: MVP ready. All features working. Needs: API key revocation + community testing.
