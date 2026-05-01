'use client'
// components/landing-templates/template-elegant.tsx
// Template minimalis dengan nuansa natural/earthy
// Menerima semua data dari Server Component (page.tsx) — tidak ada fetch di sini

import { useState }      from 'react'
import type { Tenant, TenantTheme } from '@/types/tenant'
import { formatRupiah }  from '@/lib/harga'
import BookingForm       from '@/components/landing-templates/booking-form'

interface Kamar {
  id: string
  nomor_kamar: string
  lantai: number
  tipe: string
  status: string
  catatan: string | null
}

interface Harga {
  lantai: number
  tipe: string
  harga_harian: number | null
  harga_mingguan: number | null
  harga_bulanan: number
}

interface Props {
  tenant:    Tenant
  theme:     TenantTheme
  kamarList: Kamar[]
  hargaList: Harga[]
}

export default function TemplateElegant({ tenant, theme, kamarList, hargaList }: Props) {
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [showBooking,   setShowBooking]   = useState(false)

  // Kelompokkan kamar per lantai
  const lantaiList = [...new Set(kamarList.map(k => k.lantai))].sort()

  function getHarga(lantai: number, tipe: string): Harga | undefined {
    return hargaList.find(h => h.lantai === lantai && h.tipe === tipe)
      ?? hargaList.find(h => h.lantai === lantai)
  }

  function handlePesan(kamar: Kamar) {
    setSelectedKamar(kamar)
    setShowBooking(true)
  }

  const primary   = 'var(--primary)'
  const pDark     = 'var(--primary-dark)'
  const fHeading  = 'var(--font-heading)'
  const fBody     = 'var(--font-body)'

  return (
    <div style={{ fontFamily: fBody, color: '#1a1a1a', background: '#fafaf8' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {theme.logo_url
            ? <img src={theme.logo_url} alt={tenant.nama} style={{ height: 36, objectFit: 'contain' }} />
            : <span style={{ fontFamily: fHeading, fontWeight: 700, fontSize: 20, color: primary }}>
                {tenant.nama}
              </span>
          }
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#kamar"     style={navLinkStyle}>Kamar</a>
          <a href="#harga"     style={navLinkStyle}>Harga</a>
          <a href="#kontak"    style={navLinkStyle}>Kontak</a>
          <a
            href="#kamar"
            style={{
              background: primary, color: '#fff',
              padding: '8px 20px', borderRadius: 8,
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = pDark)}
            onMouseLeave={e => (e.currentTarget.style.background = primary)}
          >
            Pesan Sekarang
          </a>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '88vh',
        display: 'flex', alignItems: 'center',
        padding: '80px 5%',
        position: 'relative', overflow: 'hidden',
        background: theme.hero_image_url
          ? `linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.3)), url(${theme.hero_image_url}) center/cover no-repeat`
          : `linear-gradient(135deg, ${theme.primary_color}18 0%, ${theme.secondary_color}10 100%)`,
        color: theme.hero_image_url ? '#fff' : '#1a1a1a',
      }}>
        <div style={{ maxWidth: 680, position: 'relative', zIndex: 1 }}>
          {/* Ornamen tipografi kecil */}
          <div style={{
            fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: theme.hero_image_url ? 'rgba(255,255,255,0.7)' : primary,
            marginBottom: 16, fontWeight: 500,
          }}>
            Selamat Datang di
          </div>

          <h1 style={{
            fontFamily: fHeading, fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700, lineHeight: 1.15, margin: '0 0 20px',
          }}>
            {tenant.nama}
          </h1>

          {tenant.tagline && (
            <p style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)', lineHeight: 1.6,
              opacity: 0.85, margin: '0 0 36px', maxWidth: 520,
            }}>
              {tenant.tagline}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="#kamar"
              style={{
                background: primary, color: '#fff',
                padding: '14px 32px', borderRadius: 10,
                textDecoration: 'none', fontSize: 15, fontWeight: 600,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = pDark)}
              onMouseLeave={e => (e.currentTarget.style.background = primary)}
            >
              Lihat Kamar Tersedia
            </a>
            <a
              href="#kontak"
              style={{
                background: 'transparent',
                border: `2px solid ${theme.hero_image_url ? 'rgba(255,255,255,0.6)' : primary}`,
                color: theme.hero_image_url ? '#fff' : primary,
                padding: '14px 32px', borderRadius: 10,
                textDecoration: 'none', fontSize: 15, fontWeight: 500,
              }}
            >
              Hubungi Kami
            </a>
          </div>

          {/* Badge kamar tersedia */}
          {kamarList.length > 0 && (
            <div style={{
              marginTop: 32, display: 'inline-flex', alignItems: 'center', gap: 8,
              background: theme.hero_image_url ? 'rgba(255,255,255,0.15)' : `${primary}15`,
              border: `1px solid ${theme.hero_image_url ? 'rgba(255,255,255,0.3)' : `${primary}30`}`,
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {kamarList.length} kamar tersedia saat ini
            </div>
          )}
        </div>
      </section>

      {/* ── KAMAR TERSEDIA ─────────────────────────────────────────────── */}
      <section id="kamar" style={{ padding: '80px 5%', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader
            label="Pilih Kamar"
            title="Kamar Tersedia"
            sub="Semua kamar di bawah ini siap untuk ditempati"
            primary={primary}
            fHeading={fHeading}
          />

          {kamarList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: '#f9fafb', borderRadius: 16,
              border: '1px dashed #d1d5db',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
              <p style={{ color: '#6b7280', fontSize: 15 }}>
                Semua kamar sedang terisi. Hubungi kami untuk informasi lebih lanjut.
              </p>
            </div>
          ) : (
            lantaiList.map(lantai => (
              <div key={lantai} style={{ marginBottom: 48 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
                    fontWeight: 600, letterSpacing: '0.1em',
                    color: primary, background: `${primary}12`,
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    LANTAI {lantai}
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 20,
                }}>
                  {kamarList
                    .filter(k => k.lantai === lantai)
                    .map(kamar => {
                      const harga = getHarga(kamar.lantai, kamar.tipe)
                      return (
                        <KamarCard
                          key={kamar.id}
                          kamar={kamar}
                          harga={harga}
                          primary={primary}
                          pDark={pDark}
                          fHeading={fHeading}
                          onPesan={handlePesan}
                        />
                      )
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── HARGA ──────────────────────────────────────────────────────── */}
      <section id="harga" style={{ padding: '80px 5%', background: '#fafaf8' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionHeader
            label="Transparansi Harga"
            title="Daftar Harga"
            sub="Harga sudah termasuk semua fasilitas, tanpa biaya tersembunyi"
            primary={primary}
            fHeading={fHeading}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}>
            {hargaList.map((h, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: '28px 24px',
                transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                  color: primary, textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Lantai {h.lantai} · {h.tipe}
                </div>

                {/* Harga bulanan sebagai highlight */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Per bulan</div>
                  <div style={{ fontFamily: fHeading, fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                    {formatRupiah(h.harga_bulanan)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {h.harga_mingguan && (
                    <PriceRow label="Per minggu" value={formatRupiah(h.harga_mingguan)} />
                  )}
                  {h.harga_harian && (
                    <PriceRow label="Per hari"   value={formatRupiah(h.harga_harian)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TENTANG / DESKRIPSI ────────────────────────────────────────── */}
      {tenant.deskripsi && (
        <section style={{ padding: '80px 5%', background: '#fff' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <SectionHeader
              label="Tentang Kami"
              title={tenant.nama}
              primary={primary}
              fHeading={fHeading}
            />
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
              {tenant.deskripsi}
            </p>
          </div>
        </section>
      )}

      {/* ── KONTAK ─────────────────────────────────────────────────────── */}
      <section id="kontak" style={{ padding: '80px 5%', background: `${primary}08` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <SectionHeader
            label="Hubungi Kami"
            title="Ada Pertanyaan?"
            sub="Tim kami siap membantu kamu menemukan kamar yang tepat"
            primary={primary}
            fHeading={fHeading}
          />

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {tenant.nomor_hp && (
              <a
                href={`https://wa.me/${tenant.nomor_hp.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#25d366', color: '#fff',
                  padding: '14px 28px', borderRadius: 10,
                  textDecoration: 'none', fontWeight: 600, fontSize: 15,
                }}
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            )}
            {tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', color: '#374151',
                  border: '1px solid #e5e7eb',
                  padding: '14px 28px', borderRadius: 10,
                  textDecoration: 'none', fontWeight: 500, fontSize: 15,
                }}
              >
                {tenant.email}
              </a>
            )}
          </div>

          {tenant.alamat && (
            <p style={{ marginTop: 28, color: '#6b7280', fontSize: 14 }}>
              📍 {tenant.alamat}
            </p>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#1a1a1a', color: '#9ca3af',
        padding: '28px 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, fontSize: 13,
      }}>
        <span style={{ fontFamily: fHeading, color: '#fff', fontWeight: 600 }}>
          {tenant.nama}
        </span>
        <span>© {new Date().getFullYear()} · Semua hak dilindungi</span>
      </footer>

      {/* ── MODAL BOOKING ──────────────────────────────────────────────── */}
      {showBooking && selectedKamar && (
        <BookingForm
          kamar={selectedKamar}
          tenantId={tenant.id}
          primary={primary}
          fHeading={fHeading}
          onClose={() => { setShowBooking(false); setSelectedKamar(null) }}
          onSuccess={() => { setShowBooking(false); setSelectedKamar(null) }}
        />
      )}
    </div>
  )
}

// ── Sub-komponen ──────────────────────────────────────────────────────────

function SectionHeader({ label, title, sub, primary, fHeading }: {
  label?: string; title: string; sub?: string
  primary: string; fHeading: string
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: primary, marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <h2 style={{
        fontFamily: fHeading, fontSize: 'clamp(26px, 4vw, 38px)',
        fontWeight: 700, margin: '0 0 12px', color: '#1a1a1a',
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>{sub}</p>
      )}
    </div>
  )
}

function KamarCard({ kamar, harga, primary, pDark, fHeading, onPesan }: {
  kamar: Kamar; harga?: Harga
  primary: string; pDark: string; fHeading: string
  onPesan: (k: Kamar) => void
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #e5e7eb', overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header warna */}
      <div style={{
        height: 6,
        background: `linear-gradient(to right, ${primary}, ${pDark})`,
      }} />

      <div style={{ padding: '20px 20px 20px' }}>
        {/* Nomor & tipe */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: fHeading, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
              {kamar.nomor_kamar}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize', marginTop: 2 }}>
              {kamar.tipe}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            background: '#dcfce7', color: '#16a34a',
            border: '1px solid #bbf7d0',
            padding: '3px 10px', borderRadius: 20,
          }}>
            Tersedia
          </span>
        </div>

        {/* Catatan kamar */}
        {kamar.catatan && (
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 14 }}>
            {kamar.catatan}
          </p>
        )}

        {/* Harga */}
        {harga && (
          <div style={{
            background: '#f9fafb', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Mulai dari</div>
            {harga.harga_harian && (
              <div style={{ fontSize: 13, color: '#374151' }}>
                <strong>{formatRupiah(harga.harga_harian)}</strong>
                <span style={{ color: '#9ca3af' }}> / hari</span>
              </div>
            )}
            <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>
              <strong>{formatRupiah(harga.harga_bulanan)}</strong>
              <span style={{ color: '#9ca3af' }}> / bulan</span>
            </div>
          </div>
        )}

        <button
          onClick={() => onPesan(kamar)}
          style={{
            width: '100%', padding: '11px 0',
            background: primary, color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = pDark)}
          onMouseLeave={e => (e.currentTarget.style.background = primary)}
        >
          Pesan Kamar Ini
        </button>
      </div>
    </div>
  )
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{value}</span>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontSize: 14, color: '#374151', textDecoration: 'none',
  fontWeight: 500, transition: 'color 0.15s',
}