'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SplashScreenProps {
  onComplete?: () => void
  durationMs?: number
  autoRedirectUrl?: string
}

export default function SplashScreen({
  onComplete,
  durationMs = 5000,
  autoRedirectUrl,
}: SplashScreenProps) {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [isDefocusing, setIsDefocusing] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const hasFinishedRef = useRef(false)

  const handleFinish = () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('massar_splash_done', 'true')
      } catch {
        // ignore storage errors
      }
    }

    setIsDefocusing(true)
    setIsExiting(true)

    // Smooth cinematic out-of-focus dissolve transition (850ms)
    setTimeout(() => {
      if (onComplete) {
        onComplete()
      }
      if (autoRedirectUrl) {
        router.push(autoRedirectUrl)
      }
    }, 850)
  }

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const currentProgress = Math.min(100, (elapsed / durationMs) * 100)
      setProgress(currentProgress)

      // Start camera out-of-focus defocus on the logo 1.6s before total time
      if (elapsed >= durationMs - 1600 && !isDefocusing) {
        setIsDefocusing(true)
      }

      // Start exit dissolve to next page 850ms before total time
      if (elapsed >= durationMs - 850 && !isExiting) {
        setIsExiting(true)
      }

      if (elapsed >= durationMs) {
        clearInterval(interval)
        handleFinish()
      }
    }, 25)

    return () => clearInterval(interval)
  }, [durationMs, isDefocusing, isExiting])

  return (
    <div
      className={`massar-splash-container ${isDefocusing ? 'massar-splash-defocus' : ''} ${isExiting ? 'massar-splash-exit' : ''}`}
      onClick={handleFinish}
      role="region"
      aria-label="Massar Splash Screen"
    >
      {/* Cinematic Vignette */}
      <div className="massar-splash-vignette" />

      {/* Atmospheric Ambient Aura */}
      <div className="massar-splash-ambient" />

      {/* Grand Hero Logo — fills screen majestically */}
      <div className="massar-splash-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/image/massar_logo.svg"
          alt="Massar Emblem"
          className="massar-splash-logo"
        />
      </div>

      {/* Small, subtle, elegant editorial typography */}
      <div className="massar-cinematic-caption">
        <span className="massar-caption-small-en">ONE PARTNER. ONE PATH.</span>
        <span className="massar-caption-subtitle">MASSAR • WORK OPERATING SYSTEM</span>
      </div>

      {/* Discreet bottom hairline progress indicator */}
      <div className="massar-cinematic-progress">
        <div
          className="massar-cinematic-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Minimal corner skip button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleFinish()
        }}
        className="massar-cinematic-skip"
      >
        Skip →
      </button>
    </div>
  )
}
