'use client'
// hooks/useNotifikasi.ts
// Hook untuk menghitung kamar yang hampir checkout dan statistik global
// Digunakan di layout.tsx untuk badge sidebar

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { sisaHari } from '@/lib/harga'

export interface NotifData {
  hampirCheckout: number   // kamar sisa <= 7 hari
  totalBelumBayar: number  // booking belum lunas
  totalKosong: number      // kamar kosong saat ini
}

export function useNotifikasi() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current
  const [data, setData] = useState<NotifData>({ hampirCheckout: 0, totalBelumBayar: 0, totalKosong: 0 })

  const fetch = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    const [{ data: bookings }, { data: kamar }] = await Promise.all([
      supabase
        .from('booking')
        .select('tanggal_out, status_bayar')
        .gte('tanggal_out', today),
      supabase
        .from('kamar')
        .select('status'),
    ])

    const hampirCheckout = (bookings ?? []).filter(b => {
      const sisa = sisaHari(b.tanggal_out)
      return sisa > 0 && sisa <= 7
    }).length

    const totalBelumBayar = (bookings ?? []).filter(b => b.status_bayar !== 'lunas').length
    const totalKosong     = (kamar ?? []).filter(k => k.status === 'kosong').length

    setData({ hampirCheckout, totalBelumBayar, totalKosong })
  }, [supabase])

  useEffect(() => {
    fetch()
    // Refresh tiap 5 menit
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  return data
}


// ── Cara penggunaan di layout.tsx ──────────────────────────────────────────
//
// import { useNotifikasi } from '@/hooks/useNotifikasi'
//
// Di dalam DashboardLayout:
// const notif = useNotifikasi()
//
// Lalu di nav item "Dashboard Kamar", tambahkan badge:
// {notif.hampirCheckout > 0 && (
//   <span style={{
//     background: 'var(--amber)', color: '#fff',
//     borderRadius: '50%', width: 16, height: 16,
//     fontSize: 9, fontWeight: 700,
//     display: 'flex', alignItems: 'center', justifyContent: 'center',
//     fontFamily: 'var(--font-mono)',
//   }}>
//     {notif.hampirCheckout}
//   </span>
// )}
//
// Dan di nav item "Data Booking":
// {notif.totalBelumBayar > 0 && (
//   <span style={{
//     background: 'var(--red)', color: '#fff',
//     borderRadius: '50%', width: 16, height: 16,
//     fontSize: 9, fontWeight: 700,
//     display: 'flex', alignItems: 'center', justifyContent: 'center',
//     fontFamily: 'var(--font-mono)',
//   }}>
//     {notif.totalBelumBayar > 9 ? '9+' : notif.totalBelumBayar}
//   </span>
// )}