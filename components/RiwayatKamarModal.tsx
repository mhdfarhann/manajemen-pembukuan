'use client'
// components/RiwayatKamarModal.tsx
// Modal menampilkan semua tamu yang pernah menginap di kamar tertentu
// Tambahkan tombol "Riwayat" di DetailKamarModal

import { useEffect, useState, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, History, CreditCard } from 'lucide-react'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row']

interface Props {
  kamar:   Kamar
  onClose: () => void
}

export default function RiwayatKamarModal({ kamar, onClose }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [riwayat, setRiwayat] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('booking')
      .select('*')
      .eq('kamar_id', kamar.id)
      .order('tanggal_in', { ascending: false })
      .limit(20)
      .then(({ data }) => { setRiwayat(data ?? []); setLoading(false) })
  }, [kamar.id, supabase])

  const totalPendapatan = riwayat.reduce((s, b) => s + (b.harga_total ? Number(b.harga_total) : 0), 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            }}>
              <History size={10} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                KAMAR {kamar.nomor_kamar} · LANTAI {kamar.lantai}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              Riwayat Tamu
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

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, gap: 10 }}>
            <div className="loader" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat riwayat...</span>
          </div>
        ) : riwayat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Belum ada riwayat tamu.</div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
              marginBottom: 16,
            }}>
              {[
                { label: 'Total Tamu', val: String(riwayat.length) },
                { label: 'Total Pendapatan', val: formatRupiah(totalPendapatan), color: 'var(--green)' },
                { label: 'Lunas', val: String(riwayat.filter(b => b.status_bayar === 'lunas').length) + ' booking' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: 4, textTransform: 'uppercase' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: color ?? 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* List */}
            <div style={{ maxHeight: 340, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
              {riwayat.map((b, i) => {
                const isFirst = i === 0
                const statusColor = b.status_bayar === 'lunas' ? 'var(--green)' : b.status_bayar === 'dp' ? 'var(--amber)' : 'var(--red)'
                const statusBg    = b.status_bayar === 'lunas' ? 'var(--green-light)' : b.status_bayar === 'dp' ? 'var(--amber-light)' : 'var(--red-light)'
                return (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 8,
                      background: isFirst ? 'var(--accent-light)' : 'transparent',
                      border: `1px solid ${isFirst ? 'var(--accent-mid)' : 'var(--border)'}`,
                      marginBottom: 6,
                    }}
                  >
                    {/* Nomor */}
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 500, fontSize: 13,
                        color: isFirst ? 'var(--accent)' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {b.nama_tamu}
                        {isFirst && (
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--font-mono)',
                            background: 'var(--accent-light)',
                            border: '1px solid var(--accent-mid)',
                            color: 'var(--accent)',
                            borderRadius: 4, padding: '1px 5px',
                          }}>TAMU AKTIF</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                        {b.nik && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CreditCard size={9} />
                            {b.nik.slice(0, 6)}••••{b.nik.slice(-4)}
                          </span>
                        )}
                        <span>
                          {format(new Date(b.tanggal_in), 'dd MMM yy', { locale: localeID })}
                          {' → '}
                          {format(new Date(b.tanggal_out), 'dd MMM yy', { locale: localeID })}
                        </span>
                        <span>{b.durasi}</span>
                      </div>
                    </div>

                    {/* Harga & Status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {b.harga_total && (
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 500, marginBottom: 4 }}>
                          {formatRupiah(b.harga_total)}
                        </div>
                      )}
                      <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '2px 7px', borderRadius: 4,
                        color: statusColor, background: statusBg,
                      }}>
                        {b.status_bayar}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="divider" style={{ marginTop: 12 }} />
        <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
          Tutup
        </button>
      </div>
    </div>
  )
}