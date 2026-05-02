// types/tenant.ts

export type TenantPlan     = 'basic' | 'pro' | 'enterprise'
export type TenantTemplate = 'elegant' | 'modern' | 'bold'
export type UserRole       = 'admin' | 'staff'

export interface Tenant {
  id:            string
  slug:          string
  nama:          string
  maps_url:         string | null
  tagline:       string | null
  deskripsi:     string | null
  alamat:        string | null
  nomor_hp:      string | null
  email:         string | null
  plan:          TenantPlan
  is_active:     boolean
  domain_custom: string | null
  created_at:    string
  updated_at:    string
}

export interface TenantTheme {
  id:              string
  tenant_id:       string
  template:        TenantTemplate
  primary_color:   string
  secondary_color: string
  font_heading:    string
  font_body:       string
  logo_url:        string | null
  hero_image_url:  string | null
  created_at:      string
  updated_at:      string
}

// Gabungan tenant + theme — dipakai di layout.tsx dan page.tsx
export interface TenantConfig {
  tenant: Tenant
  theme:  TenantTheme
}

export interface TenantUser {
  id:         string
  tenant_id:  string
  role:       UserRole
  nama:       string | null
  created_at: string
}