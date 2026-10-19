export const instant = false;
import { createClient } from '@/lib/supabase/server'
import {
  createDeliverable,
  createDeliverableVersion,
  submitForInternalReview,
  shareWithClient,
  processReview,
} from '@/app/actions/deliverables'
import { DELIVERABLE_STATUS, formatCairo } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty, PageHeader, Panel, StatStrip, CreatePanel } from '@/components/ui'
import { Icon } from '@/components/icons'
import VersionUpload from '@/components/VersionUpload'

type FileRow = { id: string; original_name: string; file_size: number | null }
type Decision = { id: string; stage: string; decision: string; comment: string | null; created_at: string; actor: { full_name: string } | null }
type Version = {
  id: string
  version_number: number
  status: string
  note: string | null
  creator_user_id: string
  created_at: string
  shared_at: string | null
  files: FileRow[]
  review_decisions: Decision[]
}
type Deliverable = {
  id: string
  title: string
  summary_status: string
  current_version_id: string | null
  reviewer_user_id: string
  projects: { id: string; name: string; internal_team_id: string | null; clients: { company_name: string } | null } | null
  reviewer: { full_name: string } | null
  deliverable_versions: Version[]
}

// A new version is allowed only after the current one is closed (ملحق 1.5)
const CAN_START_NEW = ['internal_changes_requested', 'client_changes_requested', 'client_approved']
const INTERNALLY_APPROVED = ['approved_internally', 'shared_with_client', 'client_changes_requested', 'client_approved']

