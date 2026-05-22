export const bannedPatterns = [
  /\btoken holders?\b/i,
  /\brejoice\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bmoon\b/i,
  /\bpump\b/i,
  /\b100x\b/i,
  /\bguaranteed\b/i,
  /\bprofit\b/i,
  /\binvest(?:ment)?\b/i,
  /\bfinancial advice\b/i,
  /\bchef(?:s)?\b/i,
  /\bbaker(?:s)?\b/i,
  /\bloaf\b/i,
  /\bloaves\b/i,
  /\bbaguette(?:s)?\b/i,
  /\bslice\b/i,
  /\bingredient\b/i,
  /\bcashier\b/i,
  /\bwaiter\b/i,
  /\bsupermarket\b/i,
  /\brestaurant\b/i,
  /\bfaster shoes\b/i,
  // personality cleanup: avoid desperate, repetitive, price-talk
  /\bget rich\b/i,
  /\bamazing returns?\b/i,
  /\bdont miss out\b/i,
  /\bDO NOT MISS\b/i,
  /\bFOMO\b/i,
  /\blambos?\b/i,
  /\bfree money\b/i,
  /\byields?\b/i,
  /\bstaking\b/i,
  /\bfloor price\b/i,
  /\bmarket cap\b/i,
  /\btoken value\b/i,
  /\bgm gm\b/i,
  /\bgn gn\b/i,
  /\bamazing\b.*\bamazing\b/i,
  /\bincredible\b.*\bincredible\b/i,
  // new: no partnership claims, airdrop promises
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
]

export const optOutPatterns = [
  /\bstop replying\b/i,
  /\bdon'?t reply\b/i,
  /\bleave me alone\b/i,
  /\bgo away\b/i,
  /\bblock(?:ed)?\b/i,
]

export const topicPatterns = [
  /\bmcp\b/i,
  /\bfcfs\b/i,
  /\bfbo\b/i,
  /\bbreadlines?\b/i,
  /\bmultiple concurrent proposers?\b/i,
  /\bproposer(?:s)?\b/i,
  /\bsolana\b/i,
  /\boracle freshness\b/i,
  /\bleader monopoly\b/i,
  /\btransaction ordering\b/i,
]

export function cleanText(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()
}

export function isSafeText(text) {
  const cleaned = cleanText(text)
  return (
    cleaned.length >= 20 &&
    cleaned.length <= 280 &&
    !bannedPatterns.some((pattern) => pattern.test(cleaned))
  )
}

export function isRelevantTweet(text) {
  const cleaned = cleanText(text)
  return (
    cleaned.length >= 15 &&
    !optOutPatterns.some((pattern) => pattern.test(cleaned)) &&
    topicPatterns.some((pattern) => pattern.test(cleaned))
  )
}

export function hasLink(text) {
  return /https?:\/\//i.test(text)
}
