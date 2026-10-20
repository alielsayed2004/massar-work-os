'use client'

import { useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { approveAndSend } from '@/app/actions/delivery'

/**
 * Approves the delivery and opens WhatsApp with the client's message and
 * review link already written. The tab is opened on the click itself so
 * browsers don't block it, then pointed at WhatsApp once the link exists.
 */
export default function ApproveSendButton({ versionId, back, style }: { versionId: string; back: string; style?: CSSProperties }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const sep = back.includes('?') ? '&' : '?'

  function onClick() {
    const win = window.open('', '_blank')
    start(async () => {
      const r = await approveAndSend(versionId)
      if (r.url) {
        if (win) {
          win.opener = null
          win.location.href = r.url
        } else {
          window.location.href = r.url
          return
        }
        router.push(`${back}${sep}ok=SENT_TO_CLIENT&send=${encodeURIComponent(versionId)}`)
      } else {
        win?.close()
        // Approved but not sent: the page shows it with the client and a "WhatsApp" button
        router.push(`${back}${sep}error=${r.code || 'UNKNOWN'}`)
      }
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} aria-busy={pending} style={style}>
      {pending ? 'Sending…' : 'Approve & send'}
    </button>
  )
}
