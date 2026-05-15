import crypto from 'node:crypto'

export function encode(value) {
  return encodeURIComponent(value)
    .replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

export function nonce() {
  return crypto.randomBytes(16).toString('hex')
}

export function parseForm(text) {
  return Object.fromEntries(new URLSearchParams(text).entries())
}

export function oauthHeader({
  method,
  url,
  consumerKey,
  consumerSecret,
  token,
  tokenSecret = '',
  extra = {},
}) {
  const parsed = new URL(url)
  const baseUrl = `${parsed.origin}${parsed.pathname}`
  const queryParams = Object.fromEntries(parsed.searchParams.entries())

  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...extra,
  }

  if (token) oauth.oauth_token = token

  const params = {
    ...queryParams,
    ...oauth,
  }

  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&')

  const base = [method.toUpperCase(), encode(baseUrl), encode(paramString)].join('&')
  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret)}`
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64')

  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${encode(key)}="${encode(oauth[key])}"`)
    .join(', ')}`
}
