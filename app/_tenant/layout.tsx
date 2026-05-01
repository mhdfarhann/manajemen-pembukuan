//app/(tenant)/layout.tsx

import { headers }         from 'next/headers'
import { notFound }        from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import type { Metadata }   from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')
  if (!slug) return { title: 'Tidak Ditemukan' }

  const config = await getTenantBySlug(slug)
  if (!config) return { title: 'Tidak Ditemukan' }

  return {
    title:       config.tenant.nama,
    description: config.tenant.tagline ?? `Reservasi kamar di ${config.tenant.nama}`,
    openGraph: {
      title:  config.tenant.nama,
      images: config.theme.hero_image_url ? [config.theme.hero_image_url] : [],
    },
  }
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')
  if (!slug) notFound()

  const config = await getTenantBySlug(slug)
  if (!config) notFound()

  const { theme } = config

  const cssVars = `
    --primary:      ${theme.primary_color};
    --primary-dark: ${darken(theme.primary_color)};
    --secondary:    ${theme.secondary_color};
    --font-heading: '${theme.font_heading}', Georgia, serif;
    --font-body:    '${theme.font_body}', system-ui, sans-serif;
  `

  const fontQuery = [
    encodeURIComponent(theme.font_heading) + ':wght@400;600;700',
    encodeURIComponent(theme.font_body)    + ':wght@400;500',
  ].join('&family=')
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={fontUrl} rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
      {children}
    </>
  )
}

function darken(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - 40)
  const g = Math.max(0, ((n >> 8) & 0xff) - 40)
  const b = Math.max(0, (n & 0xff) - 40)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}