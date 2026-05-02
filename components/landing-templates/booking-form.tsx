'use client'
// components/landing-templates/booking-form.tsx
// Modal form booking publik — dipanggil dari TemplateElegant
// Submit ke /api/booking/publik (no-auth endpoint)

import { useState, useEffect, useRef } from 'react'
import { format, addDays }             from 'date-fns'
import { id as localeId }              from 'date-fns/locale'
import { DURASI_PRESETS, hitungTanggalOut, hitungHargaTotal, formatRupiah, validasiNIK } from '@/lib/harga'

interface Kamar {
  id:          string
  nomor_kamar: string
  lantai:      number
  tipe:        string
  status:      string
  catatan:     string | null
}

interface Harga {
  lantai:         number
  tipe:           string
  harga_harian:   number | null
  harga_mingguan: number | null
  harga_bulanan:  number
}

interface Props {
  kamar:     Kamar
  harga?:    Harga
  tenantId:  string
  primary:   string
  fHeading:  string
  onClose:   () => void
  onSuccess: () => void
}

type Step = 'form' | 'confirm' | 'success'

export default function BookingForm({
  kamar, harga, tenantId, primary, fHeading, onClose, onSuccess,
}: Props) {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const maxDate   = format(addDays(new Date(), 365), 'yyyy-MM-dd')

  const [step,       setStep]       = useState<Step>('form')
  const [loading,    setLoading]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [bookingId,  setBookingId]  = useState<string | null>(null)

  // Form state
  const [namaTamu,   setNamaTamu]   = useState('')
  const [nik,        setNik]        = useState('')
  const [nomorHp,    setNomorHp]    = useState('')
  const [tanggalIn,  setTanggalIn]  = useState(today)
  const [durasi,     setDurasi]     = useState(30)
  const [durasiInput,setDurasiInput]= useState('30')
  const [catatan,    setCatatan]    = useState('')

  // Computed
  const tanggalOut  = hitungTanggalOut(new Date(tanggalIn), durasi)
  const hargaTotal  = harga
    ? hitungHargaTotal(harga.harga_harian, harga.harga_mingguan, harga.harga_bulanan, durasi)
    : null

  // Trap focus inside modal
  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Sync durasiInput → durasi (angka valid saja)
  function handleDurasiChange(val: string) {
    setDurasiInput(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 1 && n <= 365) setDurasi(n)
  }

  function handlePreset(hari: number) {
    setDurasi(hari)
    setDurasiInput(String(hari))
  }

  // Validasi lokal sebelum confirm
  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!namaTamu.trim())             return setErrorMsg('Nama tamu wajib diisi.')
    if (nik && !validasiNIK(nik))    return setErrorMsg('NIK harus 16 digit angka.')
    if (durasi < 1 || durasi > 365)  return setErrorMsg('Durasi harus antara 1–365 hari.')
    setStep('confirm')
  }

  // POST ke API
  async function handleConfirm() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/booking/publik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id:  tenantId,
          kamar_id:   kamar.id,
          nama_tamu:  namaTamu.trim(),
          nik:        nik || undefined,
          nomor_hp:   nomorHp || undefined,
          durasi,
          tanggal_in: tanggalIn,
          catatan:    catatan || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Terjadi kesalahan. Coba lagi.')
        setStep('form')
      } else {
        setBookingId(json.data?.id ?? null)
        setStep('success')
      }
    } catch {
      setErrorMsg('Tidak dapat terhubung ke server.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  // ── Styles helpers ──────────────────────────────────────────────────────
  const pDark  = darkenHex(primary)
  const fBody  = 'var(--font-body, system-ui, sans-serif)'

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 8, fontSize: 14,
    border: '1px solid #d1d5db', outline: 'none',
    fontFamily: fBody, color: '#1a1a1a', background: '#fff',
    transition: 'border-color 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#374151', marginBottom: 6, letterSpacing: '0.03em',
  }

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Form Booking"
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)     scale(1);    }
          }
          .bfinput:focus { border-color: ${primary} !important; box-shadow: 0 0 0 3px ${primary}22; }
          .bfpreset { border: 1.5px solid #e5e7eb; background: #f9fafb; color: #374151; border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
          .bfpreset:hover, .bfpreset.active { border-color: ${primary}; background: ${primary}12; color: ${primary}; font-weight: 600; }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 24px 0',
        }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: primary, marginBottom: 4,
            }}>
              Pemesanan Kamar
            </div>
            <h2 style={{
              fontFamily: fHeading, fontSize: 22, fontWeight: 700,
              margin: 0, color: '#1a1a1a',
            }}>
              Kamar {kamar.nomor_kamar}
            </h2>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
              Lantai {kamar.lantai} · {kamar.tipe}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280', fontSize: 18, flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
          >
            ×
          </button>
        </div>

        {/* Progress indicator */}
        {step !== 'success' && (
          <div style={{ padding: '16px 24px 0', display: 'flex', gap: 6 }}>
            {(['form', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 99,
                background: (step === 'form' && i === 0) || (step === 'confirm' && i <= 1)
                  ? primary : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}

        <div style={{ padding: '20px 24px 28px' }}>

          {/* ─────────────────── STEP: FORM ─────────────────── */}
          {step === 'form' && (
            <form onSubmit={handleSubmitForm} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Nama */}
                <div>
                  <label style={labelStyle}>
                    Nama Lengkap <Required />
                  </label>
                  <input
                    className="bfinput"
                    style={inputStyle}
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={namaTamu}
                    onChange={e => setNamaTamu(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* NIK */}
                <div>
                  <label style={labelStyle}>
                    NIK <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opsional)</span>
                  </label>
                  <input
                    className="bfinput"
                    style={inputStyle}
                    type="text"
                    inputMode="numeric"
                    placeholder="16 digit nomor KTP"
                    value={nik}
                    maxLength={16}
                    onChange={e => setNik(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {/* No HP */}
                <div>
                  <label style={labelStyle}>
                    Nomor HP / WhatsApp <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opsional)</span>
                  </label>
                  <input
                    className="bfinput"
                    style={inputStyle}
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={nomorHp}
                    onChange={e => setNomorHp(e.target.value)}
                  />
                </div>

                {/* Tanggal Check-in */}
                <div>
                  <label style={labelStyle}>
                    Tanggal Check-in <Required />
                  </label>
                  <input
                    className="bfinput"
                    style={inputStyle}
                    type="date"
                    min={today}
                    max={maxDate}
                    value={tanggalIn}
                    onChange={e => setTanggalIn(e.target.value)}
                    required
                  />
                </div>

                {/* Durasi */}
                <div>
                  <label style={labelStyle}>
                    Durasi Menginap <Required />
                  </label>

                  {/* Preset chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {DURASI_PRESETS.map(p => (
                      <button
                        key={p.hari}
                        type="button"
                        className={`bfpreset${durasi === p.hari ? ' active' : ''}`}
                        onClick={() => handlePreset(p.hari)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Input manual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      className="bfinput"
                      style={{ ...inputStyle, width: 100 }}
                      type="number"
                      min={1}
                      max={365}
                      value={durasiInput}
                      onChange={e => handleDurasiChange(e.target.value)}
                    />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>hari</span>
                    <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 'auto' }}>
                      s/d {format(tanggalOut, 'd MMM yyyy', { locale: localeId })}
                    </span>
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label style={labelStyle}>
                    Catatan <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opsional)</span>
                  </label>
                  <textarea
                    className="bfinput"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                    placeholder="Permintaan khusus, dll."
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                  />
                </div>

                {/* Estimasi harga */}
                {hargaTotal !== null && (
                  <div style={{
                    background: `${primary}0d`,
                    border: `1px solid ${primary}25`,
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: primary, fontWeight: 600, marginBottom: 2 }}>
                        ESTIMASI TOTAL
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {durasi} hari · bisa berubah
                      </div>
                    </div>
                    <div style={{
                      fontFamily: fHeading, fontSize: 22, fontWeight: 700, color: primary,
                    }}>
                      {formatRupiah(hargaTotal)}
                    </div>
                  </div>
                )}

                {/* Error */}
                {errorMsg && <ErrorBox msg={errorMsg} />}

                {/* Submit */}
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '13px 0',
                    background: primary, color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = pDark)}
                  onMouseLeave={e => (e.currentTarget.style.background = primary)}
                >
                  Lanjut ke Konfirmasi →
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────── STEP: CONFIRM ─────────────────── */}
          {step === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                Mohon periksa kembali detail pemesanan kamu sebelum mengirim.
              </p>

              {/* Summary card */}
              <div style={{
                border: '1px solid #e5e7eb', borderRadius: 14,
                overflow: 'hidden',
              }}>
                <div style={{
                  background: `linear-gradient(to right, ${primary}, ${pDark})`,
                  padding: '14px 18px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#fff', fontFamily: fHeading, fontWeight: 700, fontSize: 16 }}>
                    Kamar {kamar.nomor_kamar}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    fontSize: 12, padding: '3px 10px', borderRadius: 20,
                  }}>
                    Lantai {kamar.lantai} · {kamar.tipe}
                  </span>
                </div>

                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SummaryRow label="Nama Tamu"    value={namaTamu.toUpperCase()} />
                  {nik     && <SummaryRow label="NIK"        value={nik} />}
                  {nomorHp && <SummaryRow label="No. HP"     value={nomorHp} />}
                  <SummaryRow
                    label="Check-in"
                    value={format(new Date(tanggalIn), 'd MMMM yyyy', { locale: localeId })}
                  />
                  <SummaryRow
                    label="Check-out"
                    value={format(tanggalOut, 'd MMMM yyyy', { locale: localeId })}
                  />
                  <SummaryRow label="Durasi" value={`${durasi} hari`} />
                  {catatan && <SummaryRow label="Catatan" value={catatan} />}

                  {hargaTotal !== null && (
                    <div style={{
                      borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 4,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Total</span>
                      <span style={{
                        fontFamily: fHeading, fontSize: 20, fontWeight: 700, color: primary,
                      }}>
                        {formatRupiah(hargaTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && <ErrorBox msg={errorMsg} />}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStep('form'); setErrorMsg(null) }}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '12px 0',
                    background: '#f3f4f6', color: '#374151',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  ← Edit
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    flex: 2, padding: '12px 0',
                    background: loading ? '#9ca3af' : primary, color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = pDark }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = primary }}
                >
                  {loading
                    ? <><Spinner /> Memproses…</>
                    : 'Konfirmasi Booking ✓'
                  }
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────── STEP: SUCCESS ─────────────────── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '8px 0 8px' }}>
              {/* Checkmark animasi */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#dcfce7', border: '2px solid #bbf7d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 36,
                animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
              }}>
                ✓
              </div>

              <h3 style={{
                fontFamily: fHeading, fontSize: 22, fontWeight: 700,
                margin: '0 0 8px', color: '#1a1a1a',
              }}>
                Booking Berhasil!
              </h3>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                Terima kasih, <strong>{namaTamu}</strong>.<br />
                Pemesanan kamar <strong>{kamar.nomor_kamar}</strong> telah diterima.
                {bookingId && (
                  <><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>ID: {bookingId}</span></>
                )}
              </p>

              {/* Detail ringkas */}
              <div style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: '16px', marginBottom: 24,
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <SummaryRow
                  label="Check-in"
                  value={format(new Date(tanggalIn), 'd MMMM yyyy', { locale: localeId })}
                />
                <SummaryRow
                  label="Check-out"
                  value={format(tanggalOut, 'd MMMM yyyy', { locale: localeId })}
                />
                {hargaTotal !== null && (
                  <SummaryRow label="Total" value={formatRupiah(hargaTotal)} highlight />
                )}
              </div>

              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
                Hubungi pengelola untuk konfirmasi pembayaran.
              </p>

              <button
                onClick={onSuccess}
                style={{
                  width: '100%', padding: '13px 0',
                  background: primary, color: '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = pDark)}
                onMouseLeave={e => (e.currentTarget.style.background = primary)}
              >
                Tutup
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Micro-components ──────────────────────────────────────────────────────

function Required() {
  return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 10, padding: '12px 14px',
      fontSize: 13, color: '#b91c1c',
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ flexShrink: 0 }}>⚠️</span>
      {msg}
    </div>
  )
}

function SummaryRow({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 13, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, color: highlight ? 'var(--primary)' : '#1a1a1a',
        fontWeight: highlight ? 700 : 500, textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────

function darkenHex(hex: string): string {
  try {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (n >> 16) - 40)
    const g = Math.max(0, ((n >> 8) & 0xff) - 40)
    const b = Math.max(0, (n & 0xff) - 40)
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return hex
  }
}