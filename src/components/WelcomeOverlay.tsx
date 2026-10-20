'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'massar_welcome_seen'
const VISIBLE_MS = 1400
const FADE_MS = 400

const ROLE_EYEBROW: Record<string, string> = {
  admin: 'Operations',
  manager: 'Team lead',
  member: 'Workspace',
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** A short greeting shown once per browser session, never a gate in front of work. */
export default function WelcomeOverlay({ fullName, role }: { fullName: string; role: string }) {
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden')
  const [hello, setHello] = useState('Welcome')

  useEffect(() => {
    let seen = true
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1'
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Storage blocked: skip the greeting rather than show it on every page.
    }
    if (seen) return

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => {
      setHello(greeting(new Date().getHours()))
      setPhase('visible')
    }, 0))
    timers.push(setTimeout(() => setPhase('leaving'), VISIBLE_MS))
    timers.push(setTimeout(() => setPhase('hidden'), VISIBLE_MS + FADE_MS))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (phase !== 'visible') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhase('hidden')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  if (phase === 'hidden') return null

  const firstName = fullName.split(' ')[0] || fullName

  return (
    <div
      role="status"
      aria-live="polite"
      className="massar-welcome"
      data-leaving={phase === 'leaving'}
      onClick={() => setPhase('hidden')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/image/massar_logo.svg" alt="" className="massar-welcome-logo" />
      <p className="massar-welcome-eyebrow">{ROLE_EYEBROW[role] || 'Workspace'}</p>
      <p className="massar-welcome-title">
        {hello}, {firstName}
      </p>
    </div>
  )
}
