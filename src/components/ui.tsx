import type { CSSProperties, ReactNode } from 'react'
import { MESSAGES, statusTone } from '@/lib/labels'

/* Shared, token-only styles (Design System §6). No HEX values here. */

export const s = {
  pageTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '34px',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    color: 'var(--color-text-strong)',
    margin: '0 0 var(--space-4)',
    lineHeight: 1.2,
  } as CSSProperties,
  sectionTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '24px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    color: 'var(--color-text-strong)',
    margin: '0 0 var(--space-3)',
    lineHeight: 1.25,
  } as CSSProperties,
  section: {
    backgroundColor: 'var(--color-surface)',
    border: 'var(--border-width) solid var(--color-divider)',
    borderRadius: 'var(--radius-surface)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-5)',
  } as CSSProperties,
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-1)',
  } as CSSProperties,
  field: {
    width: '100%',
    minHeight: 'var(--control-height)',
    padding: '0 var(--space-3)',
    borderRadius: 'var(--radius-control)',
    border: 'var(--border-width) solid var(--color-border-strong)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--text-body)',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  } as CSSProperties,
  primary: {
    minHeight: 'var(--control-height)',
    padding: '0 var(--space-4)',
    backgroundColor: 'var(--color-action-primary)',
    color: 'var(--color-action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-control)',
    fontSize: 'var(--text-body)',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as CSSProperties,
  secondary: {
    minHeight: 'var(--control-height)',
    padding: '0 var(--space-4)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-strong)',
    border: 'var(--border-width) solid var(--color-text-strong)',
    borderRadius: 'var(--radius-control)',
    fontSize: 'var(--text-body)',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as CSSProperties,
  attention: {
    minHeight: 'var(--control-height)',
    padding: '0 var(--space-4)',
    backgroundColor: 'var(--color-attention)',
    color: 'var(--color-attention-text)',
    border: 'none',
    borderRadius: 'var(--radius-control)',
    fontSize: 'var(--text-body)',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as CSSProperties,
  textBtn: {
    background: 'none',
    border: 'none',
    padding: 'var(--space-2) 0',
    color: 'var(--color-text-strong)',
    fontSize: 'var(--text-label)',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textDecoration: 'underline',
  } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'start' } as CSSProperties,
  th: {
    padding: 'var(--space-2)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
    borderBottom: 'var(--border-width) solid var(--color-border-strong)',
    textAlign: 'start',
  } as CSSProperties,
  td: {
    padding: 'var(--space-2)',
    height: 'var(--row-height)',
    borderBottom: 'var(--border-width) solid var(--color-divider)',
    verticalAlign: 'middle',
  } as CSSProperties,
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-3)',
    alignItems: 'end',
  } as CSSProperties,
  muted: { color: 'var(--color-text)', fontSize: 'var(--text-label)' } as CSSProperties,
}

const toneMark: Record<string, string> = { neutral: '○', done: '✓', waiting: '◷', attention: '!' }

/** Status = text + mark + approved colour (never colour alone). */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = statusTone(status)
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-small)',
    fontSize: 'var(--text-label)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  }
  const tones: Record<string, CSSProperties> = {
    neutral: { color: 'var(--color-text)', border: 'var(--border-width) solid var(--color-border-strong)' },
    done: { color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-action-primary)' },
    waiting: { color: 'var(--color-text-strong)', border: 'var(--border-width) solid var(--color-text-strong)' },
    attention: { color: 'var(--color-attention-text)', backgroundColor: 'var(--color-attention)' },
  }
  return (
    <span style={{ ...base, ...tones[tone] }}>
      <span aria-hidden="true">{toneMark[tone]}</span>
      {label}
    </span>
  )
}

/** Banner for ?error= / ?ok= codes. Ink text + Clay/Green marker bar. */
export function Flash({ error, ok }: { error?: string; ok?: string }) {
  const code = error || ok
  if (!code) return null
  const isError = Boolean(error)
  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        border: 'var(--border-width) solid var(--color-divider)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: isError ? 'var(--color-attention)' : 'var(--color-action-primary)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-control)',
        marginBottom: 'var(--space-4)',
        fontSize: 'var(--text-body)',
      }}
    >
      {MESSAGES[code] || MESSAGES.UNKNOWN}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p style={{ ...s.muted, padding: 'var(--space-3) 0', margin: 0 }}>{children}</p>
}
