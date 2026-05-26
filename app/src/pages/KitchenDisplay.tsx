import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/providers/trpc'

// ─── Types ──────────────────────────────────────────────────────────────────
interface OrderWithItems {
  id: number
  orderNumber: string
  customerName: string
  customerPhone: string
  pickupTime: string
  orderNote: string | null
  status: string
  totalAmount: string
  createdAt: string
  items: { itemName: string; quantity: number; note: string | null }[]
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function timeSince(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function statusColor(status: string): string {
  if (status === 'pending') return '#f59e0b'
  if (status === 'confirmed') return '#3b82f6'
  if (status === 'ready') return '#10b981'
  return '#6b7280'
}

function urgency(createdAt: string): 'normal' | 'warn' | 'urgent' {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (mins > 15) return 'urgent'
  if (mins > 8) return 'warn'
  return 'normal'
}

// ─── Kitchen Display ─────────────────────────────────────────────────────────
export default function KitchenDisplay() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('staffToken'))
  const [venueId, setVenueId] = useState<number | null>(() => {
    const v = sessionStorage.getItem('staffVenueId')
    return v ? Number(v) : null
  })
  const [loginInput, setLoginInput] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [tick, setTick] = useState(0)
  const prevOrderIds = useRef<Set<number>>(new Set())
  const audioCtx = useRef<AudioContext | null>(null)

  // Auto-tick every 8 seconds for polling
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(id)
  }, [])

  // Tick every second for "time since" counter
  const [, setSecond] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSecond(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const staffLoginMut = trpc.staffAuth.login.useMutation()
  const ordersQuery = trpc.venue.listOrders.useQuery(
    { venueId: venueId!, statuses: ['pending', 'confirmed', 'ready'], limit: 100 },
    { enabled: !!token && !!venueId, refetchInterval: 8000 }
  )
  const updateStatus = trpc.venue.updateOrderStatus.useMutation()

  async function handleLogin() {
    setLoginError('')
    if (!venueId) { setLoginError('Enter venue ID'); return }
    try {
      const result = await staffLoginMut.mutateAsync({
        venueId: venueId!,
        username: loginInput.username,
        password: loginInput.password,
      })
      setToken(result.token)
      sessionStorage.setItem('staffToken', result.token)
      sessionStorage.setItem('staffVenueId', String(venueId))
    } catch (e: any) {
      setLoginError(e.message ?? 'Login failed')
    }
  }

  function playChime() {
    try {
      const ctx = audioCtx.current ?? (audioCtx.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* audio blocked */ }
  }

  // Detect new orders and chime
  useEffect(() => {
    if (!ordersQuery.data) return
    const current = ordersQuery.data as any[]
    const currentIds = new Set(current.map((o: any) => o.id))
    if (prevOrderIds.current.size > 0) {
      for (const id of currentIds) {
        if (!prevOrderIds.current.has(id)) {
          playChime()
          break
        }
      }
    }
    prevOrderIds.current = currentIds
  }, [ordersQuery.data])

  async function advance(order: any) {
    const next = order.status === 'pending' ? 'confirmed'
      : order.status === 'confirmed' ? 'ready'
      : order.status === 'ready' ? 'completed' : null
    if (!next || !token) return
    await updateStatus.mutateAsync({ token, orderId: order.id, status: next as any })
    ordersQuery.refetch()
  }

  async function cancel(orderId: number) {
    if (!token) return
    if (!window.confirm('Cancel this order?')) return
    await updateStatus.mutateAsync({ token, orderId, status: 'cancelled' })
    ordersQuery.refetch()
  }

  // ─── Login gate ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: '#1e293b', borderRadius: 12, padding: '2rem',
          width: 320, color: '#fff'
        }}>
          <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', textAlign: 'center' }}>
            🍳 Kitchen Display
          </h1>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Venue ID</label>
            <input
              type="number"
              value={venueId ?? ''}
              onChange={e => setVenueId(Number(e.target.value))}
              style={inputStyle}
              placeholder="1"
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Username</label>
            <input
              value={loginInput.username}
              onChange={e => setLoginInput(p => ({ ...p, username: e.target.value }))}
              style={inputStyle}
              placeholder="staff username"
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Password</label>
            <input
              type="password"
              value={loginInput.password}
              onChange={e => setLoginInput(p => ({ ...p, password: e.target.value }))}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {loginError && <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{loginError}</p>}
          <button onClick={handleLogin} style={btnStyle}>
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const allOrders = (ordersQuery.data ?? []) as any[]
  // KDS only shows active orders
  const pending = allOrders.filter(o => o.status === 'pending')
  const confirmed = allOrders.filter(o => o.status === 'confirmed')
  const ready = allOrders.filter(o => o.status === 'ready')

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif', padding: '1rem',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🍳 Kitchen Display</h1>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          <span>🟡 {pending.length} new</span>
          <span>🔵 {confirmed.length} making</span>
          <span>🟢 {ready.length} ready</span>
        </div>
        <button
          onClick={() => { setToken(null); sessionStorage.removeItem('staffToken') }}
          style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '0.25rem 0.75rem', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>

      {/* Columns */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
        alignItems: 'start'
      }}>
        {/* Pending */}
        <Column
          title="NEW ORDERS"
          color="#f59e0b"
          orders={pending}
          actionLabel="Start"
          onAction={advance}
          onCancel={cancel}
        />
        {/* Confirmed / making */}
        <Column
          title="IN PROGRESS"
          color="#3b82f6"
          orders={confirmed}
          actionLabel="Ready"
          onAction={advance}
          onCancel={cancel}
        />
        {/* Ready for pickup */}
        <Column
          title="READY FOR PICKUP"
          color="#10b981"
          orders={ready}
          actionLabel="Complete"
          onAction={advance}
          onCancel={cancel}
        />
      </div>
    </div>
  )
}

