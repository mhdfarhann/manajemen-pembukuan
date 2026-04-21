'use client'
// app/(dashboard)/booking/page.tsx  — FIXED: removed console.log, removed unused import

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Search, Plus } from 'lucide-react'
import BookingModal from '@/components/BookingModal'
import Link from 'next/link'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}
type Kamar = Database['public']['Tables']['kamar']['Row']

export default function BookingPage() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [kamarKosong, setKamarKosong] = useState<Kamar[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterLantai, setFilterLantai] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showModal,   setShowModal]   = useState(false)
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)

  const fetchData = useCallback(async () => {
    // FIX: Hapus console.log debug
    const [{ data: b }, { data: k }] = await Promise.all([
      supabase
        .from('booking')
        .select('*, kamar(nomor_kamar, lantai)')
        .order('tanggal_out'),
      supabase
        .from('kamar')
        .select('*')
        .eq('status', 'kosong')
        .order('nomor_kamar'),
    ])
    if (b) setBookings(b as Booking[])
    if (k) setKamarKosong(k)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchSearch =
      b.nama_tamu.toLowerCase().includes(q) ||
      b.kamar.nomor_kamar.includes(q) ||
      (b.nik && b.nik.includes(q))
    const matchLantai  = filterLantai === '' || b.kamar.lantai === filterLantai
    const matchStatus  = filterStatus === '' || b.status_bayar === filterStatus
    return matchSearch && matchLantai && matchStatus
  })

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Data Booking
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {loading ? '—' : `${bookings.length} total tamu terdaftar`}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (kamarKosong.length === 0) {
              alert('Semua kamar sedang penuh.')
              return
            }
            setSelectedKamar(kamarKosong[0])
            setShowModal(true)
          }}
        >
          <Plus size={14} strokeWidth={2.5} /> Booking Baru
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <input
            placeholder="Cari nama, NIK, atau nomor kamar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <select
          value={filterLantai}
          onChange={e => setFilterLantai(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: 130 }}
        >
          <option value="">Semua Lantai</option>
          <option value="1">Lantai 1</option>
          <option value="2">Lantai 2</option>
          <option value="3">Lantai 3</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Semua Status</option>
          <option value="belum">Belum Bayar</option>
          <option value="dp">DP</option>
          <option value="lunas">Lunas</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
            <div className="loader" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tidak ada data booking.</div>
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th style={{ width: 40 }}>No</th>
                <th>Kamar</th>
                <th>Nama Tamu</th>
                <th>NIK</th>
                <th>Durasi</th>
                <th>Masuk</th>
                <th>Keluar</th>
                <th>Harga</th>
                <th>Bayar</th>
                <th>Sisa</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const sisa    = sisaHari(b.tanggal_out)
                const expired = sisa === 0
                const warning = !expired && sisa <= 7
                return (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: 'var(--accent)', fontSize: 13,
                      }}>
                        {b.kamar.nomor_kamar}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 5 }}>
                        Lt.{b.kamar.lantai}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {b.nama_tamu}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.nik ? `${b.nik.slice(0, 6)}••••${b.nik.slice(-4)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {b.durasi}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {format(new Date(b.tanggal_in), 'dd/MM/yy', { locale: localeID })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <span style={{ color: warning ? 'var(--amber)' : expired ? 'var(--red)' : 'var(--text-secondary)' }}>
                        {format(new Date(b.tanggal_out), 'dd/MM/yy', { locale: localeID })}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--green)' }}>
                      {b.harga_total ? formatRupiah(b.harga_total) : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${b.status_bayar}`}>
                        {b.status_bayar}
                      </span>
                    </td>
                    <td>
                      {expired ? (
                        <span className="badge badge-terisi">Expired</span>
                      ) : (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11,
                          color: warning ? 'var(--amber)' : 'var(--text-muted)',
                          fontWeight: warning ? 600 : 400,
                        }}>
                          {sisa}hr
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/booking/${b.id}`}
                        style={{
                          fontSize: 12, color: 'var(--text-muted)',
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────── */}
      {showModal && selectedKamar && (
        <BookingModal
          kamar={selectedKamar}
          onClose={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}