export const instant = false
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashReviewToken, isTokenShaped } from '@/lib/review-link'
import { formatCairo, nowMs } from '@/lib/labels'
import { s, Flash } from '@/components/ui'
import { Icon } from '@/components/icons'
import { decideByLink } from './actions'

export const metadata: Metadata = { title: 'Review your delivery · Massar', robots: { index: false, follow: false } }

type Row = {
  expires_at: string
  deliverable_versions: {
    id: string
    version_number: number
    status: string
    shared_at: string | null
    note: string | null
    files: { id: string; original_name: string; file_type: string | null; file_size: number | null; storage_key: string }[]
    review_decisions: { decision: string; comment: string | null; created_at: string; stage: string }[]
    deliverables: { title: string; description: string | null; current_version_id: string | null; projects: { name: string; clients: { company_name: string } | null } | null } | null
  } | null
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-page)' }}>
      <header style={{ background: 'var(--massar-green)', padding: '18px max(16px, env(safe-area-inset-left, 0px))', display: 'flex', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/image/massar_logo.svg" alt="Massar" style={{ height: 44 }} />
      </header>
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 64px', display: 'grid', gap: 'var(--space-4)' }}>{children}</main>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <section className="massar-panel" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
        <h1 className="massar-page-title" style={{ fontSize: 24 }}>{title}</h1>
        <p className="massar-page-description" style={{ margin: '12px auto 0' }}>{body}</p>
      </section>
    </Shell>
  )
}

export default async function ReviewLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  await connection()
  const { token } = await params
  const { error, ok } = await searchParams
  if (!isTokenShaped(token)) return <Notice title="This link doesn’t work" body="Please ask your Massar contact to send you a new one." />

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return <Notice title="Not available right now" body="Please try again in a few minutes." />
  }

  const { data } = await admin
    .from('review_links')
    .select(`expires_at,
      deliverable_versions ( id, version_number, status, shared_at, note,
        files ( id, original_name, file_type, file_size, storage_key ),
        review_decisions ( decision, comment, created_at, stage ),
        deliverables!deliverable_versions_deliverable_id_fkey ( title, description, current_version_id, projects ( name, clients ( company_name ) ) ) )`)
    .eq('token_hash', hashReviewToken(token))
    .maybeSingle()
  const row = data as unknown as Row | null
  const v = row?.deliverable_versions
  const d = v?.deliverables

  if (!row || !v || !d) return <Notice title="This link doesn’t work" body="Please ask your Massar contact to send you a new one." />
  if (new Date(row.expires_at).getTime() < nowMs() && v.status === 'shared_with_client') {
    return <Notice title="This link has expired" body="Links stay open for 14 days. Ask your Massar contact for a fresh one." />
  }
  if (d.current_version_id !== v.id) {
    return <Notice title="There’s a newer version" body="Your Massar contact will send you the link to the latest version." />
  }

  // Short-lived download links, made only for the files of this one version
  const files = await Promise.all(
    (v.files || []).map(async f => {
      const { data: signed } = await admin.storage.from('massar_files').createSignedUrl(f.storage_key, 60 * 30)
      return { ...f, url: signed?.signedUrl || null }
    })
  )
  const clientDecision = (v.review_decisions || []).filter(r => r.stage === 'client').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const open = v.status === 'shared_with_client'

  return (
    <Shell>
      <div>
        <p className="massar-page-eyebrow">{d.projects?.clients?.company_name} · {d.projects?.name}</p>
        <h1 className="massar-page-title">{d.title} <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>· V{v.version_number}</span></h1>
        {v.shared_at && <p className="massar-page-description">Shared <bdi>{formatCairo(v.shared_at)}</bdi> (Cairo time)</p>}
      </div>

      <Flash error={error} ok={ok} />

      {(d.description || v.note) && (
        <section className="massar-panel" style={{ padding: 'var(--space-4)', display: 'grid', gap: 8 }}>
          {d.description && <p style={{ margin: 0, lineHeight: 1.6 }}>{d.description}</p>}
          {v.note && <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>What’s new in this version: {v.note}</p>}
        </section>
      )}

      <section className="massar-panel" aria-label="Files">
        <div className="massar-panel-head"><h2 className="massar-panel-title">Files <span className="massar-panel-count">{files.length}</span></h2></div>
        <div style={{ display: 'grid', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'grid', gap: 8 }}>
              {f.url && f.file_type?.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.original_name} style={{ width: '100%', borderRadius: 'var(--radius-surface)', border: 'var(--border-width) solid var(--color-line)' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Icon name="file" style={{ width: 18, height: 18, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{f.original_name}</span>
                {f.url && <a href={f.url} target="_blank" rel="noopener" style={{ ...s.secondary, minHeight: 38, textDecoration: 'none' }}>Open</a>}
              </div>
            </div>
          ))}
          {!files.length && <p style={{ ...s.muted, margin: 0 }}>No files in this version.</p>}
        </div>
      </section>

      {open ? (
        <section className="massar-panel" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
          <form action={decideByLink}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" name="decision" value="approved" style={{ ...s.primary, width: '100%', minHeight: 52, fontSize: 16 }}>
              Approve V{v.version_number}
            </button>
          </form>
          <form action={decideByLink} style={{ display: 'grid', gap: 8 }}>
            <input type="hidden" name="token" value={token} />
            <label htmlFor="comment" style={s.label}>Or tell us what to change</label>
            <textarea id="comment" name="comment" rows={4} required style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
            <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Send change request</button>
          </form>
        </section>
      ) : (
        <section className="massar-panel" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <h2 className="massar-panel-title" style={{ justifyContent: 'center' }}>
            {clientDecision?.decision === 'approved' ? 'You approved this version. Thank you.' : 'Your change request was sent to the team.'}
          </h2>
          {clientDecision?.comment && <p style={{ ...s.muted, margin: '8px 0 0' }}>“{clientDecision.comment}”</p>}
        </section>
      )}
    </Shell>
  )
}
