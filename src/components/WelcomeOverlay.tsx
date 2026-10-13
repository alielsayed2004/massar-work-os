'use client'

import { useState, useEffect, useRef } from 'react'

interface WelcomeOverlayProps {
  fullName: string
  role: string
}

interface RoleConfig {
  eyebrow: string
  supportingText: string
  roleLabel: string
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  admin: {
    eyebrow: 'OPERATIONS DIRECTOR',
    supportingText: 'Your workflows, permissions, and directives — in one place.',
    roleLabel: 'Executive Governance & Directives',
  },
  manager: {
    eyebrow: 'OPERATIONS & DELIVERY MANAGER',
    supportingText: 'Milestone deadlines, team capacity, and active delivery pipelines — in one place.',
    roleLabel: 'Milestone Delivery & Oversight',
  },
  member: {
    eyebrow: 'CREATIVE & OPERATIONS SPECIALIST',
    supportingText: 'Your active task buckets, urgent handovers, and creative deliverables — in one place.',
    roleLabel: 'Creative & Operations Execution',
  },
  client: {
    eyebrow: 'STRATEGIC CLIENT PARTNER',
    supportingText: 'Real-time project milestones, asset reviews, and deliverable approvals — in one place.',
    roleLabel: 'Brand Oversight & Deliverables',
  },
}

