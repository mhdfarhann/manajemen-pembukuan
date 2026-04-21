'use client'
// components/BookingModal.tsx

import { useState, useEffect, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_OPTIONS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, validasiNIK, type Durasi
} from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, CalendarDays, Banknote, User, CreditCard, Clock } from 'lucide-react'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']

interface Props {
  kamar:   Kamar
  onClose: () => void
}

export default function BookingModal({ kamar, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [hargaData, setHargaData] = useState<HargaRow | null>(null)

  const [form, setForm] = useState({
    nama_tamu:   '',
    nik:         '',
    durasi:      '1 bulan' as Durasi,
    tanggal_in:  format(new Date(), 'yyyy-MM-dd'),
    catatan:     '',
    status_bayar: 'belum' as 'belum' | 'dp' | 'lunas',
  })

  const tanggalOut = hitungTanggalOut(new Date(form.tanggal_in + 'T00:00:00'), form.durasi)
  const hargaTotal = hargaData
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, form.durasi)
    : null

  useEffect(() => {
    supabase
      .from('harga').select('*')
      .eq('lantai', kamar.lantai)
      .single()
      .then(({ data }) => { if (data) setHargaData(data) })
  }, [kamar.lantai, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.nik && !validasiNIK(form.nik)) {
      setError('NIK harus tepat 16 digit angka.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('booking').insert({
      kamar_id:     kamar.id,
      nama_tamu:    form.nama_tamu.toUpperCase(),
      nik:          form.nik || null,
      durasi:       form.durasi,
      tanggal_in:   form.tanggal_in,
      tanggal_out:  format(tanggalOut, 'yyyy-MM-dd'),
      harga_total:  hargaTotal,
      status_bayar: form.status_bayar,
      catatan:      form.catatan || null,
    })
    if (err) { setError('Gagal menyimpan. ' + err.message); setSaving(false) }
    else      { onClose() }
  }

  const nikValid = form.nik ? validasiNIK(form.nik) : null

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
              background: 'var(--green-light)', border: '1px solid var(--green-border)',
              borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)', fontWeight: 500 }}>
                KAMAR {kamar.nomor_kamar} · LANTAI {kamar.lantai}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              Tambah Booking
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

        <form onSubmit={handleSubmit}>
          {/* Nama */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              <User size={10} style={{ display: 'inline', marginRight: 4 }} />
              Nama Tamu *
            </label>
            <input
              type="text"
              placeholder="Masukkan nama lengkap"
              value={form.nama_tamu}
              onChange={e => setForm({ ...form, nama_tamu: e.target.value.toUpperCase() })}
              required
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* NIK */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              <CreditCard size={10} style={{ display: 'inline', marginRight: 4 }} />
              NIK KTP
              <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400, textTransform: 'none' }}>
                (opsional)
              </span>
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
                  letterSpacing: '0.08em',
                  borderColor: form.nik
                    ? nikValid ? 'var(--green)' : 'var(--red)'
                    : undefined,
                  paddingRight: form.nik ? 72 : 12,
                }}
              />
              {form.nik && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: nikValid ? 'var(--green)' : 'var(--red)',
                  }}>
                    {form.nik.length}/16
                  </span>
                  <span style={{ fontSize: 14 }}>{nikValid ? '✓' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Durasi + Tanggal IN — 2 kolom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="field-label">
                <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                Durasi *
              </label>
              <select
                value={form.durasi}
                onChange={e => setForm({ ...form, durasi: e.target.value as Durasi })}
              >
                {DURASI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">
                <CalendarDays size={10} style={{ display: 'inline', marginRight: 4 }} />
                Tanggal Masuk *
              </label>
              <input
                type="date"
                value={form.tanggal_in}
                onChange={e => setForm({ ...form, tanggal_in: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Info otomatis — tanggal out + harga */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.06em' }}>
                TANGGAL KELUAR
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>
                {format(tanggalOut, 'dd MMM yyyy', { locale: localeID })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: '0.06em' }}>
                HARGA TOTAL
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)' }}>
                {hargaTotal ? formatRupiah(hargaTotal) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Belum ada data harga</span>
                )}
              </div>
            </div>
          </div>

          {/* Status bayar */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              <Banknote size={10} style={{ display: 'inline', marginRight: 4 }} />
              Status Pembayaran
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {statusOpts.map(({ val, label }) => {
                const active = form.status_bayar === val
                const color  = val === 'lunas' ? 'var(--green)' : val === 'dp' ? 'var(--amber)' : 'var(--red)'
                const bg     = val === 'lunas' ? 'var(--green-light)' : val === 'dp' ? 'var(--amber-light)' : 'var(--red-light)'
                const border = val === 'lunas' ? 'var(--green-border)' : val === 'dp' ? 'var(--amber-border)' : 'var(--red-border)'
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, status_bayar: val })}
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

          {/* Catatan */}
          <div style={{ marginBottom: 20 }}>
            <label className="field-label">Catatan</label>
            <textarea
              placeholder="Catatan tambahan (opsional)"
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--red-light)', border: '1px solid var(--red-border)',
              borderRadius: 8, padding: '10px 14px',
              color: 'var(--red)', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="loader" /> Menyimpan...</> : 'Simpan Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}