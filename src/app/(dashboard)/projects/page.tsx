export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { createProject, createClientRecord, archiveProject } from '@/app/actions/projects'
import { s, Flash, Empty } from '@/components/ui'

const PROJECT_STATUS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  archived: 'Archived',
}

type ProjectRow = {
  id: string
  name: string
  status: string
  internal_team_id: string | null
  clients: { company_name: string } | null
  teams: { name: string } | null
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  if (!isAdmin && profile?.role !== 'manager') return <Empty>This page is reserved for administrators and team managers.</Empty>

  const teamsQuery = supabase.from('teams').select('id, name').order('name')
  const [{ data: clients }, { data: teams }, { data: rows }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('status', 'active').order('company_name'),
    isAdmin ? teamsQuery : teamsQuery.eq('manager_user_id', user.id),
    supabase
      .from('projects')
      .select('id, name, status, internal_team_id, clients ( company_name ), teams ( name )')
      .order('created_at', { ascending: false }),
  ])
  const projects = (rows || []) as unknown as ProjectRow[]
  const myTeams = new Set((teams || []).map(t => t.id))

  return (
    <div>
      <h1 style={s.pageTitle}>Clients & Projects</h1>
      <Flash error={error} ok={ok} />

      <section style={s.section}>
        <h2 style={s.sectionTitle}>New Project</h2>
        <form action={createProject} style={s.formGrid}>
          <div>
            <label htmlFor="p-name" style={s.label}>Project Name</label>
            <input id="p-name" name="name" required style={s.field} />
          </div>
          <div>
            <label htmlFor="p-client" style={s.label}>Client</label>
            <select id="p-client" name="client_id" required defaultValue="" style={s.field}>
              <option value="" disabled>Select client</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-team" style={s.label}>Assigned Team</label>
            <select id="p-team" name="internal_team_id" required={!isAdmin} defaultValue="" style={s.field}>
              <option value="">{isAdmin ? 'No team assigned' : 'Select your team'}</option>
              {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" style={s.primary}>Create Project</button>
          </div>
        </form>
      </section>

      {isAdmin && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>New Client</h2>
          <form action={createClientRecord} style={s.formGrid}>
            <div>
              <label htmlFor="c-name" style={s.label}>Company Name</label>
              <input id="c-name" name="company_name" required style={s.field} />
            </div>
            <div>
              <button type="submit" style={s.secondary}>Add Client</button>
            </div>
          </form>
        </section>
      )}

      <h2 style={s.sectionTitle}>Projects</h2>
      {projects.length === 0 ? (
        <Empty>No projects created yet.</Empty>
      ) : (
        <div className="massar-table-wrap">
          <table style={{ ...s.table, backgroundColor: 'var(--color-surface)' }}>
            <thead>
              <tr>
                <th style={s.th}>Project</th>
                <th style={s.th}>Client</th>
                <th style={s.th}>Team</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{p.name}</td>
                  <td style={s.td}>{p.clients?.company_name}</td>
                  <td style={s.td}>{p.teams?.name || '—'}</td>
                  <td style={s.td}>{PROJECT_STATUS[p.status] || p.status}</td>
                  <td style={s.td}>
                    {p.status !== 'archived' && (isAdmin || (p.internal_team_id && myTeams.has(p.internal_team_id))) && (
                      <form action={archiveProject}>
                        <input type="hidden" name="project_id" value={p.id} />
                        <button type="submit" style={s.textBtn}>Archive</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
