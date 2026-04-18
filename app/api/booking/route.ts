// app/api/booking/route.ts
// REST endpoint untuk booking

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hitungTanggalOut, hitungHargaTotal, validasiNIK, type Durasi } from '@/lib/harga'
import { format } from 'date-fns'

// GET /api/booking — ambil semua booking aktif
// Query params: ?kamar_id=xxx  ?aktif=true  ?bulan=2026-04
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const kamarId = searchParams.get('kamar_id')
  const aktif = searchParams.get('aktif')
  const bulan = searchParams.get('bulan') // format: 2026-04

  let query = supabase
    .from('booking')
    .select('*, kamar(nomor_kamar, lantai)')
    .order('tanggal_out')

  if (kamarId) query = query.eq('kamar_id', kamarId)

  if (aktif === 'true') {
    query = query.gte('tanggal_out', new Date().toISOString().split('T')[0])
  }

  if (bulan) {
    const [tahun, bln] = bulan.split('-')
    const start = `${tahun}-${bln}-01`
    const lastDay = new Date(Number(tahun), Number(bln), 0).getDate()
    const end = `${tahun}-${bln}-${String(lastDay).padStart(2, '0')}`
    query = query.gte('tanggal_in', start).lte('tanggal_in', end)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: data?.length ?? 0 })
}

// POST /api/booking — buat booking baru
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { kamar_id, nama_tamu, nik, durasi, tanggal_in, status_bayar, catatan } = body

  // Validasi wajib
  if (!kamar_id || !nama_tamu || !durasi || !tanggal_in) {
    return NextResponse.json(
      { error: 'kamar_id, nama_tamu, durasi, dan tanggal_in wajib diisi.' },
      { status: 400 }
    )
  }

  // Validasi NIK kalau ada
  if (nik && !validasiNIK(nik)) {
    return NextResponse.json({ error: 'NIK harus 16 digit angka.' }, { status: 400 })
  }

  // Cek kamar tersedia
  const { data: kamar } = await supabase
    .from('kamar')
    .select('*')
    .eq('id', kamar_id)
    .single()

  if (!kamar) {
    return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 })
  }

  if (kamar.status === 'terisi') {
    return NextResponse.json({ error: 'Kamar sudah terisi.' }, { status: 409 })
  }

  // Ambil harga untuk lantai ini
  const { data: hargaData } = await supabase
    .from('harga')
    .select('*')
    .eq('lantai', kamar.lantai)
    .single()

  const tanggalOut = hitungTanggalOut(new Date(tanggal_in), durasi as Durasi)
  const hargaTotal = hargaData
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, durasi as Durasi)
    : null

  const { data, error } = await supabase
    .from('booking')
    .insert({
      kamar_id,
      nama_tamu: nama_tamu.toUpperCase(),
      nik: nik || null,
      durasi,
      tanggal_in,
      tanggal_out: format(tanggalOut, 'yyyy-MM-dd'),
      harga_total: hargaTotal,
      status_bayar: status_bayar || 'belum',
      catatan: catatan || null,
    })
    .select('*, kamar(nomor_kamar, lantai)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/booking — checkout (hapus booking by id)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id wajib diisi.' }, { status: 400 })
  }

  const { error } = await supabase.from('booking').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}