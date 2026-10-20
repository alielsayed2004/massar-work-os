'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'

// Status changes are DB functions that check the caller and the current state
// (ملحق 1.1 + 1.5). Partner checks and sharing live in ./delivery.ts.

export async function processReview(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('process_review_decision', {
    p_version_id: String(formData.get('version_id') || ''),
    p_stage: 'client',
    p_decision: String(formData.get('decision') || ''),
    p_comment: String(formData.get('comment') || ''),
  })
  if (error) backWithError('/client-portal', error)

  revalidatePath('/client-portal')
  revalidatePath('/today')
  revalidatePath('/spaces', 'layout')
  backWithOk('/client-portal')
}

/** Called by the upload component after the file is in Storage.
 *  RLS only accepts it while the version is still a draft. */
export async function registerVersionFile(input: {
  versionId: string
  storageKey: string
  name: string
  type: string
  size: number
}): Promise<{ ok: boolean; code?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'NOT_ALLOWED' }
  if (!input.storageKey.startsWith(`versions/${input.versionId}/`)) return { ok: false, code: 'NOT_ALLOWED' }

  const { error } = await supabase.from('files').insert({
    deliverable_version_id: input.versionId,
    original_name: input.name,
    storage_key: input.storageKey,
    file_type: input.type || null,
    file_size: input.size,
    uploader_user_id: user.id,
  })
  if (error) return { ok: false, code: 'FILE_UPLOAD_FAILED' }

  await supabase.from('activity_events').insert({
    actor_user_id: user.id,
    event_type: 'file_uploaded',
    reference_id: input.versionId,
    changes: { name: input.name },
    scope: 'internal',
  })

  revalidatePath('/my-work')
  return { ok: true }
}
