'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, LayoutGrid, FileText, LogOut, BookOpen, ChevronRight, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'

const navItems = [
  { href: '/',           icon: LayoutGrid, label: 'Dashboard Kamar' },
  { href: '/booking',    icon: BookOpen,   label: 'Data Booking' },
  { href: '/laporan',    icon: FileText,   label: 'Laporan' },
  { href: '/pengaturan', icon: Settings2,  label: 'Pengaturan' },
]

interface TenantInfo {
  nama: string
  logo_url: string | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  useEffect(() => {
    async function fetchTenant() {
      // Ambil tenant_id dari tabel users berdasarkan user yang login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userRow } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userRow?.tenant_id) return

      // Ambil nama dari tenants dan logo dari tenant_theme secara paralel
      const [{ data: tenantData }, { data: themeData }] = await Promise.all([
        supabase
          .from('tenants')
          .select('nama')
          .eq('id', userRow.tenant_id)
          .single(),
        supabase
          .from('tenant_theme')
          .select('logo_url')
          .eq('tenant_id', userRow.tenant_id)
          .single(),
      ])

      if (tenantData) {
        setTenant({
          nama:     tenantData.nama,
          logo_url: themeData?.logo_url ?? null,
        })
      }
    }

    fetchTenant()
  }, [supabase])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: 230,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>

        {/* Logo / Nama Tenant */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Logo jika ada, fallback ke icon Building2 */}
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.nama}
                style={{
                  height: 34, maxWidth: 34,
                  objectFit: 'contain', flexShrink: 0,
                  borderRadius: 8,
                }}
              />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--accent-light)',
                border: '1px solid var(--accent-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Building2 size={17} color="var(--accent)" strokeWidth={1.8} />
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              {/* Nama tenant dinamis, fallback "Hotel" saat loading */}
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 148,
              }}>
                {tenant?.nama ?? (
                  <span style={{
                    display: 'inline-block',
                    width: 80, height: 12,
                    background: 'var(--bg-secondary)',
                    borderRadius: 4,
                    verticalAlign: 'middle',
                  }} />
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9, color: 'var(--text-muted)',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                marginTop: 2,
              }}>
                Manajemen Kamar
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{
            fontSize: 9, fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)', letterSpacing: '0.15em',
            textTransform: 'uppercase', padding: '0 10px',
            marginBottom: 6,
          }}>
            Menu
          </div>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href ||
              (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 12px',
                  borderRadius: 9,
                  marginBottom: 2,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent-mid)' : 'transparent'}`,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2 : 1.7} />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '9px 12px',
              borderRadius: 9, border: 'none',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--red)'
              e.currentTarget.style.background = 'var(--red-light)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={15} strokeWidth={1.7} />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}