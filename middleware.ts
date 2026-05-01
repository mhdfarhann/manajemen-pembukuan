import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'inapku.online'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname

  // ── Deteksi apakah ini subdomain tenant ──────────────────
  const isSubdomain =
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}` &&
    hostname.endsWith(`.${BASE_DOMAIN}`)

  if (isSubdomain) {
    const slug = hostname.replace(`.${BASE_DOMAIN}`, '')

    // Rewrite ke /t/[slug]/[...path] — tidak mengubah URL di browser
    const url = req.nextUrl.clone()
    url.pathname = `/t/${slug}${pathname === '/' ? '' : pathname}`

    return NextResponse.rewrite(url)
    // Tidak perlu set header x-tenant-slug karena slug sudah ada di URL
  }

  // ── Untuk domain utama: proteksi dashboard ───────────────
  if (
    pathname.startsWith('/(dashboard)') ||
    pathname === '/' ||
    pathname.startsWith('/booking') ||
    pathname.startsWith('/laporan') ||
    pathname.startsWith('/pengaturan')
  ) {
    // Cek session Supabase
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
    if (!user && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  return NextResponse.next()
}