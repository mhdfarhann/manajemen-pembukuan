// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api', 'superadmin'])

function getTenantSlug(request: NextRequest): string | null {
  const host = request.headers.get('host')?.split(':')[0] ?? ''
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN!

  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1))
    if (RESERVED_SUBDOMAINS.has(sub)) return null
    return sub
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tenantSlug = getTenantSlug(request)
  const host = request.headers.get('host')?.split(':')[0] ?? ''
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN!
  const isMainDomain = host === baseDomain || host === `www.${baseDomain}`

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ✅ Jika request dari subdomain tenant → rewrite ke /_tenant
  if (tenantSlug) {
    const url = request.nextUrl.clone()

    // Rewrite root dan sub-path tenant ke /_tenant/*
    // Tapi jangan rewrite kalau sudah di /_tenant (hindari loop)
    if (!pathname.startsWith('/_tenant')) {
      url.pathname = `/_tenant${pathname === '/' ? '' : pathname}`
      const rewriteResponse = NextResponse.rewrite(url)
      rewriteResponse.headers.set('x-tenant-slug', tenantSlug)
      return rewriteResponse
    }

    supabaseResponse.headers.set('x-tenant-slug', tenantSlug)
    return supabaseResponse
  }

  // ✅ Untuk domain utama: proteksi auth seperti biasa
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // ✅ Request dari subdomain tenant → rewrite ke landing page
  if (tenantSlug) {
    const url = request.nextUrl.clone()
    if (!pathname.startsWith('/_tenant')) {
      url.pathname = `/_tenant${pathname === '/' ? '' : pathname}`
      const rewriteResponse = NextResponse.rewrite(url)
      rewriteResponse.headers.set('x-tenant-slug', tenantSlug)
      return rewriteResponse
    }
    supabaseResponse.headers.set('x-tenant-slug', tenantSlug)
    return supabaseResponse
  }

  // ✅ Request dari domain utama → dashboard admin
  if (isMainDomain) {
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

    if (!user && !isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // ✅ Validasi user hanya bisa akses tenant miliknya
    if (user && !pathname.startsWith('/login')) {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        // User ada di auth tapi tidak terdaftar di tabel users → logout
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      // Simpan tenant_id di header untuk dipakai di dashboard
      supabaseResponse.headers.set('x-tenant-id', userData.tenant_id)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}