import { useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Coffee, Printer } from 'lucide-react'

export default function MenuCardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const { data: venue, isLoading } = trpc.venue.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  )

  const { data: menuItems } = trpc.venue.listMenu.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  )

  useEffect(() => {
    if (!slug) return
    const url = `${window.location.origin}/v/${slug}`
    QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#181818', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch((err: unknown) => console.error('[menu-card qr]', err))
  }, [slug])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2EE' }}>
        <Coffee size={32} className="animate-pulse" style={{ color: '#5E8B8B' }} />
      </div>
    )
  }

  if (!venue) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2EE' }}>
        <p style={{ color: '#5E5E5E' }}>Venue not found.</p>
      </div>
    )
  }

  const primaryColor = venue.primaryColor || '#181818'
  const accentColor = venue.accentColor || '#5E8B8B'
  const allItems = menuItems || []

  // Group by category
  const categories = [...new Set(allItems.map(i => i.category || 'Other'))].filter(Boolean)
  const grouped: Record<string, typeof allItems> = {}
  for (const cat of categories) {
    grouped[cat] = allItems.filter(i => (i.category || 'Other') === cat)
  }

  const venueUrl = `${window.location.origin}/v/${venue.slug}`

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print" style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: primaryColor, color: '#F3F2EE',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <Printer size={16} />
          Screenshot / Print
        </button>
      </div>

      {/* Card wrapper */}
      <div style={{
        minHeight: '100dvh', background: '#e5e7eb',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
      }}>
        <div style={{
          maxWidth: 390, width: '100%',
          background: '#FAFAF8',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          animation: 'fadeIn 0.4s ease',
        }}>
          {/* Venue header */}
          <div style={{
            background: primaryColor,
            padding: '36px 28px 28px',
            textAlign: 'center',
            color: '#F3F2EE',
          }}>
            {venue.logoUrl ? (
              <img
                src={venue.logoUrl}
                alt={venue.name}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  objectFit: 'cover', margin: '0 auto 16px',
                  border: '3px solid rgba(255,255,255,0.25)',
                }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Coffee size={32} style={{ color: '#F3F2EE' }} />
              </div>
            )}
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 700,
              letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.1,
            }}>
              {venue.name}
            </h1>
            {venue.description && (
              <p style={{
                fontSize: '0.8rem', opacity: 0.75, margin: 0,
                lineHeight: 1.5, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto',
              }}>
                {venue.description}
              </p>
            )}
            {venue.address && (
              <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '8px 0 0' }}>
                📍 {venue.address}
              </p>
            )}
          </div>

          {/* Menu sections */}
          <div style={{ padding: '20px 20px 0' }}>
            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                <Coffee size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Menu coming soon</p>
              </div>
            ) : categories.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                {/* Category heading */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <div style={{ flex: 1, height: 1, background: `${primaryColor}15` }} />
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: primaryColor, padding: '0 8px',
                  }}>
                    {cat}
                  </span>
                  <div style={{ flex: 1, height: 1, background: `${primaryColor}15` }} />
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {grouped[cat].map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '8px 4px',
                        borderBottom: idx < grouped[cat].length - 1 ? '1px solid rgba(24,24,24,0.05)' : 'none',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', lineHeight: 1.3 }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{
                            fontSize: '0.7rem', color: '#6b7280', marginTop: 2,
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          } as React.CSSProperties}>
                            {item.description}
                          </div>
                        )}
                        {item.dietary && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                            {item.dietary.split(',').map(d => d.trim()).filter(Boolean).slice(0, 3).map(tag => (
                              <span key={tag} style={{
                                fontSize: '0.6rem', background: `${accentColor}15`,
                                color: accentColor, borderRadius: 99, padding: '1px 6px', fontWeight: 500,
                              }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontWeight: 700, fontSize: '0.9rem', color: accentColor,
                        flexShrink: 0, paddingTop: 2,
                      }}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ margin: '4px 20px', height: 1, background: `${primaryColor}10` }} />

          {/* QR + Order online CTA */}
          <div style={{
            padding: '20px 20px 28px',
            textAlign: 'center',
          }}>
            {qrDataUrl && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={qrDataUrl}
                  alt="Order online QR code"
                  style={{
                    width: 120, height: 120, borderRadius: 12,
                    margin: '0 auto', display: 'block',
                    border: `3px solid ${primaryColor}12`,
                  }}
                />
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 4px' }}>
              Scan to order online
            </p>
            <a
              href={venueUrl}
              style={{
                fontSize: '0.8rem', fontWeight: 700, color: accentColor,
                textDecoration: 'none', letterSpacing: '0.02em',
              }}
            >
              Order online →
            </a>
            <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '12px 0 0' }}>
              {venueUrl}
            </p>
          </div>

          {/* Footer branding */}
          <div style={{
            background: `${primaryColor}08`,
            padding: '10px 20px',
            textAlign: 'center',
            borderTop: `1px solid ${primaryColor}10`,
          }}>
            <span style={{ fontSize: '0.6rem', color: '#9ca3af', letterSpacing: '0.06em' }}>
              POWERED BY B1 PLATFORM
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
