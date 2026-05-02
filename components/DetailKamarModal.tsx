'use client'
// components/DetailKamarModal.tsx
// Versi dengan tombol Invoice

import { useEffect, useState, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari, formatNIKDisplay, labelDurasi } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, LogOut, CalendarClock, CreditCard, Printer } from 'lucide-react'
import InvoiceModal from './InvoiceModal'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row']

interface Props {
  kamar:   Kamar
  onClose: () => void
}

export default function DetailKamarModal({ kamar, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [booking,      setBooking]      = useState<Booking | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [deleting,     setDeleting]     = useState(false)
  const [showInvoice,  setShowInvoice]  = useState(false)  // ← state invoice

  useEffect(() => {
    supabase
      .from('booking').select('*')
      .eq('kamar_id', kamar.id)
      .gte('tanggal_out', new Date().toISOString().split('T')[0])
      .order('tanggal_in', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { setBooking(data); setLoading(false) })
  }, [kamar.id, supabase])

  async function handleCheckout() {
    if (!booking) return
    if (!confirm(`Checkout ${booking.nama_tamu} dari kamar ${kamar.nomor_kamar}?\n\nKamar akan otomatis kosong.`)) return
    setDeleting(true)

    // Ambil tenant_id dari booking yang sedang aktif
const { error: histErr } = await supabase
  .from('booking_history')
  .insert({
    booking_id:   booking.id,
    kamar_id:     booking.kamar_id,
    nomor_kamar:  kamar.nomor_kamar,
    lantai:       kamar.lantai,
    nama_tamu:    booking.nama_tamu,
    nik:          booking.nik,
    nomor_hp:     booking.nomor_hp,
    durasi:       booking.durasi,
    tanggal_in:   booking.tanggal_in,
    tanggal_out:  booking.tanggal_out,
    harga_total:  booking.harga_total,
    status_bayar: booking.status_bayar,
    jumlah_dp:    booking.jumlah_dp,
    catatan:      booking.catatan,
    created_at:   booking.created_at,
    checkout_at:  new Date().toISOString(),
    tenant_id:    booking.tenant_id,   // ← tambahkan ini
  })

    if (histErr) {
      alert('Gagal menyimpan ke history: ' + histErr.message)
      setDeleting(false)
      return
    }

    await Promise.all([
      supabase.from('booking').delete().eq('id', booking.id),
      supabase.from('kamar').update({ status: 'kosong' }).eq('id', kamar.id),
    ])

    onClose()
  }

  async function updateStatusBayar(status: 'belum' | 'dp' | 'lunas') {
    if (!booking) return
    const jumlah_dp = status !== 'dp' ? null : booking.jumlah_dp
    await supabase
      .from('booking')
      .update({ status_bayar: status, jumlah_dp })
      .eq('id', booking.id)
    setBooking({ ...booking, status_bayar: status, jumlah_dp })
  }

  const sisa    = booking ? sisaHari(booking.tanggal_out) : 0
  const warning = sisa > 0 && sisa <= 7
  const expired = sisa === 0

  function displayDurasi(durasi: unknown): string {
    if (typeof durasi === 'number') return labelDurasi(durasi)
    if (typeof durasi === 'string') {
      const parsed = parseInt(durasi, 10)
      if (!isNaN(parsed)) return labelDurasi(parsed)
      return durasi
    }
    return '—'
  }

  // Tampilkan InvoiceModal di atas modal ini
  if (showInvoice && booking) {
    return (
      <InvoiceModal
        booking={booking}
        kamar={kamar}
        onClose={() => setShowInvoice(false)}
      />
    )
  }

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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, gap: 10 }}>
            <div className="loader" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data tamu...</span>
          </div>
        ) : !booking ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Data booking tidak ditemukan.</div>
          </div>
        ) : (
          <>
            {/* Nama tamu */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Nama Tamu
              </div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                {booking.nama_tamu}
              </div>
            </div>

            {/* NIK */}
            {booking.nik && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CreditCard size={9} /> NIK
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 500 }}>
                  {formatNIKDisplay(booking.nik)}
                </div>
              </div>
            )}

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                {
                  icon: <CalendarClock size={12} />,
                  label: 'Check In',
                  val: format(new Date(booking.tanggal_in), 'dd MMM yyyy', { locale: localeID }),
                  color: 'var(--text-primary)',
                },
                {
                  icon: <CalendarClock size={12} />,
                  label: 'Check Out',
                  val: format(new Date(booking.tanggal_out), 'dd MMM yyyy', { locale: localeID }),
                  color: warning ? 'var(--amber)' : expired ? 'var(--red)' : 'var(--text-primary)',
                  sub: expired ? 'Sudah expired' : warning ? `⚠ ${sisa} hari lagi` : undefined,
                },
                {
                  label: 'Durasi',
                  val: displayDurasi(booking.durasi),
                  color: 'var(--text-primary)',
                },
                {
                  label: 'Total Harga',
                  val: booking.harga_total ? formatRupiah(booking.harga_total) : '—',
                  color: 'var(--green)',
                },
              ].map(({ label, val, color, sub, icon }) => (
                <div key={label} className="info-value" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color }}>{val}</div>
                  {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* Info DP */}
            {booking.status_bayar === 'dp' && booking.harga_total && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--amber-light)', border: '1px solid var(--amber-border)',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4 }}>
                    DP DIBAYAR
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                    {booking.jumlah_dp ? formatRupiah(booking.jumlah_dp) : '—'}
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--red-light)', border: '1px solid var(--red-border)',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4 }}>
                    SISA TAGIHAN
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                    {booking.jumlah_dp
                      ? formatRupiah(Math.max(0, booking.harga_total - booking.jumlah_dp))
                      : formatRupiah(booking.harga_total)}
                  </div>
                </div>
              </div>
            )}

            {/* Status bayar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Status Pembayaran
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['belum', 'dp', 'lunas'] as const).map(s => {
                  const active = booking.status_bayar === s
                  const label  = s === 'belum' ? 'Belum Bayar' : s === 'dp' ? 'DP' : 'Lunas'
                  const color  = s === 'lunas' ? 'var(--green)' : s === 'dp' ? 'var(--amber)' : 'var(--red)'
                  const bg     = s === 'lunas' ? 'var(--green-light)' : s === 'dp' ? 'var(--amber-light)' : 'var(--red-light)'
                  const border = s === 'lunas' ? 'var(--green-border)' : s === 'dp' ? 'var(--amber-border)' : 'var(--red-border)'
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatusBayar(s)}
                      style={{
                        flex: 1, padding: '8px 4px',
                        borderRadius: 8, border: `1.5px solid ${active ? border : 'var(--border)'}`,
                        background: active ? bg : 'var(--bg)',
                        color: active ? color : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Catatan */}
            {booking.catatan && (
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Catatan
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{booking.catatan}</div>
              </div>
            )}

            <div className="divider" />

            {/* ── Actions (3 tombol) ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Tutup
              </button>

              {/* ← Tombol Invoice baru */}
              <button
                onClick={() => setShowInvoice(true)}
                className="btn-secondary"
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: '1px solid var(--accent-mid)',
                  color: 'var(--accent)',
                }}
              >
                <Printer size={13} /> Invoice
              </button>

              <button
                onClick={handleCheckout}
                disabled={deleting}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {deleting ? (
                  <><span className="loader" style={{ borderTopColor: 'var(--red)' }} /> Memproses...</>
                ) : (
                  <><LogOut size={13} /> Checkout</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}