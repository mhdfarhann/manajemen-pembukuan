'use client'
// components/DetailKamarModal.tsx

import { useEffect, useState } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari, formatNIKDisplay } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, Trash2 } from 'lucide-react'

type Kamar = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row']

interface Props {
  kamar: Kamar
  onClose: () => void
}

export default function DetailKamarModal({ kamar, onClose }: Props) {
  const supabase = createClient()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

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
    if (!confirm(`Checkout ${booking.nama_tamu} dari kamar ${kamar.nomor_kamar}?`)) return

    setDeleting(true)
    await supabase.from('booking').delete().eq('id', booking.id)
    // status kamar otomatis diupdate via trigger
    onClose()
  }

  async function updateStatusBayar(status: 'belum' | 'dp' | 'lunas') {
    if (!booking) return
    await supabase.from('booking').update({ status_bayar: status }).eq('id', booking.id)
    setBooking({ ...booking, status_bayar: status })
  }

  const sisa = booking ? sisaHari(booking.tanggal_out) : 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: '#f87171', letterSpacing: '0.15em', marginBottom: 4,
            }}>
              KAMAR {kamar.nomor_kamar} · LANTAI {kamar.lantai}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#e8e4d4' }}>
              Detail Tamu
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b55' }}>
            <X size={18} />
          </button>
        </div>

        <div className="gold-line" style={{ marginBottom: 20 }} />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="loader" />
          </div>
        ) : !booking ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b6b55' }}>
            Data booking tidak ditemukan.
          </div>
        ) : (
          <>
            {/* Nama */}
            <div style={{ marginBottom: 20 }}>
              <div style={dimLabel}>NAMA TAMU</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: '#e8e4d4' }}>
                {booking.nama_tamu}
              </div>
            </div>

            {/* NIK */}
            {booking.nik && (
              <div style={{ marginBottom: 16 }}>
                <div style={dimLabel}>NIK</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#c9a84c', letterSpacing: '0.1em' }}>
                  {formatNIKDisplay(booking.nik)}
                </div>
              </div>
            )}

            {/* Grid info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={infoBox}>
                <div style={dimLabel}>MASUK</div>
                <div style={{ fontSize: 14, color: '#e8e4d4' }}>
                  {format(new Date(booking.tanggal_in), 'dd MMM yyyy', { locale: localeID })}
                </div>
              </div>
              <div style={infoBox}>
                <div style={dimLabel}>KELUAR</div>
                <div style={{ fontSize: 14, color: sisa <= 7 ? '#c9a84c' : '#e8e4d4' }}>
                  {format(new Date(booking.tanggal_out), 'dd MMM yyyy', { locale: localeID })}
                  {sisa <= 7 && <span style={{ fontSize: 11, marginLeft: 6, color: '#c9a84c' }}>({sisa}hr lagi)</span>}
                </div>
              </div>
              <div style={infoBox}>
                <div style={dimLabel}>DURASI</div>
                <div style={{ fontSize: 14, color: '#e8e4d4' }}>{booking.durasi}</div>
              </div>
              <div style={infoBox}>
                <div style={dimLabel}>TOTAL HARGA</div>
                <div style={{ fontSize: 14, color: '#4ade80' }}>
                  {booking.harga_total ? formatRupiah(booking.harga_total) : '—'}
                </div>
              </div>
            </div>

            {/* Status bayar */}
            <div style={{ marginBottom: 20 }}>
              <div style={dimLabel}>STATUS PEMBAYARAN</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {(['belum', 'dp', 'lunas'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatusBayar(s)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: `1px solid`,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      background: booking.status_bayar === s
                        ? s === 'lunas' ? '#4ade8020' : s === 'dp' ? '#c9a84c20' : '#f8717120'
                        : 'transparent',
                      borderColor: booking.status_bayar === s
                        ? s === 'lunas' ? '#4ade8060' : s === 'dp' ? '#c9a84c60' : '#f8717160'
                        : '#2a2a22',
                      color: booking.status_bayar === s
                        ? s === 'lunas' ? '#4ade80' : s === 'dp' ? '#c9a84c' : '#f87171'
                        : '#6b6b55',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan */}
            {booking.catatan && (
              <div style={{ marginBottom: 20 }}>
                <div style={dimLabel}>CATATAN</div>
                <div style={{ fontSize: 13, color: '#9a9678', fontStyle: 'italic' }}>{booking.catatan}</div>
              </div>
            )}

            <div className="gold-line" style={{ marginBottom: 20 }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Tutup
              </button>
              <button
                onClick={handleCheckout}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px', borderRadius: 6,
                  background: '#f8717115', border: '1px solid #f8717130',
                  color: '#f87171', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8717125')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f8717115')}
              >
                {deleting ? <span className="loader" /> : <><Trash2 size={13} /> Checkout</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const dimLabel: React.CSSProperties = {
  fontSize: 10, color: '#6b6b55',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  marginBottom: 4,
}
const infoBox: React.CSSProperties = {
  background: '#131310',
  border: '1px solid #1e1e18',
  borderRadius: 8,
  padding: '12px 14px',
}