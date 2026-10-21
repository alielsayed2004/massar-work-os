export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, getMyProfile } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  inviteUser,
  saveUser,
  createTeam,
  createDepartment,
  assignTask,
  setTeamManager,
  setUserActive,
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
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await getMyProfile()
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
    <div className="massar-grid">
      <form action={createTeam} className="massar-subform massar-col-6">
        <h3>New team</h3>
        <div>
          <label htmlFor="team-name" style={s.label}>Team name</label>
          <input id="team-name" name="name" required style={s.field} />
        </div>
        <div>
          <label htmlFor="team-dep" style={s.label}>Department</label>
          <select id="team-dep" name="department_id" defaultValue="" style={s.field}>
            <option value="">No department</option>
            {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="team-lead" style={s.label}>Team lead</label>
          <select id="team-lead" name="manager_user_id" defaultValue="" style={s.field}>
            <option value="">Set later</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>
        <button type="submit" style={{ ...s.primary, marginTop: 'var(--space-2)' }}>Create team</button>
      </form>
      <form action={createDepartment} className="massar-subform massar-col-6">
        <h3>New department</h3>
        <p style={{ ...s.muted, margin: '0 0 var(--space-1)' }}>Optional. Groups teams, e.g. Creative or Production.</p>
        <div>
          <label htmlFor="dep-name" style={s.label}>Department name</label>
          <input id="dep-name" name="name" required style={s.field} />
        </div>
        <button type="submit" style={{ ...s.secondary, marginTop: 'var(--space-2)' }}>Create department</button>
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
            <CreatePanel label="Assign task" title="Assign a task" secondary>{assignForm}</CreatePanel>
            <CreatePanel label="Invite person" title="Invite someone to Massar">{inviteForm}</CreatePanel>
          </>
        }
      />
      <Flash error={error} ok={ok} />

      <Panel
        title="People"
        count={users.length}
        subtitle="Change anything in a row, then press Save on that row."
        flush
      >
        <div className="massar-table-wrap">
          <table className="massar-table massar-table-edit">
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Team</th>
                <th>WhatsApp</th>
                <th>Access</th>
                <th aria-label="Save" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const me = u.id === user.id
                const isClient = u.role === 'client'
                const row = `person-${u.id}`
                return (
                  <tr key={u.id} style={u.status === 'active' ? undefined : { opacity: 0.6 }}>
                    <td>
                      <input form={row} name="full_name" aria-label="Full name" required defaultValue={u.full_name} style={s.field} />
                      {me && <div className="massar-cell-sub">You</div>}
                    </td>
                    <td>
                      {me || isClient ? (
                        <span>{ROLE[u.role]}</span>
                      ) : (
                        <select form={row} name="role" aria-label={`Role of ${u.full_name}`} defaultValue={u.role} style={s.field}>
                          {(['member', 'manager', 'admin'] as const).map(r => <option key={r} value={r}>{ROLE[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      {me || isClient ? (
                        <span style={s.muted}>{u.team_id ? teamName[u.team_id] : '—'}</span>
                      ) : (
                        <select form={row} name="team_id" aria-label={`Team of ${u.full_name}`} defaultValue={u.team_id || ''} style={s.field}>
                          <option value="">No team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      {isClient ? (
                        <span style={s.muted}>—</span>
                      ) : (
                        <input form={row} name="whatsapp_phone" type="tel" inputMode="tel" aria-label={`WhatsApp of ${u.full_name}`} placeholder="01x xxxx xxxx" defaultValue={u.whatsapp_phone || ''} style={s.field} />
                      )}
                    </td>
                    <td>
                      <div className="massar-btn-row" style={{ flexWrap: 'nowrap' }}>
                        <StatusBadge status={u.status === 'active' ? 'active' : 'archived'} label={u.status === 'active' ? 'Active' : 'No access'} />
                        {!me && (
                          <button
                            type="submit"
                            form={`access-${u.id}`}
                            style={{ ...s.textBtn, fontWeight: 500, color: u.status === 'active' ? 'var(--color-text-muted)' : 'var(--color-text-strong)' }}
                          >
                            {u.status === 'active' ? 'Remove' : 'Restore'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <button type="submit" form={row} style={{ ...s.secondary, minHeight: 40 }}>Save</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* The row forms live outside the table (a <form> can't sit inside <tr>); fields join them with form="…" */}
        {users.map(u => (
          <form key={u.id} id={`person-${u.id}`} action={saveUser} hidden>
            <input type="hidden" name="user_id" value={u.id} />
            {(u.id === user.id || u.role === 'client') && <input type="hidden" name="role" value={u.role} />}
          </form>
        ))}
        {users.filter(u => u.id !== user.id).map(u => (
          <form key={u.id} id={`access-${u.id}`} action={setUserActive} hidden>
            <input type="hidden" name="user_id" value={u.id} />
            <input type="hidden" name="active" value={u.status === 'active' ? 'false' : 'true'} />
          </form>
        ))}
      </Panel>

      <Panel
        title="Teams"
        count={teams.length}
        subtitle="The team lead receives that team’s handover requests. Without a lead, requests go to admins."
        actions={<CreatePanel label="New team" title="Teams & departments" secondary>{structureForms}</CreatePanel>}
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
