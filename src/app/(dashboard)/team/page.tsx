export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inviteUser, setUserWhatsApp } from '@/app/actions/admin'
import { ROLE, nowMs } from '@/lib/labels'
import { whatsappLink, dueLabel, hoursUntil } from '@/lib/workflow'
import { initials } from '@/lib/spaces'
import { s, Flash, Empty, PageHeader, CreatePanel } from '@/components/ui'
import { Icon } from '@/components/icons'

type Person = { id: string; full_name: string; role: string; team_id: string | null; whatsapp_phone: string | null }
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

  const [{ data: peopleRows }, { data: taskRows }, { data: deliveredRows }, { data: teams }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, team_id, whatsapp_phone').in('role', ['admin', 'manager', 'member']).eq('status', 'active').order('full_name'),
    supabase
      .from('tasks')
      .select('id, title, due_at, current_owner_user_id, projects ( clients ( company_name ) )')
      .in('status', ['todo', 'in_progress', 'blocked'])
      .order('due_at', { ascending: true }),
    // Work already handed in is waiting on a partner or the client, not its owner
    supabase.from('deliverables').select('source_task_id').in('summary_status', ['internal_review', 'approved_internally', 'shared_with_client']),
    supabase.from('teams').select('id, name').order('name'),
  ])
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

      <div className="massar-people-list">
        {people.length === 0 && <section className="massar-panel"><Empty>No one on the team yet.</Empty></section>}
        {people.map(p => {
          const first = p.full_name.split(' ')[0]
          const chat = whatsappLink(p.whatsapp_phone, `Hi ${first}, `)
          return (
            <article key={p.id} className="massar-panel massar-person-card" data-late={p.late.length ? 'true' : undefined}>
              <div className="massar-person-card-top">
                <span className="massar-avatar" style={{ width: 44, height: 44, fontSize: 14, background: 'var(--massar-green)', color: 'var(--bone)' }} aria-hidden="true">{initials(p.full_name)}</span>
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
