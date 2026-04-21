'use client'
// app/(dashboard)/layout.tsx

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, LayoutGrid, FileText, LogOut, BookOpen, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useNotifikasi } from '@/hooks/useNotifikasi'

const navItems = [
  { href: '/',        icon: LayoutGrid, label: 'Dashboard Kamar', badge: 'hampirCheckout' as const },
  { href: '/booking', icon: BookOpen,   label: 'Data Booking',    badge: 'totalBelumBayar' as const },
  { href: '/laporan', icon: FileText,   label: 'Laporan',         badge: null },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const notif    = useNotifikasi()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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

        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--accent-light)',
              border: '1px solid var(--accent-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={17} color="var(--accent)" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14, fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}>
                Hotel
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9, color: 'var(--text-muted)',
                letterSpacing: '0.15em', textTransform: 'uppercase',
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

          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const isActive = pathname === href ||
              (href !== '/' && pathname.startsWith(href))

            const badgeCount = badge === 'hampirCheckout'
              ? notif.hampirCheckout
              : badge === 'totalBelumBayar'
              ? notif.totalBelumBayar
              : 0

            const badgeBg = badge === 'hampirCheckout' ? 'var(--amber)' : 'var(--red)'

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

                {badge && badgeCount > 0 && (
                  <span style={{
                    background: badgeBg,
                    color: '#fff',
                    borderRadius: '50%',
                    width: 16, height: 16,
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}>
                    {badge === 'totalBelumBayar' && badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}

                {isActive && !badgeCount && (
                  <ChevronRight size={13} style={{ opacity: 0.5 }} />
                )}
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