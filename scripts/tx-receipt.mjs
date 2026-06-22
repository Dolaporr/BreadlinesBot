/**
 * Breadlines transaction receipt helpers.
 *
 * This module is intentionally evidence-first:
 * - observed values come from the Breadlines receipt API
 * - pressure is labeled estimated
 * - market-structure signals are labeled conceptual
 */

export const TX_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/
const TX_SIGNATURE_CANDIDATE_PATTERN = /[1-9A-HJ-NP-Za-km-z]{64,88}/g

export function extractTxSignature(text) {
  const matches = String(text || '').match(TX_SIGNATURE_CANDIDATE_PATTERN) || []
  return matches.find((candidate) => TX_SIGNATURE_PATTERN.test(candidate)) || null
}

export function analyzeTweetForReceipt(tweetText) {
  const txSignature = extractTxSignature(tweetText)
  const receiptKeywords = /\b(receipt|explain|tx|transaction|signature|sig|hash|solscan|failed|fee|compute)\b/i

  return {
    hasReceipt: Boolean(txSignature) || receiptKeywords.test(String(tweetText || '')),
    txSignature,
  }
}

export function buildReceiptApiUrl({ site, apiUrl } = {}) {
  if (apiUrl) return apiUrl
  const base = String(site || 'https://breadlinesmarkets.com').replace(/\/+$/, '')
  return `${base}/api/receipt`
}

export function buildReceiptUrl(signature, { site, urlTemplate } = {}) {
  if (urlTemplate) return urlTemplate.replaceAll('{signature}', encodeURIComponent(signature))
  return String(site || 'https://breadlinesmarkets.com').replace(/\/+$/, '')
}

export async function fetchBreadlinesReceipt(txSignature, {
  apiUrl,
  site,
  timeoutMs = 15000,
} = {}) {
  if (!TX_SIGNATURE_PATTERN.test(txSignature)) {
    throw new Error('Invalid Solana transaction signature.')
  }

  const url = buildReceiptApiUrl({ apiUrl, site })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signature: txSignature }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(body?.error || `Breadlines receipt API failed with ${res.status}.`)
  }

  return body
}

function formatSol(value) {
  if (value == null || Number.isNaN(Number(value))) return 'unavailable'
  return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 9 })} SOL`
}

function formatNumber(value, fallback = 'unavailable') {
  if (value == null || Number.isNaN(Number(value))) return fallback
  return Number(value).toLocaleString('en-US')
}

function level(value) {
  return String(value || 'unknown').toLowerCase()
}

function compactLines(lines, maxLength = 275) {
  let text = lines.filter(Boolean).join('\n').trim()
  if (text.length <= maxLength) return text

  const withoutBlankLines = lines.filter(Boolean).filter((line) => line.trim()).join('\n').trim()
  if (withoutBlankLines.length <= maxLength) return withoutBlankLines

  return withoutBlankLines.slice(0, maxLength - 1).trimEnd()
}

export function buildReceiptReplyFromData(receipt, {
  includeLink = true,
  site = 'https://breadlinesmarkets.com',
  urlTemplate,
} = {}) {
  const signature = receipt?.signature
  const url = includeLink && signature ? buildReceiptUrl(signature, { site, urlTemplate }) : null
  const compute = receipt?.computeUnitsConsumed == null
    ? 'unavailable'
    : `${formatNumber(receipt.computeUnitsConsumed)} CUs`

  const status = String(receipt?.status || 'unknown')
  const pressure = level(receipt?.slotPressure?.label)
  const queue = level(receipt?.percolatorLens?.queueSensitive?.level)
  const price = level(receipt?.percolatorLens?.priceSensitive?.level)

  const lines = [
    'Breadlines receipt built.',
    '',
    `Observed: ${status}`,
    `Fee: ${formatSol(receipt?.feePaidSol)}`,
    `Compute: ${compute}`,
    `Estimated pressure: ${pressure}`,
    `Conceptual signals: queue ${queue}, price ${price}`,
    url ? `Open: ${url}` : null,
  ]

  return {
    shouldReply: true,
    text: compactLines(lines),
    reason: 'real Breadlines receipt draft',
    summary: {
      signature,
      status,
      feePaidSol: receipt?.feePaidSol ?? null,
      computeUnitsConsumed: receipt?.computeUnitsConsumed ?? null,
      estimatedPressure: pressure,
      queueSensitive: queue,
      priceSensitive: price,
      riskOracleSensitive: level(receipt?.percolatorLens?.riskOracleSensitive?.level),
    },
  }
}

export async function generateTxReceipt(txSignature, options = {}) {
  const receipt = await fetchBreadlinesReceipt(txSignature, options)
  return buildReceiptReplyFromData(receipt, options)
}
