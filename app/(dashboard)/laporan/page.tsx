'use client'
// app/(dashboard)/laporan/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, labelDurasi } from '@/lib/harga'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Download, FileSpreadsheet, TrendingUp, Users, Wallet, AlertCircle } from 'lucide-react'
import OkupansiChart from '@/components/OkupansiChart'


export default function LaporanPage() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [bookings, setBookings] = useState<BookingLaporan[]>([])
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [bulan,     setBulan]     = useState(format(new Date(), 'yyyy-MM'))

  const startDate = format(startOfMonth(new Date(bulan + '-01')), 'yyyy-MM-dd')
  const endDate   = format(endOfMonth(new Date(bulan + '-01')),   'yyyy-MM-dd')

  // Tambah tipe untuk history
type BookingHistory = {
  id:           string
  booking_id:   string | null
  kamar_id:     string | null
  nomor_kamar:  string
  lantai:       number | null
  nama_tamu:    string
  nik:          string | null
  nomor_hp:     string | null
  durasi:       number | null
  tanggal_in:   string
  tanggal_out:  string
  harga_total:  number | null
  status_bayar: string | null
  jumlah_dp:    number | null
  catatan:      string | null
  checkout_at:  string | null
  created_at:   string | null
}

// Tipe unified untuk laporan (gabungan aktif + history)
type BookingLaporan = {
  id:           string
  kamar_id:     string | null
  nomor_kamar:  string
  lantai:       number | null
  nama_tamu:    string
  nik:          string | null
  nomor_hp:     string | null
  durasi:       number | null
  tanggal_in:   string
  tanggal_out:  string
  harga_total:  number | null
  status_bayar: string
  jumlah_dp:    number | null
  catatan:      string | null
  sumber:       'aktif' | 'history'   // untuk debugging / badge
}

  const fetchData = useCallback(async () => {
  setLoading(true)

  // Fetch paralel: booking aktif + history, filter bulan yang sama
  const [{ data: aktif }, { data: history }] = await Promise.all([
    supabase
      .from('booking')
      .select('*, kamar(nomor_kamar, lantai)')
      .gte('tanggal_in', startDate)
      .lte('tanggal_in', endDate)
      .order('tanggal_in'),

    supabase
      .from('booking_history')
      .select('*')
      .gte('tanggal_in', startDate)
      .lte('tanggal_in', endDate)
      .order('tanggal_in'),
  ])

  // Normalize ke tipe unified
  const fromAktif: BookingLaporan[] = (aktif ?? []).map(b => ({
    id:           b.id,
    kamar_id:     b.kamar_id,
    nomor_kamar:  b.kamar.nomor_kamar,
    lantai:       b.kamar.lantai,
    nama_tamu:    b.nama_tamu,
    nik:          b.nik,
    nomor_hp:     b.nomor_hp,
    durasi:       b.durasi,
    tanggal_in:   b.tanggal_in,
    tanggal_out:  b.tanggal_out,
    harga_total:  b.harga_total ? Number(b.harga_total) : null,
    status_bayar: b.status_bayar,
    jumlah_dp:    b.jumlah_dp ? Number(b.jumlah_dp) : null,
    catatan:      b.catatan,
    sumber:       'aktif',
  }))

  const fromHistory: BookingLaporan[] = (history ?? []).map((h: BookingHistory) => ({
    id:           h.id,
    kamar_id:     h.kamar_id,
    nomor_kamar:  h.nomor_kamar,
    lantai:       h.lantai,
    nama_tamu:    h.nama_tamu,
    nik:          h.nik,
    nomor_hp:     h.nomor_hp,
    durasi:       h.durasi,
    tanggal_in:   h.tanggal_in,
    tanggal_out:  h.tanggal_out,
    harga_total:  h.harga_total ? Number(h.harga_total) : null,
    status_bayar: h.status_bayar ?? 'lunas',
    jumlah_dp:    h.jumlah_dp ? Number(h.jumlah_dp) : null,
    catatan:      h.catatan,
    sumber:       'history',
  }))

  // Gabung, hilangkan duplikat (booking aktif yg belum checkout tidak ada di history)
  const gabungan = [...fromAktif, ...fromHistory]
    .sort((a, b) => a.nomor_kamar.localeCompare(b.nomor_kamar))

  setBookings(gabungan)
  setLoading(false)
}, [supabase, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    setExporting(true)
    const XLSX = await import('xlsx')

    const rows = bookings.map((b, i) => ({
      'NO':           i + 1,
      'KAMAR':        b.nomor_kamar,
      'NAMA':         b.nama_tamu,
      'NIK':          b.nik || '',
      'NO HP':        b.nomor_hp || '',
      'DURASI':       typeof b.durasi === 'number' ? labelDurasi(b.durasi) : b.durasi,
      'IN':           format(new Date(b.tanggal_in), 'dd/MM/yyyy'),
      'OUT':          format(new Date(b.tanggal_out), 'dd/MM/yyyy'),
      'HARGA TOTAL':  b.harga_total || 0,
      'STATUS BAYAR': b.status_bayar.toUpperCase(),
      'DP DIBAYAR':   b.jumlah_dp || 0,
      'SISA':         b.status_bayar === 'dp' && b.harga_total && b.jumlah_dp
                        ? b.harga_total - b.jumlah_dp
                        : b.status_bayar === 'belum' ? (b.harga_total || 0) : 0,
      'CATATAN':      b.catatan || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 }, { wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulan}`)
    XLSX.writeFile(wb, `laporan-kost-${bulan}.xlsx`)
    setExporting(false)
  }

  // ── Computed stats ─────────────────────────────────────────────────
  const totalPendapatan = bookings.reduce((s, b) => s + (b.harga_total || 0), 0)
  const sudahLunas      = bookings.filter(b => b.status_bayar === 'lunas').reduce((s, b) => s + (b.harga_total || 0), 0)
  const totalDP         = bookings.filter(b => b.status_bayar === 'dp').reduce((s, b) => s + (b.jumlah_dp || 0), 0)
  const sisaTagihan     = bookings.reduce((s, b) => {
    if (b.status_bayar === 'belum') return s + (b.harga_total || 0)
    if (b.status_bayar === 'dp')    return s + Math.max(0, (b.harga_total || 0) - (b.jumlah_dp || 0))
    return s
  }, 0)
  const kasmasuk        = sudahLunas + totalDP   // uang yang sudah diterima

  const stats = [
    {
      label: 'Total Tamu',
      val:   loading ? '—' : String(bookings.length),
      sub:   'booking bulan ini',
      icon:  <Users size={16} />,
      color: 'var(--accent)',
      bg:    'var(--accent-light)',
      border:'var(--accent-mid)',
    },
    {
      label: 'Total Tagihan',
      val:   loading ? '—' : formatRupiah(totalPendapatan),
      sub:   'nilai seluruh booking',
      icon:  <TrendingUp size={16} />,
      color: 'var(--text-primary)',
      bg:    'var(--bg-secondary)',
      border:'var(--border)',
    },
    {
      label: 'Kas Masuk',
      val:   loading ? '—' : formatRupiah(kasmasuk),
      sub:   `lunas + DP (${bookings.filter(b => b.status_bayar === 'dp').length} tamu DP)`,
      icon:  <Wallet size={16} />,
      color: 'var(--green)',
      bg:    'var(--green-light)',
      border:'var(--green-border)',
    },
    {
      label: 'Sisa Tagihan',
      val:   loading ? '—' : formatRupiah(sisaTagihan),
      sub:   `${bookings.filter(b => b.status_bayar !== 'lunas').length} tamu belum lunas`,
      icon:  <AlertCircle size={16} />,
      color: sisaTagihan > 0 ? 'var(--red)' : 'var(--text-muted)',
      bg:    sisaTagihan > 0 ? 'var(--red-light)' : 'var(--bg-secondary)',
      border:sisaTagihan > 0 ? 'var(--red-border)' : 'var(--border)',
    },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
            Laporan Bulanan
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Data booking berdasarkan tanggal masuk tamu
          </p>
        </div>
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
            {exporting
              ? <span className="loader" />
              : <><Download size={14} /> Export Excel</>}
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(({ label, val, sub, icon, color, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </div>
              <div style={{ color, opacity: 0.7 }}>{icon}</div>
            </div>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 600, color, marginBottom: 4 }}>
              {val}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <OkupansiChart bookings={bookings} bulan={bulan} />

      {/* ── Table ───────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-secondary)',
        }}>
          <FileSpreadsheet size={13} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            LAPORAN {format(new Date(bulan + '-01'), 'MMMM yyyy', { locale: localeID }).toUpperCase()}
            {!loading && ` — ${bookings.length} DATA`}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="loader" />
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
            Tidak ada data bulan ini.
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th>NO</th>
                <th>KAMAR</th>
                <th>NAMA</th>
                <th>DURASI</th>
                <th>IN</th>
                <th>OUT</th>
                <th>HARGA TOTAL</th>
                <th>STATUS</th>
                <th>DP / SISA</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => {
                const sisa = b.status_bayar === 'dp' && b.harga_total && b.jumlah_dp
                  ? b.harga_total - b.jumlah_dp
                  : b.status_bayar === 'belum' ? (b.harga_total || 0) : 0

                return (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>
                        {b.nomor_kamar}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.nama_tamu}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {typeof b.durasi === 'number' ? labelDurasi(b.durasi) : (b.durasi ?? '—')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {format(new Date(b.tanggal_in), 'dd/MM/yy')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {format(new Date(b.tanggal_out), 'dd/MM/yy')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                      {b.harga_total ? formatRupiah(b.harga_total) : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '2px 8px', borderRadius: 4,
                        color:      b.status_bayar === 'lunas' ? 'var(--green)' : b.status_bayar === 'dp' ? 'var(--amber)' : 'var(--red)',
                        background: b.status_bayar === 'lunas' ? 'var(--green-light)' : b.status_bayar === 'dp' ? 'var(--amber-light)' : 'var(--red-light)',
                      }}>
                        {b.status_bayar}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {b.status_bayar === 'lunas' ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : b.status_bayar === 'dp' ? (
                        <div>
                          <div style={{ color: 'var(--amber)', fontWeight: 600 }}>
                            +{b.jumlah_dp ? formatRupiah(b.jumlah_dp) : '—'}
                          </div>
                          <div style={{ color: 'var(--red)', fontSize: 10, marginTop: 1 }}>
                            -{formatRupiah(sisa)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--red)' }}>-{formatRupiah(sisa)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Footer total */}
            <tfoot>
              <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={6} style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  TOTAL
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)', fontSize: 13 }}>
                  {formatRupiah(totalPendapatan)}
                </td>
                <td />
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <div style={{ color: 'var(--amber)', fontWeight: 600 }}>+{formatRupiah(totalDP)}</div>
                    <div style={{ color: 'var(--red)', fontSize: 10, marginTop: 1 }}>-{formatRupiah(sisaTagihan)}</div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}