export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { processReview } from '@/app/actions/deliverables'
import { CLIENT_STATUS, formatCairo } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty } from '@/components/ui'

type Version = {
  id: string
  version_number: number
  status: string
  shared_at: string | null
  deliverables: { id: string; title: string; description: string | null; current_version_id: string | null } | null
  files: { id: string; original_name: string; file_size: number | null }[]
  review_decisions: { id: string; decision: string; comment: string | null; created_at: string }[]
}

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase.from('client_memberships').select('client_id').eq('user_id', user.id)
  if (!memberships?.length) {
    return <Empty>Your account is not linked to any client organization yet. Please contact the Massar team.</Empty>
  }

  // RLS returns only versions explicitly shared with this company
  const { data } = await supabase
    .from('deliverable_versions')
    .select(`
      id, version_number, status, shared_at,
      deliverables!deliverable_versions_deliverable_id_fkey ( id, title, description, current_version_id ),
      files ( id, original_name, file_size ),
      review_decisions ( id, decision, comment, created_at )
    `)
    .order('shared_at', { ascending: false })
  const versions = (data || []) as unknown as Version[]

  // Show only the latest shared version of each deliverable
  const latest = new Map<string, Version>()
  for (const v of versions) {
    const key = v.deliverables?.id || v.id
    const prev = latest.get(key)
    if (!prev || v.version_number > prev.version_number) latest.set(key, v)
  }
  const list = [...latest.values()]
  const needsAction = list.filter(v => v.status === 'shared_with_client')
  const done = list.filter(v => v.status !== 'shared_with_client')

  const card = (v: Version) => (
    <article key={v.id} style={s.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h3 style={{ ...s.sectionTitle, fontSize: '20px', marginBottom: 0 }}>
          {v.deliverables?.title} — <bdi>V{v.version_number}</bdi>
        </h3>
        <StatusBadge status={v.status} label={CLIENT_STATUS[v.status] || ''} />
      </div>
      {v.deliverables?.description && <p style={{ marginTop: 'var(--space-2)' }}>{v.deliverables.description}</p>}
      <p style={{ ...s.muted, fontSize: '13px' }}>Shared on: <bdi>{formatCairo(v.shared_at)}</bdi></p>

      {v.files?.length > 0 && (
        <ul style={{ paddingInlineStart: 'var(--space-4)', margin: 'var(--space-2) 0' }}>
          {v.files.map(f => (
            <li key={f.id}>
              <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener" style={{ color: 'var(--color-text-strong)' }}>
                {f.original_name}
              </a>
              {f.file_size ? <span style={s.muted}> · {(f.file_size / 1024 / 1024).toFixed(2)} MB</span> : null}
            </li>
          ))}
        </ul>
      )}

      {v.review_decisions?.map(r => (
        <p key={r.id} style={{ ...s.muted, fontSize: '13px' }}>
          {r.decision === 'approved' ? 'You approved this version' : 'You requested revisions'} — <bdi>{formatCairo(r.created_at)}</bdi>
          {r.comment && <>: &ldquo;{r.comment}&rdquo;</>}
        </p>
      ))}

      {v.status === 'shared_with_client' && (
        <form action={processReview} style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <input type="hidden" name="version_id" value={v.id} />
          <input type="hidden" name="stage" value="client" />
          <label htmlFor={`cm-${v.id}`} style={s.label}>Your Feedback (Required when requesting revisions)</label>
          <textarea id={`cm-${v.id}`} name="comment" rows={3} placeholder="Please provide specific feedback or requested amendments…" style={{ ...s.field, padding: 'var(--space-2) var(--space-3)' }} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="submit" name="decision" value="approved" style={s.primary}>Approve Version V{v.version_number}</button>
            <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Request Revisions</button>
          </div>
        </form>
      )}
    </article>
  )

  return (
    <div>
      <h1 style={s.pageTitle}>Client Portal</h1>
      <Flash error={error} ok={ok} />

      <h2 style={s.sectionTitle}>Awaiting Your Decision ({needsAction.length})</h2>
      {needsAction.length === 0 ? <Empty>No deliverables requiring your review right now.</Empty> : needsAction.map(card)}

      {done.length > 0 && (
        <>
          <h2 style={{ ...s.sectionTitle, marginTop: 'var(--space-5)' }}>Previous Deliverables</h2>
          {done.map(card)}
        </>
      )}
    </div>
  )
}