function FileList({ files }: { files: FileRow[] }) {
  if (!files?.length) return <p style={{ ...s.muted, margin: 'var(--space-2) 0 0' }}>No files uploaded yet.</p>
  return (
    <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0 0', padding: 0, display: 'grid', gap: 6 }}>
      {files.map(f => (
        <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Icon name="file" style={{ width: 16, height: 16, color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener" style={{ color: 'var(--color-text-strong)', fontWeight: 500 }}>
            {f.original_name}
          </a>
          {f.file_size ? <span style={{ ...s.muted, fontSize: 13 }}>{(f.file_size / 1024 / 1024).toFixed(2)} MB</span> : null}
        </li>
      ))}
    </ul>
  )
}

function DecisionList({ decisions }: { decisions: Decision[] }) {
  if (!decisions?.length) return null
  return (
    <ul style={{ listStyle: 'none', margin: 'var(--space-3) 0 0', padding: 0, display: 'grid', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
      {decisions.map(r => (
        <li key={r.id}>
          <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {r.stage === 'internal' ? 'Internal review' : 'Client'}: {r.decision === 'approved' ? 'approved' : 'changes requested'}
          </strong>{' '}
          · {r.actor?.full_name} · <bdi>{formatCairo(r.created_at)}</bdi>
          {r.comment && <> — &ldquo;{r.comment}&rdquo;</>}
        </li>
      ))}
    </ul>
  )
}

/** The two approvals are separate decisions; show both, side by side, always. */
function ApprovalTrack({ status }: { status: string }) {
  const internalDone = INTERNALLY_APPROVED.includes(status)
  const internal = internalDone ? 'Approved internally' : status === 'internal_changes_requested' ? 'Changes requested' : status === 'internal_review' ? 'In review' : 'Not submitted'
  const client = status === 'client_approved' ? 'Approved by client' : status === 'client_changes_requested' ? 'Changes requested' : status === 'shared_with_client' ? 'Awaiting decision' : 'Not shared yet'
  const step = (n: number, label: string, value: string, done: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px' }}>
      <span
        aria-hidden="true"
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600,
          background: done ? 'var(--color-action-primary)' : 'var(--color-surface-raised)',
          color: done ? 'var(--color-action-primary-text)' : 'var(--color-text-muted)',
          border: done ? 'none' : 'var(--border-width) solid var(--color-line-strong)',
        }}
      >
        {done ? '✓' : n}
      </span>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-control)' }}>
      {step(1, 'Massar approval', internal, internalDone)}
      {step(2, 'Client decision', client, status === 'client_approved')}
    </div>
  )
}

export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || ''
  if (!['admin', 'manager', 'member'].includes(role)) return <Empty>This page is for the Massar team only.</Empty>
  const isAdmin = role === 'admin'

  const [{ data: rows }, { data: projects }, { data: staff }, { data: managedTeams }] = await Promise.all([
    supabase
      .from('deliverables')
      .select(`
        id, title, summary_status, current_version_id, reviewer_user_id,
        projects ( id, name, internal_team_id, clients ( company_name ) ),
        reviewer:profiles!deliverables_reviewer_user_id_fkey ( full_name ),
        deliverable_versions!deliverable_versions_deliverable_id_fkey (
          id, version_number, status, note, creator_user_id, created_at, shared_at,
          files ( id, original_name, file_size ),
          review_decisions ( id, stage, decision, comment, created_at, actor:profiles!review_decisions_actor_user_id_fkey ( full_name ) )
        )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    supabase.from('profiles').select('id, full_name').neq('role', 'client').eq('status', 'active').order('full_name'),
    supabase.from('teams').select('id').eq('manager_user_id', user.id),
  ])
  const deliverables = (rows || []) as unknown as Deliverable[]
  const myTeams = new Set((managedTeams || []).map(t => t.id))

  const count = (st: string) => deliverables.filter(d => d.summary_status === st).length

  const createForm = (
    <form action={createDeliverable} style={s.formGrid}>
      <div>
        <label htmlFor="d-project" style={s.label}>Project</label>
        <select id="d-project" name="project_id" required defaultValue="" style={s.field}>
          <option value="" disabled>Select project</option>
          {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="d-title" style={s.label}>Deliverable title</label>
        <input id="d-title" name="title" required style={s.field} />
      </div>
      <div>
        <label htmlFor="d-reviewer" style={s.label}>Internal reviewer</label>
        <select id="d-reviewer" name="reviewer_user_id" required defaultValue="" style={s.field}>
          <option value="" disabled>Select reviewer</option>
          {staff?.filter(m => m.id !== user.id || isAdmin).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </div>
      <div>
        <button type="submit" style={s.primary}>Create deliverable</button>
      </div>
    </form>
  )

  return (
    <div>
      <PageHeader
        title="Deliverables"
        description="Every version passes internal review before the client sees it."
        actions={<CreatePanel label="New deliverable">{createForm}</CreatePanel>}
      />
      <Flash error={error} ok={ok} />

      <StatStrip
        items={[
          { label: 'In internal review', value: count('internal_review') },
          { label: 'Ready to share', value: count('approved_internally') },
          { label: 'Awaiting client', value: count('shared_with_client') },
          { label: 'Changes requested', value: count('internal_changes_requested') + count('client_changes_requested'), attention: count('internal_changes_requested') + count('client_changes_requested') > 0 },
        ]}
      />

      {deliverables.length === 0 && (
        <Panel title="Deliverables" count={0}><Empty>No deliverables yet. Create one to start a review cycle.</Empty></Panel>
      )}

      {deliverables.map(d => {
        const versions = [...(d.deliverable_versions || [])].sort((a, b) => b.version_number - a.version_number)
        const current = versions.find(v => v.id === d.current_version_id)
        const previous = versions.filter(v => v.id !== d.current_version_id)
        const isReviewer = d.reviewer_user_id === user.id
        const canShare = isAdmin || isReviewer || (d.projects?.internal_team_id ? myTeams.has(d.projects.internal_team_id) : false)
        const isCreator = current?.creator_user_id === user.id

        return (
          <Panel
            key={d.id}
            title={d.title}
            subtitle={<>{d.projects?.name} · {d.projects?.clients?.company_name} · Reviewer: {d.reviewer?.full_name}</>}
            actions={<StatusBadge status={d.summary_status} label={DELIVERABLE_STATUS[d.summary_status]} />}
          >
            {current && <ApprovalTrack status={current.status} />}

            {current && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}><bdi>V{current.version_number}</bdi></strong>
                  <span style={s.muted}>· <bdi>{formatCairo(current.created_at)}</bdi></span>
                </div>
                {current.note && <p style={{ margin: 'var(--space-2) 0 0' }}>{current.note}</p>}
                <FileList files={current.files} />
                <DecisionList decisions={current.review_decisions} />

                {/* One clear action per state */}
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: 'var(--border-width) solid var(--color-line)' }}>
                  {current.status === 'draft' && (
                    <div className="massar-btn-row" style={{ alignItems: 'end' }}>
                      <VersionUpload versionId={current.id} />
                      <form action={submitForInternalReview}>
                        <input type="hidden" name="version_id" value={current.id} />
                        <button type="submit" style={s.primary} disabled={!current.files?.length}>Submit for internal review</button>
                      </form>
                    </div>
                  )}

                  {current.status === 'internal_review' && (isReviewer || isAdmin) && (!isCreator || isAdmin) && (
                    <form action={processReview} className="massar-btn-row" style={{ alignItems: 'end' }}>
                      <input type="hidden" name="version_id" value={current.id} />
                      <input type="hidden" name="stage" value="internal" />
                      <div style={{ flex: '1 1 280px' }}>
                        <label htmlFor={`rc-${current.id}`} style={s.label}>Review note (required when requesting changes)</label>
                        <input id={`rc-${current.id}`} name="comment" style={s.field} />
                      </div>
                      <button type="submit" name="decision" value="approved" style={s.primary}>Approve internally</button>
                      <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Request changes</button>
                    </form>
                  )}
                  {current.status === 'internal_review' && !(isReviewer || isAdmin) && (
                    <p style={{ ...s.muted, margin: 0 }}>Waiting for {d.reviewer?.full_name} to review.</p>
                  )}
                  {current.status === 'internal_review' && isReviewer && isCreator && !isAdmin && (
                    <p style={{ ...s.muted, margin: 0 }}>You can’t review a version you created. Ask a lead to change the reviewer.</p>
                  )}

                  {current.status === 'approved_internally' && canShare && (
                    <form action={shareWithClient}>
                      <input type="hidden" name="version_id" value={current.id} />
                      <button type="submit" style={s.primary}>Share with client</button>
                    </form>
                  )}
                  {current.status === 'approved_internally' && !canShare && (
                    <p style={{ ...s.muted, margin: 0 }}>Approved internally. A lead or the reviewer can share it with the client.</p>
                  )}

                  {current.status === 'shared_with_client' && <p style={{ ...s.muted, margin: 0 }}>Waiting for the client’s decision.</p>}

                  {CAN_START_NEW.includes(current.status) && (
                    <form action={createDeliverableVersion} className="massar-btn-row" style={{ alignItems: 'end' }}>
                      <input type="hidden" name="deliverable_id" value={d.id} />
                      <div style={{ flex: '1 1 280px' }}>
                        <label htmlFor={`nv-${d.id}`} style={s.label}>What changes in the next version?</label>
                        <input id={`nv-${d.id}`} name="note" style={s.field} />
                      </div>
                      <button type="submit" style={s.secondary}>
                        {current.status === 'client_approved' ? 'Start new version' : `Create V${current.version_number + 1}`}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {previous.length > 0 && (
              <details className="massar-disclosure" style={{ marginTop: 'var(--space-4)' }}>
                <summary style={{ ...s.textBtn, padding: 0 }}>Previous versions ({previous.length})</summary>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  {previous.map(v => (
                    <div key={v.id} style={{ padding: 'var(--space-3) 0', borderTop: 'var(--border-width) solid var(--color-line)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong><bdi>V{v.version_number}</bdi></strong>
                        <StatusBadge status={v.status} label={DELIVERABLE_STATUS[v.status]} />
                        <span style={s.muted}><bdi>{formatCairo(v.created_at)}</bdi></span>
                      </div>
                      {v.note && <p style={{ margin: 'var(--space-2) 0 0' }}>{v.note}</p>}
                      <FileList files={v.files} />
                      <DecisionList decisions={v.review_decisions} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </Panel>
        )
      })}
    </div>
  )
}
