'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'checking' | 'ready' | 'saving' | 'invalid'

/**
 * Invite and reset emails send people here with a one-time credential in the
 * URL (a #access_token pair, a ?code, or a ?token_hash). We turn it into a
 * session, wipe it from the address bar, then let them choose a password.
 * Nobody else ever sees or sets it.
 */
export default function SetPasswordForm() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)

    async function start() {
      if (hash.get('error_code') || query.get('error_code')) {
        window.history.replaceState(null, '', window.location.pathname)
        return setPhase('invalid')
      }

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const code = query.get('code')
      const tokenHash = query.get('token_hash')
      const type = query.get('type')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      } else if (tokenHash && (type === 'invite' || type === 'recovery')) {
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      }
      // The credential is single-use; keep it out of history and screenshots
      window.history.replaceState(null, '', window.location.pathname)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setPhase('invalid')
      setName(String(user.user_metadata?.full_name || '').split(' ')[0])
      setPhase('ready')
    }
    start().catch(() => setPhase('invalid'))
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password') || '')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== String(form.get('confirm') || '')) return setError('The two passwords don’t match.')

    setError('')
    setPhase('saving')
    const { error: saveError } = await createClient().auth.updateUser({ password })
    if (saveError) {
      setPhase('ready')
      return setError(
        saveError.message.toLowerCase().includes('weak') || saveError.message.toLowerCase().includes('pwned')
          ? 'That password is too common or has leaked before. Pick another one.'
          : 'Couldn’t save the password. Try again, or ask a partner for a new link.'
      )
    }
    // The site root sends each person to their own start page
    window.location.replace('/')
  }

  return (
    <main className="massar-auth-page">
      <section className="massar-login-card" aria-busy={phase === 'checking' || phase === 'saving'}>
        <div className="massar-login-mark" role="img" aria-label="Massar" />

        {phase === 'invalid' ? (
          <>
            <h1 className="massar-login-title">Link expired</h1>
            <p className="massar-login-sub">Massar Work OS</p>
            <p style={{ margin: '0 0 var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              This link was already used or is too old. Ask a Massar partner to send a new invite, or use “Forgot password?” on the sign-in page.
            </p>
            <a href="/login" className="massar-btn-primary-light" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
              Go to sign in
            </a>
          </>
        ) : (
          <>
            <h1 className="massar-login-title">{name ? `Welcome, ${name}` : 'Set your password'}</h1>
            <p className="massar-login-sub">Choose a password for Massar Work OS</p>
            <form onSubmit={onSubmit} className="massar-login-form">
              <div>
                <label htmlFor="password">New password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="massar-input-light" disabled={phase !== 'ready'} />
              </div>
              <div>
                <label htmlFor="confirm">Type it again</label>
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="massar-input-light" disabled={phase !== 'ready'} />
              </div>
              {error && <p role="alert" className="massar-login-alert">{error}</p>}
              <button type="submit" disabled={phase !== 'ready'} className="massar-btn-primary-light">
                {phase === 'checking' ? 'Checking your link…' : phase === 'saving' ? 'Saving…' : 'Save and open Massar'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
