export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  inviteUser,
  updateUserRole,
  createTeam,
  createDepartment,
  assignTask,
  setTeamManager,
  setUserActive,
  setUserWhatsApp,
} from '@/app/actions/admin'
import { ROLE } from '@/lib/labels'
import { s, Flash, PageHeader, Panel, CreatePanel, StatusBadge, Empty } from '@/components/ui'

type UserRow = { id: string; full_name: string; role: string; status: string; team_id: string | null; whatsapp_phone: string | null }
type TeamRow = { id: string; name: string; manager_user_id: string | null; departments: { name: string } | null }

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/my-work')

  const [{ data: userRows }, { data: teamRows }, { data: departments }, { data: projects }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, status, team_id, whatsapp_phone').order('full_name'),
    supabase.from('teams').select('id, name, manager_user_id, departments ( name )').order('name'),
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
  ])
  const users = (userRows || []) as UserRow[]
  const teams = (teamRows || []) as unknown as TeamRow[]
  const staff = users.filter(u => u.role !== 'client' && u.status === 'active')
  const managers = staff.filter(u => u.role === 'manager' || u.role === 'admin')
  const teamName = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const nameOf = Object.fromEntries(users.map(u => [u.id, u.full_name]))

  const inviteForm = (
    <form action={inviteUser} style={s.formGrid}>
      <div>
        <label htmlFor="i-name" style={s.label}>Full name</label>
        <input id="i-name" name="full_name" required style={s.field} />
      </div>
      <div>
        <label htmlFor="i-email" style={s.label}>Email</label>
        <input id="i-email" name="email" type="email" required style={s.field} />
      </div>
      <div>
        <label htmlFor="i-wa" style={s.label}>WhatsApp (for nudges)</label>
        <input id="i-wa" name="whatsapp_phone" type="tel" inputMode="tel" placeholder="01x xxxx xxxx" style={s.field} />
      </div>
      <div>
        <label htmlFor="i-role" style={s.label}>Role</label>
        <select id="i-role" name="role" required defaultValue="member" style={s.field}>
          <option value="member">{ROLE.member}</option>
          <option value="manager">{ROLE.manager}</option>
          <option value="admin">{ROLE.admin}</option>
        </select>
      </div>
      <div>
        <label htmlFor="i-team" style={s.label}>Team (staff only)</label>
        <select id="i-team" name="team_id" defaultValue="" style={s.field}>
          <option value="">No team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <button type="submit" style={s.primary}>Send invitation</button>
      </div>
    </form>
  )

  const assignForm = (
    <form action={assignTask} style={s.formGrid}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="a-title" style={s.label}>Task title</label>
        <input id="a-title" name="title" required style={s.field} />
      </div>
      <div>
        <label htmlFor="a-owner" style={s.label}>Owner (must be in a team)</label>
        <select id="a-owner" name="assignee_id" required defaultValue="" style={s.field}>
          <option value="" disabled>Select owner</option>
          {staff.filter(u => u.team_id).map(u => (
            <option key={u.id} value={u.id}>{u.full_name} — {teamName[u.team_id!]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="a-project" style={s.label}>Project</label>
        <select id="a-project" name="project_id" defaultValue="" style={s.field}>
          <option value="">No project</option>
          {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="a-due" style={s.label}>Due (Cairo time)</label>
        <input id="a-due" name="due_at" type="datetime-local" required style={s.field} />
      </div>
      <div>
        <button type="submit" style={s.primary}>Assign task</button>
      </div>
    </form>
  )

  const structureForms = (
    <div style={s.formGrid}>
      <form action={createDepartment} style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
        <label htmlFor="dep-name" style={s.label}>New department</label>
        <input id="dep-name" name="name" required style={s.field} />
        <button type="submit" style={s.secondary}>Create department</button>
      </form>
      <form action={createTeam} style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
        <label htmlFor="team-name" style={s.label}>New team</label>
        <input id="team-name" name="name" required style={s.field} />
        <select name="department_id" aria-label="Department" defaultValue="" style={s.field}>
          <option value="">No department</option>
          {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select name="manager_user_id" aria-label="Team lead" defaultValue="" style={s.field}>
          <option value="">Team lead (can be set later)</option>
          {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <button type="submit" style={s.primary}>Create team</button>
      </form>
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Add or remove people, set roles, and organise teams. Partners see and approve everything."
        actions={
          <>
            <CreatePanel label="Assign task" secondary>{assignForm}</CreatePanel>
            <CreatePanel label="Invite user">{inviteForm}</CreatePanel>
          </>
        }
      />
      <Flash error={error} ok={ok} />

      <Panel title="People" count={users.length} flush>
        <div className="massar-table-wrap">
          <table className="massar-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role & team</th>
                <th>WhatsApp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="massar-cell-title">{u.full_name}</td>
                  <td>
                    {u.id === user.id ? (
                      <span>{ROLE[u.role]} <span style={s.muted}>(you)</span></span>
                    ) : (
                      <form action={updateUserRole} className="massar-btn-row">
                        <input type="hidden" name="user_id" value={u.id} />
                        <select name="role" aria-label={`Role of ${u.full_name}`} defaultValue={u.role} style={{ ...s.field, width: 'auto' }}>
                          {Object.entries(ROLE).filter(([v]) => v !== 'client' || u.role === 'client').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <select name="team_id" aria-label={`Team of ${u.full_name}`} defaultValue={u.team_id || ''} style={{ ...s.field, width: 'auto' }}>
                          <option value="">No team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button type="submit" style={s.secondary}>Save</button>
                      </form>
                    )}
                  </td>
                  <td>
                    {u.role !== 'client' && (
                      <form action={setUserWhatsApp} className="massar-btn-row" style={{ flexWrap: 'nowrap' }}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input name="whatsapp_phone" type="tel" inputMode="tel" aria-label={`WhatsApp of ${u.full_name}`} placeholder="01x xxxx xxxx" defaultValue={u.whatsapp_phone || ''} style={{ ...s.field, width: 150 }} />
                        <button type="submit" style={s.secondary}>Save</button>
                      </form>
                    )}
                  </td>
                  <td>
                    <div className="massar-btn-row" style={{ flexWrap: 'nowrap' }}>
                      <StatusBadge status={u.status === 'active' ? 'active' : 'archived'} label={u.status === 'active' ? 'Active' : 'No access'} />
                      {u.id !== user.id && (
                        <form action={setUserActive}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="active" value={u.status === 'active' ? 'false' : 'true'} />
                          <button type="submit" style={{ ...s.textBtn, color: u.status === 'active' ? 'var(--color-text-muted)' : 'var(--color-text-strong)' }}>
                            {u.status === 'active' ? 'Remove access' : 'Restore'}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Teams"
        count={teams.length}
        subtitle="The team lead receives that team’s handover requests. Without a lead, requests go to admins."
        actions={<CreatePanel label="New team or department" secondary>{structureForms}</CreatePanel>}
        flush
      >
        {teams.length === 0 ? (
          <Empty>No teams yet.</Empty>
        ) : (
          <div className="massar-table-wrap">
            <table className="massar-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Department</th>
                  <th>Team lead</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id}>
                    <td className="massar-cell-title">{t.name}</td>
                    <td>{t.departments?.name || '—'}</td>
                    <td>
                      <form action={setTeamManager} className="massar-btn-row">
                        <input type="hidden" name="team_id" value={t.id} />
                        <select name="manager_user_id" aria-label={`Lead of ${t.name}`} defaultValue={t.manager_user_id || ''} style={{ ...s.field, width: 'auto' }}>
                          <option value="">No lead (requests go to admins)</option>
                          {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select>
                        <button type="submit" style={s.secondary}>Save</button>
                      </form>
                      {t.manager_user_id && !managers.some(m => m.id === t.manager_user_id) && (
                        <div className="massar-cell-sub">Current lead ({nameOf[t.manager_user_id]}) is inactive.</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
