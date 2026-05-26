import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Plus, Minus, ShoppingBag, Coffee, Loader2, CheckCircle } from 'lucide-react'

interface CartItem {
  menuItemId: number
  name: string
  price: number
  quantity: number
}

export default function KioskMode() {
  const { slug } = useParams<{ slug: string }>()

  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null)
  const [successCountdown, setSuccessCountdown] = useState(30)
  const [idle, setIdle] = useState(false)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const IDLE_SECONDS = 60

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const { data: venue, isLoading } = trpc.venue.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  )

  const { data: menuItems } = trpc.venue.listMenu.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  )

  const createOrder = trpc.venue.createOrder.useMutation({
    onSuccess: (data) => {
      setPlacedOrderNumber(data.orderNumber)
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      let remaining = 30
      setSuccessCountdown(remaining)
      successTimer.current = setInterval(() => {
        remaining -= 1
        setSuccessCountdown(remaining)
        if (remaining <= 0) {
          if (successTimer.current) clearInterval(successTimer.current)
          setPlacedOrderNumber(null)
          resetIdle()
        }
      }, 1000)
    },
  })

  // ── Idle detection ──────────────────────────────────────────────────────────
  const resetIdle = useCallback(() => {
    setIdle(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      setIdle(true)
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setPlacedOrderNumber(null)
    }, IDLE_SECONDS * 1000)
  }, [])

  useEffect(() => {
    resetIdle()
    const events = ['mousedown', 'touchstart', 'keydown', 'mousemove']
    events.forEach(e => window.addEventListener(e, resetIdle))
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (successTimer.current) clearInterval(successTimer.current)
    }
  }, [resetIdle])

  if (isLoading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2EE' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: '#5E8B8B' }} />
      </div>
    )
  }

  if (!venue) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2EE' }}>
        <div style={{ textAlign: 'center' }}>
          <Coffee size={48} style={{ color: '#5E5E5E', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '1.5rem', color: '#181818', fontWeight: 400 }}>Venue Not Found</h1>
        </div>
      </div>
    )
  }

  const primaryColor = venue.primaryColor || '#181818'
  const accentColor = venue.accentColor || '#5E8B8B'
  const allItems = menuItems || []

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const addToCart = (item: { id: number; name: string; price: string }) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id)
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId)
      if (existing && existing.quantity > 1) return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c)
      return prev.filter(c => c.menuItemId !== menuItemId)
    })
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !venue?.id) return
    createOrder.mutate({
      venueId: venue.id,
      customerName: customerName || 'Guest',
      customerPhone: customerPhone || '0000000000',
      pickupTime: 'Now',
      items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      paymentMethod: 'pickup',
    })
  }

  // ── Idle screen ─────────────────────────────────────────────────────────────
  if (idle) {
    return (
      <div
        onClick={resetIdle}
        style={{
          height: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: primaryColor, color: '#F3F2EE', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {venue.logoUrl ? (
          <img src={venue.logoUrl} alt={venue.name} style={{ height: 96, objectFit: 'contain', marginBottom: 32 }} />
        ) : (
          <Coffee size={80} style={{ color: '#F3F2EE', marginBottom: 32, opacity: 0.8 }} />
        )}
        <h1 style={{ fontSize: '3rem', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 16 }}>{venue.name}</h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Touch to Order
        </p>
      </div>
    )
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (placedOrderNumber) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F3F2EE', padding: 40, textAlign: 'center',
      }}>
        <CheckCircle size={96} style={{ color: '#16a34a', marginBottom: 32 }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#181818', marginBottom: 16 }}>Order Placed!</h1>
        <p style={{ fontSize: '1.25rem', color: '#5E5E5E', marginBottom: 8 }}>Your order number is</p>
        <div style={{
          fontSize: '4rem', fontWeight: 900, color: primaryColor,
          letterSpacing: '-0.02em', marginBottom: 32, lineHeight: 1,
        }}>
          #{placedOrderNumber}
        </div>
        <p style={{ fontSize: '1.25rem', color: '#5E5E5E', marginBottom: 8 }}>
          Please wait for your number to be called.
        </p>
        <p style={{ fontSize: '1rem', color: '#9ca3af', marginTop: 32 }}>
          Returning to menu in {successCountdown}s…
        </p>
        <button
          onClick={() => {
            if (successTimer.current) clearInterval(successTimer.current)
            setPlacedOrderNumber(null)
            resetIdle()
          }}
          style={{
            marginTop: 24, padding: '14px 40px', borderRadius: 12, border: 'none',
            background: primaryColor, color: '#F3F2EE', fontSize: '1.1rem', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          New Order
        </button>
      </div>
    )
  }

  // ── Main kiosk UI ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#F3F2EE',
      fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{
        background: primaryColor, color: '#F3F2EE',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        {venue.logoUrl ? (
          <img src={venue.logoUrl} alt={venue.name} style={{ height: 48, objectFit: 'contain' }} />
        ) : (
          <Coffee size={36} style={{ color: '#F3F2EE' }} />
        )}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{venue.name}</h1>
        <div style={{ marginLeft: 'auto', fontSize: '0.875rem', opacity: 0.7 }}>Self-Service Order</div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Menu grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {allItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#5E5E5E' }}>
              <Coffee size={64} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '1.25rem' }}>Menu coming soon</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {allItems.map(item => {
                const qty = cart.find(c => c.menuItemId === item.id)?.quantity ?? 0
                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#fff', borderRadius: 16,
                      border: qty > 0 ? `2px solid ${accentColor}` : '2px solid transparent',
                      overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
                        onError={e => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    {!item.image && (
                      <div style={{ width: '100%', aspectRatio: '4 / 3', background: `${primaryColor}08`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coffee size={40} style={{ color: `${primaryColor}30` }} />
                      </div>
                    )}
                    <div style={{ padding: '16px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#181818', marginBottom: 4, lineHeight: 1.2 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8, lineHeight: 1.4, flex: 1 }}>{item.description}</div>
                      )}
                      {item.dietary && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {item.dietary.split(',').map(d => d.trim()).filter(Boolean).map(tag => (
                            <span key={tag} style={{ fontSize: '0.65rem', background: 'rgba(94,139,139,0.1)', color: '#5E8B8B', borderRadius: 99, padding: '2px 7px', fontWeight: 500 }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: accentColor }}>${Number(item.price).toFixed(2)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {qty > 0 && (
                            <>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                style={{
                                  minWidth: 48, minHeight: 48, borderRadius: 10, border: '2px solid rgba(24,24,24,0.15)',
                                  background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1.2rem',
                                }}
                              >
                                <Minus size={20} />
                              </button>
                              <span style={{ fontWeight: 700, fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => addToCart(item)}
                            style={{
                              minWidth: 48, minHeight: 48, borderRadius: 10, border: 'none',
                              background: primaryColor, color: '#F3F2EE', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Plus size={22} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div style={{
          width: 360, background: '#fff', borderLeft: '1px solid rgba(24,24,24,0.08)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Cart header */}
          <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingBag size={24} style={{ color: primaryColor }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#181818', margin: 0 }}>Your Order</h2>
              {cartCount > 0 && (
                <span style={{
                  background: primaryColor, color: '#F3F2EE',
                  borderRadius: 99, padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600,
                }}>
                  {cartCount}
                </span>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Add items from the menu</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cart.map(item => (
                  <div key={item.menuItemId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid rgba(24,24,24,0.06)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#181818', marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>${item.price.toFixed(2)} each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: String(item.price) })}
                        style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: primaryColor, color: '#F3F2EE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#181818', minWidth: 52, textAlign: 'right' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer details + CTA */}
          {cart.length > 0 && (
            <div style={{ padding: 20, borderTop: '2px solid rgba(24,24,24,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid rgba(24,24,24,0.15)', fontSize: '1rem',
                    background: '#F3F2EE', color: '#181818', outline: 'none',
                  }}
                />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone (optional)"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid rgba(24,24,24,0.15)', fontSize: '1rem',
                    background: '#F3F2EE', color: '#181818', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>Subtotal</span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>${cartTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#181818' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: primaryColor }}>${cartTotal.toFixed(2)}</span>
              </div>

              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(94,139,139,0.08)', borderRadius: 8, fontSize: '0.8rem', color: '#5E8B8B', textAlign: 'center' }}>
                💳 Pay at Counter
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={createOrder.isPending}
                style={{
                  width: '100%', padding: '18px 0', borderRadius: 14, border: 'none',
                  background: primaryColor, color: '#F3F2EE',
                  fontSize: '1.2rem', fontWeight: 700,
                  cursor: createOrder.isPending ? 'not-allowed' : 'pointer',
                  opacity: createOrder.isPending ? 0.7 : 1,
                  minHeight: 64,
                }}
              >
                {createOrder.isPending ? 'Placing Order…' : 'Place Order'}
              </button>
              {createOrder.error && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 8, textAlign: 'center' }}>{createOrder.error.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
