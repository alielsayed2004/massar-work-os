import type { createClient } from '@/lib/supabase/server'
import { stageOf, changesRequested, hoursUntil, type Stage } from '@/lib/workflow'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type SpaceFile = { id: string; original_name: string }
export type SpaceDecision = { decision: string; comment: string | null; stage: string; created_at: string }
export type SpaceVersion = {
  id: string
  version_number: number
  status: string
  shared_at: string | null
  created_at: string
  files: SpaceFile[]
  review_decisions: SpaceDecision[]
}
export type SpaceTask = {
  id: string
  title: string
  description: string | null
  status: string
  due_at: string
  updated_at: string
  current_owner_user_id: string
  owner: { full_name: string; whatsapp_phone: string | null } | null
  projects: { id: string; name: string; client_id: string } | null
  files: SpaceFile[]
}
type Delivery = { source_task_id: string; summary_status: string; current_version_id: string | null; deliverable_versions: SpaceVersion[] }

export type SpaceItem = {
  task: SpaceTask
  stage: Stage
  version: SpaceVersion | undefined
  deliveryStatus: string | null
  late: boolean
  changes: SpaceDecision | undefined
}

const DONE_WINDOW_DAYS = 30

/**
 * Every client task with where it stands. RLS scopes what the caller sees;
 * pass a client id to load one space only.
 */
export async function loadSpaceItems(supabase: Supabase, now: number, clientId?: string): Promise<SpaceItem[]> {
  let query = supabase
    .from('tasks')
    .select(`id, title, description, status, due_at, updated_at, current_owner_user_id,
      owner:profiles!tasks_current_owner_user_id_fkey ( full_name, whatsapp_phone ),
      projects!inner ( id, name, client_id ),
      files ( id, original_name )`)
    .neq('status', 'canceled')
    .or(`status.neq.completed,updated_at.gte."${new Date(now - DONE_WINDOW_DAYS * 864e5).toISOString()}"`)
    .order('due_at', { ascending: true })
  if (clientId) query = query.eq('projects.client_id', clientId)
  const { data: taskRows } = await query
  const tasks = (taskRows || []) as unknown as SpaceTask[]
  if (!tasks.length) return []

  const { data: deliveryRows } = await supabase
    .from('deliverables')
    .select(`source_task_id, summary_status, current_version_id,
      deliverable_versions!deliverable_versions_deliverable_id_fkey ( id, version_number, status, shared_at, created_at,
        files ( id, original_name ),
        review_decisions ( decision, comment, stage, created_at ) )`)
    .in('source_task_id', tasks.map(t => t.id))
    .order('created_at', { ascending: true })
  // Later rows win, so each task maps to its newest delivery
  const deliveryOf = new Map(((deliveryRows || []) as unknown as Delivery[]).map(d => [d.source_task_id, d]))

  return tasks.map(task => {
    const d = deliveryOf.get(task.id)
    const stage = stageOf(task.status, d?.summary_status)
    const changes = changesRequested(d?.summary_status)
      ? d?.deliverable_versions
          ?.flatMap(v => v.review_decisions || [])
          .filter(r => r.decision === 'changes_requested')
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      : undefined
    return {
      task,
      stage,
      version: d?.deliverable_versions?.find(v => v.id === d.current_version_id),
      deliveryStatus: d?.summary_status || null,
      late: (stage === 'received' || stage === 'working') && hoursUntil(task.due_at, now) < 0,
      changes,
    }
  })
}

export function spaceCounts(items: SpaceItem[]) {
  return {
    open: items.filter(i => i.stage !== 'done').length,
    check: items.filter(i => i.stage === 'check').length,
    client: items.filter(i => i.stage === 'client').length,
    late: items.filter(i => i.late).length,
  }
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
