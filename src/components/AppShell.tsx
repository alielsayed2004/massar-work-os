'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SidebarNav, { isActivePath, type NavGroup } from '@/components/SidebarNav'
import GlobalHeader from '@/components/GlobalHeader'
import { Icon } from '@/components/icons'

type Notification = { id: string; message: string; internal_link: string | null; created_at: string }

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('')
}

export default function AppShell({
  groups,
  homeHref,
  fullName,
  roleLabel,
  notifications,
  canSearch,
  children,
}: {
  groups: NavGroup[]
  homeHref: string
  fullName: string
  roleLabel: string
  notifications: Notification[]
  canSearch: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = () => setNavOpen(false)

  const title = groups.flatMap(g => g.items).find(i => isActivePath(pathname, i.href))?.label || 'Massar'

  return (
    <div className="massar-shell" data-nav-open={navOpen}>
      <aside className="massar-sidebar" aria-label="Sidebar">
        <div className="massar-sidebar-brand">
          <Link href={homeHref} aria-label="Massar home" onClick={closeNav}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/massar_logo.svg" alt="Massar" className="massar-sidebar-logo" />
          </Link>
          <button type="button" className="massar-icon-btn massar-menu-btn" onClick={closeNav} aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>

        <SidebarNav groups={groups} onNavigate={closeNav} />

        <div className="massar-sidebar-user">
          <span className="massar-avatar" aria-hidden="true">{initials(fullName)}</span>
          <div className="massar-sidebar-user-meta">
            <div className="massar-sidebar-user-name">{fullName}</div>
            <div className="massar-sidebar-user-role">{roleLabel}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="massar-icon-btn" aria-label="Sign out" title="Sign out">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>

      <div className="massar-scrim" onClick={closeNav} aria-hidden="true" />

      <div className="massar-main">
        <GlobalHeader
          title={title}
          unreadNotifications={notifications}
          canSearch={canSearch}
          onOpenNav={() => setNavOpen(true)}
        />
        <main className="massar-content">{children}</main>
      </div>
    </div>
  )
}
