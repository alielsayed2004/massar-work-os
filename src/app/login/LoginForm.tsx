'use client'

import { useEffect, useState, useTransition } from 'react'
import { login, loginDirectly, requestPasswordReset } from './actions'

interface LoginFormProps {
  hasError: boolean
  inactive: boolean
  resetSent: boolean
  devAuth: boolean
}

/**
 * Brand intro, then the sign-in card. The intro's motion is all CSS (see
 * "Sign-in" in globals.css) so it runs from first paint; this component only
 * handles Skip and marks the intro finished so later visits to this page in
 * the same tab (e.g. after a wrong password) show the card straight away.
 */
export default function LoginForm({ hasError, inactive, resetSent, devAuth }: LoginFormProps) {
  const showIntro = !hasError && !inactive && !resetSent
  const [forgot, setForgot] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const working = busy || isPending

  const finishIntro = () => {
    document.documentElement.dataset.intro = 'skip'
  }

  useEffect(() => {
    if (!showIntro || skipped) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') setSkipped(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showIntro, skipped])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (working) return
    setBusy(true)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await login(formData)
      } catch {
        setBusy(false)
      }
    })
  }

  const handleDevLogin = () => {
    if (working) return
    setBusy(true)
    startTransition(async () => {
      try {
        await loginDirectly('admin')
      } catch {
        setBusy(false)
      }
    })
  }

  return (
    <main className="massar-auth-page" data-skipped={skipped ? '' : undefined}>
      {showIntro && (
        <div
          className="massar-intro"
          onClick={() => setSkipped(true)}
          onAnimationEnd={e => {
            if (e.target === e.currentTarget && e.animationName === 'massarIntroOut') finishIntro()
          }}
          aria-hidden="true"
        >
          <div className="massar-intro-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/massar_logo.svg" alt="" className="massar-intro-logo" fetchPriority="high" />
          </div>
          <div className="massar-intro-caption">
            <strong>ONE PARTNER. ONE PATH.</strong>
            <span>MASSAR · WORK OPERATING SYSTEM</span>
          </div>
          <div className="massar-intro-line" />
          <button
            type="button"
            className="massar-intro-skip"
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation()
              setSkipped(true)
            }}
          >
            SKIP
          </button>
        </div>
      )}

      <section className="massar-login-card" aria-busy={working}>
        <div className="massar-login-mark" role="img" aria-label="Massar" />
        <h1 className="massar-login-title">Sign in</h1>
        <p className="massar-login-sub">Massar Work OS</p>

        {forgot ? (
          <form action={requestPasswordReset} className="massar-login-form">
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Type the email you sign in with. We’ll email you a link to choose a new password.
            </p>
            <div>
              <label htmlFor="reset-email">Email</label>
              <input id="reset-email" name="email" type="email" autoComplete="email" required className="massar-input-light" />
            </div>
            <button type="submit" className="massar-btn-primary-light">Email me a link</button>
            <button type="button" onClick={() => setForgot(false)} className="massar-login-dev" style={{ textDecoration: 'none' }}>
              ← Back to sign in
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="massar-login-form">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={devAuth ? 'ali@massar.co' : undefined}
              className="massar-input-light"
              aria-invalid={hasError || undefined}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              defaultValue={devAuth ? 'massar2026' : undefined}
              className="massar-input-light"
              aria-invalid={hasError || undefined}
            />
          </div>

          {resetSent && (
            <p role="status" className="massar-login-alert" data-tone="ok">
              If that email has a Massar account, a link to choose a new password is on its way. Check spam too.
            </p>
          )}

          {(hasError || inactive) && (
            <p role="alert" className="massar-login-alert">
              {inactive ? 'This account can’t sign in. Ask a Massar partner if you think that’s wrong.' : 'Wrong email or password.'}
            </p>
          )}

          <button type="submit" disabled={working} className="massar-btn-primary-light">
            {working ? 'Opening your workspace…' : 'Sign in'}
          </button>

          <button type="button" onClick={() => setForgot(true)} className="massar-login-dev" style={{ textDecoration: 'none' }}>
            Forgot password?
          </button>

          {devAuth && (
            <button type="button" onClick={handleDevLogin} disabled={working} className="massar-login-dev">
              Instant dev sign-in (partner)
            </button>
          )}
        </form>
        )}
      </section>
    </main>
  )
}
