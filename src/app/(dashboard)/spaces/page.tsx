export const instant = false
import Link from 'next/link'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, getMyProfile } from '@/lib/session'
import { createClientRecord } from '@/app/actions/projects'
import { nowMs } from '@/lib/labels'
import { loadSpaceItems, spaceCounts, initials } from '@/lib/spaces'
import { s, Flash, Empty, PageHeader, CreatePanel } from '@/components/ui'

type ClientRow = { id: string; company_name: string; contact_name: string | null }

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  await connection()
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const user = await getSessionUser()
  if (!user) return null

  const me = await getMyProfile()
  const isPartner = me?.role === 'admin'
  if (!isPartner && me?.role !== 'manager') return <Empty>Client spaces are for partners and team leads.</Empty>

  const [{ data: clientRows }, items] = await Promise.all([
    supabase.from('clients').select('id, company_name, contact_name').eq('status', 'active').order('company_name'),
    loadSpaceItems(supabase, nowMs()),
  ])
  const clients = (clientRows || []) as ClientRow[]
  const all = spaceCounts(items)

  const newClientForm = (
    <form action={createClientRecord} style={s.formGrid}>
      <input type="hidden" name="back" value="/spaces" />
      <div>
        <label htmlFor="c-name" style={s.label}>Company name</label>
        <input id="c-name" name="company_name" required style={s.field} />
      </div>
      <div>
        <label htmlFor="c-contact" style={s.label}>Contact person</label>
        <input id="c-contact" name="contact_name" style={s.field} />
      </div>
      <div>
        <label htmlFor="c-wa" style={s.label}>WhatsApp number</label>
        <input id="c-wa" name="whatsapp_phone" type="tel" inputMode="tel" placeholder="01x xxxx xxxx" style={s.field} />
      </div>
      <div>
        <button type="submit" style={s.primary}>Create space</button>
      </div>
    </form>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Partners"
        title="Client spaces"
        description={all.check ? `${all.check} ${all.check === 1 ? 'delivery is' : 'deliveries are'} waiting for your check. Open a client to see each task’s path.` : 'Open a client to see each task’s path, from brief to approval.'}
        actions={isPartner ? <CreatePanel label="New space">{newClientForm}</CreatePanel> : undefined}
      />
      <Flash error={error} ok={ok} />

      {clients.length === 0 ? (
        <section className="massar-panel"><Empty>No clients yet. Create the first space.</Empty></section>
      ) : (
        <div className="massar-spaces">
          {clients.map(c => {
            const n = spaceCounts(items.filter(i => i.task.projects?.client_id === c.id))
            return (
              <Link key={c.id} href={`/spaces/${c.id}`} className="massar-space-card">
                <div className="massar-space-card-top">
                  <span className="massar-space-mono" aria-hidden="true">{initials(c.company_name)}</span>
                  <div style={{ minWidth: 0 }}>
                    <h2>{c.company_name}</h2>
                    <p>{c.contact_name ? `${c.contact_name} · ` : ''}{n.open} open</p>
                  </div>
                </div>
                <dl className="massar-space-stats">
                  <div><dd data-hot={n.check ? 'true' : undefined}>{n.check}</dd><dt>Your check</dt></div>
                  <div><dd>{n.client}</dd><dt>With client</dt></div>
                  <div><dd data-hot={n.late ? 'true' : undefined}>{n.late}</dd><dt>Late</dt></div>
                </dl>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
