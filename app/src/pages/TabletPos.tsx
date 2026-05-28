import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Coffee, Plus, Minus, CheckCircle, Clock, X, RefreshCw, Delete } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type CartLine = { menuItemId: number; name: string; price: number; quantity: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeSince(dateStr: string) {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}h`;
}

function urgencyColor(createdAt: string) {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins > 15) return '#EF4444';
  if (mins > 8) return '#F59E0B';
  return '#10B981';
}

// ─── PIN Entry Screen ─────────────────────────────────────────────────────────
function PinScreen({
  venueName,
  accentColor,
  onSuccess,
  verifyPin,
  isPending,
  error,
}: {
  venueName: string;
  accentColor: string;
  onSuccess: () => void;
  verifyPin: (pin: string) => void;
  isPending: boolean;
  error: string;
}) {
  const [pin, setPin] = useState('');

  const press = (digit: string) => {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    if (next.length >= 4) {
      // Auto-submit when 4+ digits entered (after tiny delay for UX)
      setTimeout(() => verifyPin(next), 80);
    }
  };

  const backspace = () => setPin(p => p.slice(0, -1));
  const clear = () => setPin('');

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111827', fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Coffee size={36} color="#fff" />
        </div>
        <h1 style={{ color: '#F9FAFB', fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>{venueName}</h1>
        <p style={{ color: '#9CA3AF', fontSize: 15, margin: 0 }}>Staff Tablet — Enter PIN</p>
      </div>

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length + 1)).map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < pin.length ? accentColor : 'rgba(255,255,255,0.15)',
            transition: 'background 0.1s',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ color: '#FCA5A5', fontSize: 13, marginBottom: 20, background: 'rgba(239,68,68,0.12)', padding: '8px 16px', borderRadius: 8 }}>
          {error} — tap clear and try again
        </div>
      )}

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: 260 }}>
        {['1','2','3','4','5','6','7','8','9','⌫','0','✕'].map(k => (
          <button
            key={k}
            onClick={() => {
              if (k === '⌫') backspace();
              else if (k === '✕') clear();
              else press(k);
            }}
            disabled={isPending}
            style={{
              height: 72, borderRadius: 16, border: 'none',
              background: k === '✕' ? 'rgba(239,68,68,0.2)' : k === '⌫' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)',
              color: k === '✕' ? '#FCA5A5' : '#F9FAFB',
              fontSize: k.length > 1 ? 20 : 26, fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
          >
            {k === '⌫' ? <Delete size={22} /> : k === '✕' ? <X size={22} /> : k}
          </button>
        ))}
      </div>

      {isPending && (
        <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 20 }}>Checking PIN…</p>
      )}
    </div>
  );
}

// ─── Main Tablet Interface ────────────────────────────────────────────────────
function TabletMain({ venueId, accentColor, primaryColor, tabletToken }: { venueId: number; accentColor: string; primaryColor: string; tabletToken: string }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [placedMsg, setPlacedMsg] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: menuItems } = trpc.venue.listMenu.useQuery({ venueId }, { refetchInterval: 60_000 });
  const { data: orders, refetch: refetchOrders } = trpc.venue.listOrders.useQuery(
    { venueId, status: 'pending', limit: 30 },
    { refetchInterval: 8_000 }
  );
  const { data: confirmedOrders } = trpc.venue.listOrders.useQuery(
    { venueId, status: 'confirmed', limit: 20 },
    { refetchInterval: 8_000 }
  );

  const updateStatus = trpc.venue.updateOrderStatus.useMutation({
    onSuccess: () => { utils.venue.listOrders.invalidate(); refetchOrders(); },
  });

  const placeOrder = trpc.venue.createOrder.useMutation({
    onSuccess: () => {
      setCart([]);
      setCustomerName('');
      setOrderNote('');
      setPlacedMsg('Order placed!');
      setTimeout(() => setPlacedMsg(''), 2500);
      utils.venue.listOrders.invalidate();
    },
  });

  // SSE for real-time order updates
  useEffect(() => {
    const es = new EventSource(`/api/sse/orders/${venueId}`);
    es.onmessage = () => { utils.venue.listOrders.invalidate(); };
    return () => es.close();
  }, [venueId, utils]);

  const categories = [...new Set((menuItems || []).map(i => i.category))];
  const displayCategory = activeCategory ?? categories[0] ?? null;
  const displayItems = (menuItems || []).filter(i => i.category === displayCategory);

  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const addToCart = (item: { id: number; name: string; price: string }) => {
    setCart(prev => {
      const ex = prev.find(l => l.menuItemId === item.id);
      if (ex) return prev.map(l => l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const ex = prev.find(l => l.menuItemId === id);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter(l => l.menuItemId !== id);
      return prev.map(l => l.menuItemId === id ? { ...l, quantity: l.quantity - 1 } : l);
    });
  };

  const submitOrder = () => {
    if (!cart.length) return;
    placeOrder.mutate({
      venueId,
      customerName: customerName.trim() || 'Walk-in',
      customerPhone: '',
      items: cart.map(l => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      orderNote: orderNote.trim() || undefined,
      source: 'tablet',
    } as any);
  };

  const allActive = [...(orders || []), ...(confirmedOrders || [])];

  const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#0F172A', fontFamily: "'Inter', sans-serif", overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Coffee size={20} color={accentColor} />
          <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>Staff Tablet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {placedMsg && <span style={{ color: '#34D399', fontSize: 13, fontWeight: 600 }}>✓ {placedMsg}</span>}
          <span style={{ background: allActive.length > 0 ? '#EF4444' : 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {allActive.length} active
          </span>
          <button onClick={() => utils.venue.listOrders.invalidate()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Body — two panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Order Queue ─────────────────────────── */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <span style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Order Queue</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {allActive.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
                <CheckCircle size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14, margin: 0 }}>All clear — no active orders</p>
              </div>
            )}
            {allActive.map((order: any) => (
              <div key={order.id} style={{
                background: '#1E293B', borderRadius: 12, marginBottom: 10, overflow: 'hidden',
                border: `1px solid ${order.status === 'confirmed' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                {/* Order header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px' }}>
                  <div>
                    <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>#{order.orderNumber}</span>
                    {order.customerName && order.customerName !== 'Walk-in' && (
                      <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 8 }}>{order.customerName}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: urgencyColor(order.createdAt), fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} /> {timeSince(order.createdAt)}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: order.status === 'confirmed' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                      color: order.status === 'confirmed' ? '#93C5FD' : '#FCD34D',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
                {/* Items */}
                <div style={{ padding: '0 14px 10px' }}>
                  {(order.items || []).map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#CBD5E1', marginBottom: 2 }}>
                      <span>{it.quantity}× {it.itemName}</span>
                      {it.note && <span style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>{it.note}</span>}
                    </div>
                  ))}
                  {order.orderNote && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#FCD34D', fontStyle: 'italic' }}>Note: {order.orderNote}</div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus.mutate({ token: tabletToken, orderId: order.id, status: 'confirmed' })}
                      style={{ flex: 1, padding: '10px', background: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Accept
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus.mutate({ token: tabletToken, orderId: order.id, status: 'ready' })}
                    style={{ flex: 1, padding: '10px', background: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    ✓ Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Quick Order Entry ──────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', flexShrink: 0 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 99,
                  border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: displayCategory === cat ? accentColor : 'rgba(255,255,255,0.08)',
                  color: displayCategory === cat ? '#fff' : '#94A3B8',
                }}
              >
                {catLabel(cat)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Menu grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, alignContent: 'start' }}>
              {displayItems.map((item: any) => {
                const inCart = cart.find(l => l.menuItemId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    style={{
                      background: inCart ? `${accentColor}25` : '#1E293B',
                      border: `1px solid ${inCart ? accentColor + '60' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 10, padding: '12px 10px', cursor: 'pointer',
                      textAlign: 'left', position: 'relative',
                    }}
                  >
                    {inCart && (
                      <span style={{ position: 'absolute', top: 6, right: 8, background: accentColor, color: '#fff', borderRadius: 99, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {inCart.quantity}
                      </span>
                    )}
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6, marginBottom: 8, display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coffee size={20} color="rgba(255,255,255,0.15)" />
                      </div>
                    )}
                    <div style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ color: accentColor, fontSize: 13, fontWeight: 700 }}>${Number(item.price).toFixed(2)}</div>
                  </button>
                );
              })}
              {displayItems.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#334155' }}>No items in this category</div>
              )}
            </div>

            {/* Current order / checkout */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1E293B', padding: 12, flexShrink: 0 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '8px 0' }}>Tap items to add to order</div>
              ) : (
                <>
                  {/* Cart lines */}
                  <div style={{ maxHeight: 110, overflowY: 'auto', marginBottom: 10 }}>
                    {cart.map(line => (
                      <div key={line.menuItemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => removeFromCart(line.menuItemId)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Minus size={12} />
                          </button>
                          <span style={{ color: '#CBD5E1', fontSize: 13, minWidth: 16, textAlign: 'center' }}>{line.quantity}</span>
                          <button onClick={() => addToCart({ id: line.menuItemId, name: line.name, price: String(line.price) })} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={12} />
                          </button>
                          <span style={{ color: '#E2E8F0', fontSize: 13 }}>{line.name}</span>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: 13 }}>${(line.price * line.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Name + note inputs */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Name (optional)"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#E2E8F0', fontSize: 13, outline: 'none' }}
                    />
                    <input
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      placeholder="Note"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#E2E8F0', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  {/* Place order */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCart([])}
                      style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 8, color: '#FCA5A5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={submitOrder}
                      disabled={placeOrder.isPending || !cart.length}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                        background: accentColor, color: '#fff',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        opacity: placeOrder.isPending ? 0.7 : 1,
                      }}
                    >
                      {placeOrder.isPending ? 'Placing…' : `Place Order · $${cartTotal.toFixed(2)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TabletPos() {
  const { slug } = useParams<{ slug: string }>();
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(`tablet-token-${slug}`));
  const [tabletToken, setTabletToken] = useState(() => sessionStorage.getItem(`tablet-token-${slug}`) ?? '');
  const [pinError, setPinError] = useState('');

  const venueQuery = trpc.venue.getTabletVenue.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  const verifyMutation = trpc.venue.verifyTabletPin.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem(`tablet-token-${slug}`, data.token);
      setTabletToken(data.token);
      setPinError('');
      setUnlocked(true);
    },
    onError: (err) => {
      setPinError(err.message || 'Wrong PIN');
    },
  });

  const handleVerify = useCallback((pin: string) => {
    if (!slug) return;
    setPinError('');
    verifyMutation.mutate({ slug, pin });
  }, [slug, verifyMutation]);

  if (venueQuery.isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827' }}>
        <Coffee size={32} color="#5E8B8B" style={{ opacity: 0.5 }} />
      </div>
    );
  }

  if (!venueQuery.data) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Venue not found</p>
          <p style={{ fontSize: 13 }}>Check the URL and try again</p>
        </div>
      </div>
    );
  }

  const { name, accentColor, primaryColor, hasPinSet, id: venueId } = venueQuery.data;
  const accent = accentColor ?? '#5E8B8B';
  const primary = primaryColor ?? '#181818';

  // If no PIN set yet — show instructions
  if (!hasPinSet) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <Coffee size={48} color={accent} style={{ margin: '0 auto 20px', display: 'block' }} />
          <h2 style={{ color: '#F9FAFB', fontSize: 22, marginBottom: 12 }}>Tablet PIN not set</h2>
          <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.6 }}>
            Go to your <strong style={{ color: '#F9FAFB' }}>Owner Dashboard → Settings → Tablet PIN</strong> and set a 4–6 digit PIN to activate this device.
          </p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <PinScreen
        venueName={name}
        accentColor={accent}
        onSuccess={() => setUnlocked(true)}
        verifyPin={handleVerify}
        isPending={verifyMutation.isPending}
        error={pinError}
      />
    );
  }

  return <TabletMain venueId={venueId} accentColor={accent} primaryColor={primary} tabletToken={tabletToken} />;
}
