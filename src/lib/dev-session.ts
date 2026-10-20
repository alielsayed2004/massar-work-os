/** Password-less role switching exists only for local development.
 *  In production the cookie is ignored everywhere, so it can't bypass auth. */
export const DEV_AUTH_ENABLED = process.env.NODE_ENV !== 'production'

export const DEV_SESSION_COOKIE = 'massar_dev_session'

const DEV_ROLES = ['admin', 'manager', 'member'] as const
export type DevRole = (typeof DEV_ROLES)[number]

type CookieReader = { get(name: string): { value: string } | undefined }

export function readDevRole(store: CookieReader): DevRole | null {
  if (!DEV_AUTH_ENABLED) return null
  const value = store.get(DEV_SESSION_COOKIE)?.value
  return DEV_ROLES.includes(value as DevRole) ? (value as DevRole) : null
}

export function toDevRole(value: string | null | undefined): DevRole {
  return DEV_ROLES.includes(value as DevRole) ? (value as DevRole) : 'admin'
}

export const DEV_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
  sameSite: 'lax' as const,
}

export function homeFor(role: string): string {
  return role === 'admin' || role === 'manager' ? '/today' : '/my-work'
}
