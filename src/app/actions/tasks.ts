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
  const dueLocal = String(formData.get('due_at') || '')
  let teamId = String(formData.get('team_id') || '')
  if (!teamId && owner) {
    // Partners pick a person, not a team: the task lands in that person's team.
    const { data: person } = await supabase.from('profiles').select('team_id').eq('id', owner).single()
    teamId = person?.team_id || ''
    if (!teamId) backWithError(back, 'TASK_TEAM_REQUIRED')
  }
  if (!title || !owner || !teamId || !dueLocal) backWithError(back, 'MISSING_FIELDS')

  // From a client space: the task joins that client's project, or a "General"
  // project made the first time so work can still be sent to the client.
  let projectId = String(formData.get('project_id') || '') || null
  const clientId = String(formData.get('client_id') || '')
  if (!projectId && clientId) {
    const { data: existing } = await supabase
      .from('projects').select('id').eq('client_id', clientId).neq('status', 'archived')
      .order('created_at', { ascending: true }).limit(1)
    projectId = existing?.[0]?.id || null
    if (!projectId) {
      const { data: made, error: projErr } = await supabase
        .from('projects').insert({ client_id: clientId, name: 'General', internal_team_id: teamId, status: 'active' })
        .select('id').single()
      if (projErr || !made) backWithError(back, projErr)
      projectId = made.id
    }
  }

  const { error } = await supabase.from('tasks').insert({
    title,
    description: String(formData.get('description') || '') || null,
    project_id: projectId,
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
  revalidatePath('/overview')
  revalidatePath('/spaces')
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
