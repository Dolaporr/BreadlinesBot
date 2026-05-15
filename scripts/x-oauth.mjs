import crypto from 'node:crypto'

function encode(value) {
  return encodeURIComponent(value)
    .replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function nonce() {
  return crypto.randomBytes(16).toString('hex')
}

function splitUrl(rawUrl) {
  const parsed = new URL(rawUrl)
  const baseUrl = `${parsed.origin}${parsed.pathname}`
  const queryParams = Object.fromEntries(parsed.searchParams.entries())
  return { baseUrl, queryParams }
}

function sign(method, url, oauth, bodyParams = {}) {
  const { baseUrl, queryParams } = splitUrl(url)
  const params = {
    ...oauth,
    ...queryParams,
    ...bodyParams,
  }

  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&')

  const base = [method.toUpperCase(), encode(baseUrl), encode(paramString)].join('&')
  const signingKey = `${encode(process.env.TWITTER_API_SECRET_KEY)}&${encode(process.env.TWITTER_ACCESS_TOKEN_SECRET)}`

  return crypto.createHmac('sha1', signingKey).update(base).digest('base64')
}

export function oauthHeader(method, url, bodyParams = {}) {
  const oauth = {
    oauth_consumer_key: process.env.TWITTER_API_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  oauth.oauth_signature = sign(method, url, oauth, bodyParams)

  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${encode(key)}="${encode(oauth[key])}"`)
    .join(', ')}`
}
