# BreadLines Bot Project

This is the working folder for the BreadLines X bot.

## Recommended First Launch

Use the no-dependency approval queue first. It works without elizaOS and uses the official X API.

```bash
npm run draft
npm run draft:ai
npm run queue:show
```

Open `data/queue.json`, pick one draft, and change:

```json
"approved": false
```

to:

```json
"approved": true
```

Then dry-run it:

```bash
npm run post:approved
```

If `TWITTER_DRY_RUN=true`, nothing posts. It only prints what would be posted.

Only when you are ready to send a real post:

```env
TWITTER_DRY_RUN=false
```

Then run:

```bash
npm run post:approved
```

This posts one approved item, marks it as posted, and stops.

## AI Drafts

After adding `OPENAI_API_KEY` and `BOT_MODEL` to `.env`, generate smarter drafts:

```bash
npm run draft:ai
npm run queue:show
```

The AI drafts are still unapproved by default. Approve one in `data/queue.json` before posting.

## Timing

Create a randomized next-post window:

```bash
npm run schedule:next
```

This writes `data/schedule.json`. The current safe workflow still requires you to approve and run posts manually.

## Smart Cycle

Run one controlled bot cycle:

```bash
npm run bot:cycle
```

Default behavior:

- `TWITTER_DRY_RUN=true`: never posts
- `BOT_APPROVAL_MODE=true`: creates drafts, but does not auto-approve them
- `BOT_AUTO_POST=false`: no automatic timeline posts
- `BOT_AUTO_REPLY=false`: no automatic replies
- `BOT_MENTIONS_ENABLED=true`: can draft replies to mentions
- `BOT_BACKFILL_MENTIONS=false`: only checks new mentions after the last seen ID
- `BOT_THREAD_MENTION_SEARCH_ENABLED=true`: also searches for `@BreadLinesBot` inside reply threads
- `BOT_SEARCH_ENABLED=false`: does not scan broader search by default

Review reply drafts:

```bash
npm run replies:show
```

Approve one reply in `data/replies.json`, then dry-run:

```bash
npm run reply:approved
```

For limited auto mode later, change only these after a safe test period:

```env
BOT_APPROVAL_MODE=false
BOT_AUTO_POST=true
BOT_AUTO_REPLY=true
TWITTER_DRY_RUN=false
```

Keep `BOT_SEARCH_ENABLED=false` until mentions are behaving well.

To enable conservative auto-replies to mentions only:

```env
BOT_AUTO_REPLY=true
BOT_MENTIONS_ENABLED=true
BOT_BACKFILL_MENTIONS=false
BOT_THREAD_MENTION_SEARCH_ENABLED=true
BOT_SEARCH_ENABLED=false
BOT_REPLY_SCORE_THRESHOLD=75
```

For one catch-up cycle after enabling replies, set `BOT_BACKFILL_MENTIONS=true`, deploy, wait for one cycle, then set it back to `false`.

## Toly Signal Mode

This mode watches recent `@toly` posts about MCP/FCFS/breadlines/proposers and turns them into standalone supportive commentary. It does not reply directly to Toly.

```env
BOT_TOLY_SIGNAL_ENABLED=true
BOT_TOLY_HANDLE=toly
BOT_TOLY_SIGNAL_TERMS=MCP,FCFS,bread line,breadlines,proposer,leader monopoly
BOT_TOLY_SIGNAL_DRAFTS_PER_CYCLE=2
```

Keep broad search replies off while this is enabled:

```env
BOT_SEARCH_ENABLED=false
```

Run continuously:

```bash
npm run bot:daemon
```

The daemon runs one cycle, waits a randomized interval, then repeats. Keep it in dry-run/approval mode until you trust the output.

Clean old low-quality or encoding-broken drafts:

```bash
npm run queue:clean
```

## Current Status

The project files are prepared.

The no-dependency approval queue is ready now.

The elizaOS path is optional and can be revisited later. On this Windows setup, the global Bun/elizaOS install hit permissions and an incompatible nested Bun dependency.

The official elizaOS docs currently recommend:

- Node.js 23.3+
- Bun
- Git Bash on Windows
- `bun i -g @elizaos/cli`

## What You Need To Fill

Create `.env` from `.env.example`, then paste your real keys locally:

```bash
cp .env.example .env
```

Fill:

- `TWITTER_API_KEY`
- `TWITTER_API_SECRET_KEY`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`
- one model key, usually `OPENAI_API_KEY`
- `BREADLINES_OPERATOR_HANDLE`

Keep `TWITTER_DRY_RUN=true` for first launch.

## Install elizaOS

On Windows, open **Git Bash**, not PowerShell.

```bash
node --version
powershell -c "irm bun.sh/install.ps1 | iex"
bun --version
bun i -g @elizaos/cli
elizaos --version
```

If Node is below `23.3`, install a newer Node first.

## Run

From this folder:

```bash
npm run check:character
npm run configure
npm run start
```

The bot uses port `3001` so it does not fight your Next site on `3000`.

## Launch Rule

Do not set `TWITTER_DRY_RUN=false` until you have reviewed the logs and are happy with the drafts.
