import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export const CAIRO = 'Africa/Cairo'

/** `<input type="datetime-local">` gives "2026-10-07T20:00" with no zone.
 *  Interpret it as Cairo wall-clock time and return a UTC ISO string. */
export function cairoInputToUtcIso(value: string): string {
  return fromZonedTime(value, CAIRO).toISOString()
}

export function formatCairo(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatInTimeZone(new Date(iso), CAIRO, 'yyyy-MM-dd hh:mm a')
}

export const TASK_STATUS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  canceled: 'Canceled',
}

export const DELIVERABLE_STATUS: Record<string, string> = {
  draft: 'Draft',
  internal_review: 'Under Internal Review',
  internal_changes_requested: 'Internal Changes Requested',
  approved_internally: 'Approved Internally',
  shared_with_client: 'Awaiting Client Decision',
  client_changes_requested: 'Client Requested Changes',
  client_approved: 'Client Approved',
}

/** Client-facing wording (the client never sees internal states). */
export const CLIENT_STATUS: Record<string, string> = {
  shared_with_client: 'Awaiting Your Decision',
  client_changes_requested: 'Changes Requested',
  client_approved: 'Approved by You',
}

export const ROLE: Record<string, string> = {
  admin: 'Partner',
  manager: 'Team Lead',
  member: 'Team Member',
  client: 'Client',
}

export const HANDOVER_REASONS: { value: string; label: string }[] = [
  { value: 'not_enough_time', label: 'Insufficient Time' },
  { value: 'schedule_conflict', label: 'Schedule Conflict' },
  { value: 'task_complexity', label: 'Higher Task Complexity' },
  { value: 'higher_priority', label: 'Higher Priority Assignment' },
  { value: 'need_assistance', label: 'Assistance Needed' },
  { value: 'other', label: 'Other Reason' },
]
export const HANDOVER_REASON_LABEL: Record<string, string> = Object.fromEntries(
  HANDOVER_REASONS.map(r => [r.value, r.label])
)

/** Status tone → only approved palette (see Design System §6 Badges). */
export function statusTone(status: string): 'neutral' | 'done' | 'waiting' | 'attention' {
  if (['completed', 'approved_internally', 'client_approved', 'converted', 'executed'].includes(status)) return 'done'
  if (['active', 'internal_review', 'shared_with_client', 'contacted', 'follow_up', 'in_progress', 'qualified'].includes(status)) return 'waiting'
  if (['blocked', 'internal_changes_requested', 'client_changes_requested', 'overdue', 'closed'].includes(status)) return 'attention'
  return 'neutral'
}

