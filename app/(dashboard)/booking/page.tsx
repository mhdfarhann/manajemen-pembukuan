'use client'
// app/(dashboard)/booking/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah, sisaHari, labelDurasi } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { Search, Plus, BedDouble, Clock, Archive } from 'lucide-react'
import BookingModal from '@/components/BookingModal'
import EditBookingModal from '@/components/EditBookingModal'

type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}
type Kamar = Database['public']['Tables']['kamar']['Row']

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

type Tab = 'aktif' | 'history'

export default function BookingPage() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [activeTab,           setActiveTab]           = useState<Tab>('aktif')
  const [bookings,            setBookings]            = useState<Booking[]>([])
  const [histories,           setHistories]           = useState<BookingHistory[]>([])
  const [kamarKosong,         setKamarKosong]         = useState<Kamar[]>([])
  const [kamarList,           setKamarList]           = useState<Kamar[]>([])
  const [loading,             setLoading]             = useState(true)
  const [search,              setSearch]              = useState('')
  const [filterLantai,        setFilterLantai]        = useState<number | ''>('')
  const [filterStatus,        setFilterStatus]        = useState<string>('')
  const [showModal,           setShowModal]           = useState(false)
  const [selectedKamar,       setSelectedKamar]       = useState<Kamar | null>(null)
  const [showKamarPicker,     setShowKamarPicker]     = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: k }, { data: h }, { data: semua }] = await Promise.all([
      supabase
        .from('booking')
        .select('*, kamar(nomor_kamar, lantai)')
        .order('tanggal_out'),
      supabase
        .from('kamar')
        .select('*')
        .eq('status', 'kosong')
        .order('lantai')
        .order('nomor_kamar'),
      supabase
        .from('booking_history')
        .select('*')
        .order('checkout_at', { ascending: false }),
      supabase
        .from('kamar')
        .select('*'),
    ])
    if (b)     setBookings(b as Booking[])
    if (k)     setKamarKosong(k)
    if (h)     setHistories(h as BookingHistory[])
    if (semua) setKamarList(semua)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  function handleBookingBaru() {
    if (kamarKosong.length === 0) {
      alert('Semua kamar sedang penuh.')
      return
    }
    if (kamarKosong.length === 1) {
      setSelectedKamar(kamarKosong[0])
      setShowModal(true)
      return
    }
    setShowKamarPicker(true)
  }

  // ── Filter booking aktif ─────────────────────────────
  const filteredAktif = bookings.filter(b => {
    const q           = search.toLowerCase()
    const matchSearch =
      b.nama_tamu.toLowerCase().includes(q) ||
      b.kamar.nomor_kamar.includes(q) ||
      (b.nik && b.nik.includes(q))
    const matchLantai = filterLantai === '' || b.kamar.lantai === filterLantai
    const matchStatus = filterStatus === '' || b.status_bayar === filterStatus
    return matchSearch && matchLantai && matchStatus
  })

  // ── Filter booking history ───────────────────────────
  const filteredHistory = histories.filter(h => {
    const q           = search.toLowerCase()
    const matchSearch =
      h.nama_tamu.toLowerCase().includes(q) ||
      h.nomor_kamar.includes(q) ||
      (h.nik && h.nik.includes(q))
    const matchLantai = filterLantai === '' || h.lantai === filterLantai
    const matchStatus = filterStatus === '' || h.status_bayar === filterStatus
    return matchSearch && matchLantai && matchStatus
  })

  const lantaiList = [...new Set(kamarKosong.map(k => k.lantai))].sort()

  const tabs = [
    { id: 'aktif'   as Tab, label: 'Aktif',   icon: <Clock size={13} />,   count: bookings.length },
    { id: 'history' as Tab, label: 'History',  icon: <Archive size={13} />, count: histories.length },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
            Data Booking
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {loading ? '—' : `${bookings.length} tamu aktif · ${histories.length} riwayat checkout · ${kamarKosong.length} kamar kosong`}
          </p>
        </div>
        <button className="btn-primary" onClick={handleBookingBaru} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={14} strokeWidth={2.5} /> Booking Baru
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--bg-secondary)', borderRadius: 10,
        padding: 4, border: '1px solid var(--border)',
        width: 'fit-content', marginBottom: 16,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id)
              setSearch('')
              setFilterLantai('')
              setFilterStatus('')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7, border: 'none',
              cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
              background: activeTab === t.id ? 'var(--bg)' : 'transparent',
              color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === t.id ? 600 : 400,
              boxShadow: activeTab === t.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.icon}
            {t.label}
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              padding: '1px 6px', borderRadius: 10,
              background: activeTab === t.id ? 'var(--accent-light)' : 'var(--border)',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: 600,
            }}>
              {t.count}
            </span>
          </button>
        ))}
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

      {/* ── Table Aktif ─────────────────────────────────── */}
      {activeTab === 'aktif' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
              <div className="loader" />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</span>
            </div>
          ) : filteredAktif.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tidak ada data booking aktif.</div>
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
                  <th>Status Bayar</th>
                  <th>Sisa</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredAktif.map((b, i) => {
                  const sisa    = sisaHari(b.tanggal_out)
                  const expired = sisa === 0
                  const warning = !expired && sisa <= 7
                  return (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                          {b.kamar.nomor_kamar}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 5 }}>
                          Lt.{b.kamar.lantai}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.nama_tamu}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {b.nik ? `${b.nik.slice(0, 6)}••••${b.nik.slice(-4)}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {typeof b.durasi === 'number' ? labelDurasi(b.durasi) : (b.durasi ?? '—')}
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
                      <td>
                        {expired ? (
                          <span style={{
                            fontSize: 10, fontFamily: 'var(--font-mono)',
                            padding: '2px 8px', borderRadius: 4,
                            color: 'var(--red)', background: 'var(--red-light)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            Expired
                          </span>
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
                        <button
                          onClick={() => {
                            setSelectedBooking(b)
                            setShowEditModal(true)
                          }}
                          style={{
                            fontSize: 12, color: 'var(--text-muted)',
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Table History ────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
              <div className="loader" />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗂️</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Belum ada riwayat checkout.</div>
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
                  <th>Status Bayar</th>
                  <th>Checkout</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                        {h.nomor_kamar}
                      </span>
                      {h.lantai && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 5 }}>
                          Lt.{h.lantai}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.nama_tamu}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {h.nik ? `${h.nik.slice(0, 6)}••••${h.nik.slice(-4)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {typeof h.durasi === 'number' ? labelDurasi(h.durasi) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {format(new Date(h.tanggal_in), 'dd/MM/yy', { locale: localeID })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {format(new Date(h.tanggal_out), 'dd/MM/yy', { locale: localeID })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--green)' }}>
                      {h.harga_total ? formatRupiah(h.harga_total) : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '2px 8px', borderRadius: 4,
                        color:      h.status_bayar === 'lunas' ? 'var(--green)' : h.status_bayar === 'dp' ? 'var(--amber)' : 'var(--red)',
                        background: h.status_bayar === 'lunas' ? 'var(--green-light)' : h.status_bayar === 'dp' ? 'var(--amber-light)' : 'var(--red-light)',
                      }}>
                        {h.status_bayar ?? '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {h.checkout_at
                        ? format(new Date(h.checkout_at), 'dd/MM/yy HH:mm', { locale: localeID })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Kamar Picker Modal ───────────────────────────── */}
      {showKamarPicker && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowKamarPicker(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Pilih Kamar
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {kamarKosong.length} kamar tersedia
              </p>
            </div>

            <div className="divider" />

            <div style={{ maxHeight: 360, overflowY: 'auto', marginTop: 12 }}>
              {lantaiList.map(lantai => (
                <div key={lantai} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                    color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase',
                  }}>
                    Lantai {lantai}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {kamarKosong.filter(k => k.lantai === lantai).map(k => (
                      <button
                        key={k.id}
                        onClick={() => {
                          setSelectedKamar(k)
                          setShowKamarPicker(false)
                          setShowModal(true)
                        }}
                        style={{
                          padding: '12px 8px', borderRadius: 8,
                          border: '1.5px solid var(--green-border)',
                          background: 'var(--green-light)', color: 'var(--green)',
                          cursor: 'pointer', fontFamily: 'var(--font-mono)',
                          fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-light)'; e.currentTarget.style.color = 'var(--green)' }}
                      >
                        <BedDouble size={14} />
                        {k.nomor_kamar}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" style={{ marginTop: 12 }} />

            <button
              className="btn-secondary"
              onClick={() => setShowKamarPicker(false)}
              style={{ width: '100%', marginTop: 12 }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ── Booking Modal ────────────────────────────────── */}
      {showModal && selectedKamar && (
        <BookingModal
          kamar={selectedKamar}
          onClose={() => {
            setShowModal(false)
            setSelectedKamar(null)
            fetchData()
          }}
        />
      )}

      {/* ── Detail / Edit Modal ──────────────────────────── */}
      {/* ── Edit Booking Modal ───────────────────────────── */}
      {showEditModal && selectedBooking && (
        <EditBookingModal
          booking={selectedBooking}
          nomor_kamar={selectedBooking.kamar.nomor_kamar}
          lantai={selectedBooking.kamar.lantai}
          onClose={() => {
            setShowEditModal(false)
            setSelectedBooking(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}