export const instant = false
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatInTimeZone } from 'date-fns-tz'
import { updateTaskStatus, addComment } from '@/app/actions/tasks'
import { requestHandover } from '@/app/actions/handover'
import { CAIRO, TASK_STATUS, HANDOVER_REASONS, formatCairo, nowMs } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty, PageHeader, Panel, StatStrip } from '@/components/ui'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_at: string
  projects: { name: string } | null
}

// Next step the OWNER may take (the DB enforces the same rules)
const NEXT_STEPS: Record<string, { status: string; label: string }[]> = {
  todo: [{ status: 'in_progress', label: 'Start' }],
  in_progress: [{ status: 'completed', label: 'Complete' }],
  blocked: [{ status: 'in_progress', label: 'Resume' }],
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  await connection()
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_at, projects ( name )')
    .eq('current_owner_user_id', user.id)
    .not('status', 'in', '(completed,canceled)')
    .order('due_at', { ascending: true })
  const tasks = (data || []) as unknown as Task[]

  const { data: pending } = await supabase
    .from('handover_requests')
    .select('task_id')
    .eq('status', 'pending')
    .eq('requester_user_id', user.id)
  const pendingIds = new Set((pending || []).map(h => h.task_id))

  // Rule-based buckets (Brief §18), all computed in Cairo time
  const now = nowMs()
  const today = formatInTimeZone(new Date(), CAIRO, 'yyyy-MM-dd')
  const hours = (t: Task) => (new Date(t.due_at).getTime() - now) / 36e5
  const day = (t: Task) => formatInTimeZone(new Date(t.due_at), CAIRO, 'yyyy-MM-dd')

  const waiting = tasks.filter(t => pendingIds.has(t.id))
  const open = tasks.filter(t => !pendingIds.has(t.id))
  const overdue = open.filter(t => hours(t) < 0)
  const dueSoon = open.filter(t => hours(t) >= 0 && hours(t) <= 4)
  const dueToday = open.filter(t => hours(t) > 4 && day(t) === today)
  const upcoming = open.filter(t => hours(t) > 4 && day(t) !== today)

  const attention = overdue.length + dueSoon.length
  const summary = [
    { label: 'Needs attention', value: attention, attention: attention > 0 },
    { label: 'Due today', value: dueToday.length + dueSoon.length },
    { label: 'In progress', value: tasks.filter(t => t.status === 'in_progress').length },
    { label: 'Awaiting handover', value: waiting.length },
  ]

  const renderTable = (title: string, list: Task[], flag?: 'overdue' | 'soon') => {
    if (!list.length) return null
    return (
      <Panel title={title} count={list.length} attention={flag === 'overdue'} flush>
        <div className="massar-table-wrap">
          <table className="massar-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due (Cairo)</th>
                <th>Status</th>
                <th style={{ textAlign: 'end' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(task => {
                const steps = NEXT_STEPS[task.status] || []
                const isWaiting = pendingIds.has(task.id)
                return (
                  <tr key={task.id}>
                    <td>
                      <div className="massar-cell-title">{task.title}</div>
                      <div className="massar-cell-sub">{task.projects?.name || 'Internal task'}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <bdi>{formatCairo(task.due_at)}</bdi>
                      {flag === 'overdue' && <div style={{ marginTop: 6 }}><StatusBadge status="overdue" label="Overdue" /></div>}
                      {flag === 'soon' && <div style={{ marginTop: 6 }}><StatusBadge status="internal_review" label="Due within 4 hrs" /></div>}
                    </td>
                    <td>
                      <StatusBadge status={task.status} label={isWaiting ? 'Pending lead decision' : TASK_STATUS[task.status]} />
                    </td>
                    <td>
                      <div className="massar-btn-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {steps.map(step => (
                          <form key={step.status} action={updateTaskStatus}>
                            <input type="hidden" name="task_id" value={task.id} />
                            <input type="hidden" name="status" value={step.status} />
                            <button type="submit" style={s.primary}>{step.label}</button>
                          </form>
                        ))}
                        <details className="massar-disclosure massar-menu">
                          <summary style={s.secondary} aria-label={`More actions for ${task.title}`}>
                            More
                          </summary>
                          <div className="massar-menu-panel">
                            <form action={addComment} className="massar-menu-section">
                              <input type="hidden" name="task_id" value={task.id} />
                              <label htmlFor={`c-${task.id}`} className="massar-menu-title" style={{ display: 'block' }}>Add a progress note</label>
                              <div className="massar-btn-row" style={{ flexWrap: 'nowrap' }}>
                                <input id={`c-${task.id}`} name="content" required style={s.field} />
                                <button type="submit" style={s.secondary}>Save</button>
                              </div>
                            </form>

                            {!isWaiting && (
                              <form action={requestHandover} className="massar-menu-section" style={{ display: 'grid', gap: 'var(--space-2)' }}>
                                <input type="hidden" name="task_id" value={task.id} />
                                <p className="massar-menu-title" style={{ margin: 0 }}>Request handover</p>
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
                                <p style={{ ...s.muted, margin: 0, fontSize: 13 }}>You stay the owner until your team lead decides.</p>
                                <button type="submit" style={s.attention}>Send request</button>
                              </form>
                            )}

                            {task.status !== 'blocked' && (
                              <form action={updateTaskStatus} className="massar-menu-section">
                                <input type="hidden" name="task_id" value={task.id} />
                                <input type="hidden" name="status" value="blocked" />
                                <button type="submit" style={{ ...s.textBtn, padding: 0 }}>Mark as blocked</button>
                              </form>
                            )}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={formatInTimeZone(new Date(), CAIRO, 'EEEE, d MMMM')}
        title="My Work"
        description="Your open tasks, most urgent first."
      />
      <Flash error={error} ok={ok} />
      <StatStrip items={summary} />

      {tasks.length === 0 ? (
        <Panel title="Open tasks" count={0}>
          <Empty>Nothing assigned to you right now.</Empty>
        </Panel>
      ) : (
        <>
          {renderTable('Overdue', overdue, 'overdue')}
          {renderTable('Due in the next 4 hours', dueSoon, 'soon')}
          {renderTable('Due today', dueToday)}
          {renderTable('Awaiting handover decision', waiting)}
          {renderTable('Upcoming', upcoming)}
        </>
      )}
    </div>
  )
}
