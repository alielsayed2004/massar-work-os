export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { createTask } from '@/app/actions/tasks'
import { decideHandover } from '@/app/actions/handover'
import { TASK_STATUS, HANDOVER_REASON_LABEL, formatCairo, nowMs } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty } from '@/components/ui'

type Person = { id: string; full_name: string; team_id: string | null; role: string }
type TeamTask = {
  id: string
  title: string
  status: string
  due_at: string
  team_id: string
  current_owner_user_id: string
  owner: { full_name: string } | null
}
type Handover = {
  id: string
  reason: string
  internal_note: string | null
  created_at: string
  tasks: { id: string; title: string; due_at: string; team_id: string; current_owner_user_id: string } | null
  requester: { full_name: string } | null
}

export default async function MyTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('team_id, role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  if (!isAdmin && profile?.role !== 'manager') {
    return <Empty>This page is restricted to team leads and administrators.</Empty>
  }

  // Teams this person leads (admin: all teams)
  const teamsQuery = supabase.from('teams').select('id, name').order('name')
  const { data: teams } = isAdmin ? await teamsQuery : await teamsQuery.eq('manager_user_id', user.id)
  const teamIds = (teams || []).map(t => t.id)

  if (!teamIds.length) {
    return (
      <div>
        <h1 style={s.pageTitle}>My Team</h1>
        <Empty>You have not been assigned as manager to any team yet. Ask an administrator to link your profile in Settings.</Empty>
      </div>
    )
  }

  const [{ data: taskRows }, { data: peopleRows }, { data: projects }, { data: handoverRows }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, due_at, team_id, current_owner_user_id, owner:profiles!tasks_current_owner_user_id_fkey ( full_name )')
      .in('team_id', teamIds)
      .not('status', 'in', '(completed,canceled)')
      .order('due_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, team_id, role')
      .in('team_id', teamIds)
      .eq('status', 'active')
      .neq('role', 'client')
      .order('full_name'),
    supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    supabase
      .from('handover_requests')
      .select(`id, reason, internal_note, created_at,
        tasks ( id, title, due_at, team_id, current_owner_user_id ),
        requester:profiles!handover_requests_requester_user_id_fkey ( full_name )`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])
  const tasks = (taskRows || []) as unknown as TeamTask[]
  const people = (peopleRows || []) as Person[]
  const handovers = (handoverRows || []) as unknown as Handover[]
  const teamName = Object.fromEntries((teams || []).map(t => [t.id, t.name]))

  const now = nowMs()
  const overdue = tasks.filter(t => new Date(t.due_at).getTime() < now)
  const load = people.map(p => ({ ...p, open: tasks.filter(t => t.current_owner_user_id === p.id).length }))

  return (
    <div>
      <h1 style={s.pageTitle}>My Team</h1>
      <Flash error={error} ok={ok} />

      {/* 1. Decisions waiting on the manager come first */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Handover Requests ({handovers.length})</h2>
        {handovers.length === 0 ? (
          <Empty>No handover requests awaiting your review.</Empty>
        ) : (
          handovers.map(req => {
            const candidates = people.filter(
              p => p.team_id === req.tasks?.team_id && p.id !== req.tasks?.current_owner_user_id
            )
            const ownerLoad = (id: string) => tasks.filter(t => t.current_owner_user_id === id).length
            return (
              <div key={req.id} style={{ padding: 'var(--space-3) 0', borderBottom: 'var(--border-width) solid var(--color-divider)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div><span style={{ ...s.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</span><div style={{ fontWeight: 600 }}>{req.tasks?.title}</div></div>
                  <div><span style={{ ...s.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Owner</span><div>{req.requester?.full_name}</div></div>
                  <div><span style={{ ...s.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</span><div><bdi>{formatCairo(req.tasks?.due_at)}</bdi></div></div>
                  <div><span style={{ ...s.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</span><div>{HANDOVER_REASON_LABEL[req.reason] || req.reason}</div></div>
                </div>
                {req.internal_note && <p style={{ margin: '0 0 var(--space-3)' }}><span style={s.muted}>Progress Note: </span>{req.internal_note}</p>}

                <form action={decideHandover} style={s.formGrid}>
                  <input type="hidden" name="handover_id" value={req.id} />
                  <div>
                    <label htmlFor={`o-${req.id}`} style={s.label}>Reassign To</label>
                    <select id={`o-${req.id}`} name="new_owner_id" defaultValue="" style={s.field}>
                      <option value="">Select team member</option>
                      {candidates.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} — {ownerLoad(p.id)} active tasks</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`note-${req.id}`} style={s.label}>Decision Notes (Optional)</label>
                    <input id={`note-${req.id}`} name="internal_note" placeholder="Optional comments on reassignment…" style={s.field} />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <button type="submit" name="decision" value="assigned" style={s.primary}>Assign Task</button>
                    <button type="submit" name="decision" value="declined" style={s.secondary}>Decline Request</button>
                  </div>
                </form>
              </div>
            )
          })
        )}
      </section>

      {/* 2. Overdue */}
      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={s.sectionTitle}>Overdue Tasks ({overdue.length})</h2>
        {overdue.length === 0 ? <Empty>No overdue team tasks.</Empty> : <TaskTable tasks={overdue} teamName={teamName} showTeam={isAdmin} overdue />}
      </section>

      {/* 3. Load (count of open tasks only — no invented percentages) */}
      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={s.sectionTitle}>Active Workload Per Member</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
          {load.map(p => (
            <li key={p.id} style={{ borderTop: 'var(--border-width) solid var(--color-divider)', paddingTop: 'var(--space-2)' }}>
              <strong>{p.full_name}</strong>
              <div style={{ ...s.muted, fontSize: '13px' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, color: 'var(--color-text-strong)' }}>{p.open}</span> active tasks{isAdmin && p.team_id ? ` · ${teamName[p.team_id]}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Create task */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Create New Task</h2>
        <form action={createTask} style={s.formGrid}>
          {teamIds.length === 1 ? (
            <input type="hidden" name="team_id" value={teamIds[0]} />
          ) : (
            <div>
              <label htmlFor="team_id" style={s.label}>Team</label>
              <select id="team_id" name="team_id" required defaultValue="" style={s.field}>
                <option value="" disabled>Select team</option>
                {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="title" style={s.label}>Task Title</label>
            <input id="title" name="title" required placeholder="e.g. Design Brand Identity Guidelines" style={s.field} />
          </div>
          <div>
            <label htmlFor="project_id" style={s.label}>Project</label>
            <select id="project_id" name="project_id" defaultValue="" style={s.field}>
              <option value="">Internal Task (No Project)</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="owner_id" style={s.label}>Owner</label>
            <select id="owner_id" name="owner_id" required defaultValue="" style={s.field}>
              <option value="" disabled>Select owner</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.full_name}{isAdmin && p.team_id ? ` — ${teamName[p.team_id]}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reviewer_user_id" style={s.label}>Internal Reviewer (Optional)</label>
            <select id="reviewer_user_id" name="reviewer_user_id" defaultValue="" style={s.field}>
              <option value="">None</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="due_at" style={s.label}>Due Date (Cairo Time)</label>
            <input id="due_at" type="datetime-local" name="due_at" required style={s.field} />
          </div>
          <div>
            <label htmlFor="priority" style={s.label}>Priority</label>
            <select id="priority" name="priority" defaultValue="medium" style={s.field}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="description" style={s.label}>Description</label>
            <textarea id="description" name="description" rows={3} placeholder="Task scope and deliverables…" style={{ ...s.field, padding: 'var(--space-2) var(--space-3)' }} />
          </div>
          <div>
            <button type="submit" style={s.primary}>Create Task</button>
          </div>
        </form>
      </section>

      {/* 5. All open team tasks */}
      <section>
        <h2 style={s.sectionTitle}>All Open Team Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? <Empty>No active tasks in team.</Empty> : <TaskTable tasks={tasks} teamName={teamName} showTeam={isAdmin} />}
      </section>
    </div>
  )
}

function TaskTable({
  tasks,
  teamName,
  showTeam,
  overdue,
}: {
  tasks: TeamTask[]
  teamName: Record<string, string>
  showTeam: boolean
  overdue?: boolean
}) {
  return (
    <div className="massar-table-wrap">
      <table style={{ ...s.table, backgroundColor: 'var(--color-surface)' }}>
        <thead>
          <tr>
            <th style={s.th}>Task</th>
            {showTeam && <th style={s.th}>Team</th>}
            <th style={s.th}>Owner</th>
            <th style={s.th}>Due (Cairo)</th>
            <th style={s.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td style={{ ...s.td, fontWeight: 600 }}>{t.title}</td>
              {showTeam && <td style={s.td}>{teamName[t.team_id]}</td>}
              <td style={s.td}>{t.owner?.full_name}</td>
              <td style={s.td}><bdi>{formatCairo(t.due_at)}</bdi></td>
              <td style={s.td}>
                {overdue ? <StatusBadge status="overdue" label="Overdue" /> : <StatusBadge status={t.status} label={TASK_STATUS[t.status]} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
