'use client'
// app/(dashboard)/booking/[id]/page.tsx
// Halaman edit detail satu booking

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_OPTIONS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, validasiNIK, sisaHari, type Durasi
} from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number; tipe: string }
}
type HargaRow = Database['public']['Tables']['harga']['Row']

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [hargaData, setHargaData] = useState<HargaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [form, setForm] = useState({
    nama_tamu: '',
    nik: '',
    durasi: '1 bulan' as Durasi,
    tanggal_in: '',
    status_bayar: 'belum' as 'belum' | 'dp' | 'lunas',
    catatan: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('booking')
        .select('*, kamar(nomor_kamar, lantai, tipe)')
        .eq('id', id)
        .single()

      if (data) {
        const b = data as Booking
        setBooking(b)
        setForm({
          nama_tamu: b.nama_tamu,
          nik: b.nik || '',
          durasi: b.durasi as Durasi,
          tanggal_in: b.tanggal_in,
          status_bayar: b.status_bayar as 'belum' | 'dp' | 'lunas',
          catatan: b.catatan || '',
        })

        // Fetch harga untuk lantai ini
        const { data: harga } = await supabase
          .from('harga')
          .select('*')
          .eq('lantai', b.kamar.lantai)
          .single()
        if (harga) setHargaData(harga)
      }
      setLoading(false)
    }
    load()
  }, [id, supabase])

  const tanggalOut = form.tanggal_in
    ? hitungTanggalOut(new Date(form.tanggal_in), form.durasi)
    : null

  const hargaTotal = hargaData && tanggalOut
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, form.durasi)
    : booking?.harga_total

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.nik && !validasiNIK(form.nik)) {
      setError('NIK harus 16 digit angka.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase
      .from('booking')
      .update({
        nama_tamu: form.nama_tamu.toUpperCase(),
        nik: form.nik || null,
        durasi: form.durasi,
        tanggal_in: form.tanggal_in,
        tanggal_out: tanggalOut ? format(tanggalOut, 'yyyy-MM-dd') : booking!.tanggal_out,
        harga_total: hargaTotal,
        status_bayar: form.status_bayar,
        catatan: form.catatan || null,
      })
      .eq('id', id)

    if (err) {
      setError('Gagal menyimpan. Coba lagi.')
    } else {
      setSuccess('Data berhasil disimpan.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!booking) return
    if (!confirm(`Hapus booking ${booking.nama_tamu} dari kamar ${booking.kamar.nomor_kamar}?\nKamar akan otomatis jadi kosong.`)) return

    setDeleting(true)
    await supabase.from('booking').delete().eq('id', id)
    router.push('/booking')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  if (!booking) {
    return (
      <div style={{ padding: '28px 32px', textAlign: 'center', color: '#6b6b55' }}>
        Booking tidak ditemukan.{' '}
        <Link href="/booking" style={{ color: '#c9a84c' }}>Kembali</Link>
      </div>
    )
  }

  const sisa = sisaHari(booking.tanggal_out)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>
      {/* Back */}
      <Link
        href="/booking"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#6b6b55', fontSize: 13, textDecoration: 'none',
          marginBottom: 24, transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e8e4d4')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b6b55')}
      >
        <ArrowLeft size={14} /> Kembali ke Data Booking
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: '#f87171', letterSpacing: '0.15em', marginBottom: 6,
        }}>
          KAMAR {booking.kamar.nomor_kamar} · LANTAI {booking.kamar.lantai}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#e8e4d4' }}>
          {booking.nama_tamu}
        </h1>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: sisa <= 7 ? '#c9a84c' : '#6b6b55',
          }}>
            {sisa <= 0 ? 'SUDAH EXPIRED' : `SISA ${sisa} HARI`}
          </span>
          <span style={{ color: '#2a2a22' }}>·</span>
          <span style={{ fontSize: 11, color: '#6b6b55', fontFamily: 'var(--font-mono)' }}>
            CHECK-IN {format(new Date(booking.tanggal_in), 'dd MMM yyyy', { locale: localeID }).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="gold-line" style={{ marginBottom: 28 }} />

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Nama */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>NAMA TAMU *</label>
            <input
              type="text"
              value={form.nama_tamu}
              onChange={e => setForm({ ...form, nama_tamu: e.target.value.toUpperCase() })}
              required
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* NIK */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              NIK <span style={{ color: '#6b6b55', fontWeight: 400 }}>— opsional</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="16 digit angka"
                value={form.nik}
                onChange={e => setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                maxLength={16}
                style={{
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                  borderColor: form.nik
                    ? validasiNIK(form.nik) ? '#4ade8060' : '#f8717160'
                    : undefined,
                }}
              />
              {form.nik && (
                <div style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: validasiNIK(form.nik) ? '#4ade80' : '#f87171',
                }}>
                  {form.nik.length}/16
                </div>
              )}
            </div>
          </div>

          {/* Durasi */}
          <div>
            <label style={labelStyle}>DURASI *</label>
            <select
              value={form.durasi}
              onChange={e => setForm({ ...form, durasi: e.target.value as Durasi })}
            >
              {DURASI_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Tanggal IN */}
          <div>
            <label style={labelStyle}>TANGGAL MASUK *</label>
            <input
              type="date"
              value={form.tanggal_in}
              onChange={e => setForm({ ...form, tanggal_in: e.target.value })}
              required
            />
          </div>

          {/* Tanggal OUT otomatis */}
          <div>
            <label style={labelStyle}>TANGGAL KELUAR (OTOMATIS)</label>
            <div style={{
              background: '#131310', border: '1px solid #2a2a22', borderRadius: 6,
              padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c9a84c',
            }}>
              {tanggalOut
                ? format(tanggalOut, 'dd MMMM yyyy', { locale: localeID })
                : '—'}
            </div>
          </div>

          {/* Harga otomatis */}
          <div>
            <label style={labelStyle}>HARGA TOTAL (OTOMATIS)</label>
            <div style={{
              background: '#131310', border: '1px solid #4ade8030', borderRadius: 6,
              padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 16, color: '#4ade80',
            }}>
              {hargaTotal ? formatRupiah(hargaTotal) : '—'}
            </div>
          </div>

          {/* Status bayar */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>STATUS BAYAR</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['belum', 'dp', 'lunas'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, status_bayar: s })}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: form.status_bayar === s
                      ? s === 'lunas' ? '#4ade8020' : s === 'dp' ? '#c9a84c20' : '#f8717120'
                      : 'transparent',
                    borderColor: form.status_bayar === s
                      ? s === 'lunas' ? '#4ade8060' : s === 'dp' ? '#c9a84c60' : '#f8717160'
                      : '#2a2a22',
                    color: form.status_bayar === s
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
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>CATATAN</label>
            <textarea
              rows={3}
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              placeholder="Catatan tambahan..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div style={{
            background: '#f8717115', border: '1px solid #f8717130',
            borderRadius: 6, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            background: '#4ade8015', border: '1px solid #4ade8030',
            borderRadius: 6, padding: '10px 14px', color: '#4ade80', fontSize: 13, marginBottom: 16,
          }}>{success}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '10px 18px', borderRadius: 6, border: '1px solid #f8717130',
              background: '#f8717110', color: '#f87171', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {deleting ? <span className="loader" /> : <><Trash2 size={13} /> Hapus</>}
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {saving ? <span className="loader" /> : <><Save size={14} /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#9a9678',
  marginBottom: 6, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em', fontWeight: 500,
}