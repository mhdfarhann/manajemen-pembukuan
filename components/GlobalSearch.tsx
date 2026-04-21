'use client'
// components/GlobalSearch.tsx
// Tempatkan di sidebar layout, menampilkan overlay hasil pencarian tamu/kamar

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari } from '@/lib/harga'
import { Search, X, User, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

export default function GlobalSearch() {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Booking[]>([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('booking')
      .select('*, kamar(nomor_kamar, lantai)')
      .or(`nama_tamu.ilike.%${q}%,nik.ilike.%${q}%,kamar.nomor_kamar.ilike.%${q}%`)
      .order('tanggal_out', { ascending: false })
      .limit(8)
    setResults((data as Booking[]) ?? [])
    setLoading(false)
  }, [supabase])

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  // Keyboard shortcut Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Tutup saat klik luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function goToBooking(id: string) {
    router.push(`/booking/${id}`)
    setOpen(false); setQuery('')
  }

  return (
    <>
      {/* Trigger button di sidebar */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8, cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12,
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-mid)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <Search size={13} />
        <span style={{ flex: 1, textAlign: 'left' }}>Cari tamu…</span>
        <kbd style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)',
        }}>⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 120,
        }}>
          <div ref={overlayRef} style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: '100%', maxWidth: 540,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>

            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cari nama tamu, NIK, atau nomor kamar..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent',
                  fontSize: 14, color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
              <kbd onClick={() => { setOpen(false); setQuery('') }} style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 6px', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Mencari...
                </div>
              ) : query.length >= 2 && results.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tidak ada hasil untuk "{query}"</div>
                </div>
              ) : results.length > 0 ? (
                results.map(b => {
                  const sisa = sisaHari(b.tanggal_out)
                  const expired = sisa === 0
                  const warning = !expired && sisa <= 7
                  return (
                    <button
                      key={b.id}
                      onClick={() => goToBooking(b.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 16px',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer',
                        textAlign: 'left', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: 'var(--accent-light)',
                        border: '1px solid var(--accent-mid)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={14} color="var(--accent)" />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {b.nama_tamu}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Home size={9} /> Kamar {b.kamar.nomor_kamar}
                          </span>
                          {b.nik && <span>NIK: {b.nik.slice(0, 6)}••••{b.nik.slice(-4)}</span>}
                        </div>
                      </div>

                      {/* Badge sisa */}
                      <div style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        padding: '3px 8px', borderRadius: 6,
                        color: expired ? 'var(--red)' : warning ? 'var(--amber)' : 'var(--text-muted)',
                        background: expired ? 'var(--red-light)' : warning ? 'var(--amber-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${expired ? 'var(--red-border)' : warning ? 'var(--amber-border)' : 'var(--border)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {expired ? 'Expired' : `${sisa} hari`}
                      </div>

                      {/* Harga */}
                      {b.harga_total && (
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)', whiteSpace: 'nowrap' }}>
                          {formatRupiah(b.harga_total)}
                        </div>
                      )}
                    </button>
                  )
                })
              ) : (
                <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Ketik minimal 2 karakter untuk mencari
                </div>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div style={{
                padding: '8px 16px', borderTop: '1px solid var(--border)',
                fontSize: 10, color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                display: 'flex', gap: 16,
              }}>
                <span>↵ Buka detail</span>
                <span>ESC Tutup</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}