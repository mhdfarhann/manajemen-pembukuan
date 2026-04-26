'use client'
// components/EditBookingModal.tsx

import { useState, useEffect, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_PRESETS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, validasiNIK, labelDurasi,
} from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, CalendarDays, Banknote, User, CreditCard, Clock, Phone, Save } from 'lucide-react'

type Booking  = Database['public']['Tables']['booking']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']

interface Props {
  booking:  Booking
  nomor_kamar: string
  lantai:   number
  onClose:  () => void
}

export default function EditBookingModal({ booking, nomor_kamar, lantai, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [hargaData, setHargaData] = useState<HargaRow | null>(null)

  const [form, setForm] = useState({
    nama_tamu:    booking.nama_tamu,
    nik:          booking.nik          ?? '',
    nomor_hp:     booking.nomor_hp     ?? '',
    durasi_hari:  booking.durasi       ?? 30,
    tanggal_in:   booking.tanggal_in,
    catatan:      booking.catatan      ?? '',
    status_bayar: (booking.status_bayar ?? 'belum') as 'belum' | 'dp' | 'lunas',
    jumlah_dp:    booking.jumlah_dp    ? String(booking.jumlah_dp) : '',
  })

  const tanggalOut = hitungTanggalOut(
    new Date(form.tanggal_in + 'T00:00:00'),
    form.durasi_hari,
  )

  const hargaTotal = hargaData
    ? hitungHargaTotal(
        hargaData.harga_harian,
        hargaData.harga_mingguan,
        hargaData.harga_bulanan,
        form.durasi_hari,
      )
    : booking.harga_total
      ? Number(booking.harga_total)
      : null

  useEffect(() => {
    supabase
      .from('harga').select('*')
      .eq('lantai', lantai)
      .single()
      .then(({ data }) => { if (data) setHargaData(data) })
  }, [lantai, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.nik && !validasiNIK(form.nik)) {
      setError('NIK harus tepat 16 digit angka.')
      return
    }
    if (form.durasi_hari < 1) {
      setError('Durasi minimal 1 hari.')
      return
    }

    const nominalDP = form.status_bayar === 'dp' ? Number(form.jumlah_dp) : null
    if (form.status_bayar === 'dp') {
      if (!nominalDP || nominalDP <= 0) {
        setError('Masukkan jumlah DP yang dibayar.')
        return
      }
      if (hargaTotal && nominalDP >= hargaTotal) {
        setError('Jumlah DP tidak boleh sama atau lebih dari harga total. Pilih status Lunas.')
        return
      }
    }

    setSaving(true)
    const { error: err } = await supabase
      .from('booking')
      .update({
        nama_tamu:    form.nama_tamu.toUpperCase(),
        nik:          form.nik       || null,
        nomor_hp:     form.nomor_hp  || null,
        durasi:       form.durasi_hari,
        tanggal_in:   form.tanggal_in,
        tanggal_out:  format(tanggalOut, 'yyyy-MM-dd'),
        harga_total:  hargaTotal,
        status_bayar: form.status_bayar,
        jumlah_dp:    nominalDP,
        catatan:      form.catatan   || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (err) { setError('Gagal menyimpan. ' + err.message); setSaving(false) }
    else      { onClose() }
  }

  const nikValid = form.nik ? validasiNIK(form.nik) : null

  function adjustHari(delta: number) {
    setForm(f => ({ ...f, durasi_hari: Math.max(1, Math.min(365, f.durasi_hari + delta)) }))
  }

  function infoHargaTier(): string {
    const h = form.durasi_hari
    if (h < 7)  return 'Dihitung per hari'
    if (h < 30) return 'Dihitung per minggu + sisa hari'
    return 'Dihitung per bulan + sisa hari'
  }

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
              background: 'var(--accent-light)', border: '1px solid var(--accent-mid)',
              borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
                EDIT · KAMAR {nomor_kamar} · LANTAI {lantai}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              Edit Booking
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Data awal: {labelDurasi(booking.durasi ?? 30)} · masuk {format(new Date(booking.tanggal_in), 'dd MMM yyyy', { locale: localeID })}
            </p>
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
              <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400, textTransform: 'none' }}>(opsional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="16 digit angka"
                value={form.nik}
                onChange={e => setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                maxLength={16}
                style={{
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                  borderColor: form.nik ? (nikValid ? 'var(--green)' : 'var(--red)') : undefined,
                  paddingRight: form.nik ? 72 : 12,
                }}
              />
              {form.nik && (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: nikValid ? 'var(--green)' : 'var(--red)' }}>
                    {form.nik.length}/16
                  </span>
                  <span style={{ fontSize: 14 }}>{nikValid ? '✓' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nomor HP */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              <Phone size={10} style={{ display: 'inline', marginRight: 4 }} />
              Nomor HP
              <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400, textTransform: 'none' }}>(opsional)</span>
            </label>
            <input
              type="tel"
              placeholder="Contoh: 08123456789"
              value={form.nomor_hp}
              onChange={e => setForm({ ...form, nomor_hp: e.target.value.replace(/\D/g, '').slice(0, 15) })}
              maxLength={15}
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
            />
          </div>

          {/* Tanggal Masuk */}
          <div style={{ marginBottom: 14 }}>
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

          {/* Durasi */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
              Durasi (hari) *
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => adjustHari(-1)}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  cursor: 'pointer', fontSize: 18, fontWeight: 500,
                  color: 'var(--text-secondary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                −
              </button>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  min={1} max={365}
                  value={form.durasi_hari}
                  onChange={e => setForm({ ...form, durasi_hari: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })}
                  style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, paddingRight: 44 }}
                />
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none',
                }}>
                  hari
                </span>
              </div>

              <button
                type="button"
                onClick={() => adjustHari(1)}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  cursor: 'pointer', fontSize: 18, fontWeight: 500,
                  color: 'var(--text-secondary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                +
              </button>
            </div>

            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DURASI_PRESETS.map(({ label, hari }) => {
                const active = form.durasi_hari === hari
                return (
                  <button
                    key={hari}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, durasi_hari: hari }))}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12,
                      border: '1px solid',
                      borderColor: active ? 'var(--accent)' : 'var(--border)',
                      background:  active ? 'var(--accent-light)' : 'var(--bg)',
                      color:       active ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', fontWeight: active ? 600 : 400,
                      transition: 'all 0.12s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info otomatis */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
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
                  {hargaTotal != null ? formatRupiah(hargaTotal) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Belum ada data harga</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: 'var(--accent-light)',
              borderRadius: 6, border: '1px solid var(--accent-mid)',
            }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                ℹ {infoHargaTier()}
              </span>
            </div>
          </div>

          {/* Status bayar */}
          <div style={{ marginBottom: form.status_bayar === 'dp' ? 10 : 14 }}>
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
                    onClick={() => setForm({ ...form, status_bayar: val, jumlah_dp: '' })}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8,
                      border: `1.5px solid ${active ? border : 'var(--border)'}`,
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

          {/* Input DP */}
          {form.status_bayar === 'dp' && (
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Jumlah DP Dibayar *</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none',
                }}>
                  Rp
                </span>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={form.jumlah_dp}
                  onChange={e => setForm({ ...form, jumlah_dp: e.target.value })}
                  style={{ paddingLeft: 36, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
              </div>
              {hargaTotal && Number(form.jumlah_dp) > 0 && (
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--amber-light)', border: '1px solid var(--amber-border)' }}>
                    <div style={{ fontSize: 9, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 2 }}>DP DIBAYAR</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                      {formatRupiah(Number(form.jumlah_dp))}
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--red-light)', border: '1px solid var(--red-border)' }}>
                    <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 2 }}>SISA TAGIHAN</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                      {formatRupiah(Math.max(0, hargaTotal - Number(form.jumlah_dp)))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving
                ? <><span className="loader" /> Menyimpan...</>
                : <><Save size={14} /> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}