#!/usr/bin/env node

/**
 * test-tx-receipt.mjs - Validate TX receipt module
 * 
 * Usage: node scripts/test-tx-receipt.mjs
 */

import { 
  TX_SIGNATURE_PATTERN, 
  extractTxSignature, 
  generateTxReceipt,
  analyzeTweetForReceipt 
} from './tx-receipt.mjs'

console.log('🧪 Testing TX Receipt Module\n')

// Test 1: TX Signature Pattern
console.log('Test 1: TX Signature Pattern')
// Real Solana TX format: base58, 64-88 chars
// Valid base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
const testCases = [
  {
    sig: '11111111111111111111111111111111111111111111111111111111111111111',
    valid: true,
    label: 'Valid 65-char sig',
  },
  {
    sig: '1111111111111111111111111111111111111111111111111111111111111111',
    valid: true,
    label: 'Valid 64-char sig',
  },
  {
    sig: 'ABCDEFGHJKLMNPQRSTUVWXYZ1234567abcdefghijkmnopqrstuvwxyz1234567ABCDEFGHJKLMNPQRST',
    valid: true,
    label: 'Valid 88-char sig',
  },
  {
    sig: 'G000000000000000000000000000000000000000000000000000000000000000',
    valid: false,
    label: 'Invalid: contains G (not base58)',
  },
  {
    sig: '0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    valid: false,
    label: 'Invalid: starts with 0',
  },
  {
    sig: '123456789',
    valid: false,
    label: 'Invalid: too short',
  },
]

testCases.forEach(({ sig, valid, label }) => {
  const result = TX_SIGNATURE_PATTERN.test(sig)
  const status = result === valid ? '✅' : '❌'
  console.log(`  ${status} ${label}: ${sig.slice(0, 20)}...`)
})

// Test 2: Extract Signature
console.log('\nTest 2: Extract Signature from Text')
const extractTests = [
  {
    text: 'Check this tx: 1111111111111111111111111111111111111111111111111111111111111111',
    expected: '1111111111111111111111111111111111111111111111111111111111111111',
    label: 'Sig in sentence',
  },
  {
    text: 'Multiple? 1111111111111111111111111111111111111111111111111111111111111111 and AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    expected: '1111111111111111111111111111111111111111111111111111111111111111',
    label: 'First of multiple sigs',
  },
  {
    text: 'No sig here, just text',
    expected: null,
    label: 'No sig',
  },
]

extractTests.forEach(({ text, expected, label }) => {
  const result = extractTxSignature(text)
  const status = result === expected ? '✅' : '❌'
  console.log(`  ${status} ${label}`)
  if (result !== expected) {
    console.log(`     Expected: ${expected}, Got: ${result}`)
  }
})

// Test 3: Generate Receipt
console.log('\nTest 3: Generate Receipt')
const receipt = generateTxReceipt('1111111111111111111111111111111111111111111111111111111111111111', {
  site: 'https://breadlinesmarkets.com',
  includeLink: true,
})

console.log(`  ✅ Receipt generated:`)
console.log(`     Should reply: ${receipt.shouldReply}`)
console.log(`     Reason: ${receipt.reason}`)
console.log(`     Length: ${receipt.text.length} chars`)
console.log(`     Preview:\n${receipt.text.split('\n').map((l) => '       ' + l).join('\n')}`)

// Test 4: Analyze Tweet
console.log('\nTest 4: Analyze Tweet for Receipt')
const analyzeTests = [
  {
    text: '@BreadLinesBot can you parse this tx? 1111111111111111111111111111111111111111111111111111111111111111',
    shouldHave: true,
    label: 'Tweet with tx',
  },
  {
    text: '@BreadLinesBot can you show me the receipt for my signature?',
    shouldHave: true,
    label: 'Receipt keyword (no sig)',
  },
  {
    text: '@BreadLinesBot what do you think about MCP?',
    shouldHave: false,
    label: 'No tx or receipt keyword',
  },
]

analyzeTests.forEach(({ text, shouldHave, label }) => {
  const { hasReceipt, txSignature } = analyzeTweetForReceipt(text)
  const status = hasReceipt === shouldHave ? '✅' : '❌'
  console.log(`  ${status} ${label}`)
  if (txSignature) {
    console.log(`     TX: ${txSignature.slice(0, 20)}...`)
  }
})

console.log('\n✅ All tests complete!')
