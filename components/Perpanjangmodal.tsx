'use client'
// components/PerpanjangModal.tsx
// Modal memperpanjang durasi booking dari tanggal_out yang sudah ada
// Gunakan di dalam DetailKamarModal dengan tombol "Perpanjang"

import { useState, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_OPTIONS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, type Durasi
} from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, CalendarPlus } from 'lucide-react'

type Booking  = Database['public']['Tables']['booking']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']

interface Props {
  booking:   Booking
  hargaData: HargaRow | null
  onClose:   () => void
}

export default function PerpanjangModal({ booking, hargaData, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [durasi,   setDurasi]   = useState<Durasi>('1 bulan')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Perpanjang dimulai dari tanggal_out yang lama
  const newTanggalIn  = new Date(booking.tanggal_out + 'T00:00:00')
  const newTanggalOut = hitungTanggalOut(newTanggalIn, durasi)
  const tambahHarga   = hargaData
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, durasi)
    : null

  async function handleSimpan() {
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('booking')
      .update({
        durasi:       durasi,                                   // update durasi (opsional, bisa disesuaikan)
        tanggal_out:  format(newTanggalOut, 'yyyy-MM-dd'),
        harga_total:  booking.harga_total
                        ? Number(booking.harga_total) + (tambahHarga ?? 0)
                        : tambahHarga,
        status_bayar: 'belum',                                  // reset bayar untuk periode baru
      })
      .eq('id', booking.id)

    if (err) { setError('Gagal menyimpan. ' + err.message); setSaving(false) }
    else      { onClose() }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--accent-light)', border: '1px solid var(--accent-mid)',
              borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            }}>
              <CalendarPlus size={10} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
                PERPANJANG BOOKING
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              {booking.nama_tamu}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="divider" />

        {/* Info lama */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.06em' }}>
            CHECK-OUT SEKARANG
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--amber)' }}>
            {format(new Date(booking.tanggal_out), 'dd MMMM yyyy', { locale: localeID })}
          </div>
        </div>

        {/* Pilih durasi tambahan */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Tambah Durasi</label>
          <select value={durasi} onChange={e => setDurasi(e.target.value as Durasi)}>
            {DURASI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Preview */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          marginBottom: 20,
        }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              CHECK-OUT BARU
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>
              {format(newTanggalOut, 'dd MMM yyyy', { locale: localeID })}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              TAMBAH BIAYA
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>
              {tambahHarga ? formatRupiah(tambahHarga) : '—'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-light)', border: '1px solid var(--red-border)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--red)',
            fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Batal</button>
          <button className="btn-primary" onClick={handleSimpan} disabled={saving} style={{ flex: 2 }}>
            {saving ? <><span className="loader" /> Menyimpan...</> : <><CalendarPlus size={13} /> Perpanjang</>}
          </button>
        </div>
      </div>
    </div>
  )
}