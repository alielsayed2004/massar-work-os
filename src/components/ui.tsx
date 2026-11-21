import type { CSSProperties, ReactNode } from 'react'
import { MESSAGES, statusTone } from '@/lib/labels'
import CreatePanelDialog from '@/components/CreatePanel'

/* Shared, token-only styles (Design System §6). No HEX values here. */

export const s = {
  pageTitle: {
    fontSize: 'var(--text-page)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: 'var(--color-text-strong)',
    margin: '0 0 var(--space-4)',
    lineHeight: 1.15,
  } as CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text-strong)',
    margin: '0 0 var(--space-3)',
    lineHeight: 1.3,
  } as CSSProperties,
  section: {
    backgroundColor: 'var(--color-surface-raised)',
    border: 'var(--border-width) solid var(--color-line)',
    borderRadius: 'var(--radius-surface)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
  } as CSSProperties,
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '6px',
  } as CSSProperties,
  field: {
    width: '100%',
    minHeight: '44px',
    padding: '0 12px',
    borderRadius: 'var(--radius-control)',
    border: 'var(--border-width) solid var(--color-line-strong)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: '15px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as CSSProperties,
  primary: {
    minHeight: '44px',
    padding: '0 18px',
    backgroundColor: 'var(--color-action-primary)',
    color: 'var(--color-action-primary-text)',
    border: 'var(--border-width) solid var(--color-action-primary)',
    borderRadius: 'var(--radius-control)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  secondary: {
    minHeight: '44px',
    padding: '0 18px',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-strong)',
    border: 'var(--border-width) solid var(--color-line-strong)',
    borderRadius: 'var(--radius-control)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  attention: {
    minHeight: '44px',
    padding: '0 18px',
    backgroundColor: 'var(--color-attention)',
    color: 'var(--color-attention-text)',
    border: 'var(--border-width) solid var(--color-attention)',
    borderRadius: 'var(--radius-control)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  textBtn: {
    background: 'none',
    border: 'none',
    padding: 'var(--space-2) 0',
    color: 'var(--color-text-strong)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'start' } as CSSProperties,
  th: {
    padding: '10px var(--space-4)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface-sunken)',
    borderBottom: 'var(--border-width) solid var(--color-line)',
    textAlign: 'start',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  td: {
    padding: '12px var(--space-4)',
    height: 'var(--row-height)',
    borderBottom: 'var(--border-width) solid var(--color-line)',
    verticalAlign: 'middle',
  } as CSSProperties,
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-3) var(--grid-gap)',
    alignItems: 'start',
  } as CSSProperties,
  muted: { color: 'var(--color-text-muted)', fontSize: '14px' } as CSSProperties,
}

/** One title per screen, an optional line of context, and at most one primary action. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="massar-page-header">
      <div>
        {eyebrow && <p className="massar-page-eyebrow">{eyebrow}</p>}
        <h1 className="massar-page-title">{title}</h1>
        {description && <p className="massar-page-description">{description}</p>}
      </div>
      {actions && <div className="massar-page-actions">{actions}</div>}
    </header>
  )
}

export function StatStrip({ items }: { items: { label: string; value: number | string; attention?: boolean }[] }) {
  return (
    <dl className="massar-stats">
      {items.map(item => (
        <div key={item.label} className="massar-stat" data-tone={item.attention ? 'attention' : undefined}>
          <dt>
            {item.attention && <span className="massar-stat-dot" aria-hidden="true" />}
            {item.label}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A titled section of a page: serif heading over a hairline, then the body. */
export function Panel({
  title,
  count,
  attention,
  subtitle,
  actions,
  flush,
  children,
  id,
}: {
  title: string
  count?: number
  attention?: boolean
  subtitle?: ReactNode
  actions?: ReactNode
  flush?: boolean
  children: ReactNode
  id?: string
}) {
  return (
    <section className="massar-panel massar-section" id={id} aria-label={title}>
      <div className="massar-panel-head">
        <div>
          <h2 className="massar-panel-title">
            {title}
            {typeof count === 'number' && (
              <span className="massar-panel-count" data-tone={attention && count > 0 ? 'attention' : undefined}>
                {count}
              </span>
            )}
          </h2>
          {subtitle && <p className="massar-panel-sub">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="massar-panel-body" data-flush={flush ? '' : undefined}>
        {children}
      </div>
    </section>
  )
}

/** A "New …" button whose form opens in a dialog. */
export function CreatePanel({
  label,
  title,
  children,
  secondary,
}: {
  label: string
  title?: string
  children: ReactNode
  secondary?: boolean
}) {
  return <CreatePanelDialog label={label} title={title} buttonStyle={secondary ? s.secondary : s.primary}>{children}</CreatePanelDialog>
}

const toneMark: Record<string, string> = { neutral: '○', done: '✓', waiting: '◷', attention: '!' }

/** Status = text + mark + approved colour (never colour alone). */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = statusTone(status)
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '24px',
    padding: '0 10px',
    boxSizing: 'border-box',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    border: 'var(--border-width) solid transparent',
  }
  const tones: Record<string, CSSProperties> = {
    neutral: { color: 'var(--color-text)', borderColor: 'var(--color-line-strong)' },
    done: { color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-action-primary)' },
    waiting: { color: 'var(--color-text-strong)', backgroundColor: 'var(--color-hover-strong)' },
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
        backgroundColor: 'var(--color-surface-raised)',
        color: 'var(--color-text)',
        border: 'var(--border-width) solid var(--color-line)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: isError ? 'var(--color-attention)' : 'var(--color-action-primary)',
        padding: '12px var(--space-3)',
        borderRadius: 'var(--radius-control)',
        marginBottom: 'var(--space-4)',
        fontSize: '15px',
      }}
    >
      {MESSAGES[code] || MESSAGES.UNKNOWN}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p style={{ ...s.muted, padding: 'var(--space-5) var(--space-4)', margin: 0, textAlign: 'center' }}>{children}</p>
}