/** Short, professional English messages for codes raised by the DB / actions. */
export const MESSAGES: Record<string, string> = {
  // generic
  NOT_ALLOWED: 'You do not have permission to perform this action.',
  UNKNOWN: 'An unexpected issue occurred. Please try again.',
  MISSING_FIELDS: 'Please fill in all required fields.',
  MISSING_SERVICE_ROLE_KEY: 'Server configuration incomplete (SUPABASE_SERVICE_ROLE_KEY). Check .env.local.',
  // tasks
  TASK_NOT_FOUND: 'Task not found or not in your workspace scope.',
  TASK_TEAM_REQUIRED: 'This person isn’t in a team yet. Add them to a team in Settings first.',
  TASK_OWNER_INVALID: 'Selected owner is not available.',
  INVALID_STATUS_TRANSITION: 'Task cannot transition to this status directly.',
  TASK_CREATED: 'Task created and owner notified.',
  // handover
  NOT_TASK_OWNER: 'Handover requests can only be initiated by the current task owner.',
  TASK_CLOSED: 'Task is closed; handover cannot be requested.',
  INVALID_REASON: 'Please select a handover reason from the list.',
  HANDOVER_ALREADY_PENDING: 'A handover request is already pending for this task.',
  NO_DECIDER_AVAILABLE: 'No manager available to review request. Contact administration.',
  HANDOVER_REQUESTED: 'Handover request submitted to manager. Ownership remains unchanged until decided.',
  HANDOVER_NOT_FOUND: 'Handover request not found.',
  HANDOVER_ALREADY_DECIDED: 'A decision has already been recorded for this request.',
  NEW_OWNER_REQUIRED: 'Please select the team member to assign the task to.',
  NEW_OWNER_INVALID: 'Selected team member is not available.',
  NEW_OWNER_SAME_AS_CURRENT: 'Please choose someone other than the current owner.',
  NEW_OWNER_OUTSIDE_TEAM: 'Please select a member from the same team.',
  HANDOVER_DONE: 'Decision recorded successfully.',
  // deliverables
  DELIVERABLE_NOT_FOUND: 'Deliverable not found.',
  REVIEWER_INVALID: 'Selected reviewer is not available.',
  CURRENT_VERSION_STILL_OPEN: 'Current version is still under review; a new version cannot be created yet.',
  VERSION_NOT_FOUND: 'Version not found.',
  VERSION_NOT_DRAFT: 'Only draft versions can be submitted for review.',
  VERSION_HAS_NO_FILES: 'Please upload at least one file before submitting for review.',
  VERSION_NOT_CURRENT: 'This is not the latest version.',
  COMMENT_REQUIRED: 'Please provide notes detailing the requested revisions.',
  NOT_REVIEWER: 'Internal review is restricted to the assigned reviewer.',
  CANNOT_REVIEW_OWN_VERSION: 'You cannot approve a version you created yourself.',
  VERSION_NOT_IN_INTERNAL_REVIEW: 'This version is not awaiting internal review.',
  NOT_CLIENT_MEMBER: 'This deliverable is not in your organization.',
  VERSION_NOT_SHARED: 'This version is not awaiting client decision.',
  VERSION_NOT_APPROVED_INTERNALLY: 'Deliverable must be approved internally before sharing with client.',
  PROJECT_HAS_NO_CLIENT: 'Project is not linked to an external client.',
  FILE_UPLOAD_FAILED: 'File upload failed. Please try again.',
  SAVED: 'Saved successfully.',
  // admin
  INVITE_FAILED: 'Could not send the invite. Check the email address and try again.',
  EMAIL_EXISTS: 'This email already has an account. Use “Send sign-in link” next to their name to email them a fresh link.',
  INVITE_SENT: 'Invite emailed. They open the link and choose their own password.',
  SIGN_IN_LINK_SENT: 'Sign-in link emailed. They open it and choose a new password.',
  USER_DEACTIVATED: 'Access removed. Their history stays in the system.',
  USER_REACTIVATED: 'Access restored.',
  CLIENT_ADDED: 'Client added.',
  // delivery flow
  TASK_HAS_NO_CLIENT: 'This task isn’t linked to a client project, so it can’t be sent to a client. Mark it complete instead.',
  TASK_ALREADY_CLOSED: 'This task is already closed.',
  DELIVERY_IN_PROGRESS: 'This work is already with the reviewer or the client.',
  DELIVERY_OPENED: 'Upload your files, then send them for check.',
  SENT_FOR_CHECK: 'Sent for check. You’ll be notified when it’s reviewed.',
  SENT_TO_CLIENT: 'Approved and sent to the client.',
  CHANGES_SENT: 'Changes sent back to the owner.',
  // review links
  LINK_INVALID: 'This link has expired or doesn’t work. Ask your Massar contact for a new one.',
  LINK_ALREADY_DECIDED: 'This version was already answered or replaced by a newer one.',
  CLIENT_APPROVED: 'Thank you. Your approval was sent to the Massar team.',
  CLIENT_CHANGES_SENT: 'Thank you. The team got your notes and will send a new version.',
  WHATSAPP_SAVED: 'WhatsApp number saved.',
  CLIENT_DECISION_RECORDED: 'Recorded: the client approved. The task is closed.',
}

/** Pull a known code out of a Supabase / thrown error message. */
export function toCode(err: unknown): string {
  const msg = typeof err === 'string' ? err : (err as { message?: string })?.message || ''
  const hit = Object.keys(MESSAGES).find(code => msg.includes(code))
  if (hit) return hit
  if (msg.includes('row-level security')) return 'NOT_ALLOWED'
  return 'UNKNOWN'
}

/** Current time for server-rendered deadline buckets (kept out of render for react-hooks/purity). */
export function nowMs(): number {
  return Date.now()
}
