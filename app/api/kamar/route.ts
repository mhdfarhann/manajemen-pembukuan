// app/api/kamar/route.ts
// REST endpoint untuk kamar — dipakai kalau butuh akses dari luar Next.js
// (misalnya integrasi eksternal, mobile app, dll.)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/kamar — ambil semua kamar, bisa filter ?lantai=1 atau ?status=kosong
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  // Cek auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lantai = searchParams.get('lantai')
  const status = searchParams.get('status')

  let query = supabase.from('kamar').select('*').order('nomor_kamar')

  if (lantai) query = query.eq('lantai', Number(lantai))
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/kamar/[id] — update status kamar secara manual
export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id || !['kosong', 'terisi'].includes(status)) {
    return NextResponse.json({ error: 'id dan status wajib diisi.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('kamar')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}