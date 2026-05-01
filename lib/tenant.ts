// lib/tenant.ts

import { createServerClient } from '@/lib/supabase/server'
import type { TenantConfig, TenantTemplate, TenantPlan } from '@/types/tenant'

// ─── Ambil config tenant by slug ─────────────────────────────────────────
export async function getTenantBySlug(slug: string): Promise<TenantConfig | null> {
  const supabase = await createServerClient()

  console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  // Test query paling simpel tanpa filter
  const { data: all, error: allError } = await supabase
    .from('tenants')
    .select('id, slug')
    
  console.log('📋 Semua tenant:', all)
  console.log('📋 Error semua:', JSON.stringify(allError, null, 2))

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  console.log('🔍 slug:', slug)
  console.log('📦 tenant:', tenant)
  console.log('❌ error full:', JSON.stringify(error, null, 2))
  console.log('❌ error message:', (error as any)?.message)

  if (!tenant) return null

  const { data: theme } = await supabase
    .from('tenant_theme')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  const defaultTheme = {
    id:              '',
    tenant_id:       tenant.id,
    template:        'elegant' as TenantTemplate,
    primary_color:   '#2D6A4F',
    secondary_color: '#40916C',
    font_heading:    'Playfair Display',
    font_body:       'Inter',
    logo_url:        null,
    hero_image_url:  null,
    created_at:      '',
    updated_at:      '',
  }

  return {
    tenant: {
      ...tenant,
      plan: tenant.plan as TenantPlan,   // cast: DB simpan string, kita tahu nilainya valid
    },
    theme: theme
      ? { ...theme, template: theme.template as TenantTemplate }
      : defaultTheme,
  }
}

// ─── Ambil tenant_id dari user yang sedang login ──────────────────────────
export async function getTenantIdFromUser(): Promise<string | null> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  return data?.tenant_id ?? null
}

// ─── Ambil kamar kosong milik tenant — untuk landing page ────────────────
export async function getKamarByTenant(tenantId: string) {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('kamar')
    .select('id, nomor_kamar, lantai, tipe, status, catatan')
    .eq('tenant_id', tenantId)
    .eq('status', 'kosong')
    .order('lantai')
    .order('nomor_kamar')

  return data ?? []
}

// ─── Ambil daftar harga milik tenant — untuk landing page ────────────────
export async function getHargaByTenant(tenantId: string) {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('harga')
    .select('lantai, tipe, harga_harian, harga_mingguan, harga_bulanan')
    .eq('tenant_id', tenantId)
    .order('lantai')

  return data ?? []
}