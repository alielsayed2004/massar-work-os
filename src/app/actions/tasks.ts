'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cairoInputToUtcIso } from '@/lib/labels'
import { backWithError, backWithOk } from '@/lib/flash'

const STATUSES = ['todo', 'in_progress', 'completed', 'blocked', 'canceled'] as const

/** Status changes go through the DB function, which enforces who may move what. */
export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient()
  const taskId = String(formData.get('task_id') || '')
  const status = String(formData.get('status') || '')
  const back = String(formData.get('back') || '/my-work')

  if (!taskId || !STATUSES.includes(status as (typeof STATUSES)[number])) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.rpc('update_task_status', { p_task_id: taskId, p_status: status })
  if (error) backWithError(back, error)

  revalidatePath('/my-work')
  revalidatePath('/my-team')
  backWithOk(back)
}

/** Manager (own team) or admin. Original owner, activity and the owner's
 *  notification are handled by DB triggers. */
export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/my-team')

  const title = String(formData.get('title') || '').trim()
  const owner = String(formData.get('owner_id') || '')
  const teamId = String(formData.get('team_id') || '')
  const dueLocal = String(formData.get('due_at') || '')
  if (!title || !owner || !teamId || !dueLocal) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.from('tasks').insert({
    title,
    description: String(formData.get('description') || '') || null,
    project_id: String(formData.get('project_id') || '') || null,
    current_owner_user_id: owner,
    original_owner_user_id: owner,
    reviewer_user_id: String(formData.get('reviewer_user_id') || '') || null,
    team_id: teamId,
    priority: String(formData.get('priority') || 'medium'),
    due_at: cairoInputToUtcIso(dueLocal), // form is Cairo wall-clock; DB stores UTC
  })
  if (error) backWithError(back, error)

  revalidatePath('/my-team')
  revalidatePath('/my-work')
  backWithOk(back, 'TASK_CREATED')
}

export async function addComment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const back = String(formData.get('back') || '/my-work')
  if (!user) backWithError(back, 'NOT_ALLOWED')

  const taskId = String(formData.get('task_id') || '')
  const content = String(formData.get('content') || '').trim()
  if (!taskId || !content) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.from('comments').insert({
    task_id: taskId,
    author_user_id: user.id,
    scope: 'internal',
    content,
  })
  if (error) backWithError(back, error)

  await supabase.from('activity_events').insert({
    actor_user_id: user.id,
    event_type: 'comment_added',
    reference_id: taskId,
    scope: 'internal',
  })

  revalidatePath('/my-work')
  backWithOk(back)
}
