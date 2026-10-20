import type { SupabaseClient } from '@supabase/supabase-js'
import { newReviewToken } from '@/lib/review-link'
import { siteOrigin } from '@/lib/site'
import { whatsappLink } from '@/lib/workflow'

/**
 * Makes a fresh review link for a version that is with the client (the DB
 * checks the caller may share it) and returns the WhatsApp URL with the
 * message and link typed in. A person still presses send in WhatsApp.
 */
export async function reviewWhatsAppUrl(supabase: SupabaseClient, versionId: string): Promise<{ url?: string; error?: unknown }> {
  const { token, hash } = newReviewToken()
  const { error } = await supabase.rpc('create_review_link', { p_version_id: versionId, p_token_hash: hash })
  if (error) return { error }

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
  const work = v?.deliverables?.title ? `“${v.deliverables.title}” (V${v.version_number})` : 'your work'
  const text = `Hi${c?.contact_name ? ` ${c.contact_name}` : ''}, ${work} from Massar is ready for your review. Approve it or ask for changes here: ${link}`

  // Without a saved number WhatsApp opens its contact picker with the message ready.
  return { url: whatsappLink(c?.whatsapp_phone, text) || `https://wa.me/?text=${encodeURIComponent(text)}` }
}
