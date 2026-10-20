'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/site'
import { DEV_AUTH_ENABLED, DEV_COOKIE_OPTIONS, DEV_SESSION_COOKIE, homeFor, type DevRole } from '@/lib/dev-session'

export async function login(formData: FormData) {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = (formData.get('password') as string) || ''

  let targetUrl: string | null = null

  if (password) {
    try {
      const supabase = await createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

      if (!error && authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        targetUrl = homeFor(profile?.role || '')
      }
    } catch {
      // Supabase unreachable: treated as a failed sign-in below
    }
  }

  // Offline fallback for local development only; production must never
  // turn a failed sign-in into a session.
  if (!targetUrl && DEV_AUTH_ENABLED) {
    const role: DevRole = email.includes('manager')
      ? 'manager'
      : email.includes('member')
      ? 'member'
      : 'admin'

    const cookieStore = await cookies()
    cookieStore.set(DEV_SESSION_COOKIE, role, DEV_COOKIE_OPTIONS)
    targetUrl = homeFor(role)
  }

  if (!targetUrl) redirect('/login?message=auth-error')

  revalidatePath('/', 'layout')
  redirect(targetUrl)
}

export async function loginDirectly(role: DevRole = 'admin') {
  if (!DEV_AUTH_ENABLED) redirect('/login?message=auth-error')

  const cookieStore = await cookies()
  cookieStore.set(DEV_SESSION_COOKIE, role, DEV_COOKIE_OPTIONS)
  revalidatePath('/', 'layout')
  redirect(homeFor(role))
}

/**
 * "Forgot password?": emails a one-time link to the set-password page. The
 * answer is the same whether or not the email has an account, so the form
 * can't be used to find out who works at Massar.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (email.includes('@')) {
    try {
      // Service client: its link carries the session itself, so it opens on any device
      await createAdminClient().auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/set-password` })
    } catch {
      // Same answer either way (see above)
    }
  }
  redirect('/login?message=reset-sent')
}
