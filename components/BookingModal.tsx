'use client'
// components/BookingModal.tsx

import { useState, useEffect } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_OPTIONS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, validasiNIK, type Durasi
} from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X } from 'lucide-react'

type Kamar = Database['public']['Tables']['kamar']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']
type BookingInsert = Database['public']['Tables']['booking']['Insert']

interface Props {
  kamar: Kamar
  onClose: () => void
}

export default function BookingModal({ kamar, onClose }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hargaData, setHargaData] = useState<HargaRow | null>(null)

  const [form, setForm] = useState({
    nama_tamu: '',
    nik: '',
    durasi: '1 bulan' as Durasi,
    tanggal_in: format(new Date(), 'yyyy-MM-dd'),
    catatan: '',
    status_bayar: 'belum' as 'belum' | 'dp' | 'lunas',
  })

  const tanggalOut = hitungTanggalOut(new Date(form.tanggal_in), form.durasi)
  const hargaTotal = hargaData
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, form.durasi)
    : null

  useEffect(() => {
    supabase
      .from('harga')
      .select('*')
      .eq('lantai', kamar.lantai)
      .single()
      .then(({ data }) => { if (data) setHargaData(data) })
  }, [kamar.lantai, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.nik && !validasiNIK(form.nik)) {
      setError('NIK harus 16 digit angka.')
      return
    }

    setSaving(true)

    const payload: BookingInsert = {
      kamar_id: kamar.id,
      nama_tamu: form.nama_tamu.toUpperCase(),
      nik: form.nik || null,
      durasi: form.durasi as string,
      tanggal_in: form.tanggal_in,
      tanggal_out: format(tanggalOut, 'yyyy-MM-dd'),
      harga_total: hargaTotal,
      status_bayar: form.status_bayar,
      catatan: form.catatan || null,
    }

    const { error: err } = await (supabase as any)
      .from('booking')
      .insert(payload)

    if (err) {
      setError('Gagal menyimpan. Coba lagi.')
      setSaving(false)
    } else {
      onClose()
    }
  }

  const nikValid = form.nik ? validasiNIK(form.nik) : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#4ade80',
              letterSpacing: '0.15em',
              marginBottom: 4,
            }}>
              KAMAR {kamar.nomor_kamar} · LANTAI {kamar.lantai}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#e8e4d4' }}>
              Tambah Booking
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b55', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="gold-line" style={{ marginBottom: 24 }} />

        <form onSubmit={handleSubmit}>
          {/* Nama tamu */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>NAMA TAMU *</label>
            <input
              type="text"
              placeholder="NAMA LENGKAP"
              value={form.nama_tamu}
              onChange={e => setForm({ ...form, nama_tamu: e.target.value.toUpperCase() })}
              required
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* NIK */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              NIK (KTP)
              <span style={{ color: '#6b6b55', marginLeft: 6, fontWeight: 400 }}>— opsional</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="16 digit angka"
                value={form.nik}
                onChange={e => setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                maxLength={16}
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  borderColor: form.nik
                    ? nikValid ? '#4ade8060' : '#f8717160'
                    : undefined,
                }}
              />
              {form.nik && (
                <div style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: nikValid ? '#4ade80' : '#f87171',
                }}>
                  {form.nik.length}/16
                </div>
              )}
            </div>
          </div>

          {/* Durasi */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>DURASI *</label>
            <select
              value={form.durasi}
              onChange={e => setForm({ ...form, durasi: e.target.value as Durasi })}
            >
              {DURASI_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Tanggal IN */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>TANGGAL MASUK *</label>
            <input
              type="date"
              value={form.tanggal_in}
              onChange={e => setForm({ ...form, tanggal_in: e.target.value })}
              required
            />
          </div>

          {/* Tanggal OUT — otomatis */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>TANGGAL KELUAR (OTOMATIS)</label>
            <div style={{
              background: '#131310',
              border: '1px solid #2a2a22',
              borderRadius: 6,
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#c9a84c',
            }}>
              {format(tanggalOut, 'dd MMMM yyyy', { locale: localeID })}
            </div>
          </div>

          {/* Harga — otomatis */}
          {hargaTotal && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>HARGA TOTAL (OTOMATIS)</label>
              <div style={{
                background: '#131310',
                border: '1px solid #4ade8030',
                borderRadius: 6,
                padding: '10px 12px',
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                color: '#4ade80',
              }}>
                {formatRupiah(hargaTotal)}
              </div>
            </div>
          )}

          {/* Status bayar */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>STATUS BAYAR</label>
            <select
              value={form.status_bayar}
              onChange={e => setForm({ ...form, status_bayar: e.target.value as typeof form.status_bayar })}
            >
              <option value="belum">Belum Bayar</option>
              <option value="dp">DP</option>
              <option value="lunas">Lunas</option>
            </select>
          </div>

          {/* Catatan */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>CATATAN</label>
            <textarea
              placeholder="Catatan tambahan..."
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              rows={2}
              style={{ resize: 'vertical' }}
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
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? <span className="loader" /> : 'Simpan Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#9a9678',
  marginBottom: 6,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  fontWeight: 500,
}