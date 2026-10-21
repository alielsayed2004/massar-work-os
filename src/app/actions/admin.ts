'use server'

import { createClient } from '@/lib/supabase/server'
import { inviteAccount } from '@/lib/invite'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/site'
import { revalidatePath } from 'next/cache'
import { cairoInputToUtcIso } from '@/lib/labels'
import { backWithError, backWithOk } from '@/lib/flash'

// Clients don't sign in: they review from the WhatsApp link
const ROLES = ['admin', 'manager', 'member'] as const

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) backWithError('/admin', 'NOT_ALLOWED')
  const { data: actor } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
  if (actor?.role !== 'admin' || actor?.status !== 'active') backWithError('/admin', 'NOT_ALLOWED')
  return { supabase, user }
}

// ── Invite user ─────────────────────────────────────────────────────────────
// Role / client link go into app_metadata (only the server can write it), so a
// user can never pick their own role at sign-up.
export async function inviteUser(formData: FormData) {
  await requireAdmin()
  // Settings and the Team page both invite; each gets its answer back
  const back = String(formData.get('back') || '') === '/team' ? '/team' : '/admin'

  const email = String(formData.get('email') || '').trim()
  const full_name = String(formData.get('full_name') || '').trim()
  const role = String(formData.get('role') || '')
  const team_id = String(formData.get('team_id') || '') || null

  if (!email || !full_name || !ROLES.includes(role as (typeof ROLES)[number])) backWithError(back, 'MISSING_FIELDS')

  const failure = await inviteAccount({
    email,
    fullName: full_name,
    role: role as (typeof ROLES)[number],
    teamId: team_id,
    whatsapp: String(formData.get('whatsapp_phone') || '').trim() || null,
  })
  if (failure) backWithError(back, failure)

  revalidatePath('/admin')
  revalidatePath('/team')
  backWithOk(back, 'INVITE_SENT')
}

// ── One row in Settings → People: name, role, team and WhatsApp together ──
export async function saveUser(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const target_id = String(formData.get('user_id') || '')
  const full_name = String(formData.get('full_name') || '').trim()
  const role = String(formData.get('role') || '')
  if (!target_id || !full_name) backWithError('/admin', 'MISSING_FIELDS')

  const changes: Record<string, string | null> = {
    full_name,
    whatsapp_phone: String(formData.get('whatsapp_phone') || '').trim() || null,
  }
  // Your own role and team stay as they are, so a partner can't lock themselves out
  if (target_id !== user.id) {
    if (!ROLES.includes(role as (typeof ROLES)[number]) && role !== 'client') backWithError('/admin', 'MISSING_FIELDS')
    if (role !== 'client') changes.role = role
    changes.team_id = String(formData.get('team_id') || '') || null
  }

  const { error } = await supabase.from('profiles').update(changes).eq('id', target_id)
  if (error) backWithError('/admin', error)

  revalidatePath('/admin')
  revalidatePath('/team')
  revalidatePath('/today')
  revalidatePath('/', 'layout')
  backWithOk('/admin', 'PERSON_SAVED')
}

// ── WhatsApp for nudges ────────────────────────────────────────────────────
export async function setUserWhatsApp(formData: FormData) {
  const back = String(formData.get('back') || '') === '/team' ? '/team' : '/admin'
  const { supabase } = await requireAdmin()
  const target_id = String(formData.get('user_id') || '')
  const whatsapp_phone = String(formData.get('whatsapp_phone') || '').trim() || null
  if (!target_id) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.from('profiles').update({ whatsapp_phone }).eq('id', target_id)
  if (error) backWithError(back, error)

  revalidatePath('/admin')
  revalidatePath('/team')
  revalidatePath('/today')
  backWithOk(back, 'WHATSAPP_SAVED')
}

