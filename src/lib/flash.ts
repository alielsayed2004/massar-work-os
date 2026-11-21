import { redirect } from 'next/navigation'
import { toCode } from '@/lib/labels'

/** Send the user back to `path` with a message code the page can show.
 *  (Thrown errors are hidden in production, so forms report through the URL.) */
export function backWithError(path: string, err: unknown): never {
  const to = safePath(path)
  redirect(`${to}${to.includes('?') ? '&' : '?'}error=${toCode(err)}`)
}

export function backWithOk(path: string, code = 'SAVED', extra = ''): never {
  const to = safePath(path)
  redirect(`${to}${to.includes('?') ? '&' : '?'}ok=${code}${extra}`)
}

/** `back` comes from a form field: accept only a path inside this app. */
function safePath(path: string): string {
  return /^\/(?![\/\\])/.test(path) ? path : '/'
}
