# 24/7 Deployment

Recommended first host: Railway.

Why Railway:

- supports long-running Node services
- simple GitHub deploy flow
- has environment variables for secrets
- no need to expose a public web server for this bot

Render Background Worker is also fine. Fly.io is good but more ops-heavy.

## Important Safety

Never commit `.env`.

Set these in the host dashboard as environment variables:

```env
TWITTER_API_KEY=
TWITTER_API_SECRET_KEY=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_EXPECTED_USERNAME=Breadlinebot
BOT_DRAFT_STORE=auto
DATABASE_URL=
OPENAI_API_KEY=
BOT_MODEL=gpt-4.1-mini
BREADLINES_SITE=https://breadlinesmarkets.com
BREADLINES_CA=8cLSy3rjyCuVzzE1PuQ7AwALQNERrTZx9T8R52pRpump
BREADLINES_OPERATOR_HANDLE=@dola_porr
TWITTER_DRY_RUN=true
BOT_APPROVAL_MODE=true
BOT_AUTO_POST=false
BOT_AUTO_REPLY=false
BOT_MENTIONS_ENABLED=true
BOT_RECEIPT_AUTO_REPLY=false
BOT_RECEIPT_POLL_INTERVAL_MS=60000
BOT_RECEIPTS_ENABLED=true
BOT_CONTENT_POST_ENABLED=false
BOT_CONTENT_CHECK_INTERVAL_MS=60000
BOT_CONTENT_MIN_INTERVAL_MINUTES=180
BOT_CONTENT_MAX_INTERVAL_MINUTES=420
BOT_CONTENT_LINK_EVERY_N_POSTS=4
BOT_CONTENT_USE_OPENAI=false
BOT_CONTENT_OPENAI_CANDIDATES=6
BOT_SEARCH_ENABLED=false
BOT_THREAD_MENTION_SEARCH_ENABLED=false
BOT_MAX_REPLIES_PER_CYCLE=3
BOT_MIN_POST_INTERVAL_MINUTES=180
BOT_MAX_POST_INTERVAL_MINUTES=420
BOT_CYCLE_MINUTES_MIN=20
BOT_CYCLE_MINUTES_MAX=45
BOT_LINK_EVERY_N_POSTS=3
BOT_HUMOR_LEVEL=medium
```

Keep replies and broad search off for the first 24 hours:

```env
BOT_AUTO_REPLY=false
BOT_SEARCH_ENABLED=false
```

## Railway Steps

1. Push this repo to GitHub.
2. Go to Railway and create a new project from GitHub.
3. Select this repo.
4. Set the service root directory to:

```txt
breadlines-bot
```

5. Railway should use `railway.json`, whose start command is:

```bash
npm run mentions:daemon
```

6. Add all env vars from the list above in the Railway Variables tab.
7. Add Railway Postgres and attach it to the worker if you want Draft Inbox persistence. This should expose `DATABASE_URL`.
8. Deploy.
9. Open logs and confirm:

```txt
Draft store: postgres:DATABASE_URL
```

## Alive Mode: Curated Content Pulse

The Railway start command can stay:

```bash
npm run mentions:daemon
```

To make the bot post original Breadlines content while still only replying to direct receipt mentions, enable:

```env
BOT_CONTENT_POST_ENABLED=true
BOT_CONTENT_MIN_INTERVAL_MINUTES=180
BOT_CONTENT_MAX_INTERVAL_MINUTES=420
BOT_CONTENT_LINK_EVERY_N_POSTS=4
BOT_CONTENT_USE_OPENAI=true
BOT_CONTENT_OPENAI_CANDIDATES=6
```

With `BOT_CONTENT_USE_OPENAI=true`, the bot asks OpenAI for fresh trench-native posts, rejects unsafe/tagged candidates, and falls back to curated templates if generation fails. It does not search X and does not tag large accounts.

## Render Steps

1. Create a new Background Worker.
2. Connect GitHub repo.
3. Root directory:

```txt
breadlines-bot
```

4. Build command:

```bash
npm install
```

5. Start command:

```bash
npm run bot:daemon
```

6. Add the same env vars.
7. Deploy and watch logs.

## Local 24/7 Temporary Option

You can run locally, but the bot stops if the PC sleeps or the terminal closes.

```bash
cd /c/Users/alade/Documents/breadlines/BreadLinesMarkets/breadlines-bot
npm run bot:daemon
```

Use this only for testing.
