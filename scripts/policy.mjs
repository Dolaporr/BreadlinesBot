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
