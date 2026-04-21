'use client'
// app/(dashboard)/page.tsx  — FIXED: removed duplicate warning, fixed supabase ref

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import KamarGrid from '@/components/KamarGrid'
import BookingModal from '@/components/BookingModal'
import DetailKamarModal from '@/components/DetailKamarModal'
import { sisaHari } from '@/lib/harga'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

export default function DashboardPage() {
  const [kamarList,    setKamarList]    = useState<Kamar[]>([])
  const [bookingList,  setBookingList]  = useState<Booking[]>([])
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [modalMode, setModalMode] = useState<'booking' | 'detail' | null>(null)
  const [loading, setLoading] = useState(true)

  // FIX: Gunakan ref supaya supabase client stabil dan tidak trigger infinite re-render
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchData = useCallback(async () => {
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
  }, [supabase])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kamar' },   fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking' }, fetchData)
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

  const totalKamar = kamarList.length
  const kosong     = kamarList.filter(k => k.status === 'kosong').length
  const terisi     = kamarList.filter(k => k.status === 'terisi').length
  const lantaiList = [...new Set(kamarList.map(k => k.lantai))].sort()

  // FIX: Hanya satu warning block, threshold 7 hari dengan sisaHari yang sudah difix
  const segeraCheckout = bookingList.filter(b => {
    const sisa = sisaHari(b.tanggal_out)
    return sisa <= 7 && sisa > 0
  })

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Status Kamar
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Klik kamar{' '}
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>hijau</span> untuk booking ·{' '}
          <span style={{ color: 'var(--red)', fontWeight: 500 }}>merah</span> untuk detail tamu
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Kamar', val: totalKamar, color: 'var(--text-primary)', icon: '🏢' },
          { label: 'Terisi',      val: terisi,     color: 'var(--red)',          icon: '🔴' },
          { label: 'Kosong',      val: kosong,     color: 'var(--green)',        icon: '🟢' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{
              fontSize: 10, color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 600, color, lineHeight: 1 }}>
              {loading ? (
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>—</span>
              ) : val}
            </div>
          </div>
        ))}
      </div>

      {/* ── Warning checkout segera ──────────────────────── */}
      {/* FIX: Hanya satu block, tidak duplikat */}
      {segeraCheckout.length > 0 && (
        <div style={{
          background: 'var(--amber-light)',
          border: '1px solid var(--amber-border)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{ fontSize: 16, marginTop: 1 }}>⚠️</span>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--amber)', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.07em', marginBottom: 4, textTransform: 'uppercase',
            }}>
              Checkout dalam 7 hari
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {segeraCheckout.map(b => (
                <span key={b.id} style={{ marginRight: 12 }}>
                  Kamar <strong>{b.kamar.nomor_kamar}</strong> · {b.nama_tamu} ·{' '}
                  <span style={{ color: 'var(--amber)' }}>{sisaHari(b.tanggal_out)} hari lagi</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Grid kamar per lantai ────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, gap: 12 }}>
          <div className="loader" style={{ width: 24, height: 24 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data kamar...</span>
        </div>
      ) : (
        lantaiList.map(lantai => (
          <KamarGrid
            key={lantai}
            lantai={lantai}
            kamarList={kamarList.filter(k => k.lantai === lantai)}
            bookingList={bookingList}
            onKamarClick={handleKamarClick}
          />
        ))
      )}

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