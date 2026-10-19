export const instant = false
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import CrmDashboardView from '@/components/crm/CrmDashboardView'
import { INITIAL_LEADS, INITIAL_TEAM_MEMBERS } from '@/lib/crm-data'
import { readDevRole } from '@/lib/dev-session'

export default async function CrmPage() {
  await connection()
  const cookieStore = await cookies()
  const devRole = readDevRole(cookieStore)

  let user: { id: string } | null = null
  let role: string = devRole || 'admin'

  if (devRole) {
    user = { id: '00000000-0000-0000-0000-000000000001' }
  } else {
    const supabase = await createClient()
    try {
      const userPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 1500)
      )
      const { data } = await Promise.race([userPromise, timeoutPromise])
      user = data.user
    } catch {
      user = null
    }

    if (!user) redirect('/login')

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role) role = profile.role
    } catch {
      // Fall back
    }
  }

  if (!user) redirect('/login')

  // Only internal team members, managers, and admins access CRM & Journeys (SOP §2)
  if (role === 'client') {
    redirect('/client-portal')
  }

  // CRM has no tables yet; the view runs on sample data and says so on screen.
  return (
    <CrmDashboardView initialLeads={INITIAL_LEADS} initialTeamMembers={INITIAL_TEAM_MEMBERS} />
  )
}
