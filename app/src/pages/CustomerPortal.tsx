import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Coffee, Star, Heart, User, LogOut, ShoppingBag, Loader2 } from 'lucide-react'

const TEAL = '#5E8B8B'

type Tab = 'orders' | 'loyalty' | 'favourites' | 'profile'

export default function CustomerPortal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const venueId = Number(searchParams.get('v') || localStorage.getItem('b1-last-venue') || '0')

  const [activeTab, setActiveTab] = useState<Tab>('orders')

  const { data: customer, isLoading: authLoading } = trpc.customerAuth.me.useQuery(undefined, {
    retry: false,
  })

  const customerToken = typeof window !== 'undefined' ? localStorage.getItem('customerToken') : null

  useEffect(() => {
    if (!authLoading && !customer && !customerToken) {
      navigate('/')
    }
  }, [authLoading, customer, customerToken, navigate])

  const { data: venue } = trpc.venue.getById.useQuery({ id: venueId }, { enabled: !!venueId })

  const phone = (customer as { phone?: string } | undefined)?.phone ?? ''

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    navigate('/')
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F2EE' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: TEAL }} />
      </div>
    )
  }

  if (!customer) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ background: TEAL, color: '#fff', padding: '16px 20px' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>My Account</h1>
            {venue && <p style={{ fontSize: 12, margin: '2px 0 0', opacity: 0.8 }}>{venue.name}</p>}
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Desktop tabs */}
      <div className="hidden md:block" style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="max-w-lg mx-auto flex">
          {(['orders', 'loyalty', 'favourites', 'profile'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '14px 0', border: 'none', background: 'none',
                borderBottom: activeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent',
                color: activeTab === tab ? TEAL : '#5E5E5E',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto pb-24 md:pb-8 px-4 pt-6">
        {activeTab === 'orders' && <OrdersTab venueId={venueId} phone={phone} venue={venue as { slug?: string; name?: string } | null | undefined} />}
        {activeTab === 'loyalty' && <LoyaltyTab venueId={venueId} phone={phone} />}
        {activeTab === 'favourites' && <FavouritesTab venueId={venueId} phone={phone} venue={venue as { slug?: string } | null | undefined} />}
        {activeTab === 'profile' && <ProfileTab customer={customer as Record<string, unknown>} />}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', zIndex: 50,
      }}>
        {([
          { tab: 'orders' as Tab, icon: <ShoppingBag size={20} />, label: 'Orders' },
          { tab: 'loyalty' as Tab, icon: <Star size={20} />, label: 'Loyalty' },
          { tab: 'favourites' as Tab, icon: <Heart size={20} />, label: 'Favourites' },
          { tab: 'profile' as Tab, icon: <User size={20} />, label: 'Profile' },
        ]).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 0 6px', border: 'none', background: 'none',
              color: activeTab === tab ? TEAL : '#9ca3af', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Customer Receipt Print ───────────────────────────────────────────────────
function printCustomerReceipt(order: any, venueName: string) {
  const width = '302px'
  const itemsHtml = (() => {
    try {
      const items = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : (order.items || [])
      return items.map((item: any) =>
        `<tr><td>${item.name || item.itemName}${item.note ? `<br><small>${item.note}</small>` : ''}</td><td style="text-align:right">×${item.quantity || item.qty || 1}</td><td style="text-align:right">$${((item.unitPrice || item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2)}</td></tr>`
      ).join('')
    } catch { return '<tr><td colspan="3">Items unavailable</td></tr>' }
  })()
  const tip = Number(order.tipAmount || 0)
  const discount = Number(order.discountAmount || 0)
  const total = Number(order.totalAmount || 0)
  const html = `<!DOCTYPE html><html><head><title>Receipt</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: ${width}; padding: 8px; }
    .center { text-align: center; } .bold { font-weight: bold; } .lg { font-size: 16px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; }
    .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
    @media print { @page { margin: 0; size: ${width} auto; } }
  </style></head><body>
  <div class="center bold lg">${venueName}</div>
  <hr>
  <div>Order #${order.orderNumber}</div>
  <div>${new Date(order.createdAt).toLocaleString('en-AU')}</div>
  ${order.tableNumber ? `<div>Table: ${order.tableNumber}</div>` : ''}
  ${order.pickupTime ? `<div>Pickup: ${order.pickupTime}</div>` : ''}
  <hr>
  <table><tbody>${itemsHtml}</tbody></table>
  <hr>
  <table>
    ${discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-$${discount.toFixed(2)}</td></tr>` : ''}
    ${tip > 0 ? `<tr><td>Tip</td><td style="text-align:right">$${tip.toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td class="bold">TOTAL</td><td style="text-align:right" class="bold">$${total.toFixed(2)} AUD</td></tr>
  </table>
  <hr>
  <div class="center" style="font-size:10px">${order.paymentMethod === 'online' ? 'Paid online' : 'Pay at pickup'}</div>
  <div class="center bold" style="margin-top:8px">Thank you!</div>
  <div style="margin-top:24px"></div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
  </body></html>`
  const w = window.open('', '_blank', 'width=400,height=600')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ venueId, phone, venue }: { venueId: number; phone: string; venue: { slug?: string; name?: string } | null | undefined }) {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: orders, isLoading } = trpc.venue.listOrders.useQuery(
    { venueId, customerPhone: phone, limit: 30, statuses: ['pending', 'confirmed', 'ready', 'completed', 'cancelled'] },
    { enabled: !!venueId && !!phone }
  )

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#3b82f6', ready: '#10b981', completed: '#6b7280', cancelled: '#ef4444',
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: TEAL }} /></div>

  if (!orders || orders.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.25, color: '#9ca3af', display: 'block' }} />
      <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>No orders yet — place your first order!</p>
      {venue?.slug && (
        <a
          href={`/v/${venue.slug}`}
          style={{ fontSize: 13, padding: '8px 20px', borderRadius: 8, background: TEAL, color: '#fff', fontWeight: 600, textDecoration: 'none' }}
        >
          Order Now
        </a>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(orders as any[]).map(order => {
        const isExpanded = expandedId === order.id
        let parsedItems: any[] = []
        try {
          parsedItems = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : (order.items || [])
        } catch { parsedItems = [] }

        return (
          <div
            key={order.id}
            style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid rgba(24,24,24,0.06)' }}
          >
            {/* Header row — click to expand */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#181818' }}>#{order.orderNumber}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '2px 8px',
                    background: `${STATUS_COLORS[order.status] || '#6b7280'}20`,
                    color: STATUS_COLORS[order.status] || '#6b7280',
                    textTransform: 'capitalize',
                  }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                  {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#181818' }}>${Number(order.totalAmount).toFixed(2)}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{isExpanded ? '▲ Hide' : '▼ Details'}</span>
              </div>
            </div>

            {/* Expanded items */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px 16px' }}>
                {parsedItems.length > 0 ? (
                  <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {parsedItems.map((item: any, i: number) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#44403c' }}>
                        <span>{item.quantity || item.qty || 1}× {item.name || item.itemName}</span>
                        <span style={{ color: '#78716c' }}>${((item.unitPrice || item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Total: ${Number(order.totalAmount).toFixed(2)}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => printCustomerReceipt(order, venue?.name || 'Cafe')}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #e7e5e4', background: '#fafaf9', color: '#44403c', fontWeight: 600, cursor: 'pointer' }}
                  >
                    🖨️ Receipt
                  </button>
                  {venue?.slug && (
                    <button
                      onClick={() => {
                        localStorage.setItem('b1-reorder', JSON.stringify({ orderId: order.id }))
                        navigate(`/v/${venue.slug}`)
                      }}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Loyalty Tab ──────────────────────────────────────────────────────────────
function LoyaltyTab({ venueId, phone }: { venueId: number; phone: string }) {
  const { data: account } = trpc.loyalty.getAccount.useQuery({ venueId, phone }, { enabled: !!venueId && !!phone })
  const { data: txns } = trpc.loyalty.getTransactions.useQuery({ venueId, phone }, { enabled: !!venueId && !!phone })
  const { data: rewards } = trpc.loyaltyRewards.list.useQuery({ venueId }, { enabled: !!venueId })

  const balance = (account as { pointsBalance?: number } | undefined)?.pointsBalance ?? 0

  // Stamp card: find cheapest reward to gauge progress
  const cheapestReward = rewards && rewards.length > 0
    ? [...(rewards as { pointsCost: number }[])].sort((a, b) => a.pointsCost - b.pointsCost)[0]
    : null
  const stampGoal = cheapestReward?.pointsCost ?? 100
  const stampsTotal = 10
  const stampsFilled = Math.min(stampsTotal, Math.floor((balance / stampGoal) * stampsTotal))

  const redeemMutation = trpc.loyaltyRewards.redeem.useMutation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Points balance */}
      <div style={{ background: TEAL, borderRadius: 16, padding: '20px 24px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800 }}>{balance}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>points · ${(balance / 10).toFixed(2)} value</div>
      </div>

      {/* Stamp card */}
      {cheapestReward && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 12 }}>
            Progress to next reward ({stampsFilled}/{stampsTotal})
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: stampsTotal }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: i < stampsFilled ? TEAL : 'rgba(94,139,139,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${i < stampsFilled ? TEAL : 'rgba(94,139,139,0.2)'}`,
                }}
              >
                <Coffee size={16} color={i < stampsFilled ? '#fff' : 'rgba(94,139,139,0.4)'} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            {stampGoal - balance > 0 ? `${stampGoal - balance} more points to earn "${(cheapestReward as { name?: string }).name || 'reward'}"` : 'You can redeem a reward!'}
          </p>
        </div>
      )}

      {/* Available rewards */}
      {rewards && rewards.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 10 }}>Available Rewards</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(rewards as { id: number; name: string; description?: string; pointsCost: number }[]).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>⭐ {r.pointsCost} pts</div>
                </div>
                <button
                  disabled={balance < r.pointsCost || redeemMutation.isPending}
                  onClick={() => redeemMutation.mutate({ venueId, phone, rewardId: r.id })}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: balance >= r.pointsCost ? TEAL : '#e5e7eb',
                    color: balance >= r.pointsCost ? '#fff' : '#9ca3af',
                    fontSize: 12, fontWeight: 600,
                    cursor: balance >= r.pointsCost ? 'pointer' : 'not-allowed',
                  }}
                >
                  Redeem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {txns && (txns as unknown[]).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 10 }}>Recent Transactions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(txns as { id: number; points: number; description?: string; createdAt: string }[]).slice(0, 10).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#181818' }}>{t.description || 'Points earned'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(t.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.points > 0 ? '#10b981' : '#ef4444' }}>
                  {t.points > 0 ? '+' : ''}{t.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Favourites Tab ───────────────────────────────────────────────────────────
function FavouritesTab({ venueId, phone, venue }: { venueId: number; phone: string; venue: { slug?: string } | null | undefined }) {
  const navigate = useNavigate()
  const { data: favs, refetch } = trpc.venue.listFavouriteOrders.useQuery(
    { venueId, phone },
    { enabled: !!venueId && !!phone }
  )
  const deleteFav = trpc.venue.deleteFavouriteOrder.useMutation({ onSuccess: () => refetch() })

  if (!favs || (favs as unknown[]).length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <Heart size={40} className="mx-auto mb-3 opacity-30" />
      <p style={{ fontSize: 14 }}>No saved favourites yet</p>
      <p style={{ fontSize: 12, marginTop: 4 }}>Order and save your go-to at checkout</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(favs as { id: number; label: string; totalAmount: string | number; itemsJson: string }[]).map(fav => (
        <div key={fav.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.label}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>${Number(fav.totalAmount).toFixed(2)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {venue?.slug && (
              <button
                onClick={() => {
                  localStorage.setItem('b1-reorder', fav.itemsJson)
                  navigate(`/v/${venue.slug}`)
                }}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Order Again
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm('Delete this favourite?')) {
                  deleteFav.mutate({ id: fav.id, phone })
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ customer }: { customer: Record<string, unknown> }) {
  const [name, setName] = useState(String(customer.name ?? ''))
  const [phone, setPhone] = useState(String(customer.phone ?? ''))
  const [birthday, setBirthday] = useState(String(customer.birthday ?? ''))
  const [allergies, setAllergies] = useState(String(customer.allergies ?? ''))
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(customer.marketingOptIn))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saved, setSaved] = useState(false)

  const updateProfile = trpc.customerAuth.updateProfile.useMutation({
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 14 }}>Profile Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} type="tel" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Birthday (MM-DD)</label>
            <input value={birthday} onChange={e => setBirthday(e.target.value)} placeholder="e.g. 07-25" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Allergies / Dietary notes</label>
            <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#181818', cursor: 'pointer' }}>
            <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} style={{ accentColor: TEAL }} />
            Receive marketing emails &amp; offers
          </label>
          <button
            onClick={() => updateProfile.mutate({ name, phone, birthday, allergies, marketingOptIn })}
            disabled={updateProfile.isPending}
            style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {updateProfile.isPending ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 14 }}>Change Password</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
          <button
            onClick={() => updateProfile.mutate({ currentPassword, newPassword })}
            disabled={!currentPassword || !newPassword || updateProfile.isPending}
            style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: '#181818', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!currentPassword || !newPassword) ? 0.5 : 1 }}
          >
            Update Password
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Delete Account</div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>To request account deletion, please contact support.</p>
        <a href="mailto:support@b1platform.com" style={{ fontSize: 13, color: TEAL, fontWeight: 600 }}>support@b1platform.com</a>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, color: '#181818',
  background: '#fafafa', boxSizing: 'border-box',
}
