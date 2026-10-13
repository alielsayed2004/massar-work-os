export const instant = false;
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GlobalHeader from '@/components/GlobalHeader'
import WelcomeOverlay from '@/components/WelcomeOverlay'
import SidebarNav from '@/components/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, status')
    .eq('id', user.id)
    .single()

  // Archived accounts keep their history but can't work in the system
  if (!profile || profile.status !== 'active') redirect('/login?message=inactive')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, internal_link, created_at')
    .eq('recipient_user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(30)

  const role = profile.role
  const isInternal = role === 'admin' || role === 'manager' || role === 'member'

  const navItems = [
    isInternal && { href: '/my-work', label: 'My Work' },
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
