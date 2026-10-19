export const instant = false;
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import GlobalHeader from '@/components/GlobalHeader'
import WelcomeOverlay from '@/components/WelcomeOverlay'
import SidebarNav from '@/components/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const devRole = cookieStore.get('massar_dev_session')?.value

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
      role: devRole || 'admin',
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

  const navItems = [
    isInternal && { href: '/my-work', label: 'My Work' },
    isInternal && { href: '/crm', label: 'CRM & Journeys' },
    (role === 'admin' || role === 'manager') && { href: '/my-team', label: 'My Team' },
    isInternal && { href: '/deliverables', label: 'Deliverables' },
    (role === 'admin' || role === 'manager') && { href: '/projects', label: 'Clients & Projects' },
    role === 'admin' && { href: '/admin', label: 'Settings' },
    role === 'client' && { href: '/client-portal', label: 'Client Portal' },
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <div className="massar-shell">
      <WelcomeOverlay
        fullName={profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ali'}
        role={role}
      />
      <aside className="massar-sidebar">
        <div className="massar-sidebar-brand">
          <Link href="/my-work" style={{ display: 'inline-flex', padding: 0, textDecoration: 'none' }} aria-label="Massar Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/massar_logo.svg"
              alt="Massar"
              className="massar-sidebar-logo"
            />
          </Link>
        </div>
        <SidebarNav items={navItems} />
      </aside>

      <main className="massar-main">
        <GlobalHeader
          unreadNotifications={notifications || []}
          fullName={profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ali'}
          canSearch={isInternal}
        />
        {children}
      </main>
    </div>
  )
}
