'use client'
// app/(dashboard)/page.tsx — Full redesign

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import BookingModal from '@/components/BookingModal'
import DetailKamarModal from '@/components/DetailKamarModal'
import { sisaHari, formatRupiah } from '@/lib/harga'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import {
  LayoutGrid, List, RefreshCw, CalendarClock,
  TrendingUp, BedDouble, DoorOpen, AlertTriangle,
  ChevronRight, Clock, User, Search
} from 'lucide-react'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}
type ViewMode = 'grid' | 'list'

export default function DashboardPage() {
  const [kamarList,     setKamarList]     = useState<Kamar[]>([])
  const [bookingList,   setBookingList]   = useState<Booking[]>([])
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [modalMode,     setModalMode]     = useState<'booking' | 'detail' | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [viewMode,      setViewMode]      = useState<ViewMode>('grid')
  const [filterLantai,  setFilterLantai]  = useState<number | 'semua'>('semua')
  const [filterStatus,  setFilterStatus]  = useState<'semua' | 'kosong' | 'terisi' | 'warning'>('semua')
  const [search,        setSearch]        = useState('')
  const [lastUpdate,    setLastUpdate]    = useState<Date>(new Date())

  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    const [{ data: kamar }, { data: booking }] = await Promise.all([
      supabase.from('kamar').select('*').order('lantai').order('nomor_kamar'),
      supabase
        .from('booking')
        .select('*, kamar(nomor_kamar, lantai)')
        .gte('tanggal_out', new Date().toISOString().split('T')[0])
        .order('tanggal_out'),
    ])
    if (kamar)   setKamarList(kamar)
    if (booking) setBookingList(booking as Booking[])
    setLoading(false)
    setRefreshing(false)
    setLastUpdate(new Date())
  }, [supabase])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kamar' },   () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  function handleKamarClick(kamar: Kamar) {
    setSelectedKamar(kamar)
    setModalMode(kamar.status === 'kosong' ? 'booking' : 'detail')
  }
  function closeModal() {
    setSelectedKamar(null)
    setModalMode(null)
    fetchData()
  }

  // ── Computed stats ────────────────────────────────────────
  const totalKamar   = kamarList.length
  const kosong       = kamarList.filter(k => k.status === 'kosong').length
  const terisi       = kamarList.filter(k => k.status === 'terisi').length
  const occupancy    = totalKamar > 0 ? Math.round((terisi / totalKamar) * 100) : 0
  const lantaiList   = [...new Set(kamarList.map(k => k.lantai))].sort()

  const segeraCheckout = bookingList.filter(b => {
    const s = sisaHari(b.tanggal_out)
    return s <= 7 && s > 0
  })
  const totalPendapatan = bookingList.reduce((sum, b) => sum + (b.harga_total || 0), 0)

  // ── Filter kamar ─────────────────────────────────────────
  const getBooking = (kamarId: string) => bookingList.find(b => b.kamar_id === kamarId)

  const filteredKamar = kamarList.filter(k => {
    const booking      = getBooking(k.id)
    const sisa         = booking ? sisaHari(booking.tanggal_out) : null
    const isWarning    = sisa !== null && sisa <= 7 && sisa > 0

    if (filterLantai !== 'semua' && k.lantai !== filterLantai) return false
    if (filterStatus === 'kosong'  && k.status !== 'kosong')  return false
    if (filterStatus === 'terisi'  && k.status !== 'terisi')  return false
    if (filterStatus === 'warning' && !isWarning)             return false

    if (search) {
      const q = search.toLowerCase()
      const nama = booking?.nama_tamu.toLowerCase() ?? ''
      if (!k.nomor_kamar.toLowerCase().includes(q) && !nama.includes(q)) return false
    }
    return true
  })

  // Group by lantai for grid view
  const kamarByLantai = lantaiList.map(l => ({
    lantai: l,
    kamar:  filteredKamar.filter(k => k.lantai === l),
    total:  kamarList.filter(k => k.lantai === l).length,
    kosong: kamarList.filter(k => k.lantai === l && k.status === 'kosong').length,
    terisi: kamarList.filter(k => k.lantai === l && k.status === 'terisi').length,
  })).filter(g => g.kamar.length > 0)

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh' }}>

      {/* ══ TOPBAR ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Dashboard Kamar
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }} suppressHydrationWarning>
            Live · diperbarui {format(lastUpdate, 'HH:mm:ss')}
          </span>
          </div>
        </div>

        {/* View toggle + refresh */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              padding: '7px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)',
              cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s',
            }}
            title="Refresh data"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
          </button>
          <div style={{
            display: 'flex', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 10px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: viewMode === mode ? 'var(--bg)' : 'transparent',
                  color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STAT CARDS ══════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>

        {/* Occupancy */}
        <div className="card" style={{ padding: '16px 18px', gridColumn: '1 / 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Occupancy
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {loading ? '—' : `${occupancy}%`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {terisi} dari {totalKamar} kamar
              </div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--accent-light)', border: '1px solid var(--accent-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} color="var(--accent)" />
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12, height: 4, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${occupancy}%`,
              background: occupancy >= 90 ? 'var(--red)' : occupancy >= 70 ? 'var(--amber)' : 'var(--green)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Kamar Terisi */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Terisi</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{loading ? '—' : terisi}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>kamar aktif</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-light)', border: '1px solid var(--red-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BedDouble size={18} color="var(--red)" />
            </div>
          </div>
        </div>

        {/* Kamar Kosong */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Kosong</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{loading ? '—' : kosong}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>tersedia</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DoorOpen size={18} color="var(--green)" />
            </div>
          </div>
        </div>

        {/* Checkout Segera */}
        <div className="card" style={{ padding: '16px 18px', borderColor: segeraCheckout.length > 0 ? 'var(--amber-border)' : 'var(--border)', background: segeraCheckout.length > 0 ? 'var(--amber-light)' : 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: segeraCheckout.length > 0 ? 'var(--amber)' : 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Checkout &lt;7hr
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: segeraCheckout.length > 0 ? 'var(--amber)' : 'var(--text-muted)', lineHeight: 1 }}>
                {loading ? '—' : segeraCheckout.length}
              </div>
              <div style={{ fontSize: 11, color: segeraCheckout.length > 0 ? 'var(--amber)' : 'var(--text-muted)', marginTop: 4 }}>
                {segeraCheckout.length > 0 ? 'perlu perhatian' : 'aman'}
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: segeraCheckout.length > 0 ? '#fef3c7' : 'var(--bg-secondary)', border: `1px solid ${segeraCheckout.length > 0 ? 'var(--amber-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color={segeraCheckout.length > 0 ? 'var(--amber)' : 'var(--text-muted)'} />
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2-COLUMN LAYOUT (kamar + sidebar) ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Kamar panel ─────────────────────────────────── */}
        <div>

          {/* Filter bar */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 14,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                placeholder="Cari kamar / tamu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13, height: 34, borderRadius: 8 }}
              />
            </div>

            {/* Lantai filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['semua', ...lantaiList] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLantai(l as typeof filterLantai)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, transition: 'all 0.12s',
                    background: filterLantai === l ? 'var(--accent)' : 'var(--bg)',
                    borderColor: filterLantai === l ? 'var(--accent)' : 'var(--border)',
                    color: filterLantai === l ? '#fff' : 'var(--text-secondary)',
                    fontWeight: filterLantai === l ? 500 : 400,
                  }}
                >
                  {l === 'semua' ? 'Semua' : `Lt.${l}`}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { val: 'semua',   label: 'Semua', color: 'var(--text-secondary)', activeBg: 'var(--text-primary)', activeBorder: 'var(--text-primary)' },
                { val: 'kosong',  label: 'Kosong',  color: 'var(--green)', activeBg: 'var(--green)', activeBorder: 'var(--green)' },
                { val: 'terisi',  label: 'Terisi',  color: 'var(--red)',   activeBg: 'var(--red)',   activeBorder: 'var(--red)' },
                { val: 'warning', label: '⚠ Segera', color: 'var(--amber)', activeBg: 'var(--amber)', activeBorder: 'var(--amber)' },
              ] as const).map(({ val, label, activeBg, activeBorder }) => (
                <button
                  key={val}
                  onClick={() => setFilterStatus(val)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, transition: 'all 0.12s',
                    background: filterStatus === val ? activeBg : 'var(--bg)',
                    borderColor: filterStatus === val ? activeBorder : 'var(--border)',
                    color: filterStatus === val ? '#fff' : 'var(--text-secondary)',
                    fontWeight: filterStatus === val ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah hasil filter */}
          {(search || filterLantai !== 'semua' || filterStatus !== 'semua') && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filteredKamar.length}</strong> dari {totalKamar} kamar
              {(search || filterLantai !== 'semua' || filterStatus !== 'semua') && (
                <button
                  onClick={() => { setSearch(''); setFilterLantai('semua'); setFilterStatus('semua') }}
                  style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Reset filter
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, gap: 12 }}>
              <div className="loader" style={{ width: 22, height: 22 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data kamar...</span>
            </div>
          ) : filteredKamar.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4, fontWeight: 500 }}>Tidak ada kamar yang cocok</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Coba ubah filter atau kata kunci pencarian</div>
            </div>

          /* ── GRID VIEW ─────────────────────────────── */
          ) : viewMode === 'grid' ? (
            <div>
              {kamarByLantai.map(({ lantai, kamar, total, kosong: k, terisi: t }) => (
                <div key={lantai} style={{ marginBottom: 24 }}>

                  {/* Lantai header dengan mini stats */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    padding: '8px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: 'var(--shadow-sm)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
                      LANTAI {lantai}
                    </span>
                    <div style={{ flex: 1 }} />

                    {/* Mini occupancy bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((t/total)*100)}%`, background: t/total >= 0.9 ? 'var(--red)' : t/total >= 0.7 ? 'var(--amber)' : 'var(--green)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--green)', fontWeight: 500 }}>{k}</span> kosong · <span style={{ color: 'var(--red)', fontWeight: 500 }}>{t}</span> terisi / {total}
                      </span>
                    </div>
                  </div>

                  {/* Kamar buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                    {kamar.map(k => {
                      const booking     = getBooking(k.id)
                      const sisa        = booking ? sisaHari(booking.tanggal_out) : null
                      const hampirHabis = sisa !== null && sisa <= 7 && sisa > 0

                      const btnClass = hampirHabis ? 'kamar-btn terisi hampir-habis' : `kamar-btn ${k.status}`

                      return (
                        <button
                          key={k.id}
                          className={btnClass}
                          onClick={() => handleKamarClick(k)}
                          style={{ minHeight: 100, gap: 3 }}
                          title={booking ? `${booking.nama_tamu} · sisa ${sisa} hari` : `Kamar ${k.nomor_kamar} — kosong`}
                        >
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%',
                            background: hampirHabis ? 'var(--amber)' : k.status === 'kosong' ? 'var(--green)' : 'var(--red)',
                            boxShadow: k.status === 'kosong' ? '0 0 5px rgba(22,163,74,0.5)' : 'none',
                          }} />

                          {/* Nomor */}
                          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1 }}>
                            {k.nomor_kamar}
                          </div>

                          {/* Tipe badge */}
                          {k.tipe !== 'standard' && (
                            <div style={{ fontSize: 8, letterSpacing: '0.06em', opacity: 0.7, textTransform: 'uppercase', marginTop: 1 }}>
                              {k.tipe}
                            </div>
                          )}

                          {/* Status */}
                          <div style={{ fontSize: 8, letterSpacing: '0.06em', opacity: 0.55, marginTop: 1 }}>
                            {k.status === 'kosong' ? 'KOSONG' : 'TERISI'}
                          </div>

                          {/* Info tamu */}
                          {booking && (
                            <div style={{
                              marginTop: 6, width: '100%', padding: '4px 6px',
                              background: hampirHabis ? 'rgba(217,119,6,0.12)' : 'rgba(0,0,0,0.06)',
                              borderRadius: 5, fontSize: 9, lineHeight: 1.3, textAlign: 'center',
                            }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {booking.nama_tamu.split(' ')[0]}
                              </div>
                              <div style={{ opacity: 0.75, marginTop: 1, color: hampirHabis ? 'var(--amber)' : 'inherit' }}>
                                {hampirHabis ? `⚠ ${sisa}hr` : `${sisa}hr lagi`}
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

          /* ── LIST VIEW ─────────────────────────────── */
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table-hotel">
                <thead>
                  <tr>
                    <th>Kamar</th>
                    <th>Lantai</th>
                    <th>Tipe</th>
                    <th>Status</th>
                    <th>Tamu</th>
                    <th>Masuk</th>
                    <th>Keluar</th>
                    <th>Sisa</th>
                    <th>Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKamar.map(k => {
                    const booking     = getBooking(k.id)
                    const sisa        = booking ? sisaHari(booking.tanggal_out) : null
                    const hampirHabis = sisa !== null && sisa <= 7 && sisa > 0
                    return (
                      <tr
                        key={k.id}
                        onClick={() => handleKamarClick(k)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                            {k.nomor_kamar}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{k.lantai}</td>
                        <td>
                          <span style={{ fontSize: 11, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                            {k.tipe}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${k.status}`}>{k.status}</span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {booking ? booking.nama_tamu : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {booking ? format(new Date(booking.tanggal_in), 'dd/MM/yy', { locale: localeID }) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hampirHabis ? 'var(--amber)' : 'var(--text-secondary)' }}>
                          {booking ? format(new Date(booking.tanggal_out), 'dd/MM/yy', { locale: localeID }) : '—'}
                        </td>
                        <td>
                          {sisa !== null ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                              color: hampirHabis ? 'var(--amber)' : sisa === 0 ? 'var(--red)' : 'var(--text-muted)',
                            }}>
                              {sisa === 0 ? 'EXP' : `${sisa}hr`}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {booking ? (
                            <span className={`badge badge-${booking.status_bayar}`}>{booking.status_bayar}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Occupancy per lantai */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
              Occupancy per Lantai
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="loader" />
              </div>
            ) : lantaiList.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Belum ada data</div>
            ) : lantaiList.map(l => {
              const total  = kamarList.filter(k => k.lantai === l).length
              const terisiL = kamarList.filter(k => k.lantai === l && k.status === 'terisi').length
              const pct    = total > 0 ? Math.round((terisiL / total) * 100) : 0
              return (
                <div key={l} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Lt. {l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {terisiL}/{total} kamar
                  </div>
                </div>
              )
            })}
          </div>

          {/* Aktivitas checkout segera */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Clock size={14} color="var(--amber)" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                Checkout Segera
              </span>
              {segeraCheckout.length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                  background: 'var(--amber-light)', color: 'var(--amber)',
                  border: '1px solid var(--amber-border)',
                  padding: '1px 7px', borderRadius: 20,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {segeraCheckout.length}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <div className="loader" />
              </div>
            ) : segeraCheckout.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tidak ada checkout<br />dalam 7 hari ke depan</div>
              </div>
            ) : segeraCheckout.map(b => {
              const sisa = sisaHari(b.tanggal_out)
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    const kamar = kamarList.find(k => k.id === b.kamar_id)
                    if (kamar) handleKamarClick(kamar)
                  }}
                  style={{
                    padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                    background: sisa <= 3 ? 'var(--red-light)' : 'var(--amber-light)',
                    border: `1px solid ${sisa <= 3 ? 'var(--red-border)' : 'var(--amber-border)'}`,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.nama_tamu.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                          {b.kamar.nomor_kamar}
                        </span>
                        · {format(new Date(b.tanggal_out), 'dd MMM', { locale: localeID })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: sisa <= 3 ? 'var(--red)' : 'var(--amber)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {sisa}hr
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pendapatan aktif */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingUp size={14} color="var(--green)" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                Nilai Booking Aktif
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Total harga semua booking berjalan
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {loading ? '—' : formatRupiah(totalPendapatan)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              dari {terisi} kamar aktif
            </div>
          </div>

          {/* Legend */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em' }}>
              Keterangan
            </div>
            {[
              { color: 'var(--green)', border: 'var(--green-border)', bg: 'var(--green-light)', label: 'Kosong', sub: 'Klik untuk tambah booking' },
              { color: 'var(--red)',   border: 'var(--red-border)',   bg: 'var(--red-light)',   label: 'Terisi', sub: 'Klik untuk lihat detail' },
              { color: 'var(--amber)', border: 'var(--amber-border)', bg: 'var(--amber-light)', label: 'Segera Checkout', sub: 'Checkout dalam 7 hari' },
            ].map(({ color, border, bg, label, sub }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 24, borderRadius: 6, background: bg, border: `1.5px solid ${border}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {modalMode === 'booking' && selectedKamar && (
        <BookingModal kamar={selectedKamar} onClose={closeModal} />
      )}
      {modalMode === 'detail' && selectedKamar && (
        <DetailKamarModal kamar={selectedKamar} onClose={closeModal} />
      )}
    </div>
  )
}