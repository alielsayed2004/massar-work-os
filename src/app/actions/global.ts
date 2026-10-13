'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_user_id', user.id)

  // Revalidate entire dashboard layout to update unread badge
  revalidatePath('/', 'layout')
}

export async function searchAll(query: string) {
  const supabase = await createClient()
  
  if (!query || query.length < 2) return { projects: [], tasks: [], clients: [] }

  // RLS protects these automatically
  const [
    { data: projects },
    { data: tasks },
    { data: clients }
  ] = await Promise.all([
    supabase.from('projects').select('id, name').ilike('name', `%${query}%`).limit(5),
    supabase.from('tasks').select('id, title').ilike('title', `%${query}%`).limit(5),
    supabase.from('clients').select('id, company_name').ilike('company_name', `%${query}%`).limit(5)
  ])

  return { projects, tasks, clients }
}
