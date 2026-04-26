'use client'
// app/(dashboard)/booking/[id]/page.tsx
// Halaman edit detail satu booking

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, type Database } from '@/lib/supabase'
import {
  DURASI_PRESETS, hitungTanggalOut, hitungHargaTotal,
  formatRupiah, validasiNIK, sisaHari, labelDurasi,
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
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [hargaData, setHargaData] = useState<HargaRow | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Form state — durasi sekarang integer (jumlah hari)
  const [form, setForm] = useState({
    nama_tamu:    '',
    nik:          '',
    nomor_hp:     '',
    durasi_hari:  30,          // integer
    tanggal_in:   '',
    status_bayar: 'belum' as 'belum' | 'dp' | 'lunas',
    catatan:      '',
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

        // durasi bisa number (baru) atau string lama — parse aman
        const durasiHari = typeof b.durasi === 'number'
          ? b.durasi
          : parseInt(String(b.durasi), 10) || 30

        setForm({
          nama_tamu:    b.nama_tamu,
          nik:          b.nik || '',
          nomor_hp:     b.nomor_hp || '',
          durasi_hari:  durasiHari,
          tanggal_in:   b.tanggal_in,
          status_bayar: b.status_bayar as 'belum' | 'dp' | 'lunas',
          catatan:      b.catatan || '',
        })

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
    ? hitungTanggalOut(new Date(form.tanggal_in + 'T00:00:00'), form.durasi_hari)
    : null

  const hargaTotal = hargaData && tanggalOut
    ? hitungHargaTotal(
        hargaData.harga_harian,
        hargaData.harga_mingguan,
        hargaData.harga_bulanan,
        form.durasi_hari,
      )
    : (booking?.harga_total ?? null)

  function adjustHari(delta: number) {
    setForm(f => ({ ...f, durasi_hari: Math.max(1, Math.min(365, f.durasi_hari + delta)) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.nik && !validasiNIK(form.nik)) {
      setError('NIK harus 16 digit angka.')
      return
    }
    if (form.durasi_hari < 1) {
      setError('Durasi minimal 1 hari.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase
      .from('booking')
      .update({
        nama_tamu:    form.nama_tamu.toUpperCase(),
        nik:          form.nik || null,
        nomor_hp:     form.nomor_hp || null,
        durasi:       form.durasi_hari,          // integer
        tanggal_in:   form.tanggal_in,
        tanggal_out:  tanggalOut
          ? format(tanggalOut, 'yyyy-MM-dd')
          : booking!.tanggal_out,
        harga_total:  hargaTotal,
        status_bayar: form.status_bayar,
        catatan:      form.catatan || null,
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
    if (!confirm(
      `Hapus booking ${booking.nama_tamu} dari kamar ${booking.kamar.nomor_kamar}?\nKamar akan otomatis jadi kosong.`
    )) return

    setDeleting(true)
    await supabase.from('booking').delete().eq('id', id)
    router.push('/booking')
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
        <div className="loader" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</span>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
          Booking tidak ditemukan.
        </div>
        <Link href="/booking" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Kembali ke Data Booking
        </Link>
      </div>
    )
  }

  const sisa    = sisaHari(booking.tanggal_out)
  const expired = sisa === 0
  const warning = !expired && sisa <= 7

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>

      {/* ── Back ────────────────────────────────────────── */}
      <Link
        href="/booking"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none',
          marginBottom: 24, transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={14} /> Kembali ke Data Booking
      </Link>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--red)', letterSpacing: '0.15em', marginBottom: 6,
        }}>
          KAMAR {booking.kamar.nomor_kamar} · LANTAI {booking.kamar.lantai}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          fontWeight: 600, color: 'var(--text-primary)',
        }}>
          {booking.nama_tamu}
        </h1>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
          {expired ? (
            <span className="badge badge-terisi">Expired</span>
          ) : (
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: warning ? 'var(--amber)' : 'var(--text-muted)',
              fontWeight: warning ? 600 : 400,
            }}>
              SISA {sisa} HARI
            </span>
          )}
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            CHECK-IN {format(new Date(booking.tanggal_in), 'dd MMM yyyy', { locale: localeID }).toUpperCase()}
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            DURASI {labelDurasi(form.durasi_hari).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="gold-line" style={{ marginBottom: 28 }} />

      {/* ── Form ────────────────────────────────────────── */}
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
              NIK <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— opsional</span>
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
                    ? validasiNIK(form.nik) ? 'var(--green)' : 'var(--red)'
                    : undefined,
                }}
              />
              {form.nik && (
                <div style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: validasiNIK(form.nik) ? 'var(--green)' : 'var(--red)',
                }}>
                  {form.nik.length}/16
                </div>
              )}
            </div>
          </div>

          {/* Nomor HP */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              NOMOR HP <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— opsional</span>
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

          {/* ── DURASI (integer hari) ──────────────────── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>DURASI (HARI) *</label>

            {/* Stepper + input angka */}
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
                  min={1}
                  max={365}
                  value={form.durasi_hari}
                  onChange={e => setForm({
                    ...form,
                    durasi_hari: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                  })}
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 20,
                    paddingRight: 44,
                  }}
                />
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', pointerEvents: 'none',
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

            {/* Preset shortcut buttons */}
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
                      background: active ? 'var(--accent-light)' : 'var(--bg)',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
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
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--amber)',
            }}>
              {tanggalOut
                ? format(tanggalOut, 'dd MMMM yyyy', { locale: localeID })
                : '—'}
            </div>
          </div>

          {/* Harga otomatis */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>HARGA TOTAL (OTOMATIS)</label>
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 15,
              color: 'var(--green)', fontWeight: 600,
            }}>
              {hargaTotal != null ? formatRupiah(hargaTotal) : '—'}
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
                    padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'all 0.15s',
                    background: form.status_bayar === s ? undefined : 'transparent',
                    border: '1px solid var(--border)',
                  }}
                  className={form.status_bayar === s ? `badge badge-${s}` : undefined}
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

        {/* ── Feedback ──────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'color-mix(in srgb, var(--red) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
            borderRadius: 6, padding: '10px 14px',
            color: 'var(--red)', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'color-mix(in srgb, var(--green) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
            borderRadius: 6, padding: '10px 14px',
            color: 'var(--green)', fontSize: 13, marginBottom: 16,
          }}>
            {success}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '10px 18px', borderRadius: 6,
              border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
              background: 'color-mix(in srgb, var(--red) 10%, transparent)',
              color: 'var(--red)', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            {deleting
              ? <span className="loader" />
              : <><Trash2 size={13} /> Hapus</>
            }
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {saving
              ? <span className="loader" />
              : <><Save size={14} /> Simpan Perubahan</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 6, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em', fontWeight: 500,
}