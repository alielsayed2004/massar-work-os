export const instant = false
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatInTimeZone } from 'date-fns-tz'
import { updateTaskStatus, addComment } from '@/app/actions/tasks'
import { requestHandover } from '@/app/actions/handover'
import { CAIRO, TASK_STATUS, HANDOVER_REASONS, formatCairo, nowMs } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty } from '@/components/ui'

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
  todo: [{ status: 'in_progress', label: 'Start Work' }],
  in_progress: [{ status: 'completed', label: 'Mark Complete' }],
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

  const summary = [
    { label: 'Requires Attention', value: overdue.length + dueSoon.length },
    { label: 'Due Today', value: dueToday.length + dueSoon.length },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length },
    { label: 'Awaiting Handover', value: waiting.length },
  ]

  const renderTable = (title: string, list: Task[], flag?: 'overdue' | 'soon') => {
    if (!list.length) return null
    return (
      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={s.sectionTitle}>{title} ({list.length})</h2>
        <div className="massar-table-wrap">
          <table style={{ ...s.table, backgroundColor: 'var(--color-surface)' }}>
            <thead>
              <tr>
                <th style={s.th}>Task</th>
                <th style={s.th}>Project</th>
                <th style={s.th}>Due (Cairo)</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(task => (
                <tr key={task.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{task.title}</td>
                  <td style={s.td}>{task.projects?.name || '—'}</td>
                  <td style={s.td}>
                    <bdi>{formatCairo(task.due_at)}</bdi>
                    {flag === 'overdue' && <div style={{ marginTop: 'var(--space-1)' }}><StatusBadge status="overdue" label="Overdue" /></div>}
                    {flag === 'soon' && <div style={{ marginTop: 'var(--space-1)' }}><StatusBadge status="internal_review" label="Due within 4 hrs" /></div>}
                  </td>
                  <td style={s.td}>
                    <StatusBadge status={task.status} label={pendingIds.has(task.id) ? 'Pending Lead Review' : TASK_STATUS[task.status]} />
                  </td>
                  <td style={{ ...s.td, minWidth: '260px' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {(NEXT_STEPS[task.status] || []).map(step => (
                        <form key={step.status} action={updateTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value={step.status} />
                          <button type="submit" style={s.primary}>{step.label}</button>
                        </form>
                      ))}
                      {task.status !== 'blocked' && (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="blocked" />
                          <button type="submit" style={s.textBtn}>Mark Blocked</button>
                        </form>
                      )}
                    </div>

                    <details style={{ marginTop: 'var(--space-2)' }}>
                      <summary style={{ cursor: 'pointer', fontSize: 'var(--text-label)', fontWeight: 500 }}>Add Note</summary>
                      <form action={addComment} style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <label htmlFor={`c-${task.id}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Note</label>
                        <input id={`c-${task.id}`} name="content" placeholder="Add internal progress note…" required style={s.field} />
                        <button type="submit" style={s.secondary}>Save</button>
                      </form>
                    </details>

                    {!pendingIds.has(task.id) && (
                      <details style={{ marginTop: 'var(--space-2)' }}>
                        <summary style={{ cursor: 'pointer', fontSize: 'var(--text-label)', fontWeight: 500 }}>Request Handover</summary>
                        <form action={requestHandover} style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <div>
                            <label htmlFor={`r-${task.id}`} style={s.label}>Reason</label>
                            <select id={`r-${task.id}`} name="reason" required defaultValue="" style={s.field}>
                              <option value="" disabled>Select reason</option>
                              {HANDOVER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`n-${task.id}`} style={s.label}>Progress so far (Optional)</label>
                            <textarea id={`n-${task.id}`} name="internal_note" rows={2} placeholder="Explain progress and handover context…" style={{ ...s.field, padding: 'var(--space-2) var(--space-3)' }} />
                          </div>
                          <p style={{ ...s.muted, margin: 0, fontSize: '12px' }}>Ownership remains with you until approved by team lead.</p>
                          <button type="submit" style={s.attention}>Submit Handover Request</button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div>
      <h1 style={s.pageTitle}>My Work</h1>
      <Flash error={error} ok={ok} />

      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', margin: '0 0 var(--space-5)' }}>
        {summary.map(item => (
          <div key={item.label} style={{ borderTop: 'var(--border-width) solid var(--color-border-strong)', paddingTop: 'var(--space-2)' }}>
            <dt style={{ ...s.muted, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 600 }}>{item.label}</dt>
            <dd style={{ margin: 0, fontSize: '36px', fontWeight: 500, fontFamily: 'var(--font-serif)', color: 'var(--color-text-strong)', lineHeight: 1.1 }}>{item.value}</dd>
          </div>
        ))}
      </dl>

      {tasks.length === 0 ? (
        <Empty>No active tasks assigned to you right now.</Empty>
      ) : (
        <>
          {renderTable('Overdue Tasks', overdue, 'overdue')}
          {renderTable('Due in Next Few Hours', dueSoon, 'soon')}
          {renderTable('Due Today', dueToday)}
          {renderTable('Awaiting Handover Decision', waiting)}
          {renderTable('Upcoming Tasks', upcoming)}
        </>
      )}
    </div>
  )
}
