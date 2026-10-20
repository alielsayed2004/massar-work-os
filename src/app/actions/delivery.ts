'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'

// Task → partner check → client. Every step is a DB function that checks the
// caller and the current state; these actions only route the result.

function refresh() {
  for (const path of ['/today', '/overview', '/my-work', '/my-team', '/deliverables', '/client-portal']) revalidatePath(path)
}

/** The task owner opens a draft version on their task (created on first delivery). */
export async function startDelivery(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/my-work')
  const { error } = await supabase.rpc('start_task_delivery', { p_task_id: String(formData.get('task_id') || '') })
  if (error) backWithError(back, error)
  refresh()
  backWithOk(back, 'DELIVERY_OPENED')
}

export async function sendForCheck(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/my-work')
  const { error } = await supabase.rpc('submit_version_for_review', { p_version_id: String(formData.get('version_id') || '') })
  if (error) backWithError(back, error)
  refresh()
  backWithOk(back, 'SENT_FOR_CHECK')
}

/** A partner's check. Approval goes straight to the client (owners' decision, Oct 2026). */
export async function checkDelivery(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/overview')
  const versionId = String(formData.get('version_id') || '')
  const decision = String(formData.get('decision') || '')

  const { error } = await supabase.rpc('process_review_decision', {
    p_version_id: versionId,
    p_stage: 'internal',
    p_decision: decision,
    p_comment: String(formData.get('comment') || ''),
  })
  if (error) backWithError(back, error)

  if (decision === 'approved') {
    // If sharing fails (e.g. project without a client) the version stays
    // approved internally and the Deliverables page still offers "Share".
    const { error: shareErr } = await supabase.rpc('share_version_with_client', { p_version_id: versionId })
    refresh()
    if (shareErr) backWithError(back, shareErr)
    // The page offers the WhatsApp send for this version right away
    backWithOk(back, 'SENT_TO_CLIENT', `&send=${encodeURIComponent(versionId)}`)
  }

  refresh()
  backWithOk(back, 'CHANGES_SENT')
}

/** Brief / reference material attached to the task itself (not client-visible). */
export async function registerTaskFile(input: {
  taskId: string
  storageKey: string
  name: string
  type: string
  size: number
}): Promise<{ ok: boolean; code?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'NOT_ALLOWED' }
  if (!input.storageKey.startsWith(`tasks/${input.taskId}/`)) return { ok: false, code: 'NOT_ALLOWED' }

  const { error } = await supabase.from('files').insert({
    task_id: input.taskId,
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
    reference_id: input.taskId,
    changes: { name: input.name },
    scope: 'internal',
  })

  refresh()
  return { ok: true }
}
