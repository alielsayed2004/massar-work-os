'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'

/** Employee → request. Does NOT change the owner; the manager decides (ملحق 1.2). */
export async function requestHandover(formData: FormData) {
  const supabase = await createClient()
  const taskId = String(formData.get('task_id') || '')
  const reason = String(formData.get('reason') || '')
  const note = String(formData.get('internal_note') || '')
  if (!taskId || !reason) backWithError('/my-work', 'INVALID_REASON')

  // Manager lookup, admin fallback, duplicate check, notification and
  // activity all happen atomically inside the DB function.
  const { error } = await supabase.rpc('request_handover', {
    p_task_id: taskId,
    p_reason: reason,
    p_note: note,
  })
  if (error) backWithError('/my-work', error)

  revalidatePath('/my-work')
  revalidatePath('/my-team')
  backWithOk('/my-work', 'HANDOVER_REQUESTED')
}

/** Manager → assign to a chosen teammate, decline, or cancel. */
export async function decideHandover(formData: FormData) {
  const supabase = await createClient()
  const handoverId = String(formData.get('handover_id') || '')
  const decision = String(formData.get('decision') || '')
  const newOwner = String(formData.get('new_owner_id') || '')
  const note = String(formData.get('internal_note') || '')

  if (!handoverId || !['assigned', 'declined', 'cancelled'].includes(decision)) {
    backWithError('/my-team', 'MISSING_FIELDS')
  }
  if (decision === 'assigned' && !newOwner) backWithError('/my-team', 'NEW_OWNER_REQUIRED')

  const { error } = await supabase.rpc('process_handover_decision', {
    p_handover_id: handoverId,
    p_decision: decision,
    p_new_owner_id: decision === 'assigned' ? newOwner : null,
    p_internal_note: note || null,
  })
  if (error) backWithError('/my-team', error)

  revalidatePath('/my-team')
  revalidatePath('/my-work')
  backWithOk('/my-team', 'HANDOVER_DONE')
}
