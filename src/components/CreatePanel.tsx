'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '@/components/icons'

/**
 * A "New …" button that opens its form in a centred dialog (a bottom sheet
 * on phones). Built on <details> so it opens without JavaScript; this
 * component adds the close button, Escape, and closing after a submit.
 */
export default function CreatePanel({
  label,
  title,
  children,
  buttonStyle,
}: {
  label: string
  title?: string
  children: ReactNode
  buttonStyle: CSSProperties
}) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.open) el.open = false
    }
    const onToggle = () => {
      // Keep the page behind still while the dialog is open
      document.documentElement.style.overflow = el.open ? 'hidden' : ''
      if (el.open) el.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus()
    }
    document.addEventListener('keydown', onKey)
    el.addEventListener('toggle', onToggle)
    return () => {
      document.removeEventListener('keydown', onKey)
      el.removeEventListener('toggle', onToggle)
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <details
      ref={ref}
      className="massar-disclosure massar-create"
      // A submitted form navigates; close so the page underneath shows the result
      onSubmit={() => setTimeout(() => { if (ref.current) ref.current.open = false }, 0)}
    >
      <summary style={buttonStyle}>
        <Icon name="plus" style={{ width: 16, height: 16 }} />
        {label}
      </summary>
      <div className="massar-create-body" role="dialog" aria-label={title || label}>
        <div className="massar-create-head">
          <h2 className="massar-create-title">{title || label}</h2>
          <button type="button" className="massar-create-close" aria-label="Close" onClick={() => { if (ref.current) ref.current.open = false }}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </details>
  )
}
