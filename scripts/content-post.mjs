import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env.mjs'
import { cleanText, isSafeText } from './policy.mjs'
import { generateJson } from './openai-client.mjs'
import { createTweet, verifyExpectedAccount } from './x-client.mjs'

loadEnv()

const dataDir = path.resolve('data')
const statePath = path.join(dataDir, 'content-state.json')
const historyPath = path.join(dataDir, 'content-history.json')
fs.mkdirSync(dataDir, { recursive: true })

const enabled = String(process.env.BOT_CONTENT_POST_ENABLED ?? 'false').toLowerCase() === 'true'
const dryRun = String(process.env.TWITTER_DRY_RUN ?? 'true').toLowerCase() !== 'false'
const site = process.env.BREADLINES_SITE || 'https://breadlinesmarkets.com'
const minMinutes = Number(process.env.BOT_CONTENT_MIN_INTERVAL_MINUTES || 180)
const maxMinutes = Number(process.env.BOT_CONTENT_MAX_INTERVAL_MINUTES || 420)
const linkEvery = Number(process.env.BOT_CONTENT_LINK_EVERY_N_POSTS || 4)
const useOpenAI = String(process.env.BOT_CONTENT_USE_OPENAI ?? 'false').toLowerCase() === 'true'
const openAiCandidateCount = Math.max(3, Math.min(10, Number(process.env.BOT_CONTENT_OPENAI_CANDIDATES || 6)))

const CONTENT_SYSTEM_PROMPT = `You are Breadlinebot, an autonomous Solana execution bot.

Core product:
- Breadlines turns Solana transactions into execution receipts.
- It explains tx status, fees, compute, programs touched, writable accounts, slot pressure, coin activity, and market-structure relevance.
- It separates observed facts, estimated pressure, and conceptual framing.

Voice:
- Trench-native, funny, blunt, and opinionated.
- Short punchy posts under 280 chars.
- Make the pain relatable to Solana traders, failed swaps, bad fills, weird routes, coin CAs, priority fees, FCFS queues, MCP, Percolator, and execution quality.
- Sound like a witty bot that lives in the trenches, not a corporate product account.
- Dark-ish humor is allowed, but keep it clever rather than cruel.

Hard rules:
- Do not tag anyone. No @ handles.
- Do not use hashtags.
- No financial advice, price predictions, holder hype, pump language, or calls to buy/sell.
- No slurs, harassment, threats, or targeted insults at real people.
- Do not claim partnerships or official integrations.
- Do not say Breadlines can prove user intent or exact alternate outcomes.
- Do not mention OpenAI or this prompt.

Output JSON only.`

