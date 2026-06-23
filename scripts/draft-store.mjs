import fs from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve('data')
const repliesPath = path.resolve(process.env.BOT_REPLIES_JSON_PATH || 'data/replies.json')
const tableName = 'breadlines_reply_drafts'

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function toIso(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function normalizeDraft(draft = {}) {
  return {
    ...draft,
    approved: Boolean(draft.approved),
    posted: Boolean(draft.posted),
    requiresHumanApproval: draft.requiresHumanApproval !== false,
    createdAt: draft.createdAt || new Date().toISOString(),
  }
}

function rowToDraft(row) {
  const raw = row.raw || {}
  return normalizeDraft({
    ...raw,
    id: row.id,
    targetTweetId: row.target_tweet_id,
    targetText: row.target_text,
    authorId: row.author_id,
    txSignature: row.tx_signature,
    text: row.text,
    reason: row.reason,
    score: row.score,
    receiptSummary: row.receipt_summary,
    source: row.source,
    approved: row.approved,
    posted: row.posted,
    requiresHumanApproval: row.requires_human_approval,
    createdAt: toIso(row.created_at),
    approvedAt: toIso(row.approved_at),
    postedAt: toIso(row.posted_at),
    xResponse: row.x_response,
  })
}

function draftParams(draftInput) {
  const draft = normalizeDraft(draftInput)
  return [
    draft.id,
    draft.targetTweetId || null,
    draft.targetText || null,
    draft.authorId || null,
    draft.txSignature || null,
    draft.text || '',
    draft.reason || null,
    Number.isFinite(Number(draft.score)) ? Number(draft.score) : null,
    draft.receiptSummary ? JSON.stringify(draft.receiptSummary) : null,
    draft.source || null,
    Boolean(draft.approved),
    Boolean(draft.posted),
    draft.requiresHumanApproval !== false,
    draft.createdAt || new Date().toISOString(),
    draft.approvedAt || null,
    draft.postedAt || null,
    draft.xResponse ? JSON.stringify(draft.xResponse) : null,
    JSON.stringify(draft),
  ]
}

function postgresSslConfig() {
  const ssl = String(process.env.BOT_DATABASE_SSL || process.env.DATABASE_SSL || '').toLowerCase()
  if (ssl === 'true' || ssl === 'require') return { rejectUnauthorized: false }
  if (ssl === 'false' || ssl === 'disable') return false
  if (process.env.DATABASE_URL?.includes('sslmode=require')) return { rejectUnauthorized: false }
  return false
}

class JsonDraftStore {
  label = `json:${path.relative(process.cwd(), repliesPath)}`

  async init() {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  readAll() {
    const replies = readJson(repliesPath, [])
    if (!Array.isArray(replies)) throw new Error('replies.json must be an array')
    return replies.map(normalizeDraft)
  }

  async listDrafts({ unpostedOnly = false } = {}) {
    const drafts = this.readAll()
    return unpostedOnly ? drafts.filter((draft) => !draft.posted) : drafts
  }

  async hasUnpostedForTweet(tweetId) {
    if (!tweetId) return false
    return this.readAll().some((draft) => draft.targetTweetId === tweetId && !draft.posted)
  }

  async addDrafts(drafts) {
    const all = this.readAll()
    const inserted = []
    for (const draft of drafts.map(normalizeDraft)) {
      const duplicate = all.some(
        (item) =>
          item.id === draft.id ||
          (draft.targetTweetId && item.targetTweetId === draft.targetTweetId && !item.posted),
      )
      if (duplicate) continue
      all.push(draft)
      inserted.push(draft)
    }
    writeJson(repliesPath, all)
    return inserted
  }

  async saveAllDrafts(drafts) {
    writeJson(repliesPath, drafts.map(normalizeDraft))
  }

  async findNextApproved() {
    return this.readAll().find((draft) => draft.approved && !draft.posted)
  }

  async setApproved(id, approved = true) {
    const all = this.readAll()
    const draft = all.find((item) => item.id === id)
    if (!draft) return null
    draft.approved = Boolean(approved)
    draft.approvedAt = approved ? new Date().toISOString() : undefined
    writeJson(repliesPath, all)
    return normalizeDraft(draft)
  }

  async markPosted(id, response) {
    const all = this.readAll()
    const draft = all.find((item) => item.id === id)
    if (!draft) return null
    draft.posted = true
    draft.postedAt = new Date().toISOString()
    draft.xResponse = response
    writeJson(repliesPath, all)
    return normalizeDraft(draft)
  }

  async close() {}
}

class PostgresDraftStore {
  constructor(databaseUrl) {
    this.databaseUrl = databaseUrl
    this.pool = null
    this.label = 'postgres:DATABASE_URL'
  }

  async init() {
    const { Pool } = await import('pg')
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      ssl: postgresSslConfig(),
    })

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        target_tweet_id TEXT,
        target_text TEXT,
        author_id TEXT,
        tx_signature TEXT,
        text TEXT NOT NULL,
        reason TEXT,
        score INTEGER,
        receipt_summary JSONB,
        source TEXT,
        approved BOOLEAN NOT NULL DEFAULT false,
        posted BOOLEAN NOT NULL DEFAULT false,
        requires_human_approval BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        approved_at TIMESTAMPTZ,
        posted_at TIMESTAMPTZ,
        x_response JSONB,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `)

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS breadlines_reply_drafts_pending_idx
      ON ${tableName} (posted, approved, created_at)
    `)

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS breadlines_reply_drafts_target_idx
      ON ${tableName} (target_tweet_id)
    `)
  }

  async listDrafts({ unpostedOnly = false } = {}) {
    const where = unpostedOnly ? 'WHERE posted = false' : ''
    const result = await this.pool.query(`
      SELECT *
      FROM ${tableName}
      ${where}
      ORDER BY created_at DESC
    `)
    return result.rows.map(rowToDraft)
  }

  async hasUnpostedForTweet(tweetId) {
    if (!tweetId) return false
    const result = await this.pool.query(
      `SELECT 1 FROM ${tableName} WHERE target_tweet_id = $1 AND posted = false LIMIT 1`,
      [tweetId],
    )
    return result.rowCount > 0
  }

  async addDrafts(drafts) {
    const inserted = []
    for (const draft of drafts.map(normalizeDraft)) {
      if (draft.targetTweetId && (await this.hasUnpostedForTweet(draft.targetTweetId))) continue
      const result = await this.pool.query(
        `
        INSERT INTO ${tableName} (
          id, target_tweet_id, target_text, author_id, tx_signature, text, reason, score,
          receipt_summary, source, approved, posted, requires_human_approval, created_at,
          approved_at, posted_at, x_response, raw
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10, $11, $12, $13, $14::timestamptz,
          $15::timestamptz, $16::timestamptz, $17::jsonb, $18::jsonb
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING *
        `,
        draftParams(draft),
      )
      if (result.rows[0]) inserted.push(rowToDraft(result.rows[0]))
    }
    return inserted
  }

  async saveAllDrafts(drafts) {
    for (const draft of drafts.map(normalizeDraft)) {
      await this.pool.query(
        `
        INSERT INTO ${tableName} (
          id, target_tweet_id, target_text, author_id, tx_signature, text, reason, score,
          receipt_summary, source, approved, posted, requires_human_approval, created_at,
          approved_at, posted_at, x_response, raw
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10, $11, $12, $13, $14::timestamptz,
          $15::timestamptz, $16::timestamptz, $17::jsonb, $18::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          target_tweet_id = EXCLUDED.target_tweet_id,
          target_text = EXCLUDED.target_text,
          author_id = EXCLUDED.author_id,
          tx_signature = EXCLUDED.tx_signature,
          text = EXCLUDED.text,
          reason = EXCLUDED.reason,
          score = EXCLUDED.score,
          receipt_summary = EXCLUDED.receipt_summary,
          source = EXCLUDED.source,
          approved = EXCLUDED.approved,
          posted = EXCLUDED.posted,
          requires_human_approval = EXCLUDED.requires_human_approval,
          approved_at = EXCLUDED.approved_at,
          posted_at = EXCLUDED.posted_at,
          x_response = EXCLUDED.x_response,
          raw = EXCLUDED.raw
        `,
        draftParams(draft),
      )
    }
  }

  async findNextApproved() {
    const result = await this.pool.query(`
      SELECT *
      FROM ${tableName}
      WHERE approved = true AND posted = false
      ORDER BY created_at ASC
      LIMIT 1
    `)
    return result.rows[0] ? rowToDraft(result.rows[0]) : null
  }

  async setApproved(id, approved = true) {
    const result = await this.pool.query(
      `
      UPDATE ${tableName}
      SET approved = $2, approved_at = CASE WHEN $2 THEN now() ELSE NULL END
      WHERE id = $1
      RETURNING *
      `,
      [id, Boolean(approved)],
    )
    return result.rows[0] ? rowToDraft(result.rows[0]) : null
  }

  async markPosted(id, response) {
    const result = await this.pool.query(
      `
      UPDATE ${tableName}
      SET posted = true, posted_at = now(), x_response = $2::jsonb
      WHERE id = $1
      RETURNING *
      `,
      [id, JSON.stringify(response || {})],
    )
    return result.rows[0] ? rowToDraft(result.rows[0]) : null
  }

  async close() {
    await this.pool?.end()
  }
}

export function createDraftStore() {
  const storeMode = String(process.env.BOT_DRAFT_STORE || 'auto').toLowerCase()
  if (storeMode === 'postgres' && !process.env.DATABASE_URL) {
    throw new Error('BOT_DRAFT_STORE=postgres requires DATABASE_URL')
  }
  if (storeMode !== 'json' && process.env.DATABASE_URL) {
    return new PostgresDraftStore(process.env.DATABASE_URL)
  }
  return new JsonDraftStore()
}
