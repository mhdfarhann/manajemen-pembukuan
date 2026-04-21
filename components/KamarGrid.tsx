'use client'
// components/KamarGrid.tsx

import { type Database } from '@/lib/supabase'
import { sisaHari } from '@/lib/harga'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

interface Props {
  lantai:      number
  kamarList:   Kamar[]
  bookingList: Booking[]
  onKamarClick: (kamar: Kamar) => void
}

export default function KamarGrid({ lantai, kamarList, bookingList, onKamarClick }: Props) {
  function getBooking(kamarId: string) {
    return bookingList.find(b => b.kamar_id === kamarId)
  }

  const kosongCount = kamarList.filter(k => k.status === 'kosong').length

  return (
    <div style={{ marginBottom: 32 }}>

      {/* Lantai header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '4px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '0.1em',
          boxShadow: 'var(--shadow-sm)',
        }}>
          LANTAI {lantai}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}>
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>{kosongCount} kosong</span>
          {' '}/ {kamarList.length} kamar
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
        gap: 10,
      }}>
        {kamarList.map(kamar => {
          const booking     = getBooking(kamar.id)
          const sisa        = booking ? sisaHari(booking.tanggal_out) : null
          const hampirHabis = sisa !== null && sisa <= 7 && sisa > 0

          // FIX: Kelas hampir-habis override warna terisi
          const btnClass = hampirHabis
            ? 'kamar-btn terisi hampir-habis'
            : `kamar-btn ${kamar.status}`

          return (
            <button
              key={kamar.id}
              className={btnClass}
              onClick={() => onKamarClick(kamar)}
              title={
                kamar.status === 'terisi' && booking
                  ? `${booking.nama_tamu} — sisa ${sisa} hari`
                  : `Kamar ${kamar.nomor_kamar} — Kosong, klik untuk booking`
              }
            >
              {/* Dot */}
              <div style={{
                position: 'absolute', top: 7, right: 7,
                width: 6, height: 6, borderRadius: '50%',
                background: hampirHabis
                  ? 'var(--amber)'
                  : kamar.status === 'kosong'
                  ? 'var(--green)'
                  : 'var(--red)',
                boxShadow: kamar.status === 'kosong'
                  ? '0 0 5px rgba(22,163,74,0.5)'
                  : 'none',
              }} />

              {/* Nomor kamar */}
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1 }}>
                {kamar.nomor_kamar}
              </div>

              {/* Status */}
              <div style={{ fontSize: 9, letterSpacing: '0.08em', opacity: 0.65, marginTop: 2 }}>
                {kamar.status === 'kosong' ? 'KOSONG' : 'TERISI'}
              </div>

              {/* Info tamu */}
              {booking && (
                <div style={{
                  marginTop: 5, fontSize: 9, lineHeight: 1.3,
                  maxWidth: '100%', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  padding: '0 6px',
                  color: hampirHabis ? 'var(--amber)' : 'inherit',
                  fontWeight: hampirHabis ? 600 : 400,
                }}>
                  {hampirHabis
                    ? `⚠ ${sisa}hr lagi`
                    : booking.nama_tamu.split(' ')[0]
                  }
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}