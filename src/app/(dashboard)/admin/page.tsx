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
} from '@/app/actions/admin'
import { ROLE } from '@/lib/labels'
import { s, Flash } from '@/components/ui'

type UserRow = { id: string; full_name: string; role: string; status: string; team_id: string | null }
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

  const [{ data: userRows }, { data: teamRows }, { data: departments }, { data: projects }, { data: clients }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, status, team_id').order('full_name'),
    supabase.from('teams').select('id, name, manager_user_id, departments ( name )').order('name'),
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
  ])
  const users = (userRows || []) as UserRow[]
  const teams = (teamRows || []) as unknown as TeamRow[]
  const staff = users.filter(u => u.role !== 'client' && u.status === 'active')
  const managers = staff.filter(u => u.role === 'manager' || u.role === 'admin')
  const teamName = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const nameOf = Object.fromEntries(users.map(u => [u.id, u.full_name]))

  return (
    <div>
      <h1 style={s.pageTitle}>Settings & Administration</h1>
      <Flash error={error} ok={ok} />

      {/* Users */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Invite User</h2>
        <form action={inviteUser} style={s.formGrid}>
          <div>
            <label htmlFor="i-name" style={s.label}>Full Name</label>
            <input id="i-name" name="full_name" required placeholder="e.g. Sarah Jenkins" style={s.field} />
          </div>
          <div>
            <label htmlFor="i-email" style={s.label}>Email Address</label>
            <input id="i-email" name="email" type="email" required placeholder="user@massar.co" style={s.field} />
          </div>
          <div>
            <label htmlFor="i-role" style={s.label}>Role</label>
            <select id="i-role" name="role" required defaultValue="member" style={s.field}>
              <option value="member">{ROLE.member}</option>
              <option value="manager">{ROLE.manager}</option>
              <option value="client">{ROLE.client}</option>
              <option value="admin">{ROLE.admin}</option>
            </select>
          </div>
          <div>
            <label htmlFor="i-team" style={s.label}>Team (Internal Staff)</label>
            <select id="i-team" name="team_id" defaultValue="" style={s.field}>
              <option value="">No Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="i-client" style={s.label}>Client Organization (Client Role Only)</label>
            <select id="i-client" name="client_id" defaultValue="" style={s.field}>
              <option value="">—</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" style={s.primary}>Send Invitation</button>
          </div>
        </form>
      </section>

      <section style={s.section}>
        <h2 style={s.sectionTitle}>System Users ({users.length})</h2>
        <div className="massar-table-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Role & Team</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{u.full_name}</td>
                  <td style={s.td}>
                    {u.id === user.id ? (
                      <span>{ROLE[u.role]} (You)</span>
                    ) : (
                      <form action={updateUserRole} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <select name="role" aria-label={`Role of ${u.full_name}`} defaultValue={u.role} style={{ ...s.field, width: 'auto' }}>
                          {Object.entries(ROLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <select name="team_id" aria-label={`Team of ${u.full_name}`} defaultValue={u.team_id || ''} style={{ ...s.field, width: 'auto' }}>
                          <option value="">No Team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button type="submit" style={s.secondary}>Save</button>
                      </form>
                    )}
                  </td>
                  <td style={s.td}>{u.status === 'active' ? 'Active' : 'Archived'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Structure */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Departments & Teams</h2>
        <div style={s.formGrid}>
          <form action={createDepartment} style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <label htmlFor="dep-name" style={s.label}>New Department</label>
            <input id="dep-name" name="name" required placeholder="e.g. Design & Creative" style={s.field} />
            <button type="submit" style={s.secondary}>Create Department</button>
          </form>
          <form action={createTeam} style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <label htmlFor="team-name" style={s.label}>New Team</label>
            <input id="team-name" name="name" required placeholder="e.g. Brand Identity" style={s.field} />
            <select name="department_id" aria-label="Department" defaultValue="" style={s.field}>
              <option value="">Without Department</option>
              {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select name="manager_user_id" aria-label="Team Lead" defaultValue="" style={s.field}>
              <option value="">Team Lead (Can assign later)</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <button type="submit" style={s.secondary}>Create Team</button>
          </form>
        </div>

        <div className="massar-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Team</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Lead — Receives Handover Requests</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{t.name}</td>
                  <td style={s.td}>{t.departments?.name || '—'}</td>
                  <td style={s.td}>
                    <form action={setTeamManager} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <input type="hidden" name="team_id" value={t.id} />
                      <select name="manager_user_id" aria-label={`Lead of ${t.name}`} defaultValue={t.manager_user_id || ''} style={{ ...s.field, width: 'auto' }}>
                        <option value="">No Lead Assigned (Requests escalate to admin)</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                      <button type="submit" style={s.secondary}>Save</button>
                    </form>
                    {!t.manager_user_id && <div style={s.muted}>No lead assigned yet.</div>}
                    {t.manager_user_id && !managers.some(m => m.id === t.manager_user_id) && (
                      <div style={s.muted}>Current lead ({nameOf[t.manager_user_id]}) is inactive.</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick task */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Quick Task Assignment</h2>
        <form action={assignTask} style={s.formGrid}>
          <div>
            <label htmlFor="a-title" style={s.label}>Task Title</label>
            <input id="a-title" name="title" required placeholder="e.g. Review Client Feedback" style={s.field} />
          </div>
          <div>
            <label htmlFor="a-owner" style={s.label}>Owner (Must belong to a team)</label>
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
              <option value="">Without Project</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="a-due" style={s.label}>Due Date (Cairo Time)</label>
            <input id="a-due" name="due_at" type="datetime-local" required style={s.field} />
          </div>
          <div>
            <button type="submit" style={s.primary}>Assign Task</button>
          </div>
        </form>
      </section>
    </div>
  )
}
