'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { markNotificationAsRead, searchAll } from '@/app/actions/global'
import { Icon } from '@/components/icons'
import { formatCairo } from '@/lib/labels'

type Notification = { id: string; message: string; internal_link: string | null; created_at: string }
type Results = {
  projects: { id: string; name: string }[] | null
  tasks: { id: string; title: string }[] | null
  clients: { id: string; company_name: string }[] | null
}

/** Closes a popover when the user clicks outside it or presses Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

export default function GlobalHeader({
  title,
  unreadNotifications,
  canSearch,
  onOpenNav,
}: {
  title: string
  unreadNotifications: Notification[]
  canSearch: boolean
  onOpenNav: () => void
}) {
  const router = useRouter()
  const [showNotifs, setShowNotifs] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)

  const notifRef = useDismiss(showNotifs, () => setShowNotifs(false))
  const searchRef = useDismiss(results !== null, () => setResults(null))

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setResults(q.trim().length >= 2 ? await searchAll(q) : null)
  }

  async function handleRead(id: string) {
    await markNotificationAsRead(id)
    router.refresh()
  }

  const empty = results && !results.tasks?.length && !results.projects?.length && !results.clients?.length
  const count = unreadNotifications.length

  return (
    <header className="massar-topbar">
      <button type="button" className="massar-icon-btn massar-menu-btn" onClick={onOpenNav} aria-label="Open navigation">
        <Icon name="menu" />
      </button>
      <p className="massar-topbar-title">{title}</p>
      <div className="massar-topbar-spacer" />

      {canSearch && (
        <div className="massar-search" ref={searchRef}>
          <label htmlFor="global-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Search
          </label>
          <Icon name="search" />
          <input
            id="global-search"
            type="search"
            placeholder="Search tasks, projects, clients"
            value={query}
            onChange={handleSearch}
            autoComplete="off"
          />
          {results && (
            <div className="massar-popover" style={{ insetInlineStart: 0, width: '100%' }}>
              {!!results.tasks?.length && <div className="massar-popover-group">Tasks</div>}
              {results.tasks?.map(t => <div key={t.id} className="massar-popover-item">{t.title}</div>)}
              {!!results.projects?.length && <div className="massar-popover-group">Projects</div>}
              {results.projects?.map(p => <div key={p.id} className="massar-popover-item">{p.name}</div>)}
              {!!results.clients?.length && <div className="massar-popover-group">Clients</div>}
              {results.clients?.map(c => <div key={c.id} className="massar-popover-item">{c.company_name}</div>)}
              {empty && <div className="massar-popover-item">No results for “{query}”.</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          type="button"
          className="massar-icon-btn"
          onClick={() => setShowNotifs(v => !v)}
          aria-expanded={showNotifs}
          aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
        >
          <Icon name="bell" />
          {count > 0 && <span className="massar-badge-count">{count > 9 ? '9+' : count}</span>}
        </button>

        {showNotifs && (
          <div className="massar-popover" style={{ insetInlineEnd: 0, width: 'min(360px, calc(100vw - 32px))' }}>
            <div className="massar-popover-head">
              <span>Notifications</span>
              {count > 0 && <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>{count} unread</span>}
            </div>
            {count === 0 ? (
              <p style={{ padding: 'var(--space-4) var(--space-3)', margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
                You’re all caught up.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 400, overflowY: 'auto' }}>
                {unreadNotifications.map(n => (
                  <li key={n.id} style={{ padding: '12px var(--space-3)', borderBottom: 'var(--border-width) solid var(--color-line)' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.45 }}>{n.message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-text-muted)', flex: 1 }}><bdi>{formatCairo(n.created_at)}</bdi></span>
                      {n.internal_link && (
                        <Link href={n.internal_link} onClick={() => setShowNotifs(false)} style={{ color: 'var(--color-text-strong)', fontWeight: 600 }}>
                          Open
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRead(n.id)}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                      >
                        Mark read
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
