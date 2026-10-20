'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'
import { inviteAccount } from '@/lib/invite'

// RLS: clients are written by partners (admin) only.

/** Partners only (RLS). Optional portal email sends the client an invite in the same step. */
export async function createClientRecord(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/spaces')
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
    revalidatePath('/spaces', 'layout')
    if (failure) backWithError(back, failure)
    backWithOk(back, 'INVITE_SENT')
  }

  revalidatePath('/spaces', 'layout')
  backWithOk(back, 'CLIENT_ADDED')
}

export async function updateClientContact(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('client_id') || '')
  const back = `/spaces/${id}`
  if (!id) backWithError('/spaces', 'MISSING_FIELDS')

  const { data, error } = await supabase
    .from('clients')
    .update({
      contact_name: String(formData.get('contact_name') || '').trim() || null,
      whatsapp_phone: String(formData.get('whatsapp_phone') || '').trim() || null,
    })
    .eq('id', id)
    .select('id')
  if (error) backWithError(back, error)
  if (!data?.length) backWithError(back, 'NOT_ALLOWED')

  revalidatePath('/spaces', 'layout')
  backWithOk(back)
}
