// lib/tenant.ts

import { createServerClient } from '@/lib/supabase/server'
import type { TenantConfig, TenantTemplate, TenantPlan } from '@/types/tenant'

export async function getTenantBySlug(slug: string): Promise<TenantConfig | null> {
  const supabase = await createServerClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  console.log('🔍 slug:', slug)
  console.log('📦 tenant id:', tenant?.id)
  console.log('📦 tenant nama:', tenant?.nama)
  console.log('❌ error:', error?.message)

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
      plan: tenant.plan as TenantPlan,
    },
    theme: theme
      ? { ...theme, template: theme.template as TenantTemplate }
      : defaultTheme,
  }
}

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

export async function getKamarByTenant(tenantId: string) {
  const supabase = await createServerClient()

  console.log('🚪 getKamarByTenant → tenantId:', tenantId)

  const { data, error } = await supabase
    .from('kamar')
    .select('id, nomor_kamar, lantai, tipe, status, catatan, tenant_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'kosong')
    .order('lantai')
    .order('nomor_kamar')

  console.log('🚪 kamar count:', data?.length)
  console.log('🚪 kamar tenant_ids:', [...new Set(data?.map(k => k.tenant_id))])
  console.log('❌ kamar error:', error?.message)

  // Hapus tenant_id dari hasil (tidak perlu di frontend)
  return (data ?? []).map(({ tenant_id, ...rest }) => rest)
}

export async function getHargaByTenant(tenantId: string) {
  const supabase = await createServerClient()

  console.log('💰 getHargaByTenant → tenantId:', tenantId)

  const { data, error } = await supabase
    .from('harga')
    .select('lantai, tipe, harga_harian, harga_mingguan, harga_bulanan, tenant_id')
    .eq('tenant_id', tenantId)
    .order('lantai')

  console.log('💰 harga count:', data?.length)
  console.log('💰 harga tenant_ids:', [...new Set(data?.map(h => h.tenant_id))])
  console.log('❌ harga error:', error?.message)

  return (data ?? []).map(({ tenant_id, ...rest }) => rest)
}