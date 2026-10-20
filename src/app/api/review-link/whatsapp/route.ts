import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviewWhatsAppUrl } from '@/lib/review-whatsapp'
import { toCode } from '@/lib/labels'

/** Opened in a new tab from "WhatsApp" / "Remind": a fresh link, straight into WhatsApp. */
export async function GET(request: Request) {
  const versionId = new URL(request.url).searchParams.get('version') || ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { url, error } = await reviewWhatsAppUrl(supabase, versionId)
  if (!url) return NextResponse.redirect(new URL(`/today?error=${toCode(error)}`, request.url))
  return NextResponse.redirect(url)
}
