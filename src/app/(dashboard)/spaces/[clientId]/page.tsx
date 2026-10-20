export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, getMyProfile } from '@/lib/session'
import { createTask } from '@/app/actions/tasks'
import { updateClientContact } from '@/app/actions/projects'
import { checkDelivery, recordClientDecision } from '@/app/actions/delivery'
import { nowMs, formatCairo } from '@/lib/labels'
import { whatsappLink, dueLabel, hoursUntil } from '@/lib/workflow'
import { loadSpaceItems, spaceCounts, initials, type SpaceItem } from '@/lib/spaces'
import { s, Flash, Empty, CreatePanel } from '@/components/ui'
import { Icon, type IconName } from '@/components/icons'
import VersionUpload from '@/components/VersionUpload'
import ApproveSendButton from '@/components/ApproveSendButton'

type Client = { id: string; company_name: string; contact_name: string | null; whatsapp_phone: string | null }
type Person = { id: string; full_name: string; team_id: string | null }

const NODES: { key: SpaceItem['stage']; icon: IconName }[] = [
  { key: 'received', icon: 'file' },
  { key: 'working', icon: 'user' },
  { key: 'check', icon: 'eye' },
  { key: 'client', icon: 'send' },
  { key: 'done', icon: 'flag' },
]
const ORDER = NODES.map(n => n.key)

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ tab?: string; error?: string; ok?: string; send?: string }>
}) {
  await connection()
  const { clientId } = await params
  const { tab, error, ok, send } = await searchParams
  const supabase = await createClient()
  const user = await getSessionUser()
  if (!user) return null

  const me = await getMyProfile()
  if (me?.role !== 'admin' && me?.role !== 'manager') return <Empty>Client spaces are for partners and team leads.</Empty>

  const { data: clientRow } = await supabase
    .from('clients').select('id, company_name, contact_name, whatsapp_phone').eq('id', clientId).maybeSingle()
  if (!clientRow) notFound()
  const client = clientRow as Client

  const now = nowMs()
  const [items, { data: peopleRows }] = await Promise.all([
    loadSpaceItems(supabase, now, client.id),
    supabase.from('profiles').select('id, full_name, team_id').in('role', ['admin', 'manager', 'member']).eq('status', 'active').order('full_name'),
  ])
  const people = ((peopleRows || []) as Person[]).filter(p => p.team_id)
  const counts = spaceCounts(items)
  const showDone = tab === 'done'
  const back = `/spaces/${client.id}${showDone ? '?tab=done' : ''}`
  const list = items
    .filter(i => (showDone ? i.stage === 'done' : i.stage !== 'done'))
    .sort((a, b) => Number(b.stage === 'check') - Number(a.stage === 'check') || Number(b.late) - Number(a.late) || a.task.due_at.localeCompare(b.task.due_at))
  const openFor = (id: string) => items.filter(i => i.task.current_owner_user_id === id && (i.stage === 'received' || i.stage === 'working')).length
  const contact = client.contact_name || client.company_name
  const chat = whatsappLink(client.whatsapp_phone, `Hi ${contact}, `)
  const justSent = send ? list.find(i => i.version?.id === send && i.stage === 'client') : undefined

  const newTaskForm = (
    <form action={createTask} style={s.formGrid}>
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="client_id" value={client.id} />
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="t-title" style={s.label}>What needs doing?</label>
        <input id="t-title" name="title" required style={s.field} />
      </div>
      <div>
        <label htmlFor="t-owner" style={s.label}>Who does it?</label>
        <select id="t-owner" name="owner_id" required defaultValue="" style={s.field}>
          <option value="" disabled>Select person</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.full_name} — {openFor(p.id)} on their plate</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-due" style={s.label}>Delivery due (Cairo time)</label>
        <input id="t-due" name="due_at" type="datetime-local" required style={s.field} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="t-brief" style={s.label}>Brief</label>
        <textarea id="t-brief" name="description" rows={3} style={{ ...s.field, padding: 'var(--space-2) 12px' }} />
        <p style={{ ...s.muted, fontSize: 13, margin: '6px 0 0' }}>Attach material files from the task once it’s created.</p>
      </div>
      <div>
        <button type="submit" style={s.primary}>Send to the team</button>
      </div>
    </form>
  )

  return (
    <div>
      <header className="massar-space-head">
        <span className="massar-space-mono massar-space-mono-lg" aria-hidden="true">{initials(client.company_name)}</span>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <p className="massar-page-eyebrow"><Link href="/spaces" style={{ color: 'inherit', textDecoration: 'none' }}>← Client spaces</Link></p>
          <h1 className="massar-page-title">{client.company_name}</h1>
          <p className="massar-page-description" style={{ marginTop: 4 }}>
            {client.contact_name || 'No contact name'} · <bdi>{client.whatsapp_phone || 'no WhatsApp number'}</bdi>

          </p>
        </div>
        <div className="massar-page-actions">
          {chat && (
            <a href={chat} target="_blank" rel="noopener" style={{ ...s.secondary, textDecoration: 'none' }}>
              <Icon name="chat" style={{ width: 16, height: 16 }} /> WhatsApp {contact}
            </a>
          )}
          {me?.role === 'admin' && (
            <CreatePanel label="Edit contact" secondary>
              <form action={updateClientContact} style={s.formGrid}>
                <input type="hidden" name="client_id" value={client.id} />
                <div>
                  <label htmlFor="cc-name" style={s.label}>Contact person</label>
                  <input id="cc-name" name="contact_name" defaultValue={client.contact_name || ''} style={s.field} />
                </div>
                <div>
                  <label htmlFor="cc-wa" style={s.label}>WhatsApp number</label>
                  <input id="cc-wa" name="whatsapp_phone" type="tel" inputMode="tel" defaultValue={client.whatsapp_phone || ''} placeholder="01x xxxx xxxx" style={s.field} />
                </div>
                <div>
                  <button type="submit" style={s.primary}>Save</button>
                </div>
              </form>
            </CreatePanel>
          )}
          <CreatePanel label="New task">{newTaskForm}</CreatePanel>
        </div>
      </header>
      <Flash error={error} ok={ok} />

      {justSent && justSent.version && (
        <div className="massar-due-alert" style={{ borderColor: 'var(--color-action-primary)', alignItems: 'center' }}>
          <Icon name="chat" style={{ color: 'var(--color-action-primary)' }} />
          <div style={{ flex: 1 }}>
            <strong>WhatsApp is open with the message for {contact}</strong>
            <div style={{ fontSize: 14 }}>Just press send. The link lets them approve or ask for changes without signing in.</div>
          </div>
          <a href={`/api/review-link/whatsapp?version=${justSent.version.id}`} target="_blank" rel="noopener" className="massar-wa-btn" style={{ padding: '0 16px' }}>
            <Icon name="chat" /> Didn’t open? Send again
          </a>
        </div>
      )}

      <nav className="massar-tabs" aria-label="Space views">
        <Link href={`/spaces/${client.id}`} className="massar-tab" aria-selected={!showDone}>
          In progress <span className="massar-panel-count" data-tone={counts.check ? 'attention' : undefined}>{counts.open}</span>
        </Link>
        <Link href={`/spaces/${client.id}?tab=done`} className="massar-tab" aria-selected={showDone}>
          Done <span className="massar-panel-count">{items.length - counts.open}</span>
        </Link>
      </nav>

      <div className="massar-flows">
        {list.length === 0 ? (
          <Empty>{showDone ? 'Nothing finished in the last 30 days.' : 'No open work for this client. Press “New task” to start one.'}</Empty>
        ) : (
          list.map(item => <FlowRow key={item.task.id} item={item} contact={contact} back={back} now={now} />)
        )}
      </div>
      <p style={{ ...s.muted, marginTop: 'var(--space-3)' }}>
        Each line is one task moving left to right. The filled node is where it is now; orange means it’s waiting on someone. The button you need sits under it.
      </p>
    </div>
  )
}

