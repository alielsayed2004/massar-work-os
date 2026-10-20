'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons'

export interface NavItem {
  href: string
  label: string
  icon?: IconName
  /** Letters shown instead of an icon (client spaces) */
  mono?: string
  /** Things waiting for a decision here */
  count?: number
  /** Highlight only on this exact path, not its children */
  exact?: boolean
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
              aria-current={(item.exact ? pathname === item.href : isActivePath(pathname, item.href)) ? 'page' : undefined}
              onClick={onNavigate}
            >
              {item.mono ? <span className="massar-nav-mono" aria-hidden="true">{item.mono}</span> : item.icon ? <Icon name={item.icon} /> : null}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.count ? <span className="massar-nav-count" aria-label={`${item.count} waiting`}>{item.count}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
