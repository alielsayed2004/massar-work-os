export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { createTask } from '@/app/actions/tasks'
import { decideHandover } from '@/app/actions/handover'
import { TASK_STATUS, HANDOVER_REASON_LABEL, formatCairo, nowMs } from '@/lib/labels'
import { s, StatusBadge, Flash, Empty, PageHeader, Panel, StatStrip, CreatePanel } from '@/components/ui'

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
    return (
      <div>
        <PageHeader title="My Team" />
        <Panel title="Restricted"><Empty>This page is for team leads and administrators.</Empty></Panel>
      </div>
    )
  }

  // Teams this person leads (admin: all teams)
  const teamsQuery = supabase.from('teams').select('id, name').order('name')
  const { data: teams } = isAdmin ? await teamsQuery : await teamsQuery.eq('manager_user_id', user.id)
  const teamIds = (teams || []).map(t => t.id)

  if (!teamIds.length) {
    return (
      <div>
        <PageHeader title="My Team" />
        <Panel title="No team yet">
          <Empty>You aren’t the lead of any team yet. Ask an administrator to link you in Settings.</Empty>
        </Panel>
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
  const maxLoad = Math.max(1, ...load.map(p => p.open))
  const ownerLoad = (id: string) => tasks.filter(t => t.current_owner_user_id === id).length

  const createTaskForm = (
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
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="title" style={s.label}>Task title</label>
        <input id="title" name="title" required style={s.field} />
      </div>
      <div>
        <label htmlFor="project_id" style={s.label}>Project</label>
        <select id="project_id" name="project_id" defaultValue="" style={s.field}>
          <option value="">Internal task (no project)</option>
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
        <label htmlFor="reviewer_user_id" style={s.label}>Internal reviewer (optional)</label>
        <select id="reviewer_user_id" name="reviewer_user_id" defaultValue="" style={s.field}>
          <option value="">None</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="due_at" style={s.label}>Due (Cairo time)</label>
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
        <textarea id="description" name="description" rows={3} style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
      </div>
      <div>
        <button type="submit" style={s.primary}>Create task</button>
      </div>
    </form>
  )

  return (
    <div>
      <PageHeader
        eyebrow={(teams || []).map(t => t.name).join(' · ')}
        title="My Team"
        description="Decisions waiting on you come first, then anything running late."
        actions={<CreatePanel label="New task">{createTaskForm}</CreatePanel>}
      />
      <Flash error={error} ok={ok} />

      <StatStrip
        items={[
          { label: 'Handover requests', value: handovers.length, attention: handovers.length > 0 },
          { label: 'Overdue', value: overdue.length, attention: overdue.length > 0 },
          { label: 'Open tasks', value: tasks.length },
          { label: 'Team members', value: people.length },
        ]}
      />

      <div className="massar-split">
        <div>
          <Panel
            title="Handover requests"
            count={handovers.length}
            attention
            subtitle="Pick who takes over. Ownership changes only when you assign."
            flush
          >
            {handovers.length === 0 ? (
              <Empty>No requests waiting for you.</Empty>
            ) : (
              handovers.map(req => {
                const candidates = people.filter(
                  p => p.team_id === req.tasks?.team_id && p.id !== req.tasks?.current_owner_user_id
                )
                return (
                  <div key={req.id} className="massar-row">
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 'var(--space-3)' }}>{req.tasks?.title}</div>
                    <dl className="massar-meta" style={{ marginBottom: 'var(--space-3)' }}>
                      <div><dt>Current owner</dt><dd>{req.requester?.full_name}</dd></div>
                      <div><dt>Due</dt><dd><bdi>{formatCairo(req.tasks?.due_at)}</bdi></dd></div>
                      <div><dt>Reason</dt><dd>{HANDOVER_REASON_LABEL[req.reason] || req.reason}</dd></div>
                    </dl>
                    {req.internal_note && (
                      <p style={{ margin: '0 0 var(--space-3)', padding: '12px var(--space-3)', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-control)', fontSize: 14 }}>
                        {req.internal_note}
                      </p>
                    )}

                    <form action={decideHandover} style={s.formGrid}>
                      <input type="hidden" name="handover_id" value={req.id} />
                      <div>
                        <label htmlFor={`o-${req.id}`} style={s.label}>Reassign to</label>
                        <select id={`o-${req.id}`} name="new_owner_id" defaultValue="" style={s.field}>
                          <option value="">Select team member</option>
                          {candidates.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name} — {ownerLoad(p.id)} open</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`note-${req.id}`} style={s.label}>Note (optional)</label>
                        <input id={`note-${req.id}`} name="internal_note" style={s.field} />
                      </div>
                      <div className="massar-btn-row">
                        <button type="submit" name="decision" value="assigned" style={s.primary}>Assign</button>
                        <button type="submit" name="decision" value="declined" style={s.secondary}>Decline</button>
                      </div>
                    </form>
                  </div>
                )
              })
            )}
          </Panel>

          {overdue.length > 0 && (
            <Panel title="Overdue" count={overdue.length} attention flush>
              <TaskTable tasks={overdue} teamName={teamName} showTeam={isAdmin} overdue />
            </Panel>
          )}

          <Panel title="All open tasks" count={tasks.length} flush>
            {tasks.length === 0 ? <Empty>No open tasks in your team.</Empty> : <TaskTable tasks={tasks} teamName={teamName} showTeam={isAdmin} />}
          </Panel>
        </div>

        {/* Count of open tasks only — no invented capacity percentages */}
        <Panel title="Workload" subtitle="Open tasks per person" flush>
          {load.length === 0 ? (
            <Empty>No active members.</Empty>
          ) : (
            <ul className="massar-list">
              {[...load].sort((a, b) => b.open - a.open).map(p => (
                <li key={p.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-strong)' }}>{p.open}</span>
                    </div>
                    {isAdmin && p.team_id && <div className="massar-cell-sub">{teamName[p.team_id]}</div>}
                    <div className="massar-meter" aria-hidden="true"><span style={{ width: `${(p.open / maxLoad) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
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
      <table className="massar-table">
        <thead>
          <tr>
            <th>Task</th>
            {showTeam && <th>Team</th>}
            <th>Owner</th>
            <th>Due (Cairo)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td className="massar-cell-title">{t.title}</td>
              {showTeam && <td>{teamName[t.team_id]}</td>}
              <td>{t.owner?.full_name}</td>
              <td style={{ whiteSpace: 'nowrap' }}><bdi>{formatCairo(t.due_at)}</bdi></td>
              <td>
                {overdue ? <StatusBadge status="overdue" label="Overdue" /> : <StatusBadge status={t.status} label={TASK_STATUS[t.status]} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
