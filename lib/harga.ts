// lib/harga.ts

import { addDays, addWeeks, addMonths } from 'date-fns'

export type Durasi = '1 hari' | '1 minggu' | '2 minggu' | '1 bulan' | '2 bulan' | '3 bulan'

export const DURASI_OPTIONS: Durasi[] = [
  '1 hari',
  '1 minggu',
  '2 minggu',
  '1 bulan',
  '2 bulan',
  '3 bulan',
]

export function hitungTanggalOut(tanggalIn: Date, durasi: Durasi): Date {
  switch (durasi) {
    case '1 hari':   return addDays(tanggalIn, 1)
    case '1 minggu': return addWeeks(tanggalIn, 1)
    case '2 minggu': return addWeeks(tanggalIn, 2)
    case '1 bulan':  return addMonths(tanggalIn, 1)
    case '2 bulan':  return addMonths(tanggalIn, 2)
    case '3 bulan':  return addMonths(tanggalIn, 3)
    default:         return addMonths(tanggalIn, 1)
  }
}

export function hitungHargaTotal(
  hargaHarian: number | null,
  hargaMingguan: number | null,
  hargaBulanan: number,
  durasi: Durasi
): number {
  switch (durasi) {
    case '1 hari':   return hargaHarian ?? Math.round(hargaBulanan / 30)
    case '1 minggu': return hargaMingguan ?? Math.round(hargaBulanan / 4)
    case '2 minggu': return hargaMingguan ? hargaMingguan * 2 : Math.round(hargaBulanan / 2)
    case '1 bulan':  return hargaBulanan
    case '2 bulan':  return hargaBulanan * 2
    case '3 bulan':  return hargaBulanan * 3
    default:         return hargaBulanan
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