import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
    //                                              ^^^^^ tambah ini
  ],
}

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'inapku.online'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname

  // ── Deteksi subdomain tenant ──────────────────────────────
  const isSubdomain =
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}` &&
    hostname.endsWith(`.${BASE_DOMAIN}`)

  if (isSubdomain) {
    const slug = hostname.replace(`.${BASE_DOMAIN}`, '')

    // Kalau akses /login dari subdomain → redirect ke domain utama
    if (pathname === '/login') {
      return NextResponse.redirect(new URL(`https://${BASE_DOMAIN}/login`))
    }

    // Rewrite ke /t/[slug]/[...path]
    const url = req.nextUrl.clone()
    url.pathname = `/t/${slug}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // ── Domain utama: proteksi dashboard ─────────────────────
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