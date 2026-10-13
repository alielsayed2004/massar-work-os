import { redirect } from 'next/navigation'
import { toCode } from '@/lib/labels'

/** Send the user back to `path` with a message code the page can show.
 *  (Thrown errors are hidden in production, so forms report through the URL.) */
export function backWithError(path: string, err: unknown): never {
  redirect(`${path}?error=${toCode(err)}`)
}

export function backWithOk(path: string, code = 'SAVED'): never {
  redirect(`${path}?ok=${code}`)
}
