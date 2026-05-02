//t/[slug]/layout.tsx

import { notFound }        from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import type { Metadata }   from 'next'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    const config = await getTenantBySlug(slug)
    if (!config) return { title: 'Tidak Ditemukan' }

    const { tenant, theme } = config
    const logoUrl      = theme.logo_url      ?? null
    const heroImageUrl = theme.hero_image_url ?? null

    return {
      title:       tenant.nama,
      description: tenant.tagline ?? `Reservasi kamar di ${tenant.nama}`,
      ...(heroImageUrl && {
        openGraph: {
          title:  tenant.nama,
          images: [heroImageUrl],
        },
      }),
      ...(logoUrl && {
        icons: {
          icon:     logoUrl,
          shortcut: logoUrl,
          apple:    logoUrl,
        },
      }),
    }
  } catch (e) {
    console.error('generateMetadata error:', e)
    return { title: 'Penginapan' }
  }
}

export default async function TenantLayout({ children, params }: Props) {
  try {
    const { slug } = await params
    console.log('🏗️ TenantLayout start:', slug)

    const config = await getTenantBySlug(slug)
    console.log('🏗️ config:', !!config)
    if (!config) notFound()

    const { theme } = config
    console.log('🏗️ theme.primary_color:', theme.primary_color)
    console.log('🏗️ theme.font_heading:', theme.font_heading)
    console.log('🏗️ theme.font_body:', theme.font_body)

    const cssVars = `
      --primary:      ${theme.primary_color};
      --primary-dark: ${darken(theme.primary_color)};
      --secondary:    ${theme.secondary_color};
      --font-heading: '${theme.font_heading}', Georgia, serif;
      --font-body:    '${theme.font_body}', system-ui, sans-serif;
    `
    console.log('🏗️ cssVars ok')

    const fontQuery = [
      encodeURIComponent(theme.font_heading) + ':wght@400;600;700',
      encodeURIComponent(theme.font_body)    + ':wght@400;500',
    ].join('&family=')
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`
    console.log('🏗️ fontUrl:', fontUrl)

    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontUrl} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
        {children}
      </>
    )
  } catch (e) {
    console.error('🔴 TenantLayout crash:', e)
    throw e
  }
}

function darken(hex: string): string {
  try {
    const clean = hex?.replace('#', '')
    if (!clean || clean.length < 6) return hex ?? '#1a1a1a'
    const n = parseInt(clean, 16)
    if (isNaN(n)) return hex
    const r = Math.max(0, (n >> 16) - 40)
    const g = Math.max(0, ((n >> 8) & 0xff) - 40)
    const b = Math.max(0, (n & 0xff) - 40)
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return '#1a1a1a'
  }
}