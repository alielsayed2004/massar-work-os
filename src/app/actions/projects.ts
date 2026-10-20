'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backWithError, backWithOk } from '@/lib/flash'

// RLS: clients are written by partners (admin) only.

/** Partners only (RLS). Clients get no account; they review from the WhatsApp link. */
export async function createClientRecord(formData: FormData) {
  const supabase = await createClient()
  const back = String(formData.get('back') || '/spaces')
  const company_name = String(formData.get('company_name') || '').trim()
  const contact_name = String(formData.get('contact_name') || '').trim() || null
  const whatsapp_phone = String(formData.get('whatsapp_phone') || '').trim() || null
  if (!company_name) backWithError(back, 'MISSING_FIELDS')

  const { error } = await supabase.from('clients').insert({ company_name, contact_name, whatsapp_phone, status: 'active' })
  if (error) backWithError(back, error)

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
