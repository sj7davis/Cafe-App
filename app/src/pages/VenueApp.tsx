import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ShoppingBag, ClipboardList, Star, User,
  Plus, Minus, X, Coffee, Loader2, CheckCircle,
} from 'lucide-react'

const TEAL = '#5E8B8B'

interface CartItem {
  menuItemId: number
  name: string
  price: number
  quantity: number
}

type AppTab = 'order' | 'my-orders' | 'loyalty' | 'profile'

export default function VenueApp() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AppTab>('order')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null)

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
      setCart([])
      setPlacedOrderNumber(data.orderNumber)
      setShowCartDrawer(true)
    },
  })

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

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
      pickupTime: 'ASAP',
      items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin" style={{ color: TEAL }} />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-8">
        <div>
          <Coffee size={40} style={{ color: TEAL }} className="mx-auto mb-4" />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#181818' }}>Cafe Not Found</h1>
        </div>
      </div>
    )
  }

  const primaryColor = (venue as { primaryColor?: string }).primaryColor || TEAL

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Top Bar */}
      <header style={{ background: primaryColor, color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {(venue as { logoUrl?: string }).logoUrl ? (
          <img src={(venue as { logoUrl?: string }).logoUrl} alt={venue.name} style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Coffee size={18} color="#fff" />
          </div>
        )}
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{venue.name}</h1>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: cartCount > 0 ? 120 : 72 }}>
        {activeTab === 'order' && (
          <OrderTab
            menuItems={(menuItems || []) as { id: number; name: string; price: string; description: string | null; category: string; image: string | null }[]}
            cart={cart}
            onAdd={addToCart}
            onRemove={removeFromCart}
            accentColor={primaryColor}
          />
        )}
        {activeTab === 'my-orders' && (
          <MyOrdersTab venueId={venue.id} onSetCart={setCart} navigate={navigate} slug={venue.slug} />
        )}
        {activeTab === 'loyalty' && (
          <LoyaltyAppTab venueId={venue.id} />
        )}
        {activeTab === 'profile' && (
          <ProfileAppTab venueId={venue.id} venueName={venue.name} />
        )}
      </div>

      {/* Floating cart summary */}
      {cartCount > 0 && activeTab === 'order' && (
        <button
          onClick={() => setShowCartDrawer(true)}
          style={{
            position: 'fixed', bottom: 72, left: 16, right: 16, zIndex: 40,
            background: '#181818', color: '#fff', border: 'none', borderRadius: 12,
            padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}
        >
          <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (!placedOrderNumber) setShowCartDrawer(false) }}
        >
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, maxHeight: '85dvh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#181818', margin: 0 }}>Your Order</h2>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#9ca3af" />
              </button>
            </div>

            {placedOrderNumber ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#181818', marginBottom: 8 }}>Order Confirmed!</h3>
                <div style={{ fontSize: 28, fontWeight: 800, color: TEAL, marginBottom: 20 }}>#{placedOrderNumber}</div>
                <button
                  onClick={() => { setPlacedOrderNumber(null); setShowCartDrawer(false) }}
                  style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#181818' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>${item.price.toFixed(2)} each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => removeFromCart(item.menuItemId)} style={qtyBtn}><Minus size={13} /></button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: String(item.price) })} style={qtyBtn}><Plus size={13} /></button>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input placeholder="Your name" value={customerName} onChange={e => setCustomerName(e.target.value)} style={inputStyle} />
                  <input placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={inputStyle} type="tel" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#181818', padding: '8px 0' }}>
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={createOrder.isPending || cart.length === 0}
                    style={{ padding: '14px 0', borderRadius: 10, border: 'none', background: primaryColor, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {createOrder.isPending ? 'Placing Order…' : 'Place Order'}
                  </button>
                  {createOrder.error && <p style={{ fontSize: 12, color: '#ef4444' }}>{createOrder.error.message}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
      }}>
        {([
          { tab: 'order' as AppTab, icon: <ShoppingBag size={22} />, label: 'Order' },
          { tab: 'my-orders' as AppTab, icon: <ClipboardList size={22} />, label: 'My Orders' },
          { tab: 'loyalty' as AppTab, icon: <Star size={22} />, label: 'Loyalty' },
          { tab: 'profile' as AppTab, icon: <User size={22} />, label: 'Profile' },
        ]).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 0 8px', border: 'none', background: 'none',
              color: activeTab === tab ? primaryColor : '#9ca3af',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── Order Tab ────────────────────────────────────────────────────────────────
function OrderTab({
  menuItems, cart, onAdd, onRemove, accentColor,
}: {
  menuItems: { id: number; name: string; price: string; description: string | null; category: string; image: string | null }[]
  cart: CartItem[]
  onAdd: (item: { id: number; name: string; price: string }) => void
  onRemove: (id: number) => void
  accentColor: string
}) {
  const categories = [...new Set(menuItems.map(i => i.category))]

  return (
    <div style={{ padding: '16px 16px 8px' }}>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {menuItems.filter(i => i.category === cat).map(item => {
              const qty = cart.find(c => c.menuItemId === item.id)?.quantity ?? 0
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  {item.image && (
                    <img src={item.image} alt={item.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 2 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</div>}
                    <div style={{ fontSize: 14, fontWeight: 700, color: accentColor, marginBottom: 8 }}>${Number(item.price).toFixed(2)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {qty > 0 && (
                        <>
                          <button onClick={() => onRemove(item.id)} style={qtyBtn}><Minus size={12} /></button>
                          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                        </>
                      )}
                      <button
                        onClick={() => onAdd(item)}
                        style={{ flex: qty === 0 ? 'unset' : undefined, width: qty === 0 ? '100%' : 28, height: 28, borderRadius: qty === 0 ? 8 : 6, border: 'none', background: '#181818', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: qty === 0 ? 600 : undefined }}
                      >
                        {qty === 0 ? 'Add' : <Plus size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {menuItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <Coffee size={40} className="mx-auto mb-4 opacity-30" />
          <p>Menu coming soon</p>
        </div>
      )}
    </div>
  )
}

// ─── My Orders Tab ────────────────────────────────────────────────────────────
function MyOrdersTab({ venueId, onSetCart, navigate, slug }: { venueId: number; onSetCart: (items: CartItem[]) => void; navigate: ReturnType<typeof useNavigate>; slug: string }) {
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '')
  const [submitted, setSubmitted] = useState(!!phone)

  const { data: orders, isLoading } = trpc.venue.getOrdersByPhone.useQuery(
    { venueId, phone, limit: 20 },
    { enabled: submitted && !!phone }
  )

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#3b82f6', ready: '#10b981', completed: '#6b7280',
  }

  return (
    <div style={{ padding: 16 }}>
      {!submitted ? (
        <div style={{ paddingTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#181818', marginBottom: 10 }}>Enter your phone to view orders</div>
          <input
            placeholder="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            type="tel"
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <button
            onClick={() => { localStorage.setItem('b1-phone', phone); setSubmitted(true) }}
            disabled={phone.length < 8}
            style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: phone.length < 8 ? 0.5 : 1 }}
          >
            View My Orders
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: TEAL }} /></div>
      ) : !orders || orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p style={{ fontSize: 14 }}>No orders found for this number</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(orders as { id: number; orderNumber: string; createdAt: string; status: string; totalAmount: string | number; customerName: string | null }[]).map(order => (
            <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#181818' }}>#{order.orderNumber}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 10px',
                  background: `${STATUS_COLORS[order.status] || '#6b7280'}20`,
                  color: STATUS_COLORS[order.status] || '#6b7280',
                  textTransform: 'capitalize',
                }}>
                  {order.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${Number(order.totalAmount).toFixed(2)}
                </span>
                <button
                  onClick={() => { navigate(`/v/${slug}`) }}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Loyalty App Tab ──────────────────────────────────────────────────────────
function LoyaltyAppTab({ venueId }: { venueId: number }) {
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '')
  const [submitted, setSubmitted] = useState(!!phone)

  const { data: account } = trpc.loyalty.getAccount.useQuery({ venueId, phone }, { enabled: submitted && !!phone })
  const { data: txns } = trpc.loyalty.getTransactions.useQuery({ venueId, phone }, { enabled: submitted && !!phone })
  const balance = (account as { pointsBalance?: number } | undefined)?.pointsBalance ?? 0
  const stampsTotal = 10
  const stampGoal = 100
  const stampsFilled = Math.min(stampsTotal, Math.floor((balance / stampGoal) * stampsTotal))

  if (!submitted) return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#181818', marginBottom: 10 }}>Enter your phone to view loyalty</div>
      <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={{ ...inputStyle, marginBottom: 10 }} />
      <button
        onClick={() => { localStorage.setItem('b1-phone', phone); setSubmitted(true) }}
        disabled={phone.length < 8}
        style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: phone.length < 8 ? 0.5 : 1 }}
      >
        View Loyalty
      </button>
    </div>
  )

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: TEAL, borderRadius: 14, padding: '20px 24px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 800 }}>{balance}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>points · ${(balance / 10).toFixed(2)} value</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 10 }}>Stamp Card ({stampsFilled}/{stampsTotal})</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: stampsTotal }).map((_, i) => (
            <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', background: i < stampsFilled ? TEAL : 'rgba(94,139,139,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${i < stampsFilled ? TEAL : 'rgba(94,139,139,0.2)'}` }}>
              <Coffee size={14} color={i < stampsFilled ? '#fff' : 'rgba(94,139,139,0.4)'} />
            </div>
          ))}
        </div>
      </div>
      {txns && (txns as unknown[]).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 8 }}>Recent</div>
          {(txns as { id: number; points: number; description?: string; createdAt: string }[]).slice(0, 8).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 12, color: '#181818' }}>{t.description || 'Points earned'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.points > 0 ? '#10b981' : '#ef4444' }}>{t.points > 0 ? '+' : ''}{t.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Profile App Tab ──────────────────────────────────────────────────────────
function ProfileAppTab({ venueId, venueName }: { venueId: number; venueName: string }) {
  const navigate = useNavigate()
  const { data: customer } = trpc.customerAuth.me.useQuery(undefined, { retry: false })
  const customerToken = typeof window !== 'undefined' ? localStorage.getItem('customerToken') : null

  if (!customer && !customerToken) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#181818', marginBottom: 6 }}>Sign in to your account</div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Access your full profile, loyalty, and order history at {venueName}.</p>
        <button
          onClick={() => navigate(`/account?v=${venueId}`)}
          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Sign In / Register
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#181818', marginBottom: 4 }}>
        {String((customer as Record<string, unknown> | undefined)?.name ?? 'Your Account')}
      </div>
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
        {String((customer as Record<string, unknown> | undefined)?.phone ?? '')}
      </div>
      <button
        onClick={() => navigate(`/account?v=${venueId}`)}
        style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        Manage Account
      </button>
    </div>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, color: '#181818',
  background: '#fafafa', boxSizing: 'border-box',
}
