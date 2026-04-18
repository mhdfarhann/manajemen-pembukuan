'use client'
// app/(dashboard)/laporan/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah } from '@/lib/harga'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Download, FileSpreadsheet } from 'lucide-react'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

export default function LaporanPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [bulan, setBulan] = useState(format(new Date(), 'yyyy-MM'))

  const startDate = format(startOfMonth(new Date(bulan + '-01')), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date(bulan + '-01')), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('booking')
      .select('*, kamar(nomor_kamar, lantai)')
      .gte('tanggal_in', startDate)
      .lte('tanggal_in', endDate)
      .order('kamar(nomor_kamar)')

    if (data) setBookings(data as Booking[])
    setLoading(false)
  }, [supabase, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    setExporting(true)
    const XLSX = await import('xlsx')

    // Format data sesuai template xlsx klien
    const rows = bookings.map((b, i) => ({
      'NO': i + 1,
      'KAMAR': b.kamar.nomor_kamar,
      'NAMA': b.nama_tamu,
      'NIK': b.nik || '',
      'DURASI': b.durasi,
      'IN': format(new Date(b.tanggal_in), 'dd/MM/yyyy'),
      'OUT': format(new Date(b.tanggal_out), 'dd/MM/yyyy'),
      'HARGA': b.harga_total || 0,
      'STATUS BAYAR': b.status_bayar.toUpperCase(),
      'CATATAN': b.catatan || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // Style kolom
    ws['!cols'] = [
      { wch: 4 },   // NO
      { wch: 8 },   // KAMAR
      { wch: 22 },  // NAMA
      { wch: 18 },  // NIK
      { wch: 10 },  // DURASI
      { wch: 12 },  // IN
      { wch: 12 },  // OUT
      { wch: 14 },  // HARGA
      { wch: 14 },  // STATUS
      { wch: 20 },  // CATATAN
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulan}`)

    XLSX.writeFile(wb, `laporan-hotel-${bulan}.xlsx`)
    setExporting(false)
  }

  const totalPendapatan = bookings.reduce((sum, b) => sum + (b.harga_total || 0), 0)
  const sudahLunas = bookings.filter(b => b.status_bayar === 'lunas').reduce((s, b) => s + (b.harga_total || 0), 0)
  const belumLunas = totalPendapatan - sudahLunas

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
          Laporan Bulanan
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Data booking berdasarkan bulan masuk tamu
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            style={{ width: 160 }}
          />
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={exporting || bookings.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            {exporting ? <span className="loader" /> : <><Download size={14} /> Export Excel</>}
          </button>
        </div>
      </div>

      {/* Summary cards */}
    {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Tamu', val: loading ? '—' : String(bookings.length), color: 'var(--text-primary)', bg: 'var(--bg)' },
          { label: 'Total Pendapatan', val: loading ? '—' : formatRupiah(totalPendapatan), color: 'var(--text-primary)', bg: 'var(--bg)' },
          { label: 'Sudah Lunas', val: loading ? '—' : formatRupiah(sudahLunas), color: 'var(--green)', bg: 'var(--green-light)' },
          { label: 'Belum Lunas', val: loading ? '—' : formatRupiah(belumLunas), color: 'var(--red)', bg: 'var(--red-light)' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{
            background: bg,
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
              {label}
            </div>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-secondary)',
        }}>
          <FileSpreadsheet size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            LAPORAN {format(new Date(bulan + '-01'), 'MMMM yyyy', { locale: localeID }).toUpperCase()}
            {!loading && ` — ${bookings.length} DATA`}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="loader" />
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b6b55' }}>
            Tidak ada data bulan ini.
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th>NO</th>
                <th>KAMAR</th>
                <th>NAMA</th>
                <th>NIK</th>
                <th>DURASI</th>
                <th>IN</th>
                <th>OUT</th>
                <th>HARGA</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ color: '#6b6b55', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#c9a84c', fontSize: 13 }}>
                      {b.kamar.nomor_kamar}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{b.nama_tamu}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9a9678' }}>
                    {b.nik || '—'}
                  </td>
                  <td style={{ color: '#9a9678' }}>{b.durasi}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {format(new Date(b.tanggal_in), 'dd/MM/yy')}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {format(new Date(b.tanggal_out), 'dd/MM/yy')}
                  </td>
                  <td style={{ color: '#4ade80', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {b.harga_total ? formatRupiah(b.harga_total) : '—'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '2px 8px', borderRadius: 4,
                      color: b.status_bayar === 'lunas' ? '#4ade80' : b.status_bayar === 'dp' ? '#c9a84c' : '#f87171',
                      background: b.status_bayar === 'lunas' ? '#4ade8015' : b.status_bayar === 'dp' ? '#c9a84c15' : '#f8717115',
                    }}>
                      {b.status_bayar}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}