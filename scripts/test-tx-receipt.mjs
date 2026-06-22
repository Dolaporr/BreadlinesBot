#!/usr/bin/env node

import {
  TX_SIGNATURE_PATTERN,
  analyzeTweetForReceipt,
  buildReceiptApiUrl,
  buildReceiptReplyFromData,
  extractTxSignature,
} from './tx-receipt.mjs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const sampleSignature =
  '4NBrMsedNEtTzYBTfQf73Z8m9951WYP68shBLi7PTFSZsQ795i2QLGEEMgP3iX2qq4Ku2H1jQjWTZNizNKrQAa56'

console.log('Testing Breadlines receipt helpers')

assert(TX_SIGNATURE_PATTERN.test(sampleSignature), 'sample signature should be valid')
assert(!TX_SIGNATURE_PATTERN.test('0'.repeat(64)), 'base58-invalid signature should fail')
assert(!TX_SIGNATURE_PATTERN.test('abc123'), 'short signature should fail')

const extracted = extractTxSignature(`@Breadlinebot explain this tx ${sampleSignature}`)
assert(extracted === sampleSignature, 'extractTxSignature should find the sample signature')

const noSignature = extractTxSignature('@Breadlinebot what happened here?')
assert(noSignature === null, 'extractTxSignature should return null when absent')

const analysis = analyzeTweetForReceipt(`receipt please ${sampleSignature}`)
assert(analysis.hasReceipt === true, 'analysis should detect receipt intent')
assert(analysis.txSignature === sampleSignature, 'analysis should include signature')

assert(
  buildReceiptApiUrl({ site: 'https://breadlinesmarkets.com/' }) === 'https://breadlinesmarkets.com/api/receipt',
  'buildReceiptApiUrl should normalize trailing slash',
)

const reply = buildReceiptReplyFromData({
  signature: sampleSignature,
  status: 'failed',
  feePaidSol: 0.000024211,
  computeUnitsConsumed: 128702,
  slotPressure: { label: 'high' },
  percolatorLens: {
    queueSensitive: { level: 'high' },
    priceSensitive: { level: 'high' },
    riskOracleSensitive: { level: 'medium' },
  },
}, {
  site: 'https://breadlinesmarkets.com',
  includeLink: true,
})

assert(reply.shouldReply === true, 'reply should be enabled')
assert(reply.text.includes('Observed: failed'), 'reply should include observed status')
assert(reply.text.includes('Estimated pressure: high'), 'reply should label estimated pressure')
assert(reply.text.includes('Conceptual signals'), 'reply should label conceptual signals')
assert(reply.text.length <= 280, 'reply should fit X character limit')
assert(reply.summary.status === 'failed', 'summary should include status')

console.log('Receipt helper tests passed')
