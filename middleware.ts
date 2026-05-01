// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'inapku.online'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname

  const isSubdomain =
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}` &&
    hostname.endsWith(`.${BASE_DOMAIN}`)

  // ── SUBDOMAIN TENANT ──────────────────────────────────────
  if (isSubdomain) {
    const slug = hostname.replace(`.${BASE_DOMAIN}`, '')

    // Path yang boleh diakses publik di subdomain
    const publicPaths = ['/', '/booking']
    const isPublic = publicPaths.some(p =>
      pathname === p || pathname.startsWith(p + '/')
    )

    // Login page subdomain → rewrite ke /t/[slug]/login
    if (pathname === '/login') {
      const url = req.nextUrl.clone()
      url.pathname = `/t/${slug}/login`
      return NextResponse.rewrite(url)
    }

    // Dashboard tenant → cek auth dulu
    if (pathname.startsWith('/dashboard')) {
      const res = NextResponse.next()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            ),
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.url))
      }

      // Rewrite dashboard ke /t/[slug]/dashboard/...
      const url = req.nextUrl.clone()
      url.pathname = `/t/${slug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Public pages → rewrite ke /t/[slug]/...
    if (isPublic) {
      const url = req.nextUrl.clone()
      url.pathname = `/t/${slug}${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }

    // Fallback → rewrite ke /t/[slug]/...
    const url = req.nextUrl.clone()
    url.pathname = `/t/${slug}${pathname}`
    return NextResponse.rewrite(url)
  }

  // ── DOMAIN UTAMA ──────────────────────────────────────────
  const protectedPaths = ['/', '/booking', '/laporan', '/pengaturan', '/kamar']
  const isProtected = protectedPaths.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  if (isProtected) {
    const res = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  }

  return NextResponse.next()
}