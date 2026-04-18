'use client'
// app/(dashboard)/layout.tsx

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Hotel, LayoutGrid, FileText, LogOut, BookOpen } from 'lucide-react'
import Link from 'next/link'

const navItems = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard Kamar' },
  { href: '/booking', icon: BookOpen, label: 'Data Booking' },
  { href: '/laporan', icon: FileText, label: 'Laporan' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: '#131310',
        borderRight: '1px solid #2a2a22',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e1e18' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: '#c9a84c',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Hotel size={18} color="#c9a84c" />
            HOTEL
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#6b6b55',
            letterSpacing: '0.25em',
            marginTop: 2,
          }}>
            MANAJEMEN KAMAR
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? '#c9a84c' : '#9a9678',
                  background: active ? '#c9a84c12' : 'transparent',
                  border: active ? '1px solid #c9a84c22' : '1px solid transparent',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid #1e1e18' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px',
              borderRadius: 8, border: 'none',
              background: 'transparent', color: '#6b6b55',
              fontSize: 13, cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b6b55')}
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: '#0f0f0d' }}>
        {children}
      </main>
    </div>
  )
}