// ── Remove / restore access ────────────────────────────────────────────────
// Archive, never delete: history, files and decisions stay attributed.
export async function setUserActive(formData: FormData) {
  const back = String(formData.get('back') || '') === '/team' ? '/team' : '/admin'
  const { supabase, user } = await requireAdmin()
  const target_id = String(formData.get('user_id') || '')
  const active = formData.get('active') === 'true'
  if (!target_id) backWithError(back, 'MISSING_FIELDS')
  if (target_id === user.id) backWithError(back, 'NOT_ALLOWED')

  const { error } = await supabase
    .from('profiles')
    .update({ status: active ? 'active' : 'archived' })
    .eq('id', target_id)
  if (error) backWithError(back, error)

  await supabase.from('activity_events').insert({
    actor_user_id: user.id,
    event_type: active ? 'user_reactivated' : 'user_deactivated',
    reference_id: target_id,
    scope: 'internal',
  })

  revalidatePath('/admin')
  revalidatePath('/team')
  backWithOk(back, active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED')
}

// ── Sign-in link ───────────────────────────────────────────────────────────
// Invite links expire after a day. This emails a fresh one-time link to the
// set-password page; partners never see or choose anyone's password.
export async function sendSetPasswordLink(formData: FormData) {
  const back = String(formData.get('back') || '') === '/team' ? '/team' : '/admin'
  await requireAdmin()
  const target_id = String(formData.get('user_id') || '')
  if (!target_id) backWithError(back, 'MISSING_FIELDS')

  let admin
  try {
    admin = createAdminClient()
  } catch {
    backWithError(back, 'MISSING_SERVICE_ROLE_KEY')
  }
  const { data, error } = await admin.auth.admin.getUserById(target_id)
  if (error || !data.user?.email) backWithError(back, 'NOT_ALLOWED')
  const { error: sendErr } = await admin.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: `${await siteOrigin()}/auth/set-password`,
  })
  if (sendErr) backWithError(back, 'INVITE_FAILED')
  backWithOk(back, 'SIGN_IN_LINK_SENT')
}

// ── Departments & teams ─────────────────────────────────────────────────────
export async function createDepartment(formData: FormData) {
  const { supabase } = await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  if (!name) backWithError('/admin', 'MISSING_FIELDS')
  const { error } = await supabase.from('departments').insert({ name })
  if (error) backWithError('/admin', error)
  revalidatePath('/admin')
  backWithOk('/admin')
}

export async function createTeam(formData: FormData) {
  const { supabase } = await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  const department_id = String(formData.get('department_id') || '') || null
  const manager_user_id = String(formData.get('manager_user_id') || '') || null
  if (!name) backWithError('/admin', 'MISSING_FIELDS')

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, department_id, manager_user_id })
    .select('id')
    .single()
  if (error || !team) backWithError('/admin', error)

  // The manager belongs to the team they manage
  if (manager_user_id) {
    await supabase.from('profiles').update({ team_id: team.id }).eq('id', manager_user_id)
  }

  revalidatePath('/admin')
  backWithOk('/admin')
}

export async function setTeamManager(formData: FormData) {
  const { supabase } = await requireAdmin()
  const team_id = String(formData.get('team_id') || '')
  const manager_user_id = String(formData.get('manager_user_id') || '') || null
  if (!team_id) backWithError('/admin', 'MISSING_FIELDS')

  const { error } = await supabase.from('teams').update({ manager_user_id }).eq('id', team_id)
  if (error) backWithError('/admin', error)
  if (manager_user_id) {
    await supabase.from('profiles').update({ team_id }).eq('id', manager_user_id)
  }
  revalidatePath('/admin')
  backWithOk('/admin')
}

// ── Assign task (admin shortcut) ────────────────────────────────────────────
// Team is taken from the assignee, so the task always lands in a real team.
export async function assignTask(formData: FormData) {
  const { supabase } = await requireAdmin()

  const title = String(formData.get('title') || '').trim()
  const assignee = String(formData.get('assignee_id') || '')
  const dueLocal = String(formData.get('due_at') || '')
  if (!title || !assignee || !dueLocal) backWithError('/admin', 'MISSING_FIELDS')

  const { data: owner } = await supabase.from('profiles').select('team_id').eq('id', assignee).single()
  if (!owner?.team_id) backWithError('/admin', 'TASK_TEAM_REQUIRED')

  const { error } = await supabase.from('tasks').insert({
    title,
    description: String(formData.get('description') || '') || null,
    project_id: String(formData.get('project_id') || '') || null,
    current_owner_user_id: assignee,
    original_owner_user_id: assignee,
    reviewer_user_id: String(formData.get('reviewer_user_id') || '') || null,
    team_id: owner.team_id,
    due_at: cairoInputToUtcIso(dueLocal),
  })
  if (error) backWithError('/admin', error)

  revalidatePath('/admin')
  revalidatePath('/my-work')
  backWithOk('/admin', 'TASK_CREATED')
}
