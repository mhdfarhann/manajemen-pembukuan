'use client'
// components/DetailKamarModal.tsx

import { useEffect, useState, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, User, CreditCard, Clock, CalendarDays, Banknote, FileText, Trash2 } from 'lucide-react'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row']

interface Props {
  kamar:   Kamar
  onClose: () => void
}

export default function DetailKamarModal({ kamar, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [deleting,  setDeleting]  = useState(false)
  const [updating,  setUpdating]  = useState(false)
  const [confirm,   setConfirm]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    supabase
      .from('booking')
      .select('*')
      .eq('kamar_id', kamar.id)
      .gte('tanggal_out', new Date().toISOString().split('T')[0])
      .order('tanggal_in', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setBooking(data)
        setLoading(false)
      })
  }, [kamar.id, supabase])

  async function handleCheckout() {
    if (!booking) return
    setDeleting(true)
    setError('')

    const today = new Date().toISOString().split('T')[0]

    // Update tanggal_out jadi hari ini, lalu kamar jadi kosong
    const { error: e1 } = await supabase
      .from('booking')
      .update({ tanggal_out: today })
      .eq('id', booking.id)

    if (e1) { setError('Gagal checkout: ' + e1.message); setDeleting(false); return }

    const { error: e2 } = await supabase
      .from('kamar')
      .update({ status: 'kosong' })
      .eq('id', kamar.id)

    if (e2) { setError('Gagal update kamar: ' + e2.message); setDeleting(false); return }

    onClose()
  }

  async function handleUpdateStatus(status: 'belum' | 'dp' | 'lunas') {
    if (!booking) return
    setUpdating(true)
    await supabase.from('booking').update({ status_bayar: status }).eq('id', booking.id)
    setBooking({ ...booking, status_bayar: status })
    setUpdating(false)
  }

  const sisa = booking ? sisaHari(booking.tanggal_out) : 0

  const statusOpts = [
    { val: 'belum', label: 'Belum Bayar' },
    { val: 'dp',    label: 'DP' },
    { val: 'lunas', label: 'Lunas' },
  ] as const

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--red-light)', border: '1px solid var(--red-border)',
              borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', fontWeight: 500 }}>
                KAMAR {kamar.nomor_kamar} · LANTAI {kamar.lantai}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              Detail Tamu
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)', border: 'none',
              borderRadius: 8, padding: 7, cursor: 'pointer',
              color: 'var(--text-muted)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="divider" />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="loader" />
          </div>
        ) : !booking ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
            Data booking tidak ditemukan.
          </div>
        ) : (
          <>
            {/* Info rows */}
            {[
              { icon: <User size={12} />,        label: 'Nama Tamu',  val: booking.nama_tamu },
              { icon: <CreditCard size={12} />,  label: 'NIK',        val: booking.nik || '—' },
              { icon: <Clock size={12} />,       label: 'Durasi',     val: booking.durasi },
              {
                icon: <CalendarDays size={12} />, label: 'Tanggal In',
                val: format(new Date(booking.tanggal_in), 'dd MMMM yyyy', { locale: localeID }),
              },
              {
                icon: <CalendarDays size={12} />, label: 'Tanggal Out',
                val: (
                  <span>
                    {format(new Date(booking.tanggal_out), 'dd MMMM yyyy', { locale: localeID })}
                    {sisa > 0 && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: sisa <= 7 ? 'var(--amber)' : 'var(--text-muted)',
                        background: sisa <= 7 ? 'var(--amber-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${sisa <= 7 ? 'var(--amber-border)' : 'var(--border)'}`,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        {sisa} hari lagi
                      </span>
                    )}
                  </span>
                ),
              },
              {
                icon: <Banknote size={12} />, label: 'Harga Total',
                val: booking.harga_total ? formatRupiah(booking.harga_total) : '—',
              },
              {
                icon: <FileText size={12} />, label: 'Catatan',
                val: booking.catatan || '—',
              },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--text-muted)', marginTop: 1 }}>{icon}</span>
                <span style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  textTransform: 'uppercase', width: 90, flexShrink: 0, marginTop: 2,
                }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {val}
                </span>
              </div>
            ))}

            {/* Status bayar toggle */}
            <div style={{ marginTop: 16, marginBottom: 4 }}>
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                Status Pembayaran
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {statusOpts.map(({ val, label }) => {
                  const active = booking.status_bayar === val
                  const color  = val === 'lunas' ? 'var(--green)' : val === 'dp' ? 'var(--amber)' : 'var(--red)'
                  const bg     = val === 'lunas' ? 'var(--green-light)' : val === 'dp' ? 'var(--amber-light)' : 'var(--red-light)'
                  const border = val === 'lunas' ? 'var(--green-border)' : val === 'dp' ? 'var(--amber-border)' : 'var(--red-border)'
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdateStatus(val)}
                      style={{
                        flex: 1, padding: '8px 4px',
                        borderRadius: 8, border: `1.5px solid ${active ? border : 'var(--border)'}`,
                        background: active ? bg : 'var(--bg)',
                        color: active ? color : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 12, fontWeight: active ? 500 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'var(--red-light)', border: '1px solid var(--red-border)',
                borderRadius: 8, padding: '10px 14px',
                color: 'var(--red)', fontSize: 13, marginTop: 12,
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Tutup
              </button>
              {!confirm ? (
                <button
                  type="button"
                  onClick={() => setConfirm(true)}
                  style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'var(--red-light)', border: '1px solid var(--red-border)',
                    borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
                    color: 'var(--red)', fontSize: 13, fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <Trash2 size={13} /> Checkout Tamu
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleCheckout}
                  style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'var(--red)', border: '1px solid var(--red)',
                    borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {deleting ? <><span className="loader" /> Memproses...</> : '⚠️ Konfirmasi Checkout'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}