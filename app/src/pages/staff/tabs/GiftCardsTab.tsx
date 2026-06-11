import { trpc } from '@/providers/trpc';


import {
  CheckCircle,
  Gift,
  CreditCard,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function GiftCardsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const { data: cards, isLoading } = trpc.venue.listGiftCards.useQuery({ token }, { enabled: !!token });

  const markRedeemed = trpc.venue.redeemGiftCard.useMutation({
    onSuccess: () => utils.venue.listGiftCards.invalidate(),
  });

  const activeCount = (cards ?? []).filter(c => !c.isRedeemed).length;
  const totalValue = (cards ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const redeemedCount = (cards ?? []).filter(c => c.isRedeemed).length;

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Gift Cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Gift size={20} />} label="Active Cards" value={String(activeCount)} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Total Value" value={`$${totalValue.toFixed(2)}`} color="#2563eb" />
        <StatCard icon={<CheckCircle size={20} />} label="Redeemed" value={String(redeemedCount)} color="#16a34a" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Recipient</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Balance</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (cards ?? []).length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No gift cards yet</td></tr>
            ) : (cards ?? []).map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>{c.code}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.recipientName ?? c.recipientPhone ?? '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(c.amount).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(c.balance).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: c.isRedeemed ? '#fee2e2' : '#dcfce7', color: c.isRedeemed ? '#dc2626' : '#16a34a' }}>
                    {c.isRedeemed ? 'Redeemed' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  {!c.isRedeemed && (
                    <button
                      onClick={() => markRedeemed.mutate({ venueId, code: c.code, orderTotal: Number(c.balance) })}
                      disabled={markRedeemed.isPending}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Mark Redeemed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
