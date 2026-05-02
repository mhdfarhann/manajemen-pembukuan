'use client'
// components/landing-templates/template-elegant.tsx

import { useState, useEffect, useCallback } from 'react'
import type { Tenant, TenantTheme } from '@/types/tenant'
import type { KamarImage } from '@/lib/tenant'
import { formatRupiah } from '@/lib/harga'
import BookingForm from '@/components/landing-templates/booking-form'

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
  imageList: KamarImage[]
}

// ── nav link style constant ──────────────────────────────────────────────────
const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#374151',
  fontSize: 14,
  fontWeight: 500,
}

// ── helper sub-components ────────────────────────────────────────────────────

function SectionHeader({
  label, title, sub, primary, fHeading,
}: {
  label?: string
  title: string
  sub?: string
  primary: string
  fHeading: string
}) {
  return (
    <div style={{ marginBottom: 40, textAlign: 'center' }}>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: primary, marginBottom: 8,
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

function KamarCard({
  kamar, harga, images, primary, pDark, fHeading, onPesan,
}: {
  kamar: Kamar
  harga?: Harga
  images: KamarImage[]
  primary: string
  pDark: string
  fHeading: string
  onPesan: (k: Kamar) => void
}) {
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const allImages = images.length > 0 ? images : []

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #e5e7eb', overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {/* ── Area gambar ── */}
        <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: '#f3f4f6' }}>
          {allImages.length > 0 ? (
            <>
              <img
                src={allImages[imgIdx]?.url}
                alt={`Kamar ${kamar.nomor_kamar}`}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  cursor: 'pointer', transition: 'transform 0.3s',
                }}
                onClick={() => setLightbox(true)}
                onMouseEnter={(e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e: React.MouseEvent<HTMLImageElement>) => (e.currentTarget.style.transform = 'scale(1)')}
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setImgIdx(i => (i - 1 + allImages.length) % allImages.length) }}
                    style={{
                      position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)', border: 'none',
                      color: '#fff', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >‹</button>
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setImgIdx(i => (i + 1) % allImages.length) }}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)', border: 'none',
                      color: '#fff', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >›</button>

                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  }}>
                    {imgIdx + 1}/{allImages.length}
                  </div>
                </>
              )}

              {allImages.length > 1 && (
                <button
                  onClick={() => setLightbox(true)}
                  style={{
                    position: 'absolute', bottom: 8, left: 8,
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 11, padding: '3px 10px', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  🖼 {allImages.length} foto
                </button>
              )}
            </>
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#d1d5db', gap: 8,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span style={{ fontSize: 12 }}>Foto belum tersedia</span>
            </div>
          )}
        </div>

        {/* ── Info kamar ── */}
        <div style={{ padding: '18px 20px 20px' }}>
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
              background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
              padding: '3px 10px', borderRadius: 20,
            }}>
              Tersedia
            </span>
          </div>

          {kamar.catatan && (
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 14 }}>
              {kamar.catatan}
            </p>
          )}

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
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = pDark)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = primary)}
          >
            Pesan Kamar Ini
          </button>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && allImages.length > 0 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', width: 40, height: 40, borderRadius: '50%',
              cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          <img
            src={allImages[imgIdx]?.url}
            alt={`Foto ${imgIdx + 1}`}
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              objectFit: 'contain', borderRadius: 12,
            }}
            onClick={(e: React.MouseEvent<HTMLImageElement>) => e.stopPropagation()}
          />

          {allImages[imgIdx]?.caption && (
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 }}>
              {allImages[imgIdx].caption}
            </p>
          )}

          {allImages.length > 1 && (
            <div
              style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16 }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                style={lbBtnStyle}>‹</button>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                {imgIdx + 1} / {allImages.length}
              </span>
              <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                style={lbBtnStyle}>›</button>
            </div>
          )}

          {allImages.length > 1 && (
            <div
              style={{
                display: 'flex', gap: 8, marginTop: 16, maxWidth: '90vw',
                overflowX: 'auto', padding: '0 4px',
              }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {allImages.map((img, idx) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  onClick={() => setImgIdx(idx)}
                  style={{
                    width: 64, height: 48, objectFit: 'cover',
                    borderRadius: 6, cursor: 'pointer', flexShrink: 0,
                    border: `2px solid ${idx === imgIdx ? '#fff' : 'transparent'}`,
                    opacity: idx === imgIdx ? 1 : 0.55,
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const lbBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none',
  color: '#fff', width: 40, height: 40, borderRadius: '50%',
  cursor: 'pointer', fontSize: 22,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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

function imgNavBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%', transform: 'translateY(-50%)',
    [side]: 8,
    background: 'rgba(0,0,0,0.4)', color: '#fff',
    border: 'none', borderRadius: '50%',
    width: 28, height: 28,
    cursor: 'pointer', fontSize: 18, lineHeight: '28px',
    textAlign: 'center', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TemplateElegant({ tenant, theme, kamarList, hargaList, imageList }: Props) {
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [showBooking,   setShowBooking]   = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Hero slideshow
  const heroImages = imageList.length > 0
    ? imageList.map(img => img.url)
    : theme.hero_image_url
      ? [theme.hero_image_url]
      : []

  const [heroIdx, setHeroIdx] = useState(0)

  const nextHero = useCallback(() => {
    setHeroIdx(i => (i + 1) % heroImages.length)
  }, [heroImages.length])

  useEffect(() => {
    if (heroImages.length <= 1) return
    const t = setInterval(nextHero, 4500)
    return () => clearInterval(t)
  }, [heroImages.length, nextHero])

  // Map images per kamar
  const imagesByKamar = imageList.reduce<Record<string, KamarImage[]>>((acc, img) => {
    if (!acc[img.kamar_id]) acc[img.kamar_id] = []
    acc[img.kamar_id].push(img)
    return acc
  }, {})

  const lantaiList = [...new Set(kamarList.map(k => k.lantai))].sort()

  function getHarga(lantai: number, tipe: string): Harga | undefined {
    return hargaList.find(h => h.lantai === lantai && h.tipe === tipe)
      ?? hargaList.find(h => h.lantai === lantai)
  }

  function handlePesan(kamar: Kamar) {
    setSelectedKamar(kamar)
    setShowBooking(true)
  }

  const primary  = 'var(--primary)'
  const pDark    = 'var(--primary-dark)'
  const fHeading = 'var(--font-heading)'
  const fBody    = 'var(--font-body)'

  return (
    <div style={{ fontFamily: fBody, color: '#1a1a1a', background: '#fafaf8' }}>

      {/* ── NAVBAR ── */}
      <>
        <style>{`
          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .nav-burger   { display: flex !important; }
          }
          @media (min-width: 769px) {
            .nav-desktop  { display: flex !important; }
            .nav-burger   { display: none !important; }
            .nav-mobile   { display: none !important; }
          }
        `}</style>

        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '0 5%',
        }}>
          {/* Row utama */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Logo / Nama */}
            <a href="#" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              {theme.logo_url ? (
                <img
                  src={theme.logo_url}
                  alt={tenant.nama}
                  style={{ height: 40, maxWidth: 140, objectFit: 'contain' }}
                />
              ) : (
                <span style={{
                  fontFamily: fHeading, fontWeight: 700,
                  fontSize: 'clamp(14px, 4vw, 18px)',
                  color: primary, lineHeight: 1.2,
                }}>
                  {tenant.nama}
                </span>
              )}
            </a>

            {/* Desktop links */}
            <div className="nav-desktop" style={{ gap: 24, alignItems: 'center' }}>
              {[['#kamar','Kamar'],['#harga','Harga'],['#kontak','Kontak']].map(([href, label]) => (
                <a key={href} href={href} style={{ textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500 }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = primary)}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = '#374151')}
                >{label}</a>
              ))}
              <a href="#kamar" style={{
                background: primary, color: '#fff',
                padding: '9px 22px', borderRadius: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}>Pesan Sekarang</a>
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="nav-burger"
              onClick={() => setMobileMenuOpen(v => !v)}
              style={{
                display: 'none', flexDirection: 'column', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer', padding: 8,
              }}
              aria-label="Menu"
            >
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: 'block', width: 22, height: 2,
                  background: mobileMenuOpen ? primary : '#374151',
                  borderRadius: 2, transition: 'all 0.2s',
                  transform: mobileMenuOpen
                    ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
                    : i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'none'
                    : 'none',
                  opacity: mobileMenuOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="nav-mobile" style={{
              display: 'flex', flexDirection: 'column',
              borderTop: '1px solid #f3f4f6',
              padding: '12px 0 20px', gap: 4,
            }}>
              {[['#kamar','Kamar'],['#harga','Harga'],['#kontak','Kontak']].map(([href, label]) => (
                <a key={href} href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    textDecoration: 'none', color: '#374151',
                    fontSize: 15, fontWeight: 500,
                    padding: '12px 4px', borderBottom: '1px solid #f9fafb',
                  }}
                >{label}</a>
              ))}
              <a href="#kamar"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block', marginTop: 8,
                  background: primary, color: '#fff',
                  padding: '13px 0', borderRadius: 8,
                  textDecoration: 'none', fontSize: 15,
                  fontWeight: 600, textAlign: 'center',
                }}
              >Pesan Sekarang</a>
            </div>
          )}
        </nav>
      </>

      {/* ── HERO dengan slideshow ── */}
      <section style={{
        minHeight: '88vh',
        display: 'flex', alignItems: 'center',
        padding: '80px 5%',
        position: 'relative', overflow: 'hidden',
        color: heroImages.length > 0 ? '#fff' : '#1a1a1a',
      }}>
        {heroImages.length > 0 ? (
          <>
            {heroImages.map((url, idx) => (
              <div key={url} style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: idx === heroIdx ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: 0,
              }} />
            ))}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.55) 100%)',
            }} />
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${theme.primary_color}18 0%, ${theme.secondary_color}10 100%)`,
          }} />
        )}

        <div style={{ maxWidth: 680, position: 'relative', zIndex: 2 }}>
          <div style={{
            fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: heroImages.length > 0 ? 'rgba(255,255,255,0.75)' : primary,
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
              opacity: 0.88, margin: '0 0 36px', maxWidth: 520,
            }}>
              {tenant.tagline}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#kamar" style={{
              background: primary, color: '#fff',
              padding: '14px 32px', borderRadius: 10,
              textDecoration: 'none', fontSize: 15, fontWeight: 600,
            }}>
              Lihat Kamar Tersedia
            </a>
            <a href="#kontak" style={{
              background: 'transparent',
              border: `2px solid ${heroImages.length > 0 ? 'rgba(255,255,255,0.6)' : primary}`,
              color: heroImages.length > 0 ? '#fff' : primary,
              padding: '14px 32px', borderRadius: 10,
              textDecoration: 'none', fontSize: 15, fontWeight: 500,
            }}>
              Hubungi Kami
            </a>
          </div>

          {kamarList.length > 0 && (
            <div style={{
              marginTop: 32, display: 'inline-flex', alignItems: 'center', gap: 8,
              background: heroImages.length > 0 ? 'rgba(255,255,255,0.15)' : `${theme.primary_color}15`,
              border: `1px solid ${heroImages.length > 0 ? 'rgba(255,255,255,0.3)' : `${theme.primary_color}30`}`,
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {kamarList.length} kamar tersedia saat ini
            </div>
          )}
        </div>

        {heroImages.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)', zIndex: 3,
            display: 'flex', gap: 8,
          }}>
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroIdx(idx)}
                style={{
                  width: idx === heroIdx ? 24 : 8,
                  height: 8, borderRadius: 4,
                  background: idx === heroIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── KAMAR TERSEDIA ── */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
                    fontWeight: 600, letterSpacing: '0.1em',
                    color: primary, background: `${theme.primary_color}12`,
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    LANTAI {lantai}
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20,
                }}>
                  {kamarList
                    .filter(k => k.lantai === lantai)
                    .map(kamar => (
                      <KamarCard
                        key={kamar.id}
                        kamar={kamar}
                        harga={getHarga(kamar.lantai, kamar.tipe)}
                        images={imagesByKamar[kamar.id] ?? []}
                        primary={primary}
                        pDark={pDark}
                        fHeading={fHeading}
                        onPesan={handlePesan}
                      />
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── HARGA ── */}
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
                border: '1px solid #e5e7eb', padding: '28px 24px',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                  color: primary, textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Lantai {h.lantai} · {h.tipe}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Per bulan</div>
                  <div style={{ fontFamily: fHeading, fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                    {formatRupiah(h.harga_bulanan)}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {h.harga_mingguan && <PriceRow label="Per minggu" value={formatRupiah(h.harga_mingguan)} />}
                  {h.harga_harian  && <PriceRow label="Per hari"   value={formatRupiah(h.harga_harian)} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESKRIPSI ── */}
      {tenant.deskripsi && (
        <section style={{ padding: '80px 5%', background: '#fff' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <SectionHeader label="Tentang Kami" title={tenant.nama} primary={primary} fHeading={fHeading} />
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>{tenant.deskripsi}</p>
          </div>
        </section>
      )}

      {/* ── LOKASI & MAP ── */}
      {tenant.alamat && (
        <section style={{ padding: '80px 5%', background: '#fff' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <SectionHeader
              label="Lokasi Kami"
              title="Temukan Kami"
              sub={tenant.alamat}
              primary={primary}
              fHeading={fHeading}
            />

            <div style={{
              borderRadius: 20, overflow: 'hidden',
              border: '1px solid #e5e7eb',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              position: 'relative',
            }}>
              {/* Google Maps Embed */}
              <iframe
                src={tenant.alamat ? `https://maps.google.com/maps?q=${encodeURIComponent(tenant.alamat)}&output=embed&z=17&hl=id` : ''}
                width="100%"
                height="400"
                style={{ border: 'none', display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi penginapan"
              />

              {/* Tombol buka di Google Maps — pakai share link jika ada, fallback ke alamat */}
              <a
                href={tenant.maps_url ?? `https://maps.google.com/maps?q=${encodeURIComponent(tenant.alamat ?? '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: 'absolute', bottom: 16, right: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#fff', color: '#1a1a1a',
                  padding: '10px 16px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)')}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Buka di Google Maps
              </a>
            </div>

            {/* Info tambahan di bawah map */}
            <div style={{
              display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap',
            }}>
              <div style={{
                flex: 1, minWidth: 200,
                background: '#f9fafb', borderRadius: 12,
                padding: '16px 20px', border: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${theme.primary_color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alamat</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{tenant.alamat}</div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── KONTAK ── */}
      <section id="kontak" style={{ padding: '80px 5%', background: `${theme.primary_color}08` }}>
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
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', color: '#374151', border: '1px solid #e5e7eb',
                padding: '14px 28px', borderRadius: 10,
                textDecoration: 'none', fontWeight: 500, fontSize: 15,
              }}>
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

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#1a1a1a', color: '#9ca3af',
        padding: '28px 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, fontSize: 13,
      }}>
        <span style={{ fontFamily: fHeading, color: '#fff', fontWeight: 600 }}>{tenant.nama}</span>
        <span>© {new Date().getFullYear()} · Semua hak dilindungi</span>
      </footer>

      {/* ── MODAL BOOKING ── */}
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