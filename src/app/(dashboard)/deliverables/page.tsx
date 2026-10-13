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
import { s, StatusBadge, Flash, Empty } from '@/components/ui'
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
  if (!['admin', 'manager', 'member'].includes(role)) return <Empty>This page is restricted to internal team members.</Empty>
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

  return (
    <div>
      <h1 style={s.pageTitle}>Deliverables</h1>
      <Flash error={error} ok={ok} />

      <section style={s.section}>
        <h2 style={s.sectionTitle}>New Deliverable</h2>
        <form action={createDeliverable} style={s.formGrid}>
          <div>
            <label htmlFor="d-project" style={s.label}>Project</label>
            <select id="d-project" name="project_id" required defaultValue="" style={s.field}>
              <option value="" disabled>Select project</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-title" style={s.label}>Deliverable Title</label>
            <input id="d-title" name="title" required placeholder="e.g. Brand Identity Guidelines PDF" style={s.field} />
          </div>
          <div>
            <label htmlFor="d-reviewer" style={s.label}>Internal Reviewer</label>
            <select id="d-reviewer" name="reviewer_user_id" required defaultValue="" style={s.field}>
              <option value="" disabled>Select reviewer</option>
              {staff?.filter(m => m.id !== user.id || isAdmin).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" style={s.primary}>Create Deliverable</button>
          </div>
        </form>
      </section>

      {deliverables.length === 0 && <Empty>No deliverables created yet.</Empty>}

      {deliverables.map(d => {
        const versions = [...(d.deliverable_versions || [])].sort((a, b) => b.version_number - a.version_number)
        const current = versions.find(v => v.id === d.current_version_id)
        const isReviewer = d.reviewer_user_id === user.id
        const canShare = isAdmin || isReviewer || (d.projects?.internal_team_id ? myTeams.has(d.projects.internal_team_id) : false)

        return (
          <section key={d.id} style={s.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'start' }}>
              <div>
                <h2 style={{ ...s.sectionTitle, marginBottom: 'var(--space-1)' }}>{d.title}</h2>
                <div style={s.muted}>
                  {d.projects?.name} · {d.projects?.clients?.company_name} · Reviewer: {d.reviewer?.full_name}
                </div>
              </div>
              <StatusBadge status={d.summary_status} label={DELIVERABLE_STATUS[d.summary_status]} />
            </div>

            {/* Two separate approvals, always visible (Design System — Dual Review Stream) */}
            {current && (
              <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', margin: 'var(--space-3) 0', ...s.muted, fontSize: '13px' }}>
                <span>Current Version: <strong>V{current.version_number}</strong></span>
                <span>Internal Approval: <strong>{['approved_internally', 'shared_with_client', 'client_changes_requested', 'client_approved'].includes(current.status) ? 'Approved Internally' : 'Pending Internal Review'}</strong></span>
                <span>Client Decision: <strong>{current.status === 'client_approved' ? 'Client Approved' : current.status === 'client_changes_requested' ? 'Changes Requested' : current.status === 'shared_with_client' ? 'Awaiting Decision' : 'Not Shared Yet'}</strong></span>
              </div>
            )}

            {versions.map(v => {
              const isCurrent = v.id === d.current_version_id
              const isCreator = v.creator_user_id === user.id
              return (
                <div key={v.id} style={{ borderTop: 'var(--border-width) solid var(--color-divider)', padding: 'var(--space-3) 0', opacity: isCurrent ? 1 : 0.75 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '18px' }}><bdi>V{v.version_number}</bdi></strong>
                    <StatusBadge status={v.status} label={DELIVERABLE_STATUS[v.status]} />
                    <span style={s.muted}><bdi>{formatCairo(v.created_at)}</bdi></span>
                    {!isCurrent && <span style={s.muted}>(Previous Version)</span>}
                  </div>
                  {v.note && <p style={{ margin: 'var(--space-2) 0 0' }}>{v.note}</p>}

                  {/* Files */}
                  <ul style={{ margin: 'var(--space-2) 0', paddingInlineStart: 'var(--space-4)' }}>
                    {v.files?.map(f => (
                      <li key={f.id}>
                        <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener" style={{ color: 'var(--color-text-strong)' }}>
                          {f.original_name}
                        </a>
                        {f.file_size ? <span style={s.muted}> · {(f.file_size / 1024 / 1024).toFixed(2)} MB</span> : null}
                      </li>
                    ))}
                    {!v.files?.length && <li style={{ ...s.muted, listStyle: 'none' }}>No files uploaded yet.</li>}
                  </ul>

                  {/* Decisions history (internal + client) */}
                  {v.review_decisions?.length > 0 && (
                    <ul style={{ margin: '0 0 var(--space-2)', paddingInlineStart: 'var(--space-4)', ...s.muted, fontSize: '13px' }}>
                      {v.review_decisions.map(r => (
                        <li key={r.id}>
                          {r.stage === 'internal' ? 'Internal Review' : 'Client Review'} — {r.decision === 'approved' ? 'Approved' : 'Changes Requested'} — {r.actor?.full_name} — <bdi>{formatCairo(r.created_at)}</bdi>
                          {r.comment && <>: &ldquo;{r.comment}&rdquo;</>}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* One clear action per state */}
                  {isCurrent && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'end' }}>
                      {v.status === 'draft' && (
                        <>
                          <VersionUpload versionId={v.id} />
                          <form action={submitForInternalReview}>
                            <input type="hidden" name="version_id" value={v.id} />
                            <button type="submit" style={s.primary} disabled={!v.files?.length}>Submit for Internal Review</button>
                          </form>
                        </>
                      )}

                      {v.status === 'internal_review' && (isReviewer || isAdmin) && (!isCreator || isAdmin) && (
                        <form action={processReview} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'end' }}>
                          <input type="hidden" name="version_id" value={v.id} />
                          <input type="hidden" name="stage" value="internal" />
                          <div>
                            <label htmlFor={`rc-${v.id}`} style={s.label}>Internal Notes (Required if requesting revisions)</label>
                            <input id={`rc-${v.id}`} name="comment" placeholder="Add constructive review notes…" style={s.field} />
                          </div>
                          <button type="submit" name="decision" value="approved" style={s.primary}>Approve Internally</button>
                          <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Request Internal Revisions</button>
                        </form>
                      )}
                      {v.status === 'internal_review' && !(isReviewer || isAdmin) && (
                        <span style={s.muted}>Awaiting internal review by {d.reviewer?.full_name}.</span>
                      )}
                      {v.status === 'internal_review' && isReviewer && isCreator && !isAdmin && (
                        <span style={s.muted}>You cannot review a version you created. Ask a manager to reassign the reviewer.</span>
                      )}

                      {v.status === 'approved_internally' && canShare && (
                        <form action={shareWithClient}>
                          <input type="hidden" name="version_id" value={v.id} />
                          <button type="submit" style={s.primary}>Share with Client</button>
                        </form>
                      )}
                      {v.status === 'approved_internally' && !canShare && (
                        <span style={s.muted}>Approved internally — awaiting lead or reviewer to share with client.</span>
                      )}

                      {v.status === 'shared_with_client' && <span style={s.muted}>Awaiting client decision.</span>}

                      {CAN_START_NEW.includes(v.status) && (
                        <form action={createDeliverableVersion} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'end', flexWrap: 'wrap' }}>
                          <input type="hidden" name="deliverable_id" value={d.id} />
                          <div>
                            <label htmlFor={`nv-${d.id}`} style={s.label}>What changed in this version?</label>
                            <input id={`nv-${d.id}`} name="note" placeholder="Summary of changes…" style={s.field} />
                          </div>
                          <button type="submit" style={s.secondary}>
                            {v.status === 'client_approved' ? 'Start New Version' : `Create V${v.version_number + 1}`}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
