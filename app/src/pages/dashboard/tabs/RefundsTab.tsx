import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Loader2, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export function RefundsTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();

  const { data: orders, isLoading } = trpc.stripeCheckout.getRefundableOrders.useQuery(
    { token },
    { enabled: !!token }
  );

  const createRefund = trpc.stripeCheckout.createRefund.useMutation({
    onSuccess: () => {
      utils.stripeCheckout.getRefundableOrders.invalidate();
      setRefundingId(null);
      setRefundAmount('');
      setRefundMsg({ type: 'success', text: 'Refund issued successfully.' });
      setTimeout(() => setRefundMsg(null), 5000);
    },
    onError: (err) => {
      setRefundMsg({ type: 'error', text: err.message });
    },
  });

  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundedIds, setRefundedIds] = useState<Record<number, string>>({});
  const [refundMsg, setRefundMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const orderList = (orders ?? []) as any[];

  function openRefundForm(order: any) {
    setRefundingId(order.id);
    setRefundAmount(order.totalAmount ? String(parseFloat(order.totalAmount).toFixed(2)) : '');
    setRefundMsg(null);
  }

  function submitRefund(order: any) {
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) { setRefundMsg({ type: 'error', text: 'Enter a valid refund amount.' }); return; }
    createRefund.mutate(
      { token, orderId: order.id, amount: amt },
      {
        onSuccess: () => {
          setRefundedIds(prev => ({ ...prev, [order.id]: `$${amt.toFixed(2)}` }));
        },
      }
    );
  }

  const labelStyle = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Refund Management
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Issue full or partial refunds for completed Stripe orders.
        </p>
      </div>

      {refundMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: refundMsg.type === 'success' ? 'rgba(94,139,94,0.1)' : 'rgba(184,84,80,0.1)', border: `1px solid ${refundMsg.type === 'success' ? 'rgba(94,139,94,0.2)' : 'rgba(184,84,80,0.2)'}` }}>
          {refundMsg.type === 'success' ? <CheckCircle size={15} style={{ color: '#5E8B5E' }} /> : <AlertCircle size={15} style={{ color: '#B85450' }} />}
          <span style={{ fontSize: 13, color: refundMsg.type === 'success' ? '#5E8B5E' : '#B85450' }}>{refundMsg.text}</span>
        </div>
      )}

      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!isLoading && orderList.length === 0 && (
          <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No refundable orders found.</p>
        )}
        {orderList.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--op-border-mid)' }}>
                  {['Order #', 'Customer', 'Amount', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', ...labelStyle, fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderList.map((order: any) => {
                  const isRefunded = !!refundedIds[order.id];
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--op-border-soft)' }}>
                      <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: 12, color: 'var(--op-text)', fontWeight: 600 }}>
                        #{order.orderNumber || order.id}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>
                        <div>{order.customerName || '—'}</div>
                        {order.customerPhone && <div style={{ fontSize: 11, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>{order.customerPhone}</div>}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--op-text)' }}>
                        ${parseFloat(order.totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: 11 }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {isRefunded ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: 'rgba(94,139,94,0.12)', color: '#5E8B5E', fontSize: 11, fontWeight: 600 }}>
                            <CheckCircle size={11} /> Refunded {refundedIds[order.id]}
                          </span>
                        ) : refundingId === order.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={refundAmount}
                              onChange={e => setRefundAmount(e.target.value)}
                              style={{ width: 80, padding: '5px 8px', border: '1px solid var(--op-card-border)', borderRadius: 5, fontSize: 12, background: 'var(--op-bg)', color: 'var(--op-text)' }}
                            />
                            <button
                              disabled={createRefund.isPending}
                              onClick={() => submitRefund(order)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                            >
                              {createRefund.isPending ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} Confirm
                            </button>
                            <button onClick={() => { setRefundingId(null); setRefundAmount(''); }} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--op-card-border)', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: 'var(--op-text)' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openRefundForm(order)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'none', border: '1px solid rgba(184,84,80,0.25)', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: '#B85450', fontWeight: 600 }}
                          >
                            <RotateCcw size={11} /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
