export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import AppShell from '@/components/AppShell'
import WelcomeOverlay from '@/components/WelcomeOverlay'
import type { NavGroup } from '@/components/SidebarNav'
import { readDevRole, homeFor } from '@/lib/dev-session'
import { ROLE } from '@/lib/labels'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const cookieStore = await cookies()
  const devRole = readDevRole(cookieStore)

  let user: { id: string; email?: string; user_metadata?: { full_name?: string } } | null = null
  let profile: { role: string; full_name: string | null; status: string } | null = null
  let notifications: { id: string; message: string; internal_link: string | null; created_at: string }[] | null = []

  if (devRole) {
    user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: `${devRole}@massar.test`,
      user_metadata: { full_name: 'Ali Elsayed' },
    }
    profile = {
      role: devRole,
      full_name: 'Ali Elsayed',
      status: 'active',
    }
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
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name, status')
        .eq('id', user.id)
        .single()
      profile = data
    } catch {
      profile = null
    }

    if (!profile || profile.status !== 'active') redirect('/login?message=inactive')

    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, message, internal_link, created_at')
        .eq('recipient_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(30)
      notifications = data
    } catch {
      notifications = []
    }
  }

  const role = profile.role
  const isInternal = role === 'admin' || role === 'manager' || role === 'member'
  const isLead = role === 'admin' || role === 'manager'
  // Clients have no account any more: they review from the WhatsApp link
  if (!isInternal) redirect('/login?message=inactive')
  const fullName = profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Massar'

  // Team members see their own work only; partners and leads see the business.
  // Leads get each client space in the sidebar, with what's waiting for their check
  let spaceItems: NavGroup['items'] = []
  let waitingTotal = 0
  if (isLead && !devRole) {
    const supabase = await createClient()
    const [{ data: clientRows }, { data: checkRows }] = await Promise.all([
      supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
      supabase.from('deliverables').select('projects ( client_id )').eq('summary_status', 'internal_review'),
    ])
    const waiting = new Map<string, number>()
    for (const row of (checkRows || []) as unknown as { projects: { client_id: string } | null }[]) {
      const id = row.projects?.client_id
      if (id) waiting.set(id, (waiting.get(id) || 0) + 1)
    }
    waitingTotal = (checkRows || []).length
    spaceItems = (clientRows || []).map(c => ({
      href: `/spaces/${c.id}`,
      label: c.company_name,
      dot: true,
      count: waiting.get(c.id),
    }))
  }

  // Team members see their own work only; partners and leads run the business.
  const groups: NavGroup[] = !isLead
    ? [{ heading: 'Workspace', items: [{ href: '/my-work', label: 'My Work', icon: 'work' as const }] }]
    : [
        {
          heading: 'Workspace',
          items: [
            { href: '/today', label: 'Today', icon: 'bell' as const, count: waitingTotal },
            { href: '/spaces', label: 'Client spaces', icon: 'spaces' as const, exact: true },
            { href: '/team', label: 'Team', icon: 'team' as const },
            { href: '/my-work', label: 'My Work', icon: 'work' as const },
          ],
        },
        ...(spaceItems.length ? [{ heading: 'Clients', items: spaceItems }] : []),
        ...(role === 'admin'
          ? [{ heading: 'System', items: [{ href: '/admin', label: 'Settings', icon: 'settings' as const }] }]
          : []),
      ]

  return (
    <>
      <WelcomeOverlay fullName={fullName} role={role} />
      <AppShell
        groups={groups}
        homeHref={homeFor(role)}
        fullName={fullName}
        roleLabel={ROLE[role] || role}
        notifications={notifications || []}
        canSearch={isInternal}
      >
        {children}
      </AppShell>
    </>
  )
}
