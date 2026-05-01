// app/api/booking/publik/route.ts
// Endpoint khusus untuk booking dari landing page — tidak butuh auth
// tenant_id diambil dari body (dikirim oleh client) tapi divalidasi di server

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { hitungTanggalOut, hitungHargaTotal, validasiNIK } from '@/lib/harga'
import { format } from 'date-fns'

// Pakai service role agar bisa bypass RLS untuk insert publik
// JANGAN expose key ini ke client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    tenant_id, kamar_id, nama_tamu, nik,
    nomor_hp, durasi, tanggal_in, catatan,
  } = body

  // ── Validasi input wajib ────────────────────────────────────────────────
  if (!tenant_id || !kamar_id || !nama_tamu || !durasi || !tanggal_in) {
    return NextResponse.json(
      { error: 'tenant_id, kamar_id, nama_tamu, durasi, dan tanggal_in wajib diisi.' },
      { status: 400 }
    )
  }

  if (nik && !validasiNIK(nik)) {
    return NextResponse.json({ error: 'NIK harus 16 digit angka.' }, { status: 400 })
  }

  // ── Validasi tenant aktif ───────────────────────────────────────────────
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, is_active')
    .eq('id', tenant_id)
    .eq('is_active', true)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant tidak ditemukan atau tidak aktif.' }, { status: 404 })
  }

  // ── Validasi kamar milik tenant dan statusnya ───────────────────────────
  const { data: kamar } = await supabaseAdmin
    .from('kamar')
    .select('*')
    .eq('id', kamar_id)
    .eq('tenant_id', tenant_id)   // pastikan kamar ini memang milik tenant tersebut
    .single()

  if (!kamar) {
    return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 })
  }

  if (kamar.status === 'terisi') {
    return NextResponse.json({ error: 'Maaf, kamar ini sudah dipesan.' }, { status: 409 })
  }

  // ── Hitung harga ────────────────────────────────────────────────────────
  const { data: hargaData } = await supabaseAdmin
    .from('harga')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('lantai', kamar.lantai)
    .single()

  const hari       = Number(durasi)
  const tanggalOut = hitungTanggalOut(new Date(tanggal_in), hari)
  const hargaTotal = hargaData
    ? hitungHargaTotal(hargaData.harga_harian, hargaData.harga_mingguan, hargaData.harga_bulanan, hari)
    : null

  // ── Insert booking ──────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('booking')
    .insert({
      tenant_id,
      kamar_id,
      nama_tamu:   nama_tamu.toUpperCase(),
      nik:         nik    || null,
      nomor_hp:    nomor_hp || null,
      durasi:      hari,
      tanggal_in,
      tanggal_out: format(tanggalOut, 'yyyy-MM-dd'),
      harga_total: hargaTotal,
      status_bayar: 'belum',
      catatan:     catatan || null,
    })
    .select('id, tanggal_out, harga_total')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}