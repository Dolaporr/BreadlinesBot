# LMAO Positioning Dial-Back - Update Complete ✅

## Summary

Breadlines bot has been updated to dial back hard LMAO positioning and reframe as **Breadlines-first** with **optional aligned communities**. No more partnership claims, airdrop promises, or mass tagging.

---

## 🔄 Changes Made

### 1. Mission Templates → Breadlines-First ✅

**Old Mission Templates:**
```
"Mission Control: drop a Solana tx → tag @BreadLinesBot → get a receipt → share it → tag @lmaolmao + @BreadLinesMarkets"
"Community challenge: post your tx receipt... mention @lmaolmao + @BreadLinesMarkets"
```

**New Mission Templates:**
```
"Weekly Breadlines mission: Drop a tx. Get a breadline receipt. Share your FCFS vs MCP result. Best receipts enter weekly bagworking rewards. FCFS is the line. MCP is the market."

"Open Sprint: Drop a tx, run a Breadlines receipt, share the queue dynamics. We're building ordering data with aligned communities. Came from LMAO? Run a receipt too."

"Breadlines community receipt sprint: Drop a tx. Get a receipt. Share your ordering result. No partnership hype. Just signal on FCFS vs MCP."
```

**Key Changes:**
- Breadlines is the focus
- "Open Sprint" framing (not official partnership)
- "Bagworking rewards" (community-driven, no guarantees)
- LMAO mentioned only if "they brought it up" approach
- No mass @-tagging

**File:** [scripts/mission-post.mjs](scripts/mission-post.mjs)

---

### 2. Bot Personality Updated ✅

**character.json Changes:**

**Bio (was):**
```
"Automated $BREADLINES account managed by the BreadLinesMarkets team."
```

**Bio (now):**
```
"Mission Control for Breadlines."
"Running Open Sprint: weekly bagworking missions for aligned communities."
```

**System Prompt (was):**
```
"...Prefer helpful replies to users who mention the bot..."
```

**System Prompt (now):**
```
"...Breadlines-first framing always. LMAO is a possible aligned community, not a confirmed partnership—mention only if they brought it up. Never: claim partnerships, promise airdrops..."
```

**Knowledge (added):**
```
"Breadlines Open Sprint: community receipt missions for aligned communities building on ordering research."
"Bagworking: weekly community rewards for best Breadlines receipts and insights (no guarantees, no airdrops promised)."
"LMAO is a possible aligned community lane—mention only if they started the conversation."
```

**File:** [characters/breadlines-bot.character.json](characters/breadlines-bot.character.json)

---

### 3. Policy: Ban Partnership Claims & Airdrops ✅

**New Banned Patterns Added:**
```javascript
/\bofficial partnership\b/i,
/\bconfirmed (?:partnership|deal|integration)\b/i,
/\bbreadlines.*lmao.*(?:partnership|integration|official)\b/i,
/\blmao.*integration\b/i,
/\bairdrop\b/i,
/\bretention fund\b/i,
/\bcommunity fund\b/i,
/\bfabricio(?:\s+\w+)*\b/i,
/\bslingoor(?:\s+\w+)*\b/i,
/\b(?:will|guaranteed?|promised?|assured)\s+(?:receive|get)\s+(?:rewards?|tokens?|airdrop)\b/i,
/\bholders? will receive\b/i,
```

**These prevent:**
- "official partnership" claims
- "LMAO integration"
- Airdrop promises
- Named founder/manager references
- Guaranteed reward language

**File:** [scripts/policy.mjs](scripts/policy.mjs)

---

### 4. Environment Defaults → Safe Mode ✅

**.env Changes:**

| Variable | Old | New | Reason |
|----------|-----|-----|--------|
| TWITTER_DRY_RUN | false | **true** | Test everything first |
| BOT_AUTO_POST | true | **false** | No auto-posting |
| BOT_APPROVAL_MODE | false | **true** | Manual approval required |
| BOT_AUTO_REPLY | false | **false** | Already safe |

**File:** [.env](.env)

**What This Means:**
- Bot is in test mode by default
- No posts go live automatically
- Every reply requires manual approval
- Safe for team review before enabling

---

## 📋 Language Guidelines

### ✅ Do Say:
- "Breadlines Open Sprint"
- "Community receipt sprint"
- "Aligned communities"
- "Bagworking missions"
- "If you came from LMAO..."
- "Weekly community rewards"
- "Drop a tx, get a receipt"

### ❌ Don't Say:
- "Official LMAO partnership"
- "LMAO integration"
- "LMAO holders will receive..."
- "Fabricio partnership"
- "Confirmed ecosystem deal"
- "Guaranteed airdrop"
- "@lmaolmao + @BreadLinesMarkets" (mass tag)

### 🟡 Conditional:
- Mention LMAO only if they tagged the bot first
- Respond to LMAO community members without implying partnership
- Use "aligned communities" instead of "partners"

---

## 🧪 Verification

All tests still passing ✅

```
TX Signature Pattern (6 cases)     ✅ PASS
Extract Signature (3 cases)        ✅ PASS
Generate Receipt                   ✅ PASS
Analyze Tweet (3 cases)            ✅ PASS
```

No breaking changes to TX receipt functionality.

---

## 🚀 Deployment Path

### Phase 1 (Now): Safe Testing
```bash
TWITTER_DRY_RUN=true npm run bot:cycle
# Bot logs what it would do, nothing posts live
```

### Phase 2: Community Approval
```bash
npm run mission:post
# Review templates, approve the ones you like
vim data/queue.json
```

### Phase 3: Limited Deployment
```bash
TWITTER_DRY_RUN=false npm run bot:daemon
# Real posting, but still requires manual approval for each item
```

---

## 📁 Files Modified

```
✅ scripts/mission-post.mjs              Updated mission templates
✅ characters/breadlines-bot.character.json    Updated personality + system prompt
✅ scripts/policy.mjs                         Added banned patterns
✅ .env                                       Safe defaults
```

---

## ⚠️ Critical Reminders

1. **Revoke OpenAI API Key** (exposed previously)
   - https://platform.openai.com/account/api-keys
   - Generate new key and update .env

2. **No Auto-Posting Yet**
   - BOT_AUTO_POST=false by default
   - Everything requires manual approval first

3. **No Mass Tagging**
   - Remove @-mentions from all posts
   - Respond to people who tag the bot, don't tag them proactively

4. **Breadlines-First Framing**
   - Always lead with Breadlines narrative
   - LMAO is optional context, not core positioning

---

## 🎯 Next Steps

1. Test with dry-run: `TWITTER_DRY_RUN=true npm run bot:cycle`
2. Create first mission: `npm run mission:post`
3. Review in data/queue.json and approve one
4. Run `npm run post:approved` to test posting flow
5. Gradually enable more features as you gain confidence

---

## 📞 Support

If you need to customize:
- **Personality**: Edit [characters/breadlines-bot.character.json](characters/breadlines-bot.character.json)
- **Banned words**: Edit [scripts/policy.mjs](scripts/policy.mjs)
- **Mission templates**: Edit [scripts/mission-post.mjs](scripts/mission-post.mjs)
- **Safety defaults**: Edit [.env](.env)

---

**Status: Ready for safe, Breadlines-first deployment** ✅