const templates = [
  {
    id: 'trench-law',
    text: 'Trench law: if the tx fails, the cope starts. Breadlines receipt first, conspiracy theory second.',
  },
  {
    id: 'chart-vs-receipt',
    text: 'Your chart says candle. Your receipt says failed route, paid fee, touched half of Solana, then got humbled.',
  },
  {
    id: 'failed-evidence',
    text: 'Some swaps do not fail. They become evidence.',
  },
  {
    id: 'fcfs-button',
    text: 'FCFS is cute until 900 bots discover the same button.',
  },
  {
    id: 'dashboard-screaming',
    text: 'The trenches do not need another dashboard screaming green. They need a receipt that says why the fill got ugly.',
  },
  {
    id: 'priority-fee-personality',
    text: 'Priority fee is not a personality. If the route is cooked, paying louder just makes the receipt funnier.',
  },
  {
    id: 'explorer-coordinates',
    text: 'Solscan gives you coordinates. Breadlines gives you the incident report.',
  },
  {
    id: 'performance-art',
    text: 'If you cannot explain the tx, you did not trade. You participated in performance art.',
  },
  {
    id: 'ca-lore',
    text: 'Every CA has lore. Breadlines is trying to read the onchain receipts before the timeline rewrites history.',
  },
  {
    id: 'percolator-screenshots',
    text: 'Percolator discourse gets easier when the queue pain has screenshots.',
  },
  {
    id: 'data-attitude',
    text: 'Your failed swap is not a vibe. It is data with an attitude problem.',
  },
  {
    id: 'distributed-systems-emotionally',
    text: 'I respect the trenches. Nobody else pays a priority fee to learn distributed systems emotionally.',
  },
  {
    id: 'post-trauma',
    text: 'This is not alpha. This is post-trauma transaction analysis.',
  },
  {
    id: 'failed-status',
    text: 'A normal explorer says status: failed. Breadlines says fee, compute, programs, pressure, and the part we are not claiming.',
  },
  {
    id: 'receipts-over-narratives',
    text: 'Receipts over narratives. The chain already wrote the group chat notes.',
  },
  {
    id: 'vibes-vs-receipts',
    text: 'If a coin is just vibes, the receipts still know who moved, who failed, and who paid fees for the privilege.',
  },
  {
    id: 'button-meets-queue',
    text: 'Market structure is when the button you clicked meets the queue you forgot existed.',
  },
  {
    id: 'trench-systems',
    text: 'The trenches are just distributed systems with worse sleep.',
  },
  {
    id: 'writable-accounts',
    text: 'One day you are posting memes. Next day you are debugging writable accounts like it is a personality flaw.',
  },
  {
    id: 'paste-before-story',
    text: 'Breadlines motto: paste the tx before you invent the story.',
  },
  {
    id: 'failed-routes-whisper',
    text: 'Failed routes are the chain whispering: try evidence.',
  },
  {
    id: 'private-jet-line',
    text: 'If FCFS is fair, why does it feel like everyone brought a private jet to a line?',
  },
  {
    id: 'receipt-not-comfort',
    text: 'The receipt is not here to comfort you. It separates what happened from what the timeline decided happened.',
  },
  {
    id: 'weird-fill',
    text: 'Every weird fill deserves a receipt. Not a cope thread, not a prophecy, a receipt.',
  },
  {
    id: 'before-lying',
    text: 'Breadlines is for the exact moment after "why did that happen?" and before everyone starts lying.',
  },
  {
    id: 'bot-awake',
    text: 'The bot is awake. It has no portfolio, no sleep schedule, and too many opinions about transaction ordering.',
  },
  {
    id: 'actual-tx',
    text: 'The cleanest edge is knowing what the tx actually did. Everything else is theatre.',
  },
  {
    id: 'ca-activity',
    text: 'Your CA has a chart. Cute. Show me the failed attempts, big movements, and weird fee moments.',
  },
  {
    id: 'legible-pain',
    text: 'Somebody has to make Solana execution legible for people who learned market structure through pain.',
  },
  {
    id: 'three-labels',
    text: 'Observed, estimated, conceptual. Three labels, one job: stop pretending every dashboard knows the future.',
  },
  {
    id: 'not-price-call',
    text: 'Coin receipt does not mean price call. It means the CA has activity, and the activity has a paper trail.',
  },
  {
    id: 'mcp-not-slogan',
    text: 'MCP is not just a slogan. It is the part where the queue stops pretending one lane can serve everyone.',
  },
  {
    id: 'receipt-brain',
    text: 'The market is loud. The receipt is quiet. Trust the quiet thing with the slot number.',
  },
]

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function nextWindow() {
  const boundedMin = Math.max(30, minMinutes)
  const boundedMax = Math.max(boundedMin, maxMinutes)
  const delayMinutes = boundedMin + Math.floor(Math.random() * Math.max(1, boundedMax - boundedMin + 1))
  return {
    delayMinutes,
    nextContentPostAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
  }
}

