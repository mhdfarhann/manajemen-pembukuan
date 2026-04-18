'use client'
// app/(dashboard)/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import KamarGrid from '@/components/KamarGrid'
import BookingModal from '@/components/BookingModal'
import DetailKamarModal from '@/components/DetailKamarModal'

type Kamar = Database['public']['Tables']['kamar']['Row']
type Booking = Database['public']['Tables']['booking']['Row'] & {
  kamar: { nomor_kamar: string; lantai: number }
}

export default function DashboardPage() {
  const [kamarList, setKamarList] = useState<Kamar[]>([])
  const [bookingList, setBookingList] = useState<Booking[]>([])
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [modalMode, setModalMode] = useState<'booking' | 'detail' | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: kamar }, { data: booking }] = await Promise.all([
      supabase.from('kamar').select('*').order('nomor_kamar'),
      supabase
        .from('booking')
        .select('*, kamar(nomor_kamar, lantai)')
        .gte('tanggal_out', new Date().toISOString().split('T')[0])
        .order('tanggal_out'),
    ])
    if (kamar) setKamarList(kamar)
    if (booking) setBookingList(booking as Booking[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const channel = supabase
      .channel('kamar-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kamar' }, fetchData)
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

  // Stat summary
  const totalKamar = kamarList.length
  const kosong = kamarList.filter(k => k.status === 'kosong').length
  const terisi = kamarList.filter(k => k.status === 'terisi').length
  const lantaiList = [...new Set(kamarList.map(k => k.lantai))].sort()

  // Booking yang hampir expired (7 hari ke depan)
  const segera = bookingList.filter(b => {
    const sisa = Math.ceil(
      (new Date(b.tanggal_out).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return sisa <= 7 && sisa >= 0
  })

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 500,
          color: '#e8e4d4',
          letterSpacing: '0.02em',
        }}>
          Status Kamar
        </h1>
        <p style={{ fontSize: 13, color: '#6b6b55', marginTop: 4 }}>
          Klik kamar <span style={{ color: '#4ade80' }}>hijau</span> untuk tambah booking ·{' '}
          Klik kamar <span style={{ color: '#f87171' }}>merah</span> untuk lihat detail tamu
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Kamar', val: totalKamar, color: '#e8e4d4' },
          { label: 'Terisi', val: terisi, color: '#f87171' },
          { label: 'Kosong', val: kosong, color: '#4ade80' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: '#1a1a16',
            border: '1px solid #2a2a22',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 12, color: '#6b6b55', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', color }}>
              {loading ? '—' : val}
            </div>
          </div>
        ))}
      </div>

      {/* Warning: Booking segera berakhir */}
      {segera.length > 0 && (
        <div style={{
          background: '#c9a84c10',
          border: '1px solid #c9a84c30',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{ color: '#c9a84c', fontSize: 14, marginTop: 1 }}>⚠</span>
          <div>
            <div style={{ fontSize: 12, color: '#c9a84c', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              CHECKOUT DALAM 7 HARI
            </div>
            <div style={{ fontSize: 13, color: '#9a9678' }}>
              {segera.map(b => `Kamar ${b.kamar.nomor_kamar} (${b.nama_tamu})`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Grid per lantai */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="loader" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        lantaiList.map(lantai => {
          const kamarLantai = kamarList.filter(k => k.lantai === lantai)
          return (
            <KamarGrid
              key={lantai}
              lantai={lantai}
              kamarList={kamarLantai}
              bookingList={bookingList}
              onKamarClick={handleKamarClick}
            />
          )
        })
      )}

      {/* Modals */}
      {modalMode === 'booking' && selectedKamar && (
        <BookingModal kamar={selectedKamar} onClose={closeModal} />
      )}
      {modalMode === 'detail' && selectedKamar && (
        <DetailKamarModal kamar={selectedKamar} onClose={closeModal} />
      )}
    </div>
  )
}