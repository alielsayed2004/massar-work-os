export const instant = false;
import { createClient } from '@/lib/supabase/server'
import { createProject, createClientRecord, archiveProject } from '@/app/actions/projects'
import { s, Flash, Empty, PageHeader, Panel, CreatePanel, StatusBadge } from '@/components/ui'

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
  if (!isAdmin && profile?.role !== 'manager') return <Empty>This page is for administrators and team leads.</Empty>

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

  const active = projects.filter(p => p.status !== 'archived')
  const archived = projects.filter(p => p.status === 'archived')

  const projectForm = (
    <form action={createProject} style={s.formGrid}>
      <div>
        <label htmlFor="p-name" style={s.label}>Project name</label>
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
        <label htmlFor="p-team" style={s.label}>Team</label>
        <select id="p-team" name="internal_team_id" required={!isAdmin} defaultValue="" style={s.field}>
          <option value="">{isAdmin ? 'No team assigned' : 'Select your team'}</option>
          {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <button type="submit" style={s.primary}>Create project</button>
      </div>
    </form>
  )

  const clientForm = (
    <form action={createClientRecord} style={s.formGrid}>
      <div>
        <label htmlFor="c-name" style={s.label}>Company name</label>
        <input id="c-name" name="company_name" required style={s.field} />
      </div>
      <div>
        <button type="submit" style={s.primary}>Add client</button>
      </div>
    </form>
  )

  const table = (rows: ProjectRow[]) => (
    <div className="massar-table-wrap">
      <table className="massar-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Team</th>
            <th>Status</th>
            <th style={{ textAlign: 'end' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td className="massar-cell-title">{p.name}</td>
              <td>{p.clients?.company_name}</td>
              <td>{p.teams?.name || '—'}</td>
              <td><StatusBadge status={p.status} label={PROJECT_STATUS[p.status] || p.status} /></td>
              <td style={{ textAlign: 'end' }}>
                {p.status !== 'archived' && (isAdmin || (p.internal_team_id && myTeams.has(p.internal_team_id))) && (
                  <form action={archiveProject}>
                    <input type="hidden" name="project_id" value={p.id} />
                    <button type="submit" style={{ ...s.textBtn, color: 'var(--color-text-muted)' }}>Archive</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Clients & Projects"
        description={`${clients?.length || 0} active clients · ${active.length} projects`}
        actions={
          <>
            {isAdmin && <CreatePanel label="New client" secondary>{clientForm}</CreatePanel>}
            <CreatePanel label="New project">{projectForm}</CreatePanel>
          </>
        }
      />
      <Flash error={error} ok={ok} />

      <Panel title="Projects" count={active.length} flush>
        {active.length === 0 ? <Empty>No projects yet.</Empty> : table(active)}
      </Panel>

      {archived.length > 0 && (
        <details className="massar-disclosure">
          <summary style={{ ...s.textBtn, marginBottom: 'var(--space-3)' }}>Archived projects ({archived.length})</summary>
          <Panel title="Archived" count={archived.length} flush>{table(archived)}</Panel>
        </details>
      )}
    </div>
  )
}
