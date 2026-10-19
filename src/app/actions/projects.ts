'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'
import { inviteAccount } from '@/lib/invite'

// RLS: clients → admin only; projects → admin or the project team's manager.

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/projects')
  const client_id = String(formData.get('client_id') || '')
  const name = String(formData.get('name') || '').trim()
  const internal_team_id = String(formData.get('internal_team_id') || '') || null
  if (!client_id || !name) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.from('projects').insert({ client_id, name, internal_team_id, status: 'active' })
  if (error) backWithError(back, error)

  revalidatePath('/projects')
  revalidatePath('/admin')
  backWithOk(back)
}

/** Partners only (RLS). Optional portal email sends the client an invite in the same step. */
export async function createClientRecord(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/projects')
  const company_name = String(formData.get('company_name') || '').trim()
  const contact_name = String(formData.get('contact_name') || '').trim() || null
  const whatsapp_phone = String(formData.get('whatsapp_phone') || '').trim() || null
  const portal_email = String(formData.get('portal_email') || '').trim()
  if (!company_name) backWithError(back, 'MISSING_FIELDS')

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ company_name, contact_name, whatsapp_phone, status: 'active' })
    .select('id')
    .single()
  if (error || !client) backWithError(back, error)

  // The insert above already proved the caller is a partner (clients RLS = admin).
  if (portal_email) {
    const failure = await inviteAccount({
      email: portal_email,
      fullName: contact_name || company_name,
      role: 'client',
      clientId: client.id,
    })
    revalidatePath('/projects')
    if (failure) backWithError(back, failure)
    backWithOk(back, 'INVITE_SENT')
  }

  revalidatePath('/projects')
  revalidatePath('/admin')
  backWithOk(back, 'CLIENT_ADDED')
}

export async function updateClientContact(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('client_id') || '')
  if (!id) backWithError('/projects', 'MISSING_FIELDS')

  const { data, error } = await supabase
    .from('clients')
    .update({
      contact_name: String(formData.get('contact_name') || '').trim() || null,
      whatsapp_phone: String(formData.get('whatsapp_phone') || '').trim() || null,
    })
    .eq('id', id)
    .select('id')
  if (error) backWithError('/projects', error)
  if (!data?.length) backWithError('/projects', 'NOT_ALLOWED')

  revalidatePath('/projects')
  revalidatePath('/overview')
  backWithOk('/projects')
}

/** Archive, never delete (ملحق 2.1). */
export async function archiveProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) backWithError('/projects', 'NOT_ALLOWED')
  const projectId = String(formData.get('project_id') || '')

  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId)
    .select('id')
  if (error) backWithError('/projects', error)
  if (!data?.length) backWithError('/projects', 'NOT_ALLOWED')

  await supabase.from('activity_events').insert({
    actor_user_id: user.id,
    event_type: 'project_archived',
    reference_id: projectId,
    scope: 'internal',
  })

  revalidatePath('/projects')
  backWithOk('/projects')
}
