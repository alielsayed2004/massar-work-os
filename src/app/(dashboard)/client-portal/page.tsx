export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { processReview } from '@/app/actions/deliverables'
import { CLIENT_STATUS, formatCairo } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty, PageHeader, Panel, StatStrip } from '@/components/ui'
import { Icon } from '@/components/icons'

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
    return (
      <div>
        <PageHeader title="Your deliverables" />
        <Panel title="Account not linked">
          <Empty>Your account isn’t linked to a company yet. Please contact your Massar team.</Empty>
        </Panel>
      </div>
    )
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
    <article key={v.id} className="massar-row">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
            {v.deliverables?.title} <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>· <bdi>V{v.version_number}</bdi></span>
          </h3>
          <p style={{ ...s.muted, fontSize: 13, margin: '4px 0 0' }}>Shared <bdi>{formatCairo(v.shared_at)}</bdi></p>
        </div>
        <StatusBadge status={v.status} label={CLIENT_STATUS[v.status] || ''} />
      </div>
      {v.deliverables?.description && <p style={{ margin: 'var(--space-3) 0 0', lineHeight: 1.55 }}>{v.deliverables.description}</p>}

      {v.files?.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--space-3) 0 0', display: 'grid', gap: 6 }}>
          {v.files.map(f => (
            <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <Icon name="file" style={{ width: 16, height: 16, color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener" style={{ color: 'var(--color-text-strong)', fontWeight: 500 }}>
                {f.original_name}
              </a>
              {f.file_size ? <span style={{ ...s.muted, fontSize: 13 }}>{(f.file_size / 1024 / 1024).toFixed(2)} MB</span> : null}
            </li>
          ))}
        </ul>
      )}

      {v.review_decisions?.map(r => (
        <p key={r.id} style={{ ...s.muted, fontSize: 13, margin: 'var(--space-3) 0 0' }}>
          {r.decision === 'approved' ? 'You approved this version' : 'You requested changes'} · <bdi>{formatCairo(r.created_at)}</bdi>
          {r.comment && <> — &ldquo;{r.comment}&rdquo;</>}
        </p>
      ))}

      {v.status === 'shared_with_client' && (
        <form action={processReview} style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: 'var(--border-width) solid var(--color-line)' }}>
          <input type="hidden" name="version_id" value={v.id} />
          <input type="hidden" name="stage" value="client" />
          <label htmlFor={`cm-${v.id}`} style={s.label}>Your feedback (required when requesting changes)</label>
          <textarea id={`cm-${v.id}`} name="comment" rows={3} style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
          <div className="massar-btn-row">
            <button type="submit" name="decision" value="approved" style={s.primary}>Approve V{v.version_number}</button>
            <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Request changes</button>
          </div>
        </form>
      )}
    </article>
  )

  return (
    <div>
      <PageHeader
        title="Your deliverables"
        description="Review what your Massar team has shared, then approve it or ask for changes."
      />
      <Flash error={error} ok={ok} />

      <StatStrip
        items={[
          { label: 'Awaiting your decision', value: needsAction.length, attention: needsAction.length > 0 },
          { label: 'Approved', value: list.filter(v => v.status === 'client_approved').length },
          { label: 'Changes requested', value: list.filter(v => v.status === 'client_changes_requested').length },
        ]}
      />

      <Panel title="Needs your decision" count={needsAction.length} attention flush>
        {needsAction.length === 0 ? <Empty>Nothing waiting for you right now.</Empty> : needsAction.map(card)}
      </Panel>

      {done.length > 0 && (
        <Panel title="History" count={done.length} flush>
          {done.map(card)}
        </Panel>
      )}
    </div>
  )
}
