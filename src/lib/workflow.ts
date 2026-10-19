/** Where a piece of work sits on the owners' board. One task = one card. */
export type Stage = 'received' | 'working' | 'check' | 'client' | 'done'

export const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 'received', label: 'Received', hint: 'Assigned, not started' },
  { key: 'working', label: 'In progress', hint: 'With the team' },
  { key: 'check', label: 'Your check', hint: 'Delivered, waiting for a partner' },
  { key: 'client', label: 'With client', hint: 'Waiting for the client’s reply' },
  { key: 'done', label: 'Done', hint: 'Approved by the client' },
]

/** Task status + its delivery's status (if any) → board stage. */
export function stageOf(taskStatus: string, deliveryStatus: string | null | undefined): Stage {
  if (taskStatus === 'completed' || deliveryStatus === 'client_approved') return 'done'
  if (deliveryStatus === 'internal_review' || deliveryStatus === 'approved_internally') return 'check'
  if (deliveryStatus === 'shared_with_client') return 'client'
  if (taskStatus === 'todo' && !deliveryStatus) return 'received'
  return 'working'
}

export function changesRequested(deliveryStatus: string | null | undefined) {
  return deliveryStatus === 'internal_changes_requested' || deliveryStatus === 'client_changes_requested'
}

/** Digits only, in international format. Egyptian local numbers (01…) get 20. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw || '').replace(/\D/g, '').replace(/^00/, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('01')) return `2${digits}`
  return digits.length >= 8 ? digits : null
}

/** Opens WhatsApp with the message typed in; a person still presses send. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = normalizePhone(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

export function hoursUntil(iso: string, now: number) {
  return (new Date(iso).getTime() - now) / 36e5
}

/** "in 3h", "2d late" — short enough for a card. */
export function dueLabel(iso: string, now: number) {
  const h = hoursUntil(iso, now)
  const abs = Math.abs(h)
  const span = abs < 1 ? `${Math.max(1, Math.round(abs * 60))}m` : abs < 48 ? `${Math.round(abs)}h` : `${Math.round(abs / 24)}d`
  return h < 0 ? `${span} late` : `in ${span}`
}
