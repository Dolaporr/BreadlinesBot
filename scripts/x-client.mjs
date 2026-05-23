import { requireEnv } from './env.mjs'
import { oauthHeader } from './x-oauth.mjs'

export async function xRequest(url, { method = 'GET', body } = {}) {
  requireEnv([
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET_KEY',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET',
  ])

  const headers = {
    Authorization: oauthHeader(method, url),
  }

  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const isDuplicate403 =
      res.status === 403 &&
      JSON.stringify(json).toLowerCase().includes('duplicate')

    if (isDuplicate403) {
      // Handle duplicate content locally so it never crashes the cycle.
      return {
        skipped: true,
        reason: 'DUPLICATE_CONTENT',
        status: res.status,
        details: json,
      }
    }

    throw new Error(`X API error ${res.status}: ${JSON.stringify(json)}`)
  }

  return json
}

export async function verifyExpectedAccount() {
  const expectedUsername = process.env.TWITTER_EXPECTED_USERNAME?.replace(/^@/, '').toLowerCase()
  if (!expectedUsername) return null

  const me = await xRequest('https://api.x.com/2/users/me?user.fields=username,name')
  const actualUsername = me?.data?.username?.toLowerCase()

  if (actualUsername !== expectedUsername) {
    throw new Error(`Refusing to use X tokens for @${actualUsername}; expected @${expectedUsername}.`)
  }

  return me.data
}

export async function getTweetById(id, { expansions } = {}) {
  const tweetId = String(id)
  if (!tweetId) throw new Error('getTweetById requires a tweet id')

  const url = new URL(`https://api.x.com/2/tweets/${tweetId}`)
  url.searchParams.set('tweet.fields', 'author_id,created_at,conversation_id')
  url.searchParams.set('expansions', expansions || 'author_id')
  return xRequest(url.toString())
}

export async function createTweet(text, { inReplyToTweetId, quoteTweetId } = {}) {
  const body = {
    text,
    ...(inReplyToTweetId ? { reply: { in_reply_to_tweet_id: inReplyToTweetId } } : {}),
    ...(quoteTweetId ? { quote_tweet_id: String(quoteTweetId) } : {}),
  }

  return xRequest('https://api.x.com/2/tweets', {
    method: 'POST',
    body,
  })
}

export async function getMentions({ userId, sinceId } = {}) {
  const url = new URL(`https://api.x.com/2/users/${userId}/mentions`)
  url.searchParams.set('max_results', '10')
  url.searchParams.set('tweet.fields', 'author_id,created_at,conversation_id')
  if (sinceId) url.searchParams.set('since_id', sinceId)
  return xRequest(url.toString())
}

export async function searchRecent(query, { sinceId } = {}) {
  const url = new URL('https://api.x.com/2/tweets/search/recent')
  url.searchParams.set('query', query)
  url.searchParams.set('max_results', '10')
  url.searchParams.set('tweet.fields', 'author_id,created_at,conversation_id')
  if (sinceId) url.searchParams.set('since_id', sinceId)
  return xRequest(url.toString())
}
