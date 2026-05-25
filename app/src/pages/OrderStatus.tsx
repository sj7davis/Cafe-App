import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Coffee, Loader2, CheckCircle, Clock, Package, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

const STEPS = ['pending', 'confirmed', 'ready', 'completed'] as const;
type Step = typeof STEPS[number];

const STEP_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#d97706' },
  confirmed: { bg: '#dbeafe', text: '#2563eb' },
  ready:     { bg: '#d1fae5', text: '#059669' },
  completed: { bg: '#f3f4f6', text: '#6b7280' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

// Inject keyframe animations once
const STYLE_ID = 'order-status-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes readyPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.015); }
    }
    @keyframes readyCheckBounce {
      0% { transform: scale(0.8); }
      60% { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    @keyframes coffeeSteam {
      0%, 100% { transform: translateY(0) scaleX(1); opacity: 0.7; }
      50% { transform: translateY(-6px) scaleX(0.85); opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);
}

export default function OrderStatus() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const prevStatusRef = useRef<string | null>(null);

  const { data, isLoading, error } = trpc.venue.getOrderByNumber.useQuery(
    { orderNumber: orderNumber || '' },
    {
      enabled: !!orderNumber,
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.order?.status;
        return (status === 'pending' || status === 'confirmed' || status === 'ready')
          ? 8_000
          : 30_000;
      },
    }
  );

  // Auto-scroll to top when status changes
  useEffect(() => {
    if (!data) return;
    const currentStatus = data.order.status;
    if (prevStatusRef.current !== null && prevStatusRef.current !== currentStatus) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevStatusRef.current = currentStatus;
  }, [data?.order.status]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#181818' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
        <div className="text-center">
          <Coffee size={40} style={{ color: '#5E5E5E' }} className="mx-auto mb-4" />
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>Order Not Found</h1>
          <p style={{ color: '#5E5E5E', fontSize: '0.875rem' }}>We could not find an order with that number.</p>
        </div>
      </div>
    );
  }

  const { order, venue, items } = data;
  const isCancelled = order.status === 'cancelled';
  const isReady = order.status === 'ready';
  const isConfirmed = order.status === 'confirmed';
  const currentStepIdx = STEPS.indexOf(order.status as Step);

  return (
    <div style={{ background: '#F3F2EE', minHeight: '100dvh', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* READY! Hero Banner */}
      {isReady && (
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#fff',
          padding: '28px 24px',
          textAlign: 'center',
          animation: 'readyPulse 2s ease-in-out infinite',
          boxShadow: '0 4px 24px rgba(5,150,105,0.35)',
        }}>
          <div style={{
            fontSize: 64,
            lineHeight: 1,
            marginBottom: 12,
            animation: 'readyCheckBounce 0.5s ease-out',
            display: 'inline-block',
          }}>
            ✓
          </div>
          <div style={{
            fontSize: 'clamp(18px, 4vw, 28px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight: 1.2,
          }}>
            YOUR ORDER IS READY — HEAD TO THE COUNTER!
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#181818', margin: '4px 0 0' }}>{order.orderNumber}</h1>
          {venue && (
            <Link to={`/v/${venue.slug}`} style={{ color: '#5E8B8B', fontSize: 13, textDecoration: 'none' }}>
              ← Back to {venue.name}
            </Link>
          )}
        </div>

        {/* Status card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid rgba(24,24,24,0.06)' }}>
          {isCancelled ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: STEP_COLORS.cancelled.text }}>
              <XCircle size={24} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Order Cancelled</div>
                <div style={{ fontSize: 13, color: '#5E5E5E' }}>Please contact the venue for details.</div>
              </div>
            </div>
          ) : (
            <div data-testid="status-stepper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {STEPS.map((step, idx) => {
                const isDone = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const colour = STEP_COLORS[step];
                return (
                  <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isDone ? colour.bg : '#e7e5e4',
                      color: isDone ? colour.text : '#a8a29e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                      border: isCurrent ? `2px solid ${colour.text}` : '2px solid transparent',
                    }}>
                      {isDone ? <CheckCircle size={18} /> : idx + 1}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 6, textTransform: 'capitalize', color: isDone ? '#181818' : '#a8a29e', fontWeight: isCurrent ? 600 : 400 }}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* "Preparing your order..." animated state for confirmed */}
        {isConfirmed && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 16,
            border: '1px solid rgba(37,99,235,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Animated coffee cup */}
            <div style={{ position: 'relative', flexShrink: 0, width: 40, height: 48 }}>
              {/* Steam wisps */}
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  position: 'absolute',
                  bottom: 36,
                  left: 6 + i * 10,
                  width: 4,
                  height: 10,
                  borderRadius: 2,
                  background: '#93c5fd',
                  opacity: 0.7,
                  animation: `coffeeSteam ${1.2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
              {/* Cup body */}
              <Coffee size={32} style={{ color: '#2563eb', position: 'absolute', bottom: 0, left: 4 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#2563eb' }}>Preparing your order...</div>
              <div style={{ fontSize: 13, color: '#5E5E5E', marginTop: 2 }}>The team is working on it. We'll have it ready soon!</div>
            </div>
          </div>
        )}

        {/* Pickup time */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid rgba(24,24,24,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} style={{ color: '#5E8B8B' }} />
          <div>
            <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pickup</div>
            <div data-testid="pickup-time" style={{ fontWeight: 600, color: '#181818' }}>{order.pickupTime}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid rgba(24,24,24,0.06)' }}>
          <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={14} /> Items
          </div>
          <ul data-testid="order-items" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(it => (
              <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#181818' }}>
                <span>{it.quantity}× {it.itemName}</span>
                <span style={{ color: '#5E5E5E' }}>${(Number(it.unitPrice) * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: '1px solid rgba(24,24,24,0.08)', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#181818' }}>
            <span>Total</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Review CTA — only shown when order is completed */}
        {order.status === 'completed' && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            marginTop: 16,
            border: '1px solid rgba(24,24,24,0.06)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 12 }}>How was your order?</p>
            <Link
              to={`/review/${order.id}`}
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#181818',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Leave a Review
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
