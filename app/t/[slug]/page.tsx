// app/t/[slug]/page.tsx

import { notFound } from 'next/navigation'
import {
  getTenantBySlug,
  getKamarByTenant,
  getHargaByTenant,
  getImagesByTenant,
} from '@/lib/tenant'
import TemplateElegant from '@/components/landing-templates/template-elegant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TenantPage({ params }: Props) {
  const { slug } = await params

  const config = await getTenantBySlug(slug)
  if (!config) notFound()

  const [kamarList, hargaRaw, imageList] = await Promise.all([
    getKamarByTenant(config.tenant.id),
    getHargaByTenant(config.tenant.id),
    getImagesByTenant(config.tenant.id),
  ])

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
          imageList={imageList}
        />
      )
  }
}