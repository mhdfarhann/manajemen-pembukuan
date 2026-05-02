// app/api/booking/publik/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { hitungTanggalOut, hitungHargaTotal, validasiNIK } from '@/lib/harga'
import { format } from 'date-fns'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function corsJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Inisialisasi di dalam fungsi — bukan module level
    // Ini penting agar env variable dibaca saat runtime, bukan build time
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    console.log('🔥 ROUTE HIT')
    console.log('SERVICE KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const body = await request.json()
    console.log('BODY:', JSON.stringify(body))

    const {
      tenant_id, kamar_id, nama_tamu, nik,
      nomor_hp, durasi, tanggal_in, catatan,
    } = body

    // ── Validasi input wajib ──────────────────────────────────────────────
    if (!tenant_id || !kamar_id || !nama_tamu || !durasi || !tanggal_in) {
      console.log('GAGAL VALIDASI:', { tenant_id: !!tenant_id, kamar_id: !!kamar_id, nama_tamu: !!nama_tamu, durasi: !!durasi, tanggal_in: !!tanggal_in })
      return corsJson({ error: 'tenant_id, kamar_id, nama_tamu, durasi, dan tanggal_in wajib diisi.' }, 400)
    }

    if (nik && !validasiNIK(nik)) {
      return corsJson({ error: 'NIK harus 16 digit angka.' }, 400)
    }

    // ── Validasi tenant aktif ─────────────────────────────────────────────
    console.log('QUERYING TENANT:', tenant_id)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, is_active')
      .eq('id', tenant_id)
      .eq('is_active', true)
      .single()

    console.log('TENANT RESULT:', { tenant, error: tenantError?.message })

    if (!tenant) {
      return corsJson({ error: 'Tenant tidak ditemukan atau tidak aktif.' }, 404)
    }

    // ── Validasi kamar ────────────────────────────────────────────────────
    console.log('QUERYING KAMAR:', kamar_id)
    const { data: kamar, error: kamarError } = await supabaseAdmin
      .from('kamar')
      .select('*')
      .eq('id', kamar_id)
      .eq('tenant_id', tenant_id)
      .single()

    console.log('KAMAR RESULT:', { kamar: kamar?.nomor_kamar, error: kamarError?.message })

    if (!kamar) {
      return corsJson({ error: 'Kamar tidak ditemukan.' }, 404)
    }

    if (kamar.status === 'terisi') {
      return corsJson({ error: 'Maaf, kamar ini sudah dipesan.' }, 409)
    }

    // ── Hitung harga ──────────────────────────────────────────────────────
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

    // ── Insert booking ────────────────────────────────────────────────────
    console.log('INSERTING BOOKING...')
    const { data, error } = await supabaseAdmin
      .from('booking')
      .insert({
        tenant_id,
        kamar_id,
        nama_tamu:    nama_tamu.toUpperCase(),
        nik:          nik      || null,
        nomor_hp:     nomor_hp || null,
        durasi:       hari,
        tanggal_in,
        tanggal_out:  format(tanggalOut, 'yyyy-MM-dd'),
        harga_total:  hargaTotal,
        status_bayar: 'belum',
        catatan:      catatan  || null,
      })
      .select('id, tanggal_out, harga_total')
      .single()

    if (error) {
      console.error('INSERT ERROR:', error.message)
      return corsJson({ error: error.message }, 500)
    }

    console.log('✅ BOOKING SUCCESS:', data?.id)
    return corsJson({ data }, 201)

  } catch (err) {
    console.error('💥 UNHANDLED ERROR:', err)
    return corsJson({ error: String(err) }, 500)
  }
}