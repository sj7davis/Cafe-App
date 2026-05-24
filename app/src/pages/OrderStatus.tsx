import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Coffee, Loader2, CheckCircle, Clock, Package, XCircle } from 'lucide-react';

const STEPS = ['pending', 'confirmed', 'ready', 'completed'] as const;
type Step = typeof STEPS[number];

const STEP_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#d97706' },
  confirmed: { bg: '#dbeafe', text: '#2563eb' },
  ready:     { bg: '#d1fae5', text: '#059669' },
  completed: { bg: '#f3f4f6', text: '#6b7280' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

export default function OrderStatus() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data, isLoading, error } = trpc.venue.getOrderByNumber.useQuery(
    { orderNumber: orderNumber || '' },
    { enabled: !!orderNumber, refetchInterval: 30_000 }
  );

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
  const currentStepIdx = STEPS.indexOf(order.status as Step);

  return (
    <div style={{ background: '#F3F2EE', minHeight: '100dvh', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
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
      </div>
    </div>
  );
}
