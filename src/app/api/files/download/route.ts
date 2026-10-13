import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Short-lived (60s) signed URL, issued only after a permission check
 * made AS THE CALLER (RLS), at request time (ملحق — معيار 6).
 *
 * - Staff: the `files` row must be visible to them under RLS
 *   (task files are scoped to their team / their tasks).
 * - Clients: cannot read `files` at all, so we look the row up with the
 *   service key and then require that the parent version is visible to
 *   them under RLS — i.e. shared with their company.
 */
export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get('id')
  if (!fileId) return NextResponse.json({ error: 'Missing file id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  let storageKey: string | null = null

  // 1) Visible to the caller as staff?
  const { data: ownView } = await supabase
    .from('files')
    .select('storage_key')
    .eq('id', fileId)
    .maybeSingle()

  if (ownView) {
    storageKey = ownView.storage_key
  } else {
    // 2) Client path: only files of a version shared with the caller's company
    const { data: record } = await admin
      .from('files')
      .select('storage_key, deliverable_version_id')
      .eq('id', fileId)
      .maybeSingle()

    if (record?.deliverable_version_id) {
      const { data: version } = await supabase
        .from('deliverable_versions')
        .select('id')
        .eq('id', record.deliverable_version_id)
        .maybeSingle()
      if (version) storageKey = record.storage_key
    }
  }

  // Same answer for "missing" and "forbidden" so ids can't be probed
  if (!storageKey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed, error } = await admin.storage.from('massar_files').createSignedUrl(storageKey, 60)
  if (error || !signed) return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
