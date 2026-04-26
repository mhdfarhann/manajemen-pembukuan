'use client'
// components/OkupansiChart.tsx

import { useEffect, useRef, useState } from 'react'
import { getDaysInMonth } from 'date-fns'
import { formatRupiah } from '@/lib/harga'
import type { TooltipItem } from 'chart.js'
import type { Database } from '@/lib/supabase'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

// Di OkupansiChart.tsx, ubah tipe Props
interface Props {
  bookings: {
    tanggal_in:   string
    tanggal_out:  string
    status_bayar: string
    harga_total:  number | null
    jumlah_dp:    number | null
  }[]
  bulan: string
}

type Tab = 'harian' | 'status' | 'pendapatan'

export default function OkupansiChart({ bookings, bulan }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('harian')
  const barRef  = useRef<HTMLCanvasElement>(null)
  const pieRef  = useRef<HTMLCanvasElement>(null)
  const lineRef = useRef<HTMLCanvasElement>(null)

  // ── Data calculations ────────────────────────────────
  const tahun      = parseInt(bulan.split('-')[0])
  const bulanNum   = parseInt(bulan.split('-')[1])
  const jumlahHari = getDaysInMonth(new Date(tahun, bulanNum - 1))

  // Harian: berapa kamar terisi per hari
  const harian = Array.from({ length: jumlahHari }, (_, i) => {
    const hari = i + 1
    const tgl  = `${bulan}-${String(hari).padStart(2, '0')}`
    return bookings.filter(b => b.tanggal_in <= tgl && b.tanggal_out > tgl).length
  })

  // Status pembayaran
  const jmlBelum = bookings.filter(b => b.status_bayar === 'belum').length
  const jmlDP    = bookings.filter(b => b.status_bayar === 'dp').length
  const jmlLunas = bookings.filter(b => b.status_bayar === 'lunas').length

  // Pendapatan: kas masuk per minggu (lunas full + dp partial)
  const mingguanKas = [0, 0, 0, 0, 0]
  bookings.forEach(b => {
    const tglIn  = new Date(b.tanggal_in)
    const hariIn = tglIn.getDate()
    const minggu = Math.min(Math.floor((hariIn - 1) / 7), 4)
    const masuk  = b.status_bayar === 'lunas'
      ? (b.harga_total || 0)
      : b.status_bayar === 'dp'
        ? (b.jumlah_dp || 0)
        : 0
    mingguanKas[minggu] += masuk
  })

  // ── Chart rendering ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    let chartInstance: { destroy: () => void } | null = null

    async function render() {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      // Hancurkan chart lama sebelum buat baru
      Chart.getChart(barRef.current!)?.destroy()
      Chart.getChart(pieRef.current!)?.destroy()
      Chart.getChart(lineRef.current!)?.destroy()

      if (activeTab === 'harian' && barRef.current) {
        chartInstance = new Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: Array.from({ length: jumlahHari }, (_, i) => i + 1),
            datasets: [{
              label: 'Kamar terisi',
              data: harian,
              backgroundColor: harian.map(v =>
                v === 0 ? '#e5e7eb' : v >= 8 ? '#dc2626' : v >= 5 ? '#d97706' : '#16a34a'
              ),
              borderRadius: 3,
              borderSkipped: false,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items: TooltipItem<'bar'>[]) => `Tanggal ${items[0].label}`,
                  label: (item: TooltipItem<'bar'>)    => ` ${item.raw} kamar terisi`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  font: { size: 10, family: 'monospace' },
                  color: '#9ca3af',
                  autoSkip: true,
                  maxTicksLimit: 16,
                },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  font: { size: 11, family: 'monospace' },
                  color: '#9ca3af',
                },
                grid: { color: '#f3f4f6' },
              },
            },
          },
        })
      }

      if (activeTab === 'status' && pieRef.current) {
        chartInstance = new Chart(pieRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Lunas', 'DP', 'Belum Bayar'],
            datasets: [{
              data: [jmlLunas, jmlDP, jmlBelum],
              backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
              borderColor:     ['#ffffff', '#ffffff', '#ffffff'],
              borderWidth: 3,
              hoverOffset: 6,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (item: TooltipItem<'doughnut'>) => ` ${item.label}: ${item.raw} tamu`,
                },
              },
            },
          },
        })
      }

      if (activeTab === 'pendapatan' && lineRef.current) {
        chartInstance = new Chart(lineRef.current, {
          type: 'bar',
          data: {
            labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Sisa'],
            datasets: [{
              label: 'Kas Masuk',
              data: mingguanKas,
              backgroundColor: '#16a34a22',
              borderColor: '#16a34a',
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (item: TooltipItem<'bar'>) => ` ${formatRupiah(item.raw as number)}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 11, family: 'monospace' }, color: '#9ca3af' },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 10, family: 'monospace' },
                  color: '#9ca3af',
                  callback: (v: number | string) => {
                    const n = Number(v)
                    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
                    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`
                    return String(n)
                  },
                },
                grid: { color: '#f3f4f6' },
              },
            },
          },
        })
      }
    }

    render()
    return () => {
      chartInstance?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bulan, bookings.length])

  // ── Summary values untuk di luar chart ──────────────
  const maxTerisi     = Math.max(...harian, 0)
  const avgTerisi     = harian.length > 0
    ? (harian.reduce((a, b) => a + b, 0) / harian.length).toFixed(1)
    : '0'
  const totalKasMasuk = bookings.reduce((s, b) =>
    s + (b.status_bayar === 'lunas'
      ? (b.harga_total || 0)
      : b.status_bayar === 'dp' ? (b.jumlah_dp || 0) : 0), 0)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'harian',     label: 'Okupansi Harian' },
    { id: 'status',     label: 'Status Bayar' },
    { id: 'pendapatan', label: 'Kas Masuk' },
  ]

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      {/* Tab header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
                background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                color:      activeTab === t.id ? '#fff' : 'var(--text-muted)',
                fontWeight: activeTab === t.id ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mini legend harian */}
        {activeTab === 'harian' && (
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {[
              { color: '#16a34a', label: '< 5' },
              { color: '#d97706', label: '5–7' },
              { color: '#dc2626', label: '≥ 8' },
              { color: '#e5e7eb', label: 'Kosong' },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Mini legend status */}
        {activeTab === 'status' && (
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {[
              { color: '#16a34a', label: `Lunas (${jmlLunas})` },
              { color: '#d97706', label: `DP (${jmlDP})` },
              { color: '#dc2626', label: `Belum (${jmlBelum})` },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'status' ? '1fr 200px' : '1fr', gap: 0 }}>

        {/* Chart area */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ position: 'relative', height: 200, display: activeTab === 'harian' ? 'block' : 'none' }}>
            <canvas ref={barRef} role="img" aria-label="Bar chart jumlah kamar terisi per hari" />
          </div>
          <div style={{ position: 'relative', height: 200, display: activeTab === 'status' ? 'block' : 'none' }}>
            <canvas ref={pieRef} role="img" aria-label="Doughnut chart status pembayaran tamu" />
          </div>
          <div style={{ position: 'relative', height: 200, display: activeTab === 'pendapatan' ? 'block' : 'none' }}>
            <canvas ref={lineRef} role="img" aria-label="Bar chart kas masuk per minggu" />
          </div>
        </div>

        {/* Stat sidebar — status tab only */}
        {activeTab === 'status' && (
          <div style={{
            borderLeft: '1px solid var(--border)',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 10,
            justifyContent: 'center',
          }}>
            {[
              { label: 'Lunas', count: jmlLunas, color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)' },
              { label: 'DP',    count: jmlDP,    color: 'var(--amber)', bg: 'var(--amber-light)', border: 'var(--amber-border)' },
              { label: 'Belum', count: jmlBelum, color: 'var(--red)',   bg: 'var(--red-light)',   border: 'var(--red-border)' },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} style={{
                padding: '10px 12px', borderRadius: 8,
                background: bg, border: `1px solid ${border}`,
              }}>
                <div style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {label.toUpperCase()}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                  {count}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>tamu</span>
                </div>
                <div style={{ fontSize: 10, color, marginTop: 2, opacity: 0.7 }}>
                  {bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0}% dari total
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom stat bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 20px',
        background: 'var(--bg-secondary)',
        display: 'flex', gap: 24,
      }}>
        {activeTab === 'harian' && (
          <>
            <StatPill label="Maks terisi" val={`${maxTerisi} kamar`} />
            <StatPill label="Rata-rata"   val={`${avgTerisi} kamar/hari`} />
            <StatPill label="Hari aktif"  val={`${harian.filter(h => h > 0).length} hari`} />
          </>
        )}
        {activeTab === 'status' && (
          <>
            <StatPill label="Total booking" val={`${bookings.length} tamu`} />
            <StatPill label="Tingkat lunas" val={`${bookings.length > 0 ? Math.round((jmlLunas / bookings.length) * 100) : 0}%`} />
          </>
        )}
        {activeTab === 'pendapatan' && (
          <>
            <StatPill label="Total kas masuk" val={formatRupiah(totalKasMasuk)} />
            <StatPill label="Minggu terbaik"  val={formatRupiah(Math.max(...mingguanKas))} />
          </>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {val}
      </div>
    </div>
  )
}