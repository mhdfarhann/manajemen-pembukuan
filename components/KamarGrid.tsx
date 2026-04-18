'use client'
// components/KamarGrid.tsx

import { type Database } from '@/lib/supabase'
import { sisaHari } from '@/lib/harga'

type Kamar = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

interface Props {
  lantai: number
  kamarList: Kamar[]
  bookingList: Booking[]
  onKamarClick: (kamar: Kamar) => void
}

export default function KamarGrid({ lantai, kamarList, bookingList, onKamarClick }: Props) {
  function getBookingForKamar(kamarId: string) {
    return bookingList.find(b => b.kamar_id === kamarId)
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Lantai header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#6b6b55',
          letterSpacing: '0.2em',
        }}>
          LANTAI {lantai}
        </div>
        <div className="gold-line" style={{ flex: 1 }} />
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: '#6b6b55',
        }}>
          {kamarList.filter(k => k.status === 'kosong').length} kosong /{' '}
          {kamarList.length} total
        </div>
      </div>

      {/* Grid kamar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 10,
      }}>
        {kamarList.map(kamar => {
          const booking = getBookingForKamar(kamar.id)
          const sisa = booking ? sisaHari(booking.tanggal_out) : null
          const hampirHabis = sisa !== null && sisa <= 7

          return (
            <button
              key={kamar.id}
              className={`kamar-btn ${kamar.status}`}
              onClick={() => onKamarClick(kamar)}
              title={
                kamar.status === 'terisi' && booking
                  ? `${booking.nama_tamu} — sisa ${sisa} hari`
                  : `Kamar ${kamar.nomor_kamar} — Kosong`
              }
              style={{
                minHeight: 90,
                borderColor: hampirHabis
                  ? '#c9a84c60'
                  : kamar.status === 'kosong'
                  ? '#4ade8040'
                  : '#f8717130',
              }}
            >
              {/* Nomor kamar */}
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}>
                {kamar.nomor_kamar}
              </div>

              {/* Status label */}
              <div style={{
                fontSize: 9,
                letterSpacing: '0.1em',
                opacity: 0.7,
                marginTop: 2,
              }}>
                {kamar.status === 'kosong' ? 'KOSONG' : 'TERISI'}
              </div>

              {/* Info booking jika terisi */}
              {booking && (
                <div style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: hampirHabis ? '#c9a84c' : '#f8717188',
                  letterSpacing: '0.04em',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 4px',
                  lineHeight: 1.3,
                }}>
                  {hampirHabis ? `⚠ ${sisa}hr` : booking.nama_tamu.split(' ')[0]}
                </div>
              )}

              {/* Dot indicator */}
              <div style={{
                position: 'absolute',
                top: 6, right: 6,
                width: 6, height: 6,
                borderRadius: '50%',
                background: hampirHabis
                  ? '#c9a84c'
                  : kamar.status === 'kosong'
                  ? '#4ade80'
                  : '#f87171',
                boxShadow: kamar.status === 'kosong'
                  ? '0 0 6px #4ade8060'
                  : hampirHabis
                  ? '0 0 6px #c9a84c60'
                  : 'none',
              }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}