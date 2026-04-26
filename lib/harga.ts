// lib/harga.ts

import { addDays } from 'date-fns'

// ── Durasi sekarang disimpan sebagai integer (jumlah hari) ──────────────────
// Preset hanya untuk shortcut UI, bukan tipe data

export interface DurasiPreset {
  label: string
  hari:  number
}

export const DURASI_PRESETS: DurasiPreset[] = [
  { label: '1 Hari',    hari: 1  },
  { label: '1 Minggu',  hari: 7  },
  { label: '2 Minggu',  hari: 14 },
  { label: '1 Bulan',   hari: 30 },
  { label: '2 Bulan',   hari: 60 },
  { label: '3 Bulan',   hari: 90 },
]

// tanggalOut = tanggalIn + jumlah hari (integer)
export function hitungTanggalOut(tanggalIn: Date, hari: number): Date {
  return addDays(tanggalIn, Math.max(1, hari))
}

// Hitung harga berdasarkan jumlah hari
// Logika tier: gunakan harga terbaik sesuai durasi
export function hitungHargaTotal(
  hargaHarian:   number | null,
  hargaMingguan: number | null,
  hargaBulanan:  number,
  hari: number,
): number {
  const perHari    = hargaHarian   ?? Math.round(hargaBulanan / 30)
  const perMinggu  = hargaMingguan ?? Math.round(hargaBulanan / 4)

  if (hari < 7) {
    // < 1 minggu → hitung harian
    return perHari * hari
  } else if (hari < 30) {
    // 1–29 hari → hitung per minggu + sisa hari
    const minggu   = Math.floor(hari / 7)
    const sisaHari = hari % 7
    return minggu * perMinggu + sisaHari * perHari
  } else {
    // ≥ 30 hari → hitung per bulan + sisa hari
    const bulan    = Math.floor(hari / 30)
    const sisaHari = hari % 30
    // sisa hari dihitung proporsional (per hari)
    return bulan * hargaBulanan + sisaHari * perHari
  }
}

export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nilai)
}

export function validasiNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik)
}

export function formatNIKDisplay(nik: string): string {
  return nik.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

// BUG FIX: Bandingkan date-only (strip jam) supaya booking "1 hari"
// tidak langsung jadi expired karena selisih jam
export function sisaHari(tanggalOut: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out = new Date(tanggalOut)
  out.setHours(0, 0, 0, 0)
  const ms = out.getTime() - today.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function isExpired(tanggalOut: string): boolean {
  return sisaHari(tanggalOut) === 0
}

// Konversi integer hari → label ringkas untuk display
export function labelDurasi(hari: number): string {
  if (hari === 1)  return '1 hari'
  if (hari < 7)    return `${hari} hari`
  if (hari === 7)  return '1 minggu'
  if (hari < 30)   return `${hari} hari`
  if (hari === 30) return '1 bulan'
  if (hari < 60)   return `${hari} hari`
  if (hari === 60) return '2 bulan'
  if (hari < 90)   return `${hari} hari`
  if (hari === 90) return '3 bulan'
  return `${hari} hari`
}