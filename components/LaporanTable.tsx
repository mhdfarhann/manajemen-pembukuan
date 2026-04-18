'use client'
// components/LaporanTable.tsx
// Komponen tabel laporan yang bisa dipakai di halaman laporan maupun ekspor
// Sesuai format asli file xlsx klien

import { type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import Link from 'next/link'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

interface Props {
  bookings: Booking[]
  showActions?: boolean    // tampilkan link ke detail booking
  showLantai?: boolean     // tampilkan kolom lantai
  compact?: boolean        // ukuran font lebih kecil untuk cetak
}

const STATUS_COLOR = {
  belum: { text: '#f87171', bg: '#f8717115', border: '#f8717130' },
  dp:    { text: '#c9a84c', bg: '#c9a84c15', border: '#c9a84c30' },
  lunas: { text: '#4ade80', bg: '#4ade8015', border: '#4ade8030' },
}

export default function LaporanTable({
  bookings,
  showActions = true,
  showLantai = false,
  compact = false,
}: Props) {
  const fontSize = compact ? 11 : 13

  if (bookings.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 24px',
        color: '#6b6b55', fontSize: 13,
      }}>
        Tidak ada data.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize,
      }}>
        {/* Header */}
        <thead>
          <tr>
            {[
              { label: 'NO',    w: 36 },
              { label: 'KAMAR', w: 70 },
              ...(showLantai ? [{ label: 'LANTAI', w: 60 }] : []),
              { label: 'NAMA TAMU',    w: 180 },
              { label: 'NIK',          w: 130 },
              { label: 'DURASI',       w: 80 },
              { label: 'MASUK',        w: 90 },
              { label: 'KELUAR',       w: 90 },
              { label: 'HARGA',        w: 110 },
              { label: 'STATUS BAYAR', w: 100 },
              { label: 'SISA',         w: 60 },
              ...(showActions ? [{ label: '', w: 50 }] : []),
            ].map(col => (
              <th
                key={col.label}
                style={{
                  textAlign: 'left',
                  padding: compact ? '8px 10px' : '10px 12px',
                  borderBottom: '1px solid #2a2a22',
                  color: '#6b6b55',
                  fontWeight: 500,
                  fontFamily: 'var(--font-mono)',
                  fontSize: compact ? 9 : 11,
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                  width: col.w,
                  minWidth: col.w,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {bookings.map((b, i) => {
            const sisa = sisaHari(b.tanggal_out)
            const expired = sisa === 0
            const hampirHabis = sisa > 0 && sisa <= 7
            const statusStyle = STATUS_COLOR[b.status_bayar as keyof typeof STATUS_COLOR]

            return (
              <tr
                key={b.id}
                style={{ opacity: expired ? 0.45 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e18')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* NO */}
                <td style={cellStyle(compact)}>
                  <span style={{ color: '#6b6b55', fontFamily: 'var(--font-mono)', fontSize: compact ? 10 : 11 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </td>

                {/* KAMAR */}
                <td style={cellStyle(compact)}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: '#c9a84c', fontSize: compact ? 12 : 14,
                  }}>
                    {b.kamar.nomor_kamar}
                  </span>
                </td>

                {/* LANTAI (opsional) */}
                {showLantai && (
                  <td style={cellStyle(compact)}>
                    <span style={{ color: '#6b6b55', fontFamily: 'var(--font-mono)' }}>
                      {b.kamar.lantai}
                    </span>
                  </td>
                )}

                {/* NAMA */}
                <td style={cellStyle(compact)}>
                  <span style={{ color: '#e8e4d4', fontWeight: 500 }}>{b.nama_tamu}</span>
                </td>

                {/* NIK */}
                <td style={cellStyle(compact)}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#9a9678', fontSize: compact ? 10 : 12 }}>
                    {b.nik
                      ? compact
                        ? b.nik  // tampilkan full saat cetak
                        : `${b.nik.slice(0, 6)}••••${b.nik.slice(-4)}`  // masking di layar
                      : <span style={{ color: '#2a2a22' }}>—</span>
                    }
                  </span>
                </td>

                {/* DURASI */}
                <td style={cellStyle(compact)}>
                  <span style={{ color: '#9a9678' }}>{b.durasi}</span>
                </td>

                {/* MASUK */}
                <td style={cellStyle(compact)}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 10 : 12 }}>
                    {format(new Date(b.tanggal_in), 'dd/MM/yy', { locale: localeID })}
                  </span>
                </td>

                {/* KELUAR */}
                <td style={cellStyle(compact)}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: compact ? 10 : 12,
                    color: hampirHabis ? '#c9a84c' : expired ? '#f87171' : undefined,
                  }}>
                    {format(new Date(b.tanggal_out), 'dd/MM/yy', { locale: localeID })}
                  </span>
                </td>

                {/* HARGA */}
                <td style={cellStyle(compact)}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: compact ? 10 : 12,
                    color: b.harga_total ? '#4ade80' : '#6b6b55',
                  }}>
                    {b.harga_total ? formatRupiah(b.harga_total) : '—'}
                  </span>
                </td>

                {/* STATUS BAYAR */}
                <td style={cellStyle(compact)}>
                  <span style={{
                    fontSize: compact ? 9 : 10,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: 4,
                    color: statusStyle.text,
                    background: statusStyle.bg,
                    border: `1px solid ${statusStyle.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {b.status_bayar}
                  </span>
                </td>

                {/* SISA */}
                <td style={cellStyle(compact)}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: compact ? 10 : 11,
                    color: expired
                      ? '#f87171'
                      : hampirHabis
                      ? '#c9a84c'
                      : '#6b6b55',
                  }}>
                    {expired ? 'EXP' : `${sisa}hr`}
                  </span>
                </td>

                {/* ACTIONS (opsional) */}
                {showActions && (
                  <td style={cellStyle(compact)}>
                    <Link
                      href={`/booking/${b.id}`}
                      style={{
                        fontSize: 11,
                        color: '#6b6b55',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-mono)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #2a2a22',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#c9a84c'
                        e.currentTarget.style.borderColor = '#c9a84c40'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#6b6b55'
                        e.currentTarget.style.borderColor = '#2a2a22'
                      }}
                    >
                      Edit
                    </Link>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>

        {/* Footer total */}
        <tfoot>
          <tr>
            <td
              colSpan={showLantai ? 8 : 7}
              style={{
                padding: compact ? '8px 10px' : '12px',
                borderTop: '1px solid #2a2a22',
                color: '#6b6b55',
                fontFamily: 'var(--font-mono)',
                fontSize: compact ? 10 : 11,
                letterSpacing: '0.06em',
              }}
            >
              TOTAL {bookings.length} TAMU
            </td>
            <td style={{
              padding: compact ? '8px 10px' : '12px',
              borderTop: '1px solid #2a2a22',
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? 11 : 13,
              color: '#4ade80',
              fontWeight: 600,
            }}>
              {formatRupiah(bookings.reduce((s, b) => s + (b.harga_total || 0), 0))}
            </td>
            <td
              colSpan={showActions ? 3 : 2}
              style={{ borderTop: '1px solid #2a2a22' }}
            />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function cellStyle(compact: boolean): React.CSSProperties {
  return {
    padding: compact ? '7px 10px' : '12px',
    borderBottom: '1px solid #1e1e18',
    verticalAlign: 'middle',
  }
}