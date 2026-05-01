// app/t/[slug]/page.tsx

import { notFound }    from 'next/navigation'
import { getTenantBySlug, getKamarByTenant, getHargaByTenant } from '@/lib/tenant'
import TemplateElegant from '@/components/landing-templates/template-elegant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TenantPage({ params }: Props) {
  const { slug } = await params

  console.log('📄 TenantPage render → slug:', slug)

  const config = await getTenantBySlug(slug)

  console.log('📄 config.tenant.id:', config?.tenant.id)
  console.log('📄 config.tenant.slug:', config?.tenant.slug)
  console.log('📄 config.tenant.nama:', config?.tenant.nama)

  if (!config) notFound()

  const [kamarList, hargaRaw] = await Promise.all([
    getKamarByTenant(config.tenant.id),
    getHargaByTenant(config.tenant.id),
  ])

  console.log('📄 kamarList.length:', kamarList.length)
  console.log('📄 hargaRaw.length:', hargaRaw.length)

  const hargaList = hargaRaw.filter(
    (h): h is typeof h & { lantai: number } => h.lantai !== null
  )

  switch (config.theme.template) {
    case 'elegant':
    default:
      return (
        <TemplateElegant
          tenant={config.tenant}
          theme={config.theme}
          kamarList={kamarList}
          hargaList={hargaList}
        />
      )
  }
}