// ─── Column ──────────────────────────────────────────────────────────────────
function Column({ title, color, orders, actionLabel, onAction, onCancel }: {
  title: string
  color: string
  orders: any[]
  actionLabel: string
  onAction: (o: any) => void
  onCancel: (id: number) => void
}) {
  return (
    <div>
      <div style={{
        background: color + '22', border: `1px solid ${color}44`,
        borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontWeight: 700, fontSize: '0.8rem', color, letterSpacing: '0.05em' }}>
          {title}
        </span>
        <span style={{ marginLeft: 'auto', background: color + '33', color, borderRadius: 99, padding: '0 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
          {orders.length}
        </span>
      </div>
      {orders.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>
          Nothing here yet
        </div>
      )}
      {orders.map(o => <OrderCard key={o.id} order={o} actionLabel={actionLabel} onAction={onAction} onCancel={onCancel} />)}
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, actionLabel, onAction, onCancel }: {
  order: any
  actionLabel: string
  onAction: (o: any) => void
  onCancel: (id: number) => void
}) {
  const u = urgency(order.createdAt)
  const borderColor = u === 'urgent' ? '#ef4444' : u === 'warn' ? '#f59e0b' : '#1e293b'

  const [items, setItems] = useState<any[]>([])
  const itemsQuery = trpc.venue.getOrderItemsByOrderId.useQuery(
    { orderId: order.id },
    { refetchInterval: false }
  )

  const displayItems = itemsQuery.data ?? []

  return (
    <div style={{
      background: '#1e293b',
      border: `2px solid ${borderColor}`,
      borderRadius: 10,
      padding: '1rem',
      marginBottom: '0.75rem',
      transition: 'border-color 0.3s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
          #{order.orderNumber.replace('B1-', '')}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: u === 'urgent' ? '#ef4444' : u === 'warn' ? '#f59e0b' : '#94a3b8'
        }}>
          {timeSince(order.createdAt)} ago
        </span>
      </div>

      {/* Customer */}
      <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
        {order.customerName}
        {order.pickupTime && (
          <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
            ⏰ {order.pickupTime}
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ margin: '0.75rem 0', borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
        {displayItems.length > 0 ? displayItems.map((item: any, i: number) => (
          <div key={i} style={{ marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              {item.quantity}× {item.itemName}
            </span>
            {item.note && (
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '1rem' }}>
                ↳ {item.note}
              </div>
            )}
          </div>
        )) : (
          <div style={{ color: '#475569', fontSize: '0.75rem' }}>Loading items…</div>
        )}
      </div>

      {/* Order note */}
      {order.orderNote && (
        <div style={{
          background: '#0f172a', borderRadius: 6, padding: '0.4rem 0.6rem',
          fontSize: '0.75rem', color: '#fbbf24', marginBottom: '0.75rem'
        }}>
          📝 {order.orderNote}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onAction(order)}
          style={{
            flex: 1, background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: 6, padding: '0.5rem', fontWeight: 600, cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {actionLabel}
        </button>
        <button
          onClick={() => onCancel(order.id)}
          style={{
            background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
            borderRadius: 6, padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f172a', border: '1px solid #334155',
  borderRadius: 6, padding: '0.5rem 0.75rem', color: '#f8fafc',
  fontSize: '0.875rem', marginTop: '0.25rem', boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  width: '100%', background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.75rem', fontWeight: 600, cursor: 'pointer',
  fontSize: '0.9rem',
}
