export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { formatInTimeZone } from 'date-fns-tz'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, getMyProfile } from '@/lib/session'
import { checkDelivery } from '@/app/actions/delivery'
import { CAIRO, nowMs } from '@/lib/labels'
import { whatsappLink, dueLabel, hoursUntil } from '@/lib/workflow'
import { s, Flash, Empty, PageHeader, Panel } from '@/components/ui'
import { Icon } from '@/components/icons'
import ApproveSendButton from '@/components/ApproveSendButton'

type Client = { company_name: string; contact_name: string | null } | null
type Version = { id: string; version_number: number; status: string; shared_at: string | null; created_at: string; files: { id: string; original_name: string }[] }
type Delivery = {
  id: string
  title: string
  summary_status: string
  current_version_id: string | null
  source_task_id: string | null
  projects: { name: string; clients: Client } | null
  deliverable_versions: Version[]
}
type Task = {
  id: string
  title: string
  status: string
  due_at: string
  owner: { full_name: string; whatsapp_phone: string | null } | null
  projects: { name: string; clients: Client } | null
}

const WAITING_ON_CLIENT_HOURS = 24

/**
 * The partners' to-do list: only what needs a person to step in.
 * Everything here has its action on the row; when it's empty, nothing is stuck.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; send?: string }>
}) {
  await connection()
  const { error, ok, send } = await searchParams
  const supabase = await createClient()
  const user = await getSessionUser()
  if (!user) return null

  const me = await getMyProfile()
  if (me?.role !== 'admin' && me?.role !== 'manager') {
    return (
      <div>
        <PageHeader title="Today" />
        <Empty>This page is for partners and team leads.</Empty>
      </div>
    )
  }

  const now = nowMs()
  const [{ data: deliveryRows }, { data: taskRows }, { count: handovers }] = await Promise.all([
    supabase
      .from('deliverables')
      .select(`id, title, summary_status, current_version_id, source_task_id,
        projects ( name, clients ( company_name, contact_name ) ),
        deliverable_versions!deliverable_versions_deliverable_id_fkey ( id, version_number, status, shared_at, created_at, files ( id, original_name ) )`)
      .in('summary_status', ['internal_review', 'shared_with_client']),
    supabase
      .from('tasks')
      .select(`id, title, status, due_at,
        owner:profiles!tasks_current_owner_user_id_fkey ( full_name, whatsapp_phone ),
        projects ( name, clients ( company_name, contact_name ) )`)
      .in('status', ['todo', 'in_progress', 'blocked'])
      .lt('due_at', new Date(now).toISOString())
      .order('due_at', { ascending: true }),
    supabase.from('handover_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const deliveries = ((deliveryRows || []) as unknown as Delivery[]).map(d => ({
    ...d,
    version: d.deliverable_versions?.find(v => v.id === d.current_version_id),
  }))
  // A late task whose work is already delivered is waiting on someone else, not its owner
  const deliveredTaskIds = new Set(deliveries.map(d => d.source_task_id).filter(Boolean))
  const late = ((taskRows || []) as unknown as Task[]).filter(t => !deliveredTaskIds.has(t.id))
  const toCheck = deliveries.filter(d => d.summary_status === 'internal_review' && d.version)
  const withClient = deliveries.filter(d => d.summary_status === 'shared_with_client' && d.version?.shared_at)
  const slowClients = withClient.filter(d => hoursUntil(d.version!.shared_at!, now) < -WAITING_ON_CLIENT_HOURS)
  const justSent = send ? deliveries.find(d => d.version?.id === send && d.summary_status === 'shared_with_client') : undefined
  const total = toCheck.length + late.length + slowClients.length + (handovers || 0)
  const clientLine = (p: Delivery['projects'] | Task['projects']) => (p?.clients ? `${p.clients.company_name} · ${p.name}` : 'Internal')
  const hour = Number(formatInTimeZone(new Date(now), CAIRO, 'H'))
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = me.full_name?.split(' ')[0]

  return (
    <div>
      <PageHeader
        eyebrow={formatInTimeZone(new Date(now), CAIRO, 'EEEE, d MMMM')}
        title={firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
        description={total ? `${total} ${total === 1 ? 'thing needs' : 'things need'} you today. Each one has its next step beside it.` : 'All clear. Nothing is waiting for your check, nobody is late, and no client has been waiting more than a day.'}
        actions={<Link href="/spaces" style={{ ...s.secondary, textDecoration: 'none' }}>Client spaces</Link>}
      />
      <Flash error={error} ok={ok} />

      {/* Straight after an approval: send it to the client while it's fresh */}
      {justSent && (
        <div className="massar-due-alert" style={{ borderColor: 'var(--color-action-primary)', alignItems: 'center' }}>
          <Icon name="chat" style={{ color: 'var(--color-action-primary)' }} />
          <div style={{ flex: 1 }}>
            <strong>WhatsApp is open with the message for {justSent.projects?.clients?.contact_name || justSent.projects?.clients?.company_name}</strong>
            <div style={{ fontSize: 14 }}>Just press send. The link lets them approve or ask for changes without signing in.</div>
          </div>
          <a href={`/api/review-link/whatsapp?version=${justSent.version!.id}`} target="_blank" rel="noopener" className="massar-wa-btn" style={{ padding: '0 16px' }}>
            <Icon name="chat" /> Didn’t open? Send again
          </a>
        </div>
      )}

      {!!handovers && (
        <div className="massar-due-alert" style={{ alignItems: 'center' }}>
          <Icon name="team" />
          <div style={{ flex: 1 }}>
            <strong>{handovers} handover {handovers === 1 ? 'request' : 'requests'}</strong>
            <div style={{ fontSize: 14 }}>Someone can’t finish on time and needs you to pick who takes over.</div>
          </div>
          <Link href="/team#handovers" style={{ ...s.primary, textDecoration: 'none' }}>Decide</Link>
        </div>
      )}

      <Panel title="Waiting for your check" count={toCheck.length} attention flush>
        {toCheck.length === 0 ? (
          <Empty>No deliveries to check.</Empty>
        ) : (
          toCheck.map(d => (
            <article key={d.id} className="massar-row massar-today-row">
              <div className="massar-today-main">
                <h3 className="massar-today-title">{d.title} <span>· V{d.version!.version_number}</span></h3>
                <p className="massar-cell-sub">{clientLine(d.projects)} · delivered {dueLabel(d.version!.created_at, now).replace(' late', ' ago')}</p>
                <ul className="massar-flow-files" style={{ marginTop: 8, fontSize: 14 }}>
                  {d.version!.files?.map(f => (
                    <li key={f.id}>
                      <Icon name="file" />
                      <a href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener">{f.original_name}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="massar-today-actions">
                <ApproveSendButton versionId={d.version!.id} back="/today" style={{ ...s.primary, width: '100%' }} />
                <details className="massar-disclosure">
                  <summary style={{ ...s.secondary, width: '100%', boxSizing: 'border-box' }}>Needs changes</summary>
                  <form action={checkDelivery} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="back" value="/today" />
                    <input type="hidden" name="version_id" value={d.version!.id} />
                    <label htmlFor={`c-${d.id}`} style={{ ...s.label, margin: 0 }}>What should change?</label>
                    <textarea id={`c-${d.id}`} name="comment" required rows={3} style={{ ...s.field, padding: 8 }} />
                    <button type="submit" name="decision" value="changes_requested" style={s.secondary}>Send back</button>
                  </form>
                </details>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel title="Late with the team" count={late.length} attention flush>
        {late.length === 0 ? (
          <Empty>Nobody is late.</Empty>
        ) : (
          late.map(t => {
            const first = t.owner?.full_name.split(' ')[0] || 'there'
            const wa = whatsappLink(
              t.owner?.whatsapp_phone,
              `Hi ${first}, “${t.title}”${t.projects?.clients ? ` for ${t.projects.clients.company_name}` : ''} was due ${dueLabel(t.due_at, now).replace(' late', '')} ago. Where are we on it? Please deliver it on Massar as soon as you can.`
            )
            return (
              <article key={t.id} className="massar-row massar-today-row">
                <div className="massar-today-main">
                  <h3 className="massar-today-title">{t.title}</h3>
                  <p className="massar-cell-sub">
                    {t.owner?.full_name} · {clientLine(t.projects)} · <strong style={{ color: 'var(--color-text)' }}>{dueLabel(t.due_at, now)}</strong>
                  </p>
                </div>
                <div className="massar-today-actions">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener" className="massar-wa-btn">
                      <Icon name="chat" /> Nudge {first}
                    </a>
                  ) : (
                    <Link href="/team" style={{ ...s.secondary, textDecoration: 'none' }}>Add {first}’s WhatsApp</Link>
                  )}
                </div>
              </article>
            )
          })
        )}
      </Panel>

      <Panel
        title="Client hasn’t replied"
        count={slowClients.length}
        subtitle={`Sent more than ${WAITING_ON_CLIENT_HOURS} hours ago. ${withClient.length - slowClients.length} more are with clients and still fresh.`}
        flush
      >
        {slowClients.length === 0 ? (
          <Empty>No client has been waiting more than a day.</Empty>
        ) : (
          slowClients.map(d => (
            <article key={d.id} className="massar-row massar-today-row">
              <div className="massar-today-main">
                <h3 className="massar-today-title">{d.title} <span>· V{d.version!.version_number}</span></h3>
                <p className="massar-cell-sub">{clientLine(d.projects)} · sent {dueLabel(d.version!.shared_at!, now).replace(' late', ' ago')}</p>
              </div>
              <div className="massar-today-actions">
                <a href={`/api/review-link/whatsapp?version=${d.version!.id}`} target="_blank" rel="noopener" className="massar-wa-btn">
                  <Icon name="chat" /> Remind {d.projects?.clients?.contact_name || 'client'}
                </a>
              </div>
            </article>
          ))
        )}
      </Panel>
    </div>
  )
}
