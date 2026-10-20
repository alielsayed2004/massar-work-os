export const instant = false
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readDevRole, homeFor } from '@/lib/dev-session'

/** The site root: signed-in people go to their own start page, everyone else to sign-in. */
export default async function Home() {
  await connection()
  const devRole = readDevRole(await cookies())
  if (devRole) redirect(homeFor(devRole))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
  redirect(profile?.status === 'active' ? homeFor(profile.role) : '/login?message=inactive')
}
