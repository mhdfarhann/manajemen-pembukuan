'use client'
// components/OkupansiChart.tsx
// Grafik bar chart pendapatan & tamu per minggu dalam satu bulan
// Gunakan di halaman /laporan — tidak butuh library eksternal, pure CSS/SVG

import { useMemo } from 'react'
import { type Database } from '@/lib/supabase'
import { formatRupiah } from '@/lib/harga'
import { format, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

interface Props {
  bookings: Booking[]
  bulan: string   // format 'yyyy-MM'
}

export default function OkupansiChart({ bookings, bulan }: Props) {
  const weeks = useMemo(() => {
    const start = new Date(bulan + '-01')
    // Bagi bulan jadi 4-5 minggu
    const result = []
    let cursor = start
    const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)

    let weekNum = 1
    while (cursor <= endOfMonth) {
      const weekEnd = addDays(cursor, 6) > endOfMonth ? endOfMonth : addDays(cursor, 6)
      const weekBookings = bookings.filter(b => {
        const tanggalIn = parseISO(b.tanggal_in)
        return isWithinInterval(tanggalIn, { start: cursor, end: weekEnd })
      })
      result.push({
        label:    `Mgg ${weekNum}`,
        sublabel: `${format(cursor, 'd')}–${format(weekEnd, 'd MMM', { locale: localeID })}`,
        tamu:     weekBookings.length,
        pendapatan: weekBookings.reduce((s, b) => s + (b.harga_total ? Number(b.harga_total) : 0), 0),
      })
      cursor = addDays(weekEnd, 1)
      weekNum++
    }
    return result
  }, [bookings, bulan])

  const maxTamu  = Math.max(...weeks.map(w => w.tamu), 1)
  const maxPend  = Math.max(...weeks.map(w => w.pendapatan), 1)

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 20,
      }}>
        Tamu Masuk per Minggu
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 140 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
            {/* Batang pendapatan (background) */}
            <div style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {/* Bar pendapatan — abu-abu tipis */}
              <div style={{
                position: 'absolute', bottom: 0, left: '15%',
                width: '70%', borderRadius: '4px 4px 0 0',
                height: `${(w.pendapatan / maxPend) * 100}%`,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                transition: 'height 0.4s ease',
              }} />
              {/* Bar tamu — warna accent di atas */}
              <div style={{
                position: 'absolute', bottom: 0, left: '25%',
                width: '50%', borderRadius: '3px 3px 0 0',
                height: `${(w.tamu / maxTamu) * 100}%`,
                background: 'var(--accent)',
                opacity: 0.8,
                transition: 'height 0.4s ease',
                minHeight: w.tamu > 0 ? 4 : 0,
              }} />
              {/* Label angka tamu */}
              {w.tamu > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: `${(w.tamu / maxTamu) * 100}%`,
                  left: 0, right: 0, textAlign: 'center',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  transform: 'translateY(-4px)',
                }}>
                  {w.tamu}
                </div>
              )}
            </div>

            {/* Label minggu */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {w.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                {w.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.8 }} />
          Jumlah tamu masuk
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
          Skala pendapatan
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Total: <span style={{ color: 'var(--green)' }}>
            {formatRupiah(bookings.reduce((s, b) => s + (b.harga_total ? Number(b.harga_total) : 0), 0))}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Cara penggunaan di laporan/page.tsx ──────────────────────────────────
//
// import OkupansiChart from '@/components/OkupansiChart'
//
// Taruh sebelum Summary Cards:
// <OkupansiChart bookings={bookings} bulan={bulan} />