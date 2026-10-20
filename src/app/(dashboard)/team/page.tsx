export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inviteUser, setUserWhatsApp } from '@/app/actions/admin'
import { decideHandover } from '@/app/actions/handover'
import { ROLE, HANDOVER_REASON_LABEL, formatCairo, nowMs } from '@/lib/labels'
import { whatsappLink, dueLabel, hoursUntil } from '@/lib/workflow'
import { initials } from '@/lib/spaces'
import { s, Flash, Empty, PageHeader, CreatePanel, Panel } from '@/components/ui'
import { Icon } from '@/components/icons'

type Person = { id: string; full_name: string; role: string; team_id: string | null; whatsapp_phone: string | null }
type Handover = {
  id: string
  reason: string
  internal_note: string | null
  tasks: { id: string; title: string; due_at: string; team_id: string; current_owner_user_id: string } | null
  requester: { full_name: string } | null
}
type OpenTask = { id: string; title: string; due_at: string; current_owner_user_id: string; projects: { clients: { company_name: string } | null } | null }

/** Who's on the team, how much each has, and a WhatsApp nudge for anything late. */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  await connection()
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isPartner = me?.role === 'admin'
  if (!isPartner && me?.role !== 'manager') return <Empty>The team page is for partners and team leads.</Empty>

  const [{ data: peopleRows }, { data: taskRows }, { data: deliveredRows }, { data: teams }, { data: handoverRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, team_id, whatsapp_phone').in('role', ['admin', 'manager', 'member']).eq('status', 'active').order('full_name'),
    supabase
      .from('tasks')
      .select('id, title, due_at, current_owner_user_id, projects ( clients ( company_name ) )')
      .in('status', ['todo', 'in_progress', 'blocked'])
      .order('due_at', { ascending: true }),
    // Work already handed in is waiting on a partner or the client, not its owner
    supabase.from('deliverables').select('source_task_id').in('summary_status', ['internal_review', 'approved_internally', 'shared_with_client']),
    supabase.from('teams').select('id, name').order('name'),
    // RLS returns only the requests this person may decide (their team, or all for partners)
    supabase
      .from('handover_requests')
      .select(`id, reason, internal_note,
        tasks ( id, title, due_at, team_id, current_owner_user_id ),
        requester:profiles!handover_requests_requester_user_id_fkey ( full_name )`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])
  const handovers = (handoverRows || []) as unknown as Handover[]
  const handedIn = new Set((deliveredRows || []).map(d => d.source_task_id))
  const tasks = ((taskRows || []) as unknown as OpenTask[]).filter(t => !handedIn.has(t.id))
  const teamName = Object.fromEntries((teams || []).map(t => [t.id, t.name]))
  const now = nowMs()

  const people = ((peopleRows || []) as Person[])
    .map(p => {
      const mine = tasks.filter(t => t.current_owner_user_id === p.id)
      return { ...p, open: mine, late: mine.filter(t => hoursUntil(t.due_at, now) < 0) }
    })
    // Partners without assigned work stay off the list; the late come first
    .filter(p => p.role !== 'admin' || p.open.length)
    .sort((a, b) => b.late.length - a.late.length || b.open.length - a.open.length)
  const lateTotal = people.reduce((n, p) => n + p.late.length, 0)

  const addForm = (
    <form action={inviteUser} style={s.formGrid}>
      <input type="hidden" name="back" value="/team" />
      <div>
        <label htmlFor="p-name" style={s.label}>Full name</label>
        <input id="p-name" name="full_name" required style={s.field} />
      </div>
      <div>
        <label htmlFor="p-wa" style={s.label}>WhatsApp number</label>
        <input id="p-wa" name="whatsapp_phone" type="tel" inputMode="tel" required placeholder="01x xxxx xxxx" style={s.field} />
      </div>
      <div>
        <label htmlFor="p-email" style={s.label}>Email for sign-in</label>
        <input id="p-email" name="email" type="email" required style={s.field} />
      </div>
      <div>
        <label htmlFor="p-team" style={s.label}>Team</label>
        <select id="p-team" name="team_id" required defaultValue="" style={s.field}>
          <option value="" disabled>Select team</option>
          {(teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="p-role" style={s.label}>Role</label>
        <select id="p-role" name="role" defaultValue="member" style={s.field}>
          <option value="member">{ROLE.member}</option>
          <option value="manager">{ROLE.manager}</option>
        </select>
      </div>
      <div>
        <button type="submit" style={s.primary}>Send invite</button>
      </div>
    </form>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Partners"
        title="Team"
        description={lateTotal ? `${lateTotal} ${lateTotal === 1 ? 'task is' : 'tasks are'} late. Nudge the person on WhatsApp straight from here.` : 'Everyone’s WhatsApp is saved here, so you can nudge them the moment something is late.'}
        actions={isPartner ? <CreatePanel label="Add person">{addForm}</CreatePanel> : undefined}
      />
      <Flash error={error} ok={ok} />

      {handovers.length > 0 && (
        <div id="handovers" style={{ maxWidth: 900 }}>
          <Panel title="Handover requests" count={handovers.length} attention subtitle="Someone can’t finish in time. Pick who takes over; ownership changes only when you assign." flush>
            {handovers.map(req => {
              const candidates = people.filter(p => p.team_id === req.tasks?.team_id && p.id !== req.tasks?.current_owner_user_id)
              return (
                <div key={req.id} className="massar-row" style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{req.tasks?.title}</strong>
                    <p className="massar-cell-sub" style={{ margin: '2px 0 0' }}>
                      {req.requester?.full_name} · {HANDOVER_REASON_LABEL[req.reason] || req.reason} · due <bdi>{formatCairo(req.tasks?.due_at)}</bdi>
                    </p>
                    {req.internal_note && <p style={{ margin: '8px 0 0', fontSize: 14 }}>{req.internal_note}</p>}
                  </div>
                  <form action={decideHandover} className="massar-btn-row" style={{ alignItems: 'end' }}>
                    <input type="hidden" name="handover_id" value={req.id} />
                    <div style={{ flex: '1 1 220px' }}>
                      <label htmlFor={`o-${req.id}`} style={s.label}>Give it to</label>
                      <select id={`o-${req.id}`} name="new_owner_id" defaultValue="" style={s.field}>
                        <option value="">Select person</option>
                        {candidates.map(p => <option key={p.id} value={p.id}>{p.full_name} — {p.open.length} on their plate</option>)}
                      </select>
                    </div>
                    <button type="submit" name="decision" value="assigned" style={s.primary}>Assign</button>
                    <button type="submit" name="decision" value="declined" style={s.secondary}>Keep with {req.requester?.full_name?.split(' ')[0]}</button>
                  </form>
                </div>
              )
            })}
          </Panel>
        </div>
      )}

      <div className="massar-people-list">
        {people.length === 0 && <section className="massar-panel"><Empty>No one on the team yet.</Empty></section>}
        {people.map(p => {
          const first = p.full_name.split(' ')[0]
          const chat = whatsappLink(p.whatsapp_phone, `Hi ${first}, `)
          return (
            <article key={p.id} className="massar-panel massar-person-card" data-late={p.late.length ? 'true' : undefined}>
              <div className="massar-person-card-top">
                <span className="massar-avatar" style={{ width: 44, height: 44, fontSize: 14, background: 'var(--color-hover-strong)', color: 'var(--color-text-strong)' }} aria-hidden="true">{initials(p.full_name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2>{p.full_name}</h2>
                  <p>{ROLE[p.role]}{p.team_id && teamName[p.team_id] ? ` · ${teamName[p.team_id]}` : ''}</p>
                </div>
                <div className="massar-person-card-load" data-late={p.late.length ? 'true' : undefined}>
                  <strong>{p.open.length}</strong> on their plate{p.late.length ? <> · <strong>{p.late.length}</strong> late</> : null}
                </div>
              </div>

              {p.late.map(t => {
                const nudge = whatsappLink(
                  p.whatsapp_phone,
                  `Hi ${first}, “${t.title}”${t.projects?.clients ? ` for ${t.projects.clients.company_name}` : ''} was due ${dueLabel(t.due_at, now).replace(' late', '')} ago. Where are we on it? Please deliver it on Massar as soon as you can.`
                )
                return (
                  <div key={t.id} className="massar-person-late">
                    <span><strong>{t.title}</strong>{t.projects?.clients ? ` · ${t.projects.clients.company_name}` : ''} · {dueLabel(t.due_at, now)}</span>
                    {nudge ? (
                      <a href={nudge} target="_blank" rel="noopener" className="massar-wa-btn" style={{ padding: '0 14px', minHeight: 38, fontSize: 13 }}>
                        <Icon name="chat" /> Nudge on WhatsApp
                      </a>
                    ) : (
                      <span style={{ ...s.muted, fontSize: 13 }}>Add a number below to nudge</span>
                    )}
                  </div>
                )
              })}

              <div className="massar-btn-row">
                {isPartner ? (
                  <form action={setUserWhatsApp} className="massar-btn-row" style={{ flex: 1, flexWrap: 'nowrap' }}>
                    <input type="hidden" name="back" value="/team" />
                    <input type="hidden" name="user_id" value={p.id} />
                    <label htmlFor={`wa-${p.id}`} style={{ ...s.muted, fontSize: 13, whiteSpace: 'nowrap' }}>WhatsApp</label>
                    <input id={`wa-${p.id}`} name="whatsapp_phone" type="tel" inputMode="tel" placeholder="01x xxxx xxxx" defaultValue={p.whatsapp_phone || ''} style={{ ...s.field, maxWidth: 180, minHeight: 38 }} />
                    <button type="submit" style={{ ...s.secondary, minHeight: 38 }}>Save</button>
                  </form>
                ) : (
                  <span style={{ ...s.muted, flex: 1 }}>WhatsApp: <bdi>{p.whatsapp_phone || '—'}</bdi></span>
                )}
                {chat && !p.late.length && (
                  <a href={chat} target="_blank" rel="noopener" style={{ ...s.secondary, minHeight: 38, textDecoration: 'none' }}>
                    <Icon name="chat" style={{ width: 16, height: 16 }} /> Message
                  </a>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {isPartner && (
        <p style={{ ...s.muted, marginTop: 'var(--space-3)' }}>
          Roles, teams and removing access are in <Link href="/admin" style={{ color: 'var(--color-text-strong)' }}>Settings</Link>.
        </p>
      )}
    </div>
  )
}
