'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEV_AUTH_ENABLED, DEV_COOKIE_OPTIONS, DEV_SESSION_COOKIE, homeFor, type DevRole } from '@/lib/dev-session'

export async function login(formData: FormData) {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = (formData.get('password') as string) || ''

  let targetUrl: string | null = null

  if (password) {
    try {
      const supabase = await createClient()
      const authPromise = supabase.auth.signInWithPassword({ email, password })
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 1500)
      )
      const { data: authData, error } = await Promise.race([authPromise, timeoutPromise])

      if (!error && authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        targetUrl = homeFor(profile?.role || '')
      }
    } catch {
      // Supabase is offline or connection timed out
    }
  }

  // Offline fallback for local development only; production must never
  // turn a failed sign-in into a session.
  if (!targetUrl && DEV_AUTH_ENABLED) {
    const role: DevRole = email.includes('client')
      ? 'client'
      : email.includes('manager')
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
