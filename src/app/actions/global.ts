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
  
  if (!query || query.trim().length < 2) return { projects: [], tasks: [], clients: [] }
  // What the person typed is text, not a pattern or a filter
  const like = `%${query.trim().replace(/[%_\\]/g, m => `\\${m}`)}%`

  // RLS protects these automatically
  const [
    { data: projects },
    { data: tasks },
    { data: clients }
  ] = await Promise.all([
    supabase.from('projects').select('id, name, client_id').ilike('name', like).limit(5),
    supabase.from('tasks').select('id, title, projects ( client_id )').ilike('title', like).limit(5),
    supabase.from('clients').select('id, company_name').ilike('company_name', like).limit(5)
  ])

  return {
    projects: (projects || []).map(p => ({ id: p.id, name: p.name, href: p.client_id ? `/spaces/${p.client_id}` : null })),
    tasks: ((tasks || []) as unknown as { id: string; title: string; projects: { client_id: string | null } | null }[]).map(t => ({
      id: t.id,
      title: t.title,
      href: t.projects?.client_id ? `/spaces/${t.projects.client_id}` : null,
    })),
    clients: (clients || []).map(c => ({ id: c.id, company_name: c.company_name, href: `/spaces/${c.id}` })),
  }
}
