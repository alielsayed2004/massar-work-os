'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { login, loginDirectly } from './actions'

interface LoginFormProps {
  hasError: boolean
  inactive: boolean
  devAuth: boolean
}

const SPLASH_SEEN_KEY = 'massar_splash_seen'

export default function LoginForm({ hasError, inactive, devAuth }: LoginFormProps) {
  // If there's an error or inactive message, immediately show the light login form without splash.
  // Otherwise, start in dark cinematic splash on every refresh / reload.
  const shouldSkipSplash = hasError || inactive

  const [isLight, setIsLight] = useState<boolean>(shouldSkipSplash)
  const [splashPhase, setSplashPhase] = useState<'cinematic' | 'defocus' | 'fading' | 'done'>(
    shouldSkipSplash ? 'done' : 'cinematic'
  )
  const [progress, setProgress] = useState(0)
  const hasFinishedRef = useRef(false)
  const [isPending, startTransition] = useTransition()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const skipToLightLogin = () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true

    setIsLight(true)
    setSplashPhase('done')
  }

  useEffect(() => {
    if (shouldSkipSplash) {
      return
    }

    hasFinishedRef.current = false

    // The brand splash plays once per browser session; repeat visits go straight to the form.
    let seen = false
    try {
      seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === '1'
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    } catch {
      seen = true
    }
    if (seen) {
      const skip = setTimeout(skipToLightLogin, 0)
      return () => clearTimeout(skip)
    }

    const totalDuration = 1800
    const defocusTime = 1000
    const whitePageTime = 1400
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const p = Math.min(100, (elapsed / totalDuration) * 100)
      setProgress(p)

      if (elapsed >= defocusTime && elapsed < whitePageTime) {
        setSplashPhase('defocus')
      }

      if (elapsed >= whitePageTime && elapsed < totalDuration) {
        setIsLight(true)
        setSplashPhase('fading')
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval)
        skipToLightLogin()
      }
    }, 25)

    return () => clearInterval(interval)
  }, [shouldSkipSplash])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoggingIn || isPending) return
    setIsLoggingIn(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        await login(formData)
      } catch {
        setIsLoggingIn(false)
      }
    })
  }

  const handleDirectDevLogin = () => {
    if (isLoggingIn || isPending) return
    setIsLoggingIn(true)

    startTransition(async () => {
      try {
        await loginDirectly('admin')
      } catch {
        setIsLoggingIn(false)
      }
    })
  }

  return (
    <main
      className={`massar-auth-page ${isLight ? 'massar-theme-light' : 'massar-theme-dark'} ${
        isLoggingIn ? 'massar-logging-in' : ''
      }`}
      role="main"
      suppressHydrationWarning
    >
      {/* ── Cinematic Splash Overlay ── */}
      {splashPhase !== 'done' && (
        <div
          className={`massar-splash-overlay ${
            splashPhase === 'defocus'
              ? 'massar-splash-defocus'
              : splashPhase === 'fading'
              ? 'massar-splash-defocus massar-splash-fading'
              : ''
          }`}
          onClick={skipToLightLogin}
          role="region"
          aria-label="Massar Splash Screen"
        >
          {/* Atmospheric Vignette */}
          <div className="massar-splash-vignette" />

          {/* Ambient Pulsing Aura */}
          <div className="massar-splash-ambient" />

          {/* Hero Grand Logo — fills the screen */}
          <div className="massar-splash-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/massar_logo.svg"
              alt="Massar Emblem"
              className="massar-splash-logo"
            />
          </div>

          {/* Small, refined editorial caption */}
          <div className="massar-cinematic-caption">
            <span className="massar-caption-small-en">ONE PARTNER. ONE PATH.</span>
            <span className="massar-caption-subtitle">MASSAR • WORK OPERATING SYSTEM</span>
          </div>

          {/* Discreet bottom hairline progress */}
          <div className="massar-cinematic-progress">
            <div
              className="massar-cinematic-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Corner skip button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              skipToLightLogin()
            }}
            className="massar-cinematic-skip"
          >
            Skip →
          </button>
        </div>
      )}

      {/* ── Light Login Card (Pure Editorial Massar Light Theme) ── */}
      <div
        className="massar-login-card-light"
        style={{
          display: splashPhase === 'cinematic' || splashPhase === 'defocus' ? 'none' : 'block',
        }}
      >
        {/* Massar brand mark in Massar Green (#0D3B34) on the light card */}
        <div className="massar-logo-green-mask" aria-label="Massar Logo" />

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <h1
            style={{
              fontSize: '32px',
              color: 'var(--massar-green)',
              margin: 0,
              fontWeight: 500,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em',
            }}
          >
            Sign In
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text)',
              opacity: 0.7,
              margin: 'var(--space-1) 0 0 0',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Internal Work Operating System
          </p>
        </div>

        <form
          onSubmit={handleFormSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="email"
              style={{
                fontSize: '11px',
                color: 'var(--color-text)',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue="ali@massar.co"
              placeholder="ali@massar.co"
              className="massar-input-light"
              style={{
                borderColor: hasError ? 'var(--color-attention)' : undefined,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="password"
              style={{
                fontSize: '11px',
                color: 'var(--color-text)',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              defaultValue="massar2026"
              placeholder="••••••••"
              className="massar-input-light"
              style={{
                borderColor: hasError ? 'var(--color-attention)' : undefined,
              }}
            />
          </div>

          {(hasError || inactive) && (
            <p
              role="alert"
              style={{
                color: 'var(--color-text)',
                fontSize: 'var(--text-body)',
                margin: 'var(--space-1) 0',
                padding: 'var(--space-2) var(--space-3)',
                borderInlineStart: '4px solid var(--color-attention)',
                backgroundColor: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-control)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {inactive
                ? 'This account is currently inactive. Please contact administration.'
                : 'Invalid email address or password.'}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || isPending}
            className="massar-btn-primary-light"
          >
            {isLoggingIn || isPending ? 'Opening Workspace…' : 'Sign In'}
          </button>

          {devAuth && (
            <button
              type="button"
              onClick={handleDirectDevLogin}
              disabled={isLoggingIn || isPending}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--massar-green)',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 'var(--space-1) 0',
                opacity: 0.85,
                textDecoration: 'underline',
                textAlign: 'center',
              }}
            >
              Instant Dev Sign In (Admin) →
            </button>
          )}
        </form>
      </div>
    </main>
  )
}
