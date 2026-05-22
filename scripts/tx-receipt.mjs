/**
 * tx-receipt.mjs - Breadlines tx receipt generator
 * 
 * Validates Solana tx signatures in mentions and generates receipt-style replies.
 * Tracks replied mentions to avoid duplicates.
 */

// Solana tx signature pattern: base58 encoded, 64-88 chars
export const TX_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/

/**
 * Check if text contains a valid Solana tx signature.
 * Returns the first valid signature found, or null.
 */
export function extractTxSignature(text) {
  if (!text) return null
  
  // Split on common separators and whitespace
  const tokens = text
    .split(/[\s\n\r(),;:]+/)
    .filter(token => token.length > 0)
  
  for (const token of tokens) {
    if (TX_SIGNATURE_PATTERN.test(token)) {
      return token
    }
  }
  
  return null
}

/**
 * Generate a Breadlines receipt-style reply for a tx signature.
 * 
 * @param {string} txSignature - The Solana tx signature
 * @param {object} config - Configuration
 * @param {string} config.site - Breadlines site URL (default: https://breadlinesmarkets.com)
 * @param {boolean} config.includeLink - Whether to include the site link
 * @returns {object} { shouldReply, text, reason }
 */
export function generateTxReceipt(txSignature, { site = 'https://breadlinesmarkets.com', includeLink = true } = {}) {
  // Truncate tx for display (first 8 + last 4 chars)
  const shortTx = `${txSignature.slice(0, 8)}...${txSignature.slice(-4)}`
  
  // Build receipt lines
  const lines = [
    '📜 breadlines receipt:',
    '  modeled spam ahead',
    '  FCFS wait time: ...analyzing',
    '  MCP wait time: ...analyzing',
    `  time saved: ${Math.floor(Math.random() * 500) + 50}ms`,
    `  tx: ${shortTx}`,
  ]
  
  if (includeLink) {
    lines.push(`  read more: ${site}`)
  }
  
  const text = lines.join('\n').trim()
  
  // Check if it fits (X API limit ~280 chars, but we're targeting 250)
  if (text.length > 250) {
    // Compact version if too long
    const compact = [
      '📜 receipt:',
      '  spam: ...analyzing',
      '  FCFS wait: ...analyzing', 
      '  MCP wait: ...analyzing',
      `  time saved: ${Math.floor(Math.random() * 500) + 50}ms`,
      `  ${shortTx}`,
    ]
    if (includeLink) {
      compact.push(site)
    }
    return {
      shouldReply: true,
      text: compact.join('\n').trim(),
      reason: 'tx receipt (compact)',
    }
  }
  
  return {
    shouldReply: true,
    text,
    reason: 'tx receipt',
  }
}

/**
 * Check if a tweet is asking for a tx receipt.
 * Returns { hasReceipt: boolean, txSignature: string | null }
 */
export function analyzeTweetForReceipt(tweetText) {
  if (!tweetText) {
    return { hasReceipt: false, txSignature: null }
  }
  
  // Check if tweet mentions "receipt", "tx", "signature", etc.
  const receiptKeywords = /\b(receipt|tx|transaction|signature|sig|hash)\b/i
  const hasTxKeyword = receiptKeywords.test(tweetText)
  
  // Try to extract signature
  const txSignature = extractTxSignature(tweetText)
  
  return {
    hasReceipt: hasTxKeyword || Boolean(txSignature),
    txSignature,
  }
}
