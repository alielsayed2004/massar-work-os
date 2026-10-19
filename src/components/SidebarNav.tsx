'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons'

export interface NavItem {
  href: string
  label: string
  icon: IconName
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="massar-nav">
      {groups.map(group => (
        <div key={group.heading} className="massar-nav-group">
          <p className="massar-nav-heading">{group.heading}</p>
          {group.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="massar-nav-link"
              aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
