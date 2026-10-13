'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'

// Every status change below is a DB function that checks the caller and the
// current state (ملحق 1.1 + 1.5). The UI only decides which buttons to show.

export async function createDeliverable(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') || '')
  const title = String(formData.get('title') || '').trim()
  const reviewer_user_id = String(formData.get('reviewer_user_id') || '')
  if (!project_id || !title || !reviewer_user_id) backWithError('/deliverables', 'MISSING_FIELDS')

  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      project_id,
      title,
      description: String(formData.get('description') || '') || null,
      source_task_id: String(formData.get('source_task_id') || '') || null,
      reviewer_user_id,
    })
    .select('id')
    .single()
  if (error || !data) backWithError('/deliverables', error)

  // Start with V1 as a draft so the team can attach files right away
  const { error: vErr } = await supabase.rpc('create_deliverable_version', {
    p_deliverable_id: data.id,
    p_note: null,
  })
  if (vErr) backWithError('/deliverables', vErr)

  revalidatePath('/deliverables')
  backWithOk('/deliverables')
}

export async function createDeliverableVersion(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_deliverable_version', {
    p_deliverable_id: String(formData.get('deliverable_id') || ''),
    p_note: String(formData.get('note') || '') || null,
  })
  if (error) backWithError('/deliverables', error)
  revalidatePath('/deliverables')
  backWithOk('/deliverables')
}

export async function submitForInternalReview(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_version_for_review', {
    p_version_id: String(formData.get('version_id') || ''),
  })
  if (error) backWithError('/deliverables', error)
  revalidatePath('/deliverables')
  backWithOk('/deliverables')
}

export async function processReview(formData: FormData) {
  const supabase = await createClient()
  const stage = String(formData.get('stage') || '')
  const back = stage === 'client' ? '/client-portal' : '/deliverables'

  const { error } = await supabase.rpc('process_review_decision', {
    p_version_id: String(formData.get('version_id') || ''),
    p_stage: stage,
    p_decision: String(formData.get('decision') || ''),
    p_comment: String(formData.get('comment') || ''),
  })
  if (error) backWithError(back, error)

  revalidatePath('/deliverables')
  revalidatePath('/client-portal')
  backWithOk(back)
}

/** The target client comes from the project inside the DB, never from the form. */
export async function shareWithClient(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('share_version_with_client', {
    p_version_id: String(formData.get('version_id') || ''),
  })
  if (error) backWithError('/deliverables', error)
  revalidatePath('/deliverables')
  backWithOk('/deliverables')
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

  revalidatePath('/deliverables')
  return { ok: true }
}
