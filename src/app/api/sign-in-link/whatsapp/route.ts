import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/site'
import { whatsappLink } from '@/lib/workflow'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Opened in a new tab from Team → "Sign-in link on WhatsApp". Partners only.
 * Makes a one-time link to the set-password page and opens WhatsApp to that
 * person with it typed in, so signing someone in never depends on email.
 */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('user') || ''
  const back = (code: string) => NextResponse.redirect(new URL(`/team?error=${code}`, request.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  if (!UUID.test(userId)) return back('NOT_ALLOWED')
  const { data: actor } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
  if (actor?.role !== 'admin' || actor?.status !== 'active') return back('NOT_ALLOWED')

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return back('MISSING_SERVICE_ROLE_KEY')
  }

  const [{ data: person }, { data: account }] = await Promise.all([
    admin.from('profiles').select('full_name, whatsapp_phone, status').eq('id', userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ])
  if (!person || person.status !== 'active' || !account?.user?.email) return back('NOT_ALLOWED')
  if (!person.whatsapp_phone) return back('NO_WHATSAPP')

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: account.user.email,
    options: { redirectTo: `${await siteOrigin()}/auth/set-password` },
  })
  const url = link?.properties?.action_link
  if (error || !url) return back('INVITE_FAILED')

  const first = person.full_name.split(' ')[0]
  const text = `Hi ${first}, this is your private link to choose your Massar password and sign in: ${url}\nIt works once and expires in 24 hours. Don’t forward it.`
  return NextResponse.redirect(whatsappLink(person.whatsapp_phone, text) || new URL('/team?error=NO_WHATSAPP', request.url))
}
