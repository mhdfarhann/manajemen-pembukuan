// app/t/[slug]/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff } from 'lucide-react'

export default function TenantLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }

    // Verifikasi user memang milik tenant ini
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, tenants(slug)')
      .eq('id', data.user.id)
      .single()

    const tenantSlug = (userData?.tenants as any)?.slug

    if (!userData || tenantSlug !== slug) {
      await supabase.auth.signOut()
      setError('Akun ini tidak terdaftar untuk properti ini.')
      setLoading(false)
      return
    }

    // Redirect ke dashboard tenant
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-secondary, #f8f7f4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Building2 size={24} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            Portal Staff
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          padding: '28px 28px 24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
            Masuk ke Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 22 }}>
            Hanya staff terdaftar yang dapat mengakses.
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="staff@hotel.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '9px 42px 9px 12px',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#9ca3af', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px',
                color: '#dc2626', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: '#111827', color: 'white',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
          © {new Date().getFullYear()} {slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </p>
      </div>
    </div>
  )
}