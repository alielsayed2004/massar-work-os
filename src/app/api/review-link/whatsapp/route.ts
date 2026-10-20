import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { newReviewToken } from '@/lib/review-link'
import { siteOrigin } from '@/lib/site'
import { whatsappLink } from '@/lib/workflow'
import { toCode } from '@/lib/labels'

/**
 * Opened in a new tab from "Send on WhatsApp". Makes a fresh review link
 * (the DB checks the caller may share this version) and forwards to WhatsApp
 * with the message typed in. A person still presses send.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const versionId = url.searchParams.get('version') || ''
  const back = (path: string, code: string) => NextResponse.redirect(new URL(`${path}?error=${code}`, request.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { token, hash } = newReviewToken()
  const { error } = await supabase.rpc('create_review_link', { p_version_id: versionId, p_token_hash: hash })
  if (error) return back('/today', toCode(error))

  const { data: version } = await supabase
    .from('deliverable_versions')
    .select(`version_number,
      deliverables!deliverable_versions_deliverable_id_fkey ( title, projects ( clients ( contact_name, whatsapp_phone ) ) )`)
    .eq('id', versionId)
    .single()
  const v = version as unknown as {
    version_number: number
    deliverables: { title: string; projects: { clients: { contact_name: string | null; whatsapp_phone: string | null } | null } | null } | null
  } | null
  const c = v?.deliverables?.projects?.clients

  const link = `${await siteOrigin()}/r/${token}`
  const text = `Hi${c?.contact_name ? ` ${c.contact_name}` : ''}, “${v?.deliverables?.title}” (V${v?.version_number}) from Massar is ready for your review. Approve it or ask for changes here: ${link}`

  // Without a saved number WhatsApp opens its contact picker with the message ready.
  return NextResponse.redirect(whatsappLink(c?.whatsapp_phone, text) || `https://wa.me/?text=${encodeURIComponent(text)}`)
}
