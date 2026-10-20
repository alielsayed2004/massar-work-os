import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// The layout and the page both need "who is this?". cache() makes that one
// round trip to Supabase Auth and one profile read per request, not one each.

export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getMyProfile = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('role, full_name, status').eq('id', user.id).single()
  return data as { role: string; full_name: string | null; status: string } | null
})