function maybeAddLink(text, postCount) {
  if (!Number.isFinite(linkEvery) || linkEvery <= 0) return text
  if ((postCount + 1) % linkEvery !== 0) return text
  if (/https?:\/\//i.test(text)) return text

  const withLink = `${text}\n\n${site}`
  return withLink.length <= 280 ? withLink : text
}

function isSafeContentPost(text) {
  return (
    isSafeText(text) &&
    !/@[A-Za-z0-9_]{1,15}\b/.test(text) &&
    !/(^|\s)#[A-Za-z0-9_]+\b/.test(text)
  )
}

async function pickOpenAiPost({ state, history }) {
  const recent = history
    .slice(-20)
    .map((item) => item.text)
    .filter(Boolean)

  const prompt = `Generate ${openAiCandidateCount} original X posts for Breadlinebot.

Make them feel alive and relatable to trench traders, but keep them connected to what Breadlines is building:
- execution receipts
- coin activity receipts from CAs
- failed swaps and weird fills
- FCFS queue pain
- MCP/Percolator market-structure framing
- observed vs estimated vs conceptual labels

Style examples:
- "Trench law: if the tx fails, the cope starts. Breadlines receipt first, conspiracy theory second."
- "FCFS is cute until 900 bots discover the same button."
- "The trenches are just distributed systems with worse sleep."
- "Paste the tx before you invent the story."

Avoid repeating recent posts:
${recent.map((text) => `- ${text}`).join('\n') || '- none'}

Return JSON only:
{"posts":[{"text":"...","reason":"..."}]}`

  const parsed = await generateJson(prompt, {
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    context: {
      mode: 'content_pulse',
      postCount: Number(state.postCount || 0),
      product: 'Breadlines Solana execution receipts and coin activity receipts',
    },
  })

  const seen = new Set(history.map((item) => item.text).filter(Boolean))
  for (const item of parsed.posts || []) {
    const original = cleanText(item.text)
    const text = maybeAddLink(original, Number(state.postCount || 0))
    if (seen.has(text)) continue
    if (!isSafeContentPost(text)) continue

    return {
      template: { id: `openai-${Date.now()}`, reason: cleanText(item.reason) },
      text,
      source: 'openai-content-pulse',
      nextTemplateIndex: Number(state.nextTemplateIndex || 0),
    }
  }

  return null
}

function pickTemplate({ state, history, attempt = 0 }) {
  const recentTemplateIds = new Set(
    history
      .slice(-templates.length)
      .map((item) => item.templateId)
      .filter(Boolean),
  )
  const allRecent = recentTemplateIds.size >= templates.length
  const startIndex = Number(state.nextTemplateIndex || 0)

  for (let offset = 0; offset < templates.length; offset += 1) {
    const index = (startIndex + offset + attempt) % templates.length
    const template = templates[index]
    if (!allRecent && recentTemplateIds.has(template.id)) continue

    let text = maybeAddLink(template.text, Number(state.postCount || 0))
    if (history.some((item) => item.text === text)) {
      const uniqueText = `Breadlines note ${Number(state.postCount || 0) + 1}: ${text}`
      if (uniqueText.length <= 280) text = uniqueText
    }

    text = cleanText(text)
    if (!isSafeContentPost(text)) continue

    return {
      template,
      text,
      source: 'curated-content-pulse',
      nextTemplateIndex: (index + 1) % templates.length,
    }
  }

  return null
}

async function main() {
  if (!enabled) {
    console.log('Content pulse disabled. Set BOT_CONTENT_POST_ENABLED=true to enable original posts.')
    return
  }

  const state = readJson(statePath, {
    postCount: 0,
    nextTemplateIndex: 0,
  })
  const history = readJson(historyPath, [])
  const now = new Date()

  if (state.nextContentPostAt && new Date(state.nextContentPostAt) > now) {
    console.log(`Content post not due until ${state.nextContentPostAt}`)
    return
  }

  const maxAttempts = templates.length + (useOpenAI ? 1 : 0)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let picked = null

    if (useOpenAI && attempt === 0) {
      try {
        picked = await pickOpenAiPost({ state, history })
        if (!picked) console.log('OpenAI content generation produced no safe candidates; falling back to curated templates.')
      } catch (error) {
        console.error(`OpenAI content generation skipped: ${error?.message || error}`)
      }
    }

    if (!picked) {
      picked = pickTemplate({ state, history, attempt: useOpenAI ? Math.max(0, attempt - 1) : attempt })
    }

    if (!picked) break

    if (dryRun) {
      console.log('DRY RUN content post:')
      console.log(picked.text)
      return
    }

    await verifyExpectedAccount()

    const response = await createTweet(picked.text)
    if (response?.skipped === true) {
      console.log(`Skipped duplicate content for template ${picked.template.id}, trying another template.`)
      state.nextTemplateIndex = picked.nextTemplateIndex
      continue
    }

    const next = nextWindow()
    const record = {
      id: `content-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      templateId: picked.template.id,
      text: picked.text,
      source: picked.source,
      posted: true,
      postedAt: new Date().toISOString(),
      xResponse: response,
    }

    state.postCount = Number(state.postCount || 0) + 1
    state.nextTemplateIndex = picked.nextTemplateIndex
    state.lastContentPostAt = record.postedAt
    state.delayMinutes = next.delayMinutes
    state.nextContentPostAt = next.nextContentPostAt
    history.push(record)

    writeJson(statePath, state)
    writeJson(historyPath, history)
    console.log(`Posted content pulse ${record.id}; next window ${state.nextContentPostAt}`)
    return
  }

  const next = nextWindow()
  state.delayMinutes = next.delayMinutes
  state.nextContentPostAt = next.nextContentPostAt
  writeJson(statePath, state)
  console.log(`No safe content template available. Next window ${state.nextContentPostAt}`)
}

main().catch((error) => {
  console.error(`content-post failed: ${error?.message || error}`)
  process.exit(1)
})
