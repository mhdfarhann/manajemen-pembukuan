'use client'
// app/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, #c9a84c08 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div className="animate-in" style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: '#c9a84c',
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            HOTEL
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.3em',
            color: '#6b6b55',
            textTransform: 'uppercase',
          }}>
            SISTEM MANAJEMEN KAMAR
          </div>
          <div className="gold-line" style={{ marginTop: 20 }} />
        </div>

        {/* Form */}
        <div style={{
          background: '#1a1a16',
          border: '1px solid #2a2a22',
          borderRadius: 12,
          padding: '32px 28px',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 500,
            color: '#e8e4d4',
            marginBottom: 6,
          }}>
            Masuk ke Sistem
          </h1>
          <p style={{ fontSize: 13, color: '#6b6b55', marginBottom: 24 }}>
            Hanya staff hotel yang dapat mengakses.
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 12,
                color: '#9a9678', marginBottom: 6,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
              }}>
                EMAIL
              </label>
              <input
                type="email"
                placeholder="staff@hotel.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 12,
                color: '#9a9678', marginBottom: 6,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
              }}>
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: '#f8717115',
                border: '1px solid #f8717130',
                borderRadius: 6,
                padding: '10px 12px',
                color: '#f87171',
                fontSize: 13,
                marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px' }}
            >
              {loading ? <span className="loader" /> : 'Masuk'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 12, color: '#6b6b5566',
          fontFamily: 'var(--font-mono)',
        }}>
          © HOTEL PEMBUKUAN SISTEM
        </p>
      </div>
    </div>
  )
}