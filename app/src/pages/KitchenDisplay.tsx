import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/providers/trpc'
import { useVenueSSE } from '@/hooks/useVenueSSE'

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderWithItems {
  id: number
  orderNumber: string
  customerName: string
  customerPhone: string
  pickupTime: string
  orderNote: string | null
  status: string
  totalAmount: string
  tableNumber: string | null
  createdAt: string
  items: { itemName: string; quantity: number; note: string | null }[]
}

type KDSView = 'live' | 'history'

// ─── Utilities ────────────────────────────────────────────────────────────────
function timeSince(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return '< 1m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function urgency(createdAt: string): 'normal' | 'warn' | 'urgent' {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (mins > 10) return 'urgent'
  if (mins > 7) return 'warn'
  return 'normal'
}

// ─── KDS Main ─────────────────────────────────────────────────────────────────
export default function KitchenDisplay() {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem('kds-token')
  )
  const [venueId, setVenueId] = useState<number | null>(() => {
    const v = sessionStorage.getItem('kds-venueId')
    return v ? Number(v) : null
  })
  const [loginInput, setLoginInput] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [view, setView] = useState<KDSView>('live')
  const [undoOrder, setUndoOrder] = useState<{ id: number; orderNumber: string; prevStatus: string } | null>(null)

  const prevOrderIds = useRef<Set<number>>(new Set())
  const audioCtx = useRef<AudioContext | null>(null)
  const playChimeRef = useRef<() => void>(() => {})
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const utils = trpc.useUtils()

  // ── SSE live connection ──────────────────────────────────────────────────
  const { connected } = useVenueSSE({
    venueId,
    token,
    events: ['order_update', 'order_new'],
    onEvent: (eventName) => {
      utils.venue.listOrdersWithItems.invalidate()
      if (eventName === 'order_new') playChimeRef.current()
    },
  })

  // ── Polling fallback — 8s when SSE disconnected, 30s when connected ──────
  const pollInterval = connected ? 30000 : 8000
  const ordersQuery = trpc.venue.listOrdersWithItems.useQuery(
    { venueId: venueId!, statuses: ['pending', 'confirmed', 'ready'], limit: 100, token: token! },
    { enabled: !!token && !!venueId, staleTime: 0, refetchInterval: pollInterval }
  )

  // History query — completed + cancelled today
  const historyQuery = trpc.venue.listOrdersWithItems.useQuery(
    { venueId: venueId!, statuses: ['completed', 'cancelled'], limit: 50, token: token! },
    { enabled: !!token && !!venueId && view === 'history', staleTime: 30000 }
  )

  // ── Tick every second for live age counter ────────────────────────────────
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Auto-dismiss undo toast after 8 seconds ───────────────────────────────
  useEffect(() => {
    if (!undoOrder) return
    undoTimer.current = setTimeout(() => setUndoOrder(null), 8000)
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current) }
  }, [undoOrder])

  // ── Chime on new orders ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ordersQuery.data) return
    const current = ordersQuery.data as any[]
    const ids = new Set(current.map((o: any) => o.id))
    if (prevOrderIds.current.size > 0) {
      for (const id of ids) {
        if (!prevOrderIds.current.has(id)) { playChime(); break }
      }
    }
    prevOrderIds.current = ids
  }, [ordersQuery.data])

  const staffLoginMut = trpc.staffAuth.login.useMutation()
  const updateStatus = trpc.venue.updateOrderStatus.useMutation({
    onSuccess: () => {
      ordersQuery.refetch()
      historyQuery.refetch()
    },
  })

  function playChime() {
    try {
      const ctx = audioCtx.current ?? (audioCtx.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
    } catch { /* audio blocked by browser — user must interact first */ }
  }
  playChimeRef.current = playChime

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
      sessionStorage.setItem('kds-token', result.token)
      sessionStorage.setItem('kds-venueId', String(venueId))
    } catch (e: any) {
      setLoginError(e.message ?? 'Login failed')
    }
  }

  async function advance(order: any) {
    const next = order.status === 'pending' ? 'confirmed'
      : order.status === 'confirmed' ? 'ready'
      : order.status === 'ready' ? 'completed' : null
    if (!next || !token) return
    await updateStatus.mutateAsync({ token, orderId: order.id, status: next as any })
  }

  async function clearOrder(order: any) {
    // Single-click clear: mark cancelled, show undo toast for 8 seconds
    if (!token) return
    const prev = order.status
    await updateStatus.mutateAsync({ token, orderId: order.id, status: 'cancelled' as any })
    setUndoOrder({ id: order.id, orderNumber: order.orderNumber, prevStatus: prev })
  }

  async function restoreOrder(orderId: number, toStatus: string) {
    if (!token) return
    await updateStatus.mutateAsync({ token, orderId, status: toStatus as any })
    setUndoOrder(null)
  }

  // ── Login gate ───────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#1C1C1E', borderRadius: 16, padding: '2.5rem', width: 340, border: '1px solid #2a2a2a' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍳</div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#F5F5F5' }}>Kitchen Display</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#71717A' }}>Sign in to view live orders</p>
          </div>
          {[
            { label: 'Venue ID', type: 'number', value: String(venueId ?? ''), onChange: (v: string) => setVenueId(Number(v)), placeholder: '1' },
            { label: 'Username', type: 'text', value: loginInput.username, onChange: (v: string) => setLoginInput(p => ({ ...p, username: v })), placeholder: 'staff username' },
            { label: 'Password', type: 'password', value: loginInput.password, onChange: (v: string) => setLoginInput(p => ({ ...p, password: v })), placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: '0.875rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', background: '#0F0F0F', border: '1px solid #2a2a2a', borderRadius: 8, padding: '0.625rem 0.75rem', color: '#F5F5F5', fontSize: '0.9rem', boxSizing: 'border-box' as const, outline: 'none' }}
              />
            </div>
          ))}
          {loginError && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{loginError}</p>}
          <button onClick={handleLogin} disabled={staffLoginMut.isPending}
            style={{ width: '100%', background: '#5E8B8B', color: '#fff', border: 'none', borderRadius: 10, padding: '0.875rem', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', opacity: staffLoginMut.isPending ? 0.7 : 1 }}>
            {staffLoginMut.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    )
  }

  const allOrders = ((ordersQuery.data ?? []) as any[]).filter(o => ['pending', 'confirmed', 'ready'].includes(o.status))
  const pending = allOrders.filter(o => o.status === 'pending')
  const confirmed = allOrders.filter(o => o.status === 'confirmed')
  const ready = allOrders.filter(o => o.status === 'ready')
  const historyOrders = ((historyQuery.data ?? []) as any[])

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F0F', color: '#F5F5F5', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '1px solid #1C1C1E', background: '#141414', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Kitchen Display</span>
          {/* SSE connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', boxShadow: connected ? '0 0 6px #10B981' : 'none' }} />
            <span style={{ fontSize: '0.7rem', color: connected ? '#10B981' : '#EF4444', fontWeight: 600 }}>
              {connected ? 'LIVE' : `POLLING ${Math.round(pollInterval / 1000)}s`}
            </span>
          </div>
        </div>

        {/* Order counts — live view */}
        {view === 'live' && (
          <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>{pending.length} new</span>
            <span style={{ color: '#3B82F6', fontWeight: 700 }}>{confirmed.length} in progress</span>
            <span style={{ color: '#10B981', fontWeight: 700 }}>{ready.length} ready</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#1C1C1E', borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            {(['live', 'history'] as KDSView[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '0.4rem 0.875rem', background: view === v ? '#5E8B8B' : 'transparent', color: view === v ? '#fff' : '#71717A', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                {v === 'live' ? '🟢 Live' : '📋 History'}
              </button>
            ))}
          </div>
          <button onClick={() => { setToken(null); sessionStorage.removeItem('kds-token') }}
            style={{ background: 'none', border: '1px solid #2a2a2a', color: '#71717A', borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* ── Undo toast ── */}
      {undoOrder && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 280 }}>
          <span style={{ fontSize: '0.875rem', color: '#F5F5F5' }}>Order #{undoOrder.orderNumber.replace('B1-', '')} cleared</span>
          <button onClick={() => restoreOrder(undoOrder.id, undoOrder.prevStatus)}
            style={{ background: '#5E8B8B', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' as const }}>
            ↩ Undo
          </button>
          <button onClick={() => setUndoOrder(null)}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Live board ── */}
      {view === 'live' && (
        <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          {ordersQuery.isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A' }}>Loading orders…</div>
          )}
          {!ordersQuery.isLoading && allOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#71717A' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>☕</div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No active orders</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>New orders will appear here automatically</p>
            </div>
          )}
          <div className="kds-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
            <Column title="NEW" color="#F59E0B" orders={pending} actionLabel="Start →" onAction={advance} onClear={clearOrder} />
            <Column title="IN PROGRESS" color="#3B82F6" orders={confirmed} actionLabel="Ready →" onAction={advance} onClear={clearOrder} />
            <Column title="READY FOR PICKUP" color="#10B981" orders={ready} actionLabel="✓ Done" onAction={advance} onClear={clearOrder} />
          </div>
        </div>
      )}

      {/* ── History view ── */}
      {view === 'history' && (
        <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F5F5F5' }}>Order History</h2>
              <button onClick={() => historyQuery.refetch()} style={{ background: 'none', border: '1px solid #2a2a2a', color: '#71717A', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem' }}>↻ Refresh</button>
            </div>
            {historyQuery.isLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A' }}>Loading…</div>}
            {!historyQuery.isLoading && historyOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A' }}>
                <p style={{ margin: 0 }}>No completed or cancelled orders yet today.</p>
              </div>
            )}
            {historyOrders.map((order: any) => (
              <HistoryCard key={order.id} order={order} onRestore={restoreOrder} />
            ))}
          </div>
        </div>
      )}

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 900px) { .kds-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 560px) { .kds-grid { grid-template-columns: 1fr !important; } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

// ─── Column ──────────────────────────────────────────────────────────────────
function Column({ title, color, orders, actionLabel, onAction, onClear }: {
  title: string; color: string; orders: any[]
  actionLabel: string; onAction: (o: any) => void; onClear: (o: any) => void
}) {
  return (
    <div>
      <div style={{ background: color + '18', border: `1px solid ${color}40`, borderRadius: 8, padding: '0.5rem 0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontWeight: 700, fontSize: '0.75rem', color, letterSpacing: '0.06em' }}>{title}</span>
        <span style={{ marginLeft: 'auto', background: color + '30', color, borderRadius: 99, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <div style={{ color: '#3a3a3a', textAlign: 'center', padding: '2.5rem 0', fontSize: '0.85rem', border: '1px dashed #2a2a2a', borderRadius: 10 }}>
          Nothing here
        </div>
      ) : orders.map(o => (
        <OrderCard key={o.id} order={o} items={o.items ?? []} actionLabel={actionLabel} onAction={onAction} onClear={onClear} />
      ))}
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, items, actionLabel, onAction, onClear }: {
  order: any; items: any[]; actionLabel: string
  onAction: (o: any) => void; onClear: (o: any) => void
}) {
  const [clearing, setClearing] = useState(false)
  const u = urgency(order.createdAt)
  const borderColor = u === 'urgent' ? '#EF4444' : u === 'warn' ? '#F59E0B' : '#2C2C2E'
  const ageColor = u === 'urgent' ? '#EF4444' : u === 'warn' ? '#F59E0B' : '#71717A'
  const actionBg = order.status === 'ready' ? '#10B981' : order.status === 'confirmed' ? '#3B82F6' : '#F59E0B'

  async function handleClear() {
    setClearing(true)
    await onClear(order)
    setClearing(false)
  }

  return (
    <div style={{ background: '#1C1C1E', border: `2px solid ${borderColor}`, borderRadius: 12, padding: '0.875rem', marginBottom: '0.75rem', transition: 'border-color 0.3s' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F5F5F5', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            #{order.orderNumber.replace('B1-', '')}
          </span>
          {order.tableNumber && (
            <span style={{ marginLeft: 8, background: '#7C3AED', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, verticalAlign: 'middle' }}>
              Table {order.tableNumber}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ageColor }}>{timeSince(order.createdAt)}</span>
      </div>

      {/* Customer */}
      <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
        <span>{order.customerName}</span>
        {order.pickupTime && <span style={{ color: '#555', fontSize: '0.75rem' }}>· {order.pickupTime}</span>}
      </div>

      {/* Items */}
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginBottom: 8 }}>
        {items.length > 0 ? items.map((item, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '0.925rem', color: '#F5F5F5' }}>{item.quantity}×</span>
            <span style={{ fontSize: '0.925rem', color: '#E0E0E0', marginLeft: 4 }}>{item.itemName}</span>
            {item.note && <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginLeft: '1.25rem', marginTop: 1 }}>↳ {item.note}</div>}
          </div>
        )) : <div style={{ color: '#555', fontSize: '0.8rem' }}>No items</div>}
      </div>

      {/* Order note */}
      {order.orderNote && (
        <div style={{ background: '#0F0F0F', borderRadius: 6, padding: '0.35rem 0.625rem', fontSize: '0.75rem', color: '#FBBF24', marginBottom: 10 }}>
          📝 {order.orderNote}
        </div>
      )}

      {/* Actions — large touch targets for tablet */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAction(order)}
          style={{ flex: 1, background: actionBg, color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', minHeight: 44 }}>
          {actionLabel}
        </button>
        <button onClick={handleClear} disabled={clearing}
          title="Clear order (with undo)"
          style={{ background: '#2C2C2E', color: '#71717A', border: '1px solid #3a3a3a', borderRadius: 8, padding: '0 0.875rem', cursor: 'pointer', fontSize: '1rem', minHeight: 44, minWidth: 44, opacity: clearing ? 0.5 : 1 }}>
          🗑
        </button>
      </div>
    </div>
  )
}

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({ order, onRestore }: { order: any; onRestore: (id: number, status: string) => void }) {
  const isCompleted = order.status === 'completed'
  const statusColor = isCompleted ? '#10B981' : '#EF4444'
  const statusLabel = isCompleted ? '✓ Completed' : '✕ Cancelled'

  return (
    <div style={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12, padding: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      {/* Status pill */}
      <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 99, background: statusColor + '20', color: statusColor, fontSize: '0.7rem', fontWeight: 700, marginTop: 2 }}>
        {statusLabel}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' as const }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#F5F5F5', fontFamily: 'monospace' }}>#{order.orderNumber.replace('B1-', '')}</span>
          {order.tableNumber && <span style={{ background: '#7C3AED', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>Table {order.tableNumber}</span>}
          <span style={{ fontSize: '0.8rem', color: '#71717A' }}>{order.customerName}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#555' }}>
          {(order.items ?? []).map((i: any) => `${i.quantity}× ${i.itemName}`).join(', ')}
        </div>
      </div>

      {/* Restore button */}
      <button
        onClick={() => onRestore(order.id, isCompleted ? 'ready' : 'confirmed')}
        title={isCompleted ? 'Restore to Ready' : 'Restore to Confirmed'}
        style={{ flexShrink: 0, background: '#2C2C2E', color: '#a0a0a0', border: '1px solid #3a3a3a', borderRadius: 8, padding: '0.5rem 0.875rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' as const, minHeight: 40 }}>
        ↩ Restore
      </button>
    </div>
  )
}
