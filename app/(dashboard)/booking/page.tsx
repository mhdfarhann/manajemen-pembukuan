'use client'
// app/(dashboard)/booking/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Search, Plus, SortAsc } from 'lucide-react'
import BookingModal from '@/components/BookingModal'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}
type Kamar = Database['public']['Tables']['kamar']['Row']

export default function BookingPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [kamarKosong, setKamarKosong] = useState<Kamar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLantai, setFilterLantai] = useState<number | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)

  const fetchData = useCallback(async () => {
  const [{ data: b, error: eb }, { data: k, error: ek }] = await Promise.all([
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

  console.log('kamar kosong:', k, 'error:', ek)  // ← tambah ini
  console.log('booking:', b, 'error:', eb)

  if (b) setBookings(b as Booking[])
  if (k) setKamarKosong(k)
  setLoading(false)
}, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = bookings.filter(b => {
    const matchSearch =
      b.nama_tamu.toLowerCase().includes(search.toLowerCase()) ||
      b.kamar.nomor_kamar.includes(search) ||
      (b.nik && b.nik.includes(search))
    const matchLantai = filterLantai === '' || b.kamar.lantai === filterLantai
    return matchSearch && matchLantai
  })

  const statusColor = {
    belum: '#f87171',
    dp: '#c9a84c',
    lunas: '#4ade80',
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24,fontWeight: 600, color: 'var(--text-primary)' }}>
            Data Booking
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
            {bookings.length} total tamu terdaftar
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (kamarKosong.length === 0) return alert('Semua kamar penuh.')
            setSelectedKamar(kamarKosong[0])
            setShowModal(true)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={14} /> Booking Baru
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b6b55' }} />
          <input
            placeholder="Cari nama, NIK, atau nomor kamar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          value={filterLantai}
          onChange={e => setFilterLantai(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: 140 }}
        >
          <option value="">Semua Lantai</option>
          <option value="1">Lantai 1</option>
          <option value="2">Lantai 2</option>
          <option value="3">Lantai 3</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="loader" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b6b55' }}>
            Tidak ada data.
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th>NO</th>
                <th>KAMAR</th>
                <th>NAMA TAMU</th>
                <th>NIK</th>
                <th>DURASI</th>
                <th>MASUK</th>
                <th>KELUAR</th>
                <th>HARGA</th>
                <th>BAYAR</th>
                <th>SISA</th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((b, i) => {
                const sisa = sisaHari(b.tanggal_out)
                const expired = sisa === 0
                return (
                <tr key={b.id} style={{
                    opacity: expired ? 0.5 : 1,
                    background: expired ? 'var(--red-light)' : 'var(--bg)',
                }}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: 'var(--accent)',
                        fontWeight: 500,
                    }}>
                        {b.kamar.nomor_kamar}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                        Lt.{b.kamar.lantai}
                    </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.nama_tamu}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {b.nik ? `${b.nik.slice(0, 6)}****${b.nik.slice(-4)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{b.durasi}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {format(new Date(b.tanggal_in), 'dd/MM/yy', { locale: localeID })}
                    </td>
                    <td style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: sisa <= 7 ? 'var(--amber)' : 'var(--text-secondary)',
                    fontWeight: sisa <= 7 ? 500 : 400,
                    }}>
                    {format(new Date(b.tanggal_out), 'dd/MM/yy', { locale: localeID })}
                    </td>
                    <td style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>
                    {b.harga_total ? formatRupiah(b.harga_total) : '—'}
                    </td>
                    <td>
                    <span style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: b.status_bayar === 'lunas' ? '#16a34a' : b.status_bayar === 'dp' ? '#92400e' : '#dc2626',
                        background: b.status_bayar === 'lunas' ? 'var(--green-light)' : b.status_bayar === 'dp' ? 'var(--amber-light)' : 'var(--red-light)',
                        border: `1px solid ${b.status_bayar === 'lunas' ? '#bbf7d0' : b.status_bayar === 'dp' ? '#fde68a' : '#fecaca'}`,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}>
                        {b.status_bayar}
                    </span>
                    </td>
                    <td style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: expired ? 'var(--red)' : sisa <= 7 ? 'var(--amber)' : 'var(--text-muted)',
                    fontWeight: expired || sisa <= 7 ? 500 : 400,
                    }}>
                    {expired ? 'EXPIRED' : `${sisa}hr`}
                    </td>
                </tr>
                )
            })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedKamar && (
        <BookingModal
          kamar={selectedKamar}
          onClose={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}