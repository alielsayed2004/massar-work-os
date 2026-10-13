'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main Navigation" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/my-work' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              color: isActive ? 'var(--bone)' : 'rgba(241, 236, 226, 0.82)',
              backgroundColor: isActive ? 'rgba(241, 236, 226, 0.14)' : 'transparent',
              textDecoration: 'none',
              padding: '10px var(--space-3)',
              borderRadius: 'var(--radius-control)',
              fontSize: 'var(--text-body)',
              fontWeight: isActive ? 600 : 500,
              fontFamily: 'var(--font-sans)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all var(--motion-fast) var(--motion-ease)',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
