'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { markNotificationAsRead, searchAll } from '@/app/actions/global'
import { s } from '@/components/ui'

type Notification = { id: string; message: string; internal_link: string | null; created_at: string }
type Results = {
  projects: { id: string; name: string }[] | null
  tasks: { id: string; title: string }[] | null
  clients: { id: string; company_name: string }[] | null
}

export default function GlobalHeader({
  unreadNotifications,
  fullName,
  canSearch,
}: {
  unreadNotifications: Notification[]
  fullName: string
  canSearch: boolean
}) {
  const router = useRouter()
  const [showNotifs, setShowNotifs] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setResults(q.trim().length >= 2 ? await searchAll(q) : null)
  }

  async function handleRead(id: string) {
    await markNotificationAsRead(id)
    router.refresh()
  }

  const panel: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + var(--space-1))',
    backgroundColor: 'var(--color-surface)',
    border: 'var(--border-width) solid var(--color-border-strong)',
    borderRadius: 'var(--radius-surface)',
    zIndex: 10,
  }

  const empty = results && !results.tasks?.length && !results.projects?.length && !results.clients?.length

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-5)',
        paddingBottom: 'var(--space-3)',
        borderBottom: 'var(--border-width) solid var(--color-divider)',
      }}
    >
      {canSearch ? (
        <div style={{ flex: '1 1 280px', position: 'relative', maxWidth: '420px' }}>
          <label htmlFor="global-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Search
          </label>
          <input
            id="global-search"
            type="search"
            placeholder="Search projects, tasks, and clients..."
            value={query}
            onChange={handleSearch}
            style={s.field}
          />
          {results && (
            <div style={{ ...panel, insetInlineStart: 0, width: '100%' }}>
              <ul style={{ listStyle: 'none', padding: 'var(--space-2)', margin: 0 }}>
                {!!results.tasks?.length && <li style={{ fontWeight: 600, padding: 'var(--space-1)' }}>Tasks</li>}
                {results.tasks?.map(t => <li key={t.id} style={{ padding: 'var(--space-1)' }}>{t.title}</li>)}
                {!!results.projects?.length && <li style={{ fontWeight: 600, padding: 'var(--space-1)' }}>Projects</li>}
                {results.projects?.map(p => <li key={p.id} style={{ padding: 'var(--space-1)' }}>{p.name}</li>)}
                {!!results.clients?.length && <li style={{ fontWeight: 600, padding: 'var(--space-1)' }}>Clients</li>}
                {results.clients?.map(c => <li key={c.id} style={{ padding: 'var(--space-1)' }}>{c.company_name}</li>)}
                {empty && <li style={{ padding: 'var(--space-1)' }}>No results found.</li>}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <span />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifs(v => !v)}
            aria-expanded={showNotifs}
            style={{ ...s.textBtn, textDecoration: 'none', fontSize: 'var(--text-body)' }}
          >
            Notifications
            {unreadNotifications.length > 0 && (
              <span
                style={{
                  marginInlineStart: 'var(--space-1)',
                  backgroundColor: 'var(--color-attention)',
                  color: 'var(--color-attention-text)',
                  borderRadius: 'var(--radius-small)',
                  padding: '0 var(--space-1)',
                  fontSize: 'var(--text-micro)',
                  fontWeight: 600,
                }}
              >
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{ ...panel, insetInlineEnd: 0, width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
              {unreadNotifications.length === 0 ? (
                <p style={{ padding: 'var(--space-3)', margin: 0 }}>No new notifications.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {unreadNotifications.map(n => (
                    <li key={n.id} style={{ padding: 'var(--space-3)', borderBottom: 'var(--border-width) solid var(--color-divider)' }}>
                      <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-label)' }}>{n.message}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {n.internal_link && (
                          <Link href={n.internal_link} onClick={() => setShowNotifs(false)} style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-label)' }}>
                            Open
                          </Link>
                        )}
                        <button type="button" onClick={() => handleRead(n.id)} style={s.textBtn}>
                          Mark as read
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-strong)' }}>{fullName}</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('massar-replay-welcome'))}
              title="Replay Welcome Animation"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-small)',
                backgroundColor: 'rgba(13, 59, 52, 0.06)',
              }}
            >
              ✦ Welcome
            </button>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ ...s.textBtn, padding: 0, color: 'var(--color-text)' }}>Sign Out</button>
          </form>
        </div>
      </div>
    </header>
  )
}
