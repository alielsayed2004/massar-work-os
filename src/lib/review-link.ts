import { createHash, randomBytes } from 'node:crypto'

/** A review link token: 192 random bits for the URL, only its SHA-256 is stored. */
export function newReviewToken() {
  const token = randomBytes(24).toString('base64url')
  return { token, hash: hashReviewToken(token) }
}

export function hashReviewToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** Tokens are exactly 32 base64url chars; anything else is rejected before a lookup. */
export function isTokenShaped(token: string) {
  return /^[A-Za-z0-9_-]{32}$/.test(token)
}
