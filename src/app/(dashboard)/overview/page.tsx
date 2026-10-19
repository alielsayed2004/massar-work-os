export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { formatInTimeZone } from 'date-fns-tz'
import { createClient } from '@/lib/supabase/server'
import { createTask } from '@/app/actions/tasks'
import { checkDelivery } from '@/app/actions/delivery'
import { CAIRO, formatCairo, nowMs } from '@/lib/labels'
import { STAGES, stageOf, changesRequested, whatsappLink, dueLabel, hoursUntil, type Stage } from '@/lib/workflow'
import { siteOrigin } from '@/lib/site'
import { s, Flash, Empty, PageHeader, CreatePanel } from '@/components/ui'
import { Icon } from '@/components/icons'
import VersionUpload from '@/components/VersionUpload'

type Client = { company_name: string; contact_name: string | null; whatsapp_phone: string | null } | null
type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  due_at: string
  updated_at: string
  current_owner_user_id: string
  projects: { name: string; clients: Client } | null
  owner: { full_name: string } | null
  files: { id: string; original_name: string }[]
}
type FileRow = { id: string; original_name: string; file_size: number | null }
type Version = { id: string; version_number: number; status: string; shared_at: string | null; files: FileRow[] }
type Delivery = { id: string; source_task_id: string; summary_status: string; current_version_id: string | null; deliverable_versions: Version[] }
type Person = { id: string; full_name: string; role: string; team_id: string | null }

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; error?: string; ok?: string }>
}) {
  await connection()
  const { person: personId, error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isPartner = me?.role === 'admin'
  if (!isPartner && me?.role !== 'manager') {
    return (
      <div>
        <PageHeader title="Overview" />
        <Empty>This page is for partners and team leads.</Empty>
      </div>
    )
  }

  const now = nowMs()
  const since = new Date(now - 14 * 864e5).toISOString()

  const [{ data: peopleRows }, { data: taskRows }, { data: projects }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, team_id').in('role', ['admin', 'manager', 'member']).eq('status', 'active').order('full_name'),
    supabase
      .from('tasks')
      .select(`id, title, description, status, due_at, updated_at, current_owner_user_id,
        projects ( name, clients ( company_name, contact_name, whatsapp_phone ) ),
        owner:profiles!tasks_current_owner_user_id_fkey ( full_name ),
        files ( id, original_name )`)
      .neq('status', 'canceled')
      .or(`status.neq.completed,updated_at.gte."${since}"`)
      .order('due_at', { ascending: true }),
    supabase.from('projects').select('id, name, clients ( company_name )').eq('status', 'active').order('name'),
  ])
  const tasks = (taskRows || []) as unknown as TaskRow[]
  const taskIds = tasks.map(t => t.id)

  const { data: deliveryRows } = taskIds.length
    ? await supabase
        .from('deliverables')
        .select(`id, source_task_id, summary_status, current_version_id,
          deliverable_versions!deliverable_versions_deliverable_id_fkey ( id, version_number, status, shared_at, files ( id, original_name, file_size ) )`)
        .in('source_task_id', taskIds)
        .order('created_at', { ascending: true })
    : { data: [] }
  // Later rows win, so each task maps to its newest delivery
  const deliveryOf = new Map(((deliveryRows || []) as unknown as Delivery[]).map(d => [d.source_task_id, d]))

  const people = ((peopleRows || []) as Person[]).filter(p => tasks.some(t => t.current_owner_user_id === p.id) || p.role !== 'admin')
  const origin = await siteOrigin()

  const cards = tasks.map(t => {
    const delivery = deliveryOf.get(t.id)
    const version = delivery?.deliverable_versions?.find(v => v.id === delivery.current_version_id)
    const stage = stageOf(t.status, delivery?.summary_status)
    const late = stage !== 'done' && stage !== 'client' && hoursUntil(t.due_at, now) < 0
    return { task: t, delivery, version, stage, late }
  })

  const openFor = (id: string) => cards.filter(c => c.task.current_owner_user_id === id && c.stage !== 'done')
  const visible = personId ? cards.filter(c => c.task.current_owner_user_id === personId) : cards
  const byStage = (stage: Stage) => visible.filter(c => c.stage === stage)
  const open = visible.filter(c => c.stage !== 'done')
  // Work waiting on someone other than its owner is where it gets stuck
  const bottleneck = STAGES.filter(st => st.key === 'check' || st.key === 'client')
    .map(st => ({ ...st, n: byStage(st.key).length }))
    .sort((a, b) => b.n - a.n)[0]
  const selected = people.find(p => p.id === personId)

  const newTaskForm = (
    <form action={createTask} style={s.formGrid}>
      <input type="hidden" name="back" value="/overview" />
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="t-title" style={s.label}>What needs doing?</label>
        <input id="t-title" name="title" required style={s.field} />
      </div>
      <div>
        <label htmlFor="t-owner" style={s.label}>Who does it</label>
        <select id="t-owner" name="owner_id" required defaultValue={personId || ''} style={s.field}>
          <option value="" disabled>Select person</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.full_name} — {openFor(p.id).length} open</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-project" style={s.label}>Client project</label>
        <select id="t-project" name="project_id" defaultValue="" style={s.field}>
          <option value="">Internal (no client)</option>
          {(projects as unknown as { id: string; name: string; clients: { company_name: string } | null }[] | null)?.map(p => (
            <option key={p.id} value={p.id}>{p.clients?.company_name} — {p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="t-due" style={s.label}>Delivery due (Cairo time)</label>
        <input id="t-due" name="due_at" type="datetime-local" required style={s.field} />
      </div>
      <div>
        <label htmlFor="t-priority" style={s.label}>Priority</label>
        <select id="t-priority" name="priority" defaultValue="medium" style={s.field}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="t-brief" style={s.label}>Brief</label>
        <textarea id="t-brief" name="description" rows={3} style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
        <p style={{ ...s.muted, fontSize: 13, margin: '6px 0 0' }}>You can attach material files to the task card after creating it.</p>
      </div>
      <div>
        <button type="submit" style={s.primary}>Create and notify</button>
      </div>
    </form>
  )

  return (
    <div>
      <PageHeader
        eyebrow={formatInTimeZone(new Date(), CAIRO, 'EEEE, d MMMM')}
        title="Overview"
        description="Every piece of work, where it stands, and who it’s waiting on."
        actions={<CreatePanel label="New task">{newTaskForm}</CreatePanel>}
      />
      <Flash error={error} ok={ok} />

      {/* Team strip: pick a person to see only their work */}
      <nav aria-label="Team" className="massar-people">
        <Link href="/overview" className="massar-person" aria-current={!personId ? 'true' : undefined}>
          <span className="massar-avatar" aria-hidden="true"><Icon name="team" style={{ width: 16, height: 16 }} /></span>
          <span className="massar-person-name">Everyone</span>
          <span className="massar-person-count">{cards.filter(c => c.stage !== 'done').length}</span>
        </Link>
        {people.map(p => {
          const mine = openFor(p.id)
          const late = mine.filter(c => c.late).length
          return (
            <Link
              key={p.id}
              href={`/overview?person=${p.id}`}
              className="massar-person"
              aria-current={personId === p.id ? 'true' : undefined}
              title={`${p.full_name}: ${mine.length} open${late ? `, ${late} late` : ''}`}
            >
              <span className="massar-avatar" aria-hidden="true">{initials(p.full_name)}</span>
              <span className="massar-person-name">{p.full_name.split(' ')[0]}</span>
              <span className="massar-person-count" data-tone={late ? 'attention' : undefined}>{mine.length}</span>
            </Link>
          )
        })}
      </nav>

      <p className="massar-board-summary">
        {selected ? <><strong>{selected.full_name}</strong> · </> : null}
        {open.length} open · {open.filter(c => c.late).length} late
        {bottleneck && bottleneck.n > 0 && (
          <> · most work is waiting at <strong>{bottleneck.label}</strong> ({bottleneck.n})</>
        )}
      </p>

      <div className="massar-board" role="list" aria-label="Work by stage">
        {STAGES.map((st, i) => {
          const list = byStage(st.key)
          const shown = st.key === 'done' ? list.slice(-6).reverse() : list
          const isBottleneck = bottleneck && bottleneck.key === st.key && bottleneck.n > 0
          return (
            <section key={st.key} className="massar-col" role="listitem" aria-label={st.label} data-hot={isBottleneck ? 'true' : undefined}>
              <header className="massar-col-head">
                <span className="massar-col-step">{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="massar-col-title">{st.label}</h2>
                  <p className="massar-col-hint">{st.hint}</p>
                </div>
                <span className="massar-panel-count" data-tone={st.key === 'check' && list.length ? 'attention' : undefined}>{list.length}</span>
              </header>

              <div className="massar-col-body">
                {shown.length === 0 && <p className="massar-col-empty">Nothing here</p>}
                {shown.map(({ task, delivery, version, late }) => {
                  const client = task.projects?.clients
                  const portalText = `Hi${client?.contact_name ? ` ${client.contact_name}` : ''}, “${task.title}”${version ? ` (V${version.version_number})` : ''} is ready for your review on the Massar portal: ${origin}/client-portal`
                  const wa = st.key === 'client' ? whatsappLink(client?.whatsapp_phone, portalText) : null
                  return (
                    <article key={task.id} className="massar-flow-card" data-late={late ? 'true' : undefined}>
                      <div className="massar-flow-card-top">
                        <span className="massar-avatar" style={{ width: 26, height: 26, fontSize: 11 }} aria-hidden="true">
                          {initials(task.owner?.full_name || '?')}
                        </span>
                        <span className="massar-flow-owner">{task.owner?.full_name}</span>
                        {st.key !== 'done' && (
                          <span className="massar-flow-due" data-late={late ? 'true' : undefined} title={formatCairo(task.due_at)}>
                            {dueLabel(task.due_at, now)}
                          </span>
                        )}
                      </div>
                      <h3 className="massar-flow-title">{task.title}</h3>
                      <p className="massar-flow-client">{client ? `${client.company_name} · ${task.projects?.name}` : 'Internal'}</p>
                      {changesRequested(delivery?.summary_status) && (
                        <p className="massar-flow-flag">
                          {delivery?.summary_status === 'client_changes_requested' ? 'Client asked for changes' : 'Changes requested'}
                        </p>
                      )}
                      {task.status === 'blocked' && <p className="massar-flow-flag">Blocked</p>}

                      {/* Check: the delivered files + approve (→ client) or send back */}
                      {st.key === 'check' && version && (
                        <div className="massar-flow-actions">
                          <ul className="massar-flow-files">
                            {version.files?.map(f => (
                              <li key={f.id}>
                                <Icon name="file" />
                                <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener">{f.original_name}</a>
                              </li>
                            ))}
                          </ul>
                          {version.status === 'internal_review' ? (
                            <>
                              <form action={checkDelivery}>
                                <input type="hidden" name="back" value={`/overview${personId ? `?person=${personId}` : ''}`} />
                                <input type="hidden" name="version_id" value={version.id} />
                                <button type="submit" name="decision" value="approved" style={{ ...s.primary, width: '100%', minHeight: 40, whiteSpace: 'normal', lineHeight: 1.25, padding: '8px 12px' }}>
                                  ✓ Approve &amp; send to client
                                </button>
                              </form>
                              <details className="massar-disclosure">
                                <summary style={{ ...s.textBtn, padding: '4px 0', fontSize: 13 }}>Send back with changes</summary>
                                <form action={checkDelivery} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                                  <input type="hidden" name="back" value={`/overview${personId ? `?person=${personId}` : ''}`} />
                                  <input type="hidden" name="version_id" value={version.id} />
                                  <label htmlFor={`ch-${version.id}`} style={{ ...s.label, margin: 0 }}>What should change?</label>
                                  <textarea id={`ch-${version.id}`} name="comment" required rows={2} style={{ ...s.field, padding: 8, fontSize: 14 }} />
                                  <button type="submit" name="decision" value="changes_requested" style={{ ...s.secondary, minHeight: 40 }}>Send back</button>
                                </form>
                              </details>
                            </>
                          ) : (
                            <p className="massar-flow-note">Approved — not sent yet. Open Deliverables to share.</p>
                          )}
                        </div>
                      )}

                      {/* With client: nudge them on WhatsApp */}
                      {st.key === 'client' && (
                        <div className="massar-flow-actions">
                          {version?.shared_at && <p className="massar-flow-note">Sent {dueLabel(version.shared_at, now).replace(' late', ' ago')}</p>}
                          {wa ? (
                            <a href={wa} target="_blank" rel="noopener" className="massar-wa-btn">
                              <Icon name="chat" /> Send on WhatsApp
                            </a>
                          ) : (
                            <p className="massar-flow-note">No WhatsApp number for this client. Add it in Clients.</p>
                          )}
                        </div>
                      )}

                      {/* Brief material can be added until the work is delivered */}
                      {(st.key === 'received' || st.key === 'working') && (
                        <details className="massar-disclosure massar-flow-more">
                          <summary>Brief &amp; material ({task.files?.length || 0})</summary>
                          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                            {task.description && <p className="massar-flow-brief">{task.description}</p>}
                            {!!task.files?.length && (
                              <ul className="massar-flow-files">
                                {task.files.map(f => (
                                  <li key={f.id}>
                                    <Icon name="file" />
                                    <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener">{f.original_name}</a>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <VersionUpload taskId={task.id} label="Add material" />
                          </div>
                        </details>
                      )}
                    </article>
                  )
                })}
                {st.key === 'done' && list.length > shown.length && (
                  <p className="massar-col-empty">+{list.length - shown.length} more in the last 14 days</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
