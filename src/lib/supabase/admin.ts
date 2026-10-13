import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS — use ONLY in server actions / route
 * handlers, AFTER checking the caller's permission yourself.
 * Never import this from a 'use client' file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('MISSING_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