function FlowRow({ item, contact, back, now }: { item: SpaceItem; contact: string; back: string; now: number }) {
  const { task, stage, version, late, changes } = item
  const at = ORDER.indexOf(stage)
  const owner = task.owner?.full_name || 'Unassigned'
  const first = owner.split(' ')[0]
  const clientSlow = stage === 'client' && version?.shared_at ? hoursUntil(version.shared_at, now) < -24 : false
  const waiting = stage === 'check' || late || Boolean(changes) || clientSlow
  const label: Record<SpaceItem['stage'], string> = { received: 'Assigned', working: first, check: 'Your check', client: contact, done: 'Approved' }
  const nudge = whatsappLink(
    task.owner?.whatsapp_phone,
    `Hi ${first}, “${task.title}” was due ${dueLabel(task.due_at, now).replace(' late', '')} ago. Where are we on it? Please deliver it on Massar as soon as you can.`
  )

  const sub = (key: SpaceItem['stage']) => {
    if (key !== stage) return null
    if (key === 'received') return late ? `${dueLabel(task.due_at, now)}` : 'Not started'
    if (key === 'working') return late ? dueLabel(task.due_at, now) : changes ? 'Fixing changes' : `due ${dueLabel(task.due_at, now)}`
    if (key === 'check') return 'Waiting for you'
    if (key === 'client' && version?.shared_at) return `Sent ${dueLabel(version.shared_at, now).replace(' late', ' ago')}`
    return null
  }

  const action = (key: SpaceItem['stage']) => {
    if (key !== stage) return null
    if ((key === 'received' || key === 'working') && late) {
      return nudge ? (
        <a href={nudge} target="_blank" rel="noopener" className="massar-wa-btn massar-node-btn"><Icon name="chat" /> Nudge {first}</a>
      ) : (
        <Link href="/team" className="massar-node-link">Add {first}’s WhatsApp</Link>
      )
    }
    if (key === 'check' && version) {
      return (
        <>
          <ApproveSendButton versionId={version.id} back={back} style={{ ...s.primary, width: '100%', minHeight: 38, fontSize: 13 }} />
          <details className="massar-disclosure">
            <summary style={{ ...s.secondary, width: '100%', minHeight: 38, fontSize: 13, boxSizing: 'border-box' }}>Needs changes</summary>
            <form action={checkDelivery} style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="version_id" value={version.id} />
              <label htmlFor={`ch-${version.id}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>What should change?</label>
              <textarea id={`ch-${version.id}`} name="comment" required rows={3} placeholder="What should change?" style={{ ...s.field, padding: 8, fontSize: 14 }} />
              <button type="submit" name="decision" value="changes_requested" style={{ ...s.secondary, minHeight: 38, fontSize: 13 }}>Send back</button>
            </form>
          </details>
        </>
      )
    }
    if (key === 'client' && version) {
      return (
        <>
          <a href={`/api/review-link/whatsapp?version=${version.id}`} target="_blank" rel="noopener" className="massar-wa-btn massar-node-btn"><Icon name="chat" /> WhatsApp</a>
          <details className="massar-disclosure">
            <summary style={{ ...s.secondary, width: '100%', minHeight: 38, fontSize: 13, boxSizing: 'border-box' }}>They replied</summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              <form action={recordClientDecision}>
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="version_id" value={version.id} />
                <button type="submit" name="decision" value="approved" style={{ ...s.primary, width: '100%', minHeight: 38, fontSize: 13 }}>Client approved</button>
              </form>
              <form action={recordClientDecision} style={{ display: 'grid', gap: 6 }}>
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="version_id" value={version.id} />
                <label htmlFor={`cr-${version.id}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>What did the client ask to change?</label>
                <textarea id={`cr-${version.id}`} name="comment" required rows={3} placeholder="What did they ask to change?" style={{ ...s.field, padding: 8, fontSize: 14 }} />
                <button type="submit" name="decision" value="changes_requested" style={{ ...s.secondary, minHeight: 38, fontSize: 13 }}>Wants changes</button>
              </form>
            </div>
          </details>
        </>
      )
    }
    return null
  }

  return (
    <article className="massar-flow-row">
      <div className="massar-flow-info">
        <h3>{task.title}</h3>
        <p title={formatCairo(task.due_at)}>{owner} · {stage === 'done' ? 'closed' : hoursUntil(task.due_at, now) < 0 ? dueLabel(task.due_at, now) : `due ${dueLabel(task.due_at, now)}`}{version ? ` · V${version.version_number}` : ''}</p>
        {changes?.comment && (stage === 'working' || stage === 'received') && (
          <p className="massar-flow-change"><strong>{changes.stage === 'client' ? 'Client' : 'Partner'}:</strong> {changes.comment}</p>
        )}
        <details className="massar-disclosure">
          <summary className="massar-flow-more-link">Brief &amp; files</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {task.description && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{task.description}</p>}
            {[...(task.files || []).map(f => ({ ...f, tag: 'Material' })), ...(version?.files || []).map(f => ({ ...f, tag: `V${version!.version_number}` }))].map(f => (
              <a key={f.id} href={`/api/files/download?id=${f.id}`} target="_blank" rel="noopener" className="massar-flow-file">
                <Icon name="file" /> <span>{f.original_name}</span> <small>{f.tag}</small>
              </a>
            ))}
            {(stage === 'received' || stage === 'working') && <VersionUpload taskId={task.id} label="Add material" />}
          </div>
        </details>
      </div>
      {NODES.map((n, i) => {
        const state = stage === 'done' || i < at ? 'done' : i === at ? (waiting ? 'now wait' : 'now') : ''
        return (
          <div key={n.key} className={`massar-flow-step ${state}`}>
            <span className="massar-flow-node"><Icon name={n.icon} /></span>
            <span className="massar-flow-step-label">{label[n.key]}</span>
            {sub(n.key) && <span className="massar-flow-step-sub">{sub(n.key)}</span>}
            {action(n.key) && <div className="massar-flow-step-act">{action(n.key)}</div>}
          </div>
        )
      })}
    </article>
  )
}