export default function WelcomeOverlay({ fullName, role }: WelcomeOverlayProps) {
  const [mounted, setMounted] = useState<boolean>(false)
  const [step, setStep] = useState<'active' | 'dissolve' | 'done'>('active')
  const [progress, setProgress] = useState(0)
  const [showGridOverlay, setShowGridOverlay] = useState(false)
  const [dateStrings, setDateStrings] = useState<{ shortDate: string; longDate: string }>({
    shortDate: 'Oct 2026',
    longDate: 'Today',
  })

  const dismissedRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const dismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setStep('dissolve')
    setTimeout(() => {
      setStep('done')
    }, 700)
  }

  const startAnimation = () => {
    dismissedRef.current = false
    setStep('active')
    setProgress(0)

    const totalDuration = 3400 // Total loading duration
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const p = Math.min(100, (elapsed / totalDuration) * 100)
      setProgress(p)

      if (elapsed >= totalDuration) {
        clearInterval(interval)
        // Auto-redirect after 600ms of loading completion
        timerRef.current = setTimeout(() => {
          dismiss()
        }, 600)
      }
    }, 25)

    return () => {
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }

  useEffect(() => {
    setMounted(true)

    // Format localized date
    try {
      const now = new Date()
      const longFmt = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now)
      const shortFmt = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(now)
      setDateStrings({ longDate: longFmt, shortDate: shortFmt })
    } catch {
      // Fallback
    }

    const cleanup = startAnimation()

    // Global Key Listener:
    // "G" or "g" toggles the 12-column dev grid overlay
    // "W" or "w" replays the welcome screen for quick testing
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }
      if (e.key === 'g' || e.key === 'G') {
        setShowGridOverlay((prev) => !prev)
      }
      if (e.key === 'w' || e.key === 'W') {
        startAnimation()
      }
    }

    const handleReplay = () => {
      startAnimation()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('massar-replay-welcome', handleReplay)

    return () => {
      cleanup?.()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('massar-replay-welcome', handleReplay)
    }
  }, [])

  if (!mounted || step === 'done') return null

  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.member
  const displayName =
    !fullName || fullName === 'Unknown User' || fullName.toLowerCase() === 'admin'
      ? 'Ali'
      : fullName.split(' ')[0] || fullName

  const isComplete = progress >= 100

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Massar Work OS"
      className={`massar-welcome-viewport ${step === 'dissolve' ? 'massar-welcome-dissolving' : ''}`}
    >
      {/* ── 1. TOP BAR (72px) ── */}
      <header className="massar-split-topbar">
        <div className="massar-grid-frame">
          <div className="massar-12-col-grid">
            {/* Cols 1–3: [logo + massar] */}
            <div className="massar-welcome-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image/massar_logo.svg"
                alt="Massar"
                className="massar-welcome-brand-mark"
              />
              <span className="massar-welcome-brand-text">MASSAR</span>
            </div>

            {/* Col 12: [Enter Workspace →] (Right edge aligns exactly with col 12) */}
            <div className="massar-split-topbar-action">
              <button
                type="button"
                onClick={dismiss}
                className={`massar-enter-workspace-btn ${isComplete ? 'massar-enter-active' : ''}`}
                aria-label="Enter Workspace"
              >
                <span>Enter Workspace</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. MIDDLE AREA (Split Layout: Cols 1–6 content, Col 7 empty, Cols 8–12 panel) ── */}
      <main className="massar-split-middle">
        <div className="massar-grid-frame" style={{ height: '100%' }}>
          <div className="massar-12-col-grid massar-split-middle-grid">
            {/* LEFT CONTENT: cols 1–6 (Left-aligned & horizontally anchored to col 1) */}
            <div className="massar-split-content">
              {/* Eyebrow (role): 12px, uppercase, letter-spacing 0.08em, medium, muted green, small dot */}
              <div className="massar-split-eyebrow">
                <span className="massar-split-eyebrow-dot" aria-hidden="true" />
                <span>{config.eyebrow}</span>
              </div>

              {/* Headline: serif display, clamp(48px, 6vw, 88px), line-height 1.05, 2 lines */}
              <h1 className="massar-split-headline">
                <span>Welcome,</span>
                <span>{displayName}</span>
              </h1>

              {/* Supporting text: 16–18px sans, line-height 1.6, muted, max-width 45ch. No italics. */}
              <p className="massar-split-support-text">
                {config.supportingText}
              </p>

              {/* Mobile button: Enter Workspace full width when on mobile screen */}
              <div className="massar-mobile-enter-btn" style={{ display: 'none' }}>
                <button
                  type="button"
                  onClick={dismiss}
                  className={`massar-enter-workspace-btn ${isComplete ? 'massar-enter-active' : ''}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Enter Workspace</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            {/* COL 7: Intentionally empty breathing space (grid gap 24px) */}

            {/* RIGHT VISUAL PANEL: cols 8–12 (Full height of middle area, radius 16px, deep green) */}
            <aside className="massar-split-panel" aria-label="Workspace Status Snapshot">
              {/* Option A: Oversized watermark emblem cropped off edge at 8% opacity */}
              <div className="massar-split-panel-watermark" aria-hidden="true" />

              {/* Option B: Calm 'today' preview — date, active projects, pending approvals */}
              <div className="massar-panel-header">
                <div className="massar-panel-tag">WORKSPACE OVERVIEW</div>
                <div className="massar-panel-date">{dateStrings.longDate}</div>
              </div>

              <div className="massar-panel-stats">
                <div className="massar-panel-stat-card">
                  <div>
                    <div className="massar-panel-stat-num">04</div>
                    <div className="massar-panel-stat-meta">Active Projects</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(241, 236, 226, 0.45)' }}>Live</span>
                </div>

                <div className="massar-panel-stat-card">
                  <div>
                    <div className="massar-panel-stat-num">02</div>
                    <div className="massar-panel-stat-meta">Pending Approvals</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(241, 236, 226, 0.45)' }}>Queue</span>
                </div>
              </div>

              <div className="massar-panel-status">
                <span className="massar-status-dot-pulse" aria-hidden="true" />
                <span>Operational · Systems Synchronized</span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ── 3. BOTTOM BAR (72px) ── */}
      <footer className="massar-split-bottombar">
        <div className="massar-grid-frame">
          <div className="massar-12-col-grid">
            {/* Cols 1–4: Progress with caption label above 2px hairline bar, left-aligned */}
            <div
              className={`massar-split-progress-wrap ${isComplete ? 'massar-progress-done' : ''}`}
            >
              <span className="massar-split-progress-label">Opening workspace…</span>
              <div className="massar-split-progress-track">
                <div
                  className="massar-split-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Col 12 (ending on col 12): Version and today's date */}
            <div className="massar-split-bottom-meta">
              <span>v1.0 · {dateStrings.shortDate}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 4. DEV-ONLY GRID OVERLAY (Toggle with key "G") ── */}
      {showGridOverlay && (
        <div className="massar-dev-grid-overlay" aria-hidden="true">
          <div className="massar-grid-frame massar-overlay-frame">
            <div className="massar-12-col-grid massar-overlay-grid">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="massar-overlay-col">
                  <span className="massar-overlay-col-num">{i + 1}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'rgba(220, 38, 38, 0.65)',
                      fontFamily: 'monospace',
                    }}
                  >
                    col {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="massar-overlay-pill">
            12-Col Grid Active · Press <kbd>G</kbd> to hide
          </div>
        </div>
      )}
    </div>
  )
}
