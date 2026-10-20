export const instant = false
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { formatInTimeZone } from 'date-fns-tz'
import { updateTaskStatus, addComment } from '@/app/actions/tasks'
import { requestHandover } from '@/app/actions/handover'
import { startDelivery, sendForCheck } from '@/app/actions/delivery'
import { CAIRO, TASK_STATUS, HANDOVER_REASONS, formatCairo, nowMs } from '@/lib/labels'
import { stageOf, changesRequested, dueLabel, hoursUntil } from '@/lib/workflow'
import { s, StatusBadge, Flash, Empty, PageHeader, Panel, StatStrip } from '@/components/ui'
import { Icon } from '@/components/icons'
import VersionUpload from '@/components/VersionUpload'

type FileRow = { id: string; original_name: string; file_size?: number | null }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_at: string
  projects: { name: string; clients: { company_name: string } | null } | null
  files: FileRow[]
}
type Version = {
  id: string
  version_number: number
  status: string
  files: FileRow[]
  review_decisions: { id: string; stage: string; decision: string; comment: string | null; created_at: string }[]
}
type Delivery = { source_task_id: string; summary_status: string; current_version_id: string | null; deliverable_versions: Version[] }

function Files({ files }: { files: FileRow[] }) {
  return (
    <ul className="massar-flow-files" style={{ fontSize: 14 }}>
      {files.map(f => (
        <li key={f.id}>
          <Icon name="file" />
          <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener">{f.original_name}</a>
        </li>
      ))}
    </ul>
  )
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  await connection()
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const user = await getSessionUser()
  if (!user) return null

  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_at, projects ( name, clients ( company_name ) ), files ( id, original_name )')
    .eq('current_owner_user_id', user.id)
    .not('status', 'in', '(completed,canceled)')
    .order('due_at', { ascending: true })
  const tasks = (data || []) as unknown as Task[]
  const ids = tasks.map(t => t.id)

  const [{ data: pending }, { data: deliveryRows }] = await Promise.all([
    supabase.from('handover_requests').select('task_id').eq('status', 'pending').eq('requester_user_id', user.id),
    ids.length
      ? supabase
          .from('deliverables')
          .select(`source_task_id, summary_status, current_version_id,
            deliverable_versions!deliverable_versions_deliverable_id_fkey ( id, version_number, status,
              files ( id, original_name, file_size ),
              review_decisions ( id, stage, decision, comment, created_at ) )`)
          .in('source_task_id', ids)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])
  const pendingIds = new Set((pending || []).map(h => h.task_id))
  const deliveryOf = new Map(((deliveryRows || []) as unknown as Delivery[]).map(d => [d.source_task_id, d]))

  const now = nowMs()
  const items = tasks.map(task => {
    const delivery = deliveryOf.get(task.id)
    const version = delivery?.deliverable_versions?.find(v => v.id === delivery.current_version_id)
    // The newest "changes requested" note on any version of this delivery
    const lastChange = delivery?.deliverable_versions
      ?.flatMap(v => v.review_decisions || [])
      .filter(r => r.decision === 'changes_requested')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    const stage = stageOf(task.status, delivery?.summary_status)
    const h = hoursUntil(task.due_at, now)
    return { task, delivery, version, lastChange, stage, h }
  })

  const waiting = items.filter(i => i.stage === 'check' || i.stage === 'client')
  const active = items.filter(i => i.stage === 'received' || i.stage === 'working')
  const urgent = active.filter(i => i.h < 24 || changesRequested(i.delivery?.summary_status))
  const queue = active.filter(i => !urgent.includes(i))
  const overdue = active.filter(i => i.h < 0)
  const soon = active.filter(i => i.h >= 0 && i.h < 24)

  const renderItem = (item: (typeof items)[number]) => {
    const { task, delivery, version, lastChange, stage, h } = item
    const hasClient = Boolean(task.projects?.clients)
    const isDraft = version?.status === 'draft'
    const needsChanges = changesRequested(delivery?.summary_status)
    const late = h < 0 && stage !== 'check' && stage !== 'client'

    return (
      <article key={task.id} className="massar-row">
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{task.title}</h3>
            <p className="massar-cell-sub" style={{ margin: '2px 0 0' }}>
              {task.projects?.clients ? `${task.projects.clients.company_name} · ${task.projects.name}` : 'Internal task'}
            </p>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: late ? 'var(--color-text)' : undefined }}>
              {late && <span aria-hidden="true" style={{ color: 'var(--color-attention)' }}>● </span>}
              Due {dueLabel(task.due_at, now)}
            </div>
            <div className="massar-cell-sub"><bdi>{formatCairo(task.due_at)}</bdi></div>
          </div>
        </div>

        {needsChanges && lastChange?.comment && (
          <div style={{ margin: 'var(--space-3) 0 0', padding: '10px var(--space-3)', background: 'var(--color-surface-sunken)', borderInlineStart: '3px solid var(--color-attention)', borderRadius: 'var(--radius-control)', fontSize: 14 }}>
            <strong>{lastChange.stage === 'client' ? 'Client asked for changes' : 'Changes requested'}:</strong> {lastChange.comment}
          </div>
        )}

        {(task.description || task.files?.length > 0) && (
          <details className="massar-disclosure" open={stage === 'received'} style={{ marginTop: 'var(--space-3)' }}>
            <summary style={{ ...s.textBtn, padding: 0, fontSize: 14 }}>Brief &amp; material{task.files?.length ? ` · ${task.files.length} ${task.files.length === 1 ? 'file' : 'files'}` : ''}</summary>
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {task.description && <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{task.description}</p>}
              {task.files?.length > 0 && <Files files={task.files} />}
            </div>
          </details>
        )}

        {/* Delivery workspace: upload into the open draft, then send for check */}
        {isDraft && version && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', border: 'var(--border-width) dashed var(--color-line-strong)', borderRadius: 'var(--radius-surface)', display: 'grid', gap: 'var(--space-2)' }}>
            <strong style={{ fontSize: 14 }}>Your delivery · V{version.version_number}</strong>
            {version.files?.length ? <Files files={version.files} /> : <p style={{ ...s.muted, margin: 0 }}>Upload the finished files.</p>}
            <div className="massar-btn-row">
              <VersionUpload versionId={version.id} label="Upload files" />
              <form action={sendForCheck}>
                <input type="hidden" name="version_id" value={version.id} />
                <button type="submit" style={s.primary} disabled={!version.files?.length}>Send for check</button>
              </form>
            </div>
          </div>
        )}

        <div className="massar-btn-row" style={{ marginTop: 'var(--space-3)' }}>
          <StatusBadge
            status={stage === 'check' || stage === 'client' ? 'shared_with_client' : needsChanges ? 'client_changes_requested' : task.status}
            label={
              pendingIds.has(task.id) ? 'Handover pending'
              : stage === 'check' ? 'Waiting for check'
              : stage === 'client' ? 'With the client'
              : needsChanges ? 'Changes requested'
              : TASK_STATUS[task.status]
            }
          />
          <span style={{ flex: 1 }} />

          {task.status === 'todo' && !delivery && (
            <form action={updateTaskStatus}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="in_progress" />
              <button type="submit" style={s.primary}>Start</button>
            </form>
          )}
          {task.status === 'blocked' && (
            <form action={updateTaskStatus}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="in_progress" />
              <button type="submit" style={s.primary}>Resume</button>
            </form>
          )}
          {task.status === 'in_progress' && !isDraft && stage === 'working' && (
            hasClient ? (
              <form action={startDelivery}>
                <input type="hidden" name="task_id" value={task.id} />
                <button type="submit" style={s.primary}>{needsChanges ? 'Deliver new version' : 'Deliver work'}</button>
              </form>
            ) : (
              <form action={updateTaskStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="completed" />
                <button type="submit" style={s.primary}>Mark complete</button>
              </form>
            )
          )}

          <details className="massar-disclosure massar-menu">
            <summary style={s.secondary} aria-label={`More actions for ${task.title}`}>More</summary>
            <div className="massar-menu-panel">
              <form action={addComment} className="massar-menu-section">
                <input type="hidden" name="task_id" value={task.id} />
                <label htmlFor={`c-${task.id}`} className="massar-menu-title" style={{ display: 'block' }}>Add a progress note</label>
                <div className="massar-btn-row" style={{ flexWrap: 'nowrap' }}>
                  <input id={`c-${task.id}`} name="content" required style={s.field} />
                  <button type="submit" style={s.secondary}>Save</button>
                </div>
              </form>

              {!pendingIds.has(task.id) && stage !== 'check' && stage !== 'client' && (
                <form action={requestHandover} className="massar-menu-section" style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <p className="massar-menu-title" style={{ margin: 0 }}>Can’t make it? Request handover</p>
                  <div>
                    <label htmlFor={`r-${task.id}`} style={s.label}>Reason</label>
                    <select id={`r-${task.id}`} name="reason" required defaultValue="" style={s.field}>
                      <option value="" disabled>Select reason</option>
                      {HANDOVER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`n-${task.id}`} style={s.label}>Progress so far (optional)</label>
                    <textarea id={`n-${task.id}`} name="internal_note" rows={2} style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
                  </div>
                  <p style={{ ...s.muted, margin: 0, fontSize: 13 }}>You stay the owner until your lead decides.</p>
                  <button type="submit" style={s.attention}>Send request</button>
                </form>
              )}

              {task.status !== 'blocked' && stage !== 'check' && stage !== 'client' && (
                <form action={updateTaskStatus} className="massar-menu-section">
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="status" value="blocked" />
                  <button type="submit" style={{ ...s.textBtn, padding: 0 }}>Mark as blocked</button>
                </form>
              )}
            </div>
          </details>
        </div>
      </article>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={formatInTimeZone(new Date(), CAIRO, 'EEEE, d MMMM')}
        title="My Work"
        description="Your tasks, the brief and material for each, and when they’re due."
      />
      <Flash error={error} ok={ok} />

      {(overdue.length > 0 || soon.length > 0) && (
        <div role="alert" className="massar-due-alert">
          <Icon name="bell" />
          <div>
            <strong>
              {overdue.length > 0 && `${overdue.length} late`}
              {overdue.length > 0 && soon.length > 0 && ' · '}
              {soon.length > 0 && `${soon.length} due within 24 hours`}
            </strong>
            <div style={{ fontSize: 14 }}>
              {[...overdue, ...soon].slice(0, 3).map(i => `${i.task.title} (${dueLabel(i.task.due_at, now)})`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      <StatStrip
        items={[
          { label: 'Needs you now', value: urgent.length, attention: urgent.length > 0 },
          { label: 'In your queue', value: queue.length },
          { label: 'Delivered, waiting', value: waiting.length },
        ]}
      />

      {items.length === 0 ? (
        <Panel title="Your tasks" count={0}>
          <Empty>Nothing assigned to you right now.</Empty>
        </Panel>
      ) : (
        <>
          {urgent.length > 0 && <Panel title="Needs you now" count={urgent.length} attention flush>{urgent.map(renderItem)}</Panel>}
          {queue.length > 0 && <Panel title="In your queue" count={queue.length} flush>{queue.map(renderItem)}</Panel>}
          {waiting.length > 0 && (
            <Panel title="Delivered, waiting" count={waiting.length} subtitle="With a partner for check, or with the client." flush>
              {waiting.map(renderItem)}
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
