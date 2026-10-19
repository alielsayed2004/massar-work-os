export const instant = false
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import CrmDashboardView from '@/components/crm/CrmDashboardView'
import { INITIAL_LEADS, INITIAL_TEAM_MEMBERS, Lead, TeamMember } from '@/lib/crm-data'
import { nowMs } from '@/lib/labels'

export default async function CrmPage() {
  await connection()
  const cookieStore = await cookies()
  const devRole = cookieStore.get('massar_dev_session')?.value

  let user: { id: string } | null = null
  let role = devRole || 'admin'

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

  // Safe fetch profiles and clients to enrich data if available
  let dynamicTeam: TeamMember[] = INITIAL_TEAM_MEMBERS
  let dynamicLeads: Lead[] = INITIAL_LEADS

  if (!devRole) {
    const supabase = await createClient()
    try {
      const [{ data: dbProfiles }, { data: dbClients }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').eq('status', 'active'),
        supabase.from('clients').select('id, company_name').eq('status', 'active'),
      ])

    if (dbProfiles && dbProfiles.length > 0) {
      dynamicTeam = dbProfiles.map((p, idx) => ({
        id: p.id,
        name: p.full_name || 'Team Member',
        role: p.role === 'admin' ? 'Design Director' : p.role === 'manager' ? 'Brand Lead' : 'Specialist',
        avatar: (p.full_name || 'TM')
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        activeCases: (idx % 4) + 2,
        statusBadgeColor: idx % 2 === 0 ? '#0D3B34' : '#B85333',
      }))
    }

    if (dbClients && dbClients.length > 0) {
      const currentTime = nowMs()
      const createdIso = new Date(currentTime).toISOString()
      const dueIso = new Date(currentTime + 48 * 36e5).toISOString()

      // Merge db clients into lead list if desired
      const extraLeads: Lead[] = dbClients.slice(0, 3).map((c, i) => ({
        id: `db-client-${c.id}`,
        fullName: `Lead for ${c.company_name}`,
        companyName: c.company_name,
        phone: `+20 100 000 ${1000 + i}`,
        email: `contact@${c.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.eg`,
        status: 'assigned',
        journeyStage: 'consideration',
        priority: 'high',
        assigneeId: dynamicTeam[i % dynamicTeam.length]?.id || 'u-1',
        assigneeName: dynamicTeam[i % dynamicTeam.length]?.name || 'Ali Elsayed',
        assigneeRole: dynamicTeam[i % dynamicTeam.length]?.role || 'Creative Director',
        assigneeAvatar: dynamicTeam[i % dynamicTeam.length]?.avatar || 'AE',
        serviceInterest: 'Work OS Expansion',
        segment: 'Active Client',
        source: 'Existing Client Account',
        createdAt: createdIso,
        nextActionTitle: 'Quarterly Strategic Alignment & Creative Roadmap',
        nextActionDue: dueIso,
        firstResponseAt: createdIso,
        stageEnteredAt: createdIso,
        notes: 'Existing client expanding scope into Work OS deliverables.',
        slaHours: 8,
        isOverdue: false,
      }))
      dynamicLeads = [...extraLeads, ...INITIAL_LEADS]
    }
    } catch {
      // If Supabase query fails or offline, safely fall back to INITIAL_LEADS & INITIAL_TEAM_MEMBERS
    }
  }

  return (
    <CrmDashboardView
      initialLeads={dynamicLeads}
      initialTeamMembers={dynamicTeam}
    />
  )
}
