import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Star,
  CheckCircle,
  Truck,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function CateringTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState('all');
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [quoteText, setQuoteText] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');

  const { data: requests, isLoading } = trpc.venue.listCateringRequests.useQuery(
    { token, status: statusFilter === 'all' ? undefined : statusFilter },
    { enabled: !!token }
  );

  const updateStatus = trpc.venue.updateCateringStatus.useMutation({
    onSuccess: () => utils.venue.listCateringRequests.invalidate(),
  });

  const sendQuote = trpc.venue.sendCateringQuote.useMutation({
    onSuccess: () => {
      utils.venue.listCateringRequests.invalidate();
      setQuotingId(null);
      setQuoteText('');
      setQuoteAmount('');
    },
  });

  const newCount = (requests ?? []).filter(r => r.status === 'new').length;
  const confirmedCount = (requests ?? []).filter(r => r.status === 'confirmed').length;
  const completedCount = (requests ?? []).filter(r => r.status === 'completed').length;

  const statusColors: Record<string, { bg: string; color: string }> = {
    new: { bg: '#fef9c3', color: '#a16207' },
    quoted: { bg: '#dbeafe', color: '#1d4ed8' },
    confirmed: { bg: '#dcfce7', color: '#16a34a' },
    completed: { bg: '#f5f5f4', color: '#57534e' },
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Catering Requests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Truck size={20} />} label="New Requests" value={String(newCount)} color="#d97706" />
        <StatCard icon={<CheckCircle size={20} />} label="Confirmed" value={String(confirmedCount)} color="#16a34a" />
        <StatCard icon={<Star size={20} />} label="Completed" value={String(completedCount)} color="#1c1917" />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'new', 'quoted', 'confirmed', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: statusFilter === s ? '#1c1917' : '#e7e5e4', color: statusFilter === s ? '#fafaf9' : '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Event Date</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Guests</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (requests ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No catering requests</td></tr>
            ) : (requests ?? []).map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ borderBottom: quotingId === r.id ? 'none' : '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.phone}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.eventDate}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.guestCount}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...(statusColors[r.status] ?? { bg: '#f5f5f4', color: '#57534e' }) }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select
                        value={r.status}
                        onChange={e => {
                          if (e.target.value !== r.status) updateStatus.mutate({ token, requestId: r.id, status: e.target.value as any });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                      >
                        {['new', 'quoted', 'confirmed', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {r.email && (
                        <button
                          onClick={() => setQuotingId(quotingId === r.id ? null : r.id)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Send Quote
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {quotingId === r.id && (
                  <tr style={{ borderBottom: '1px solid #f5f5f4', background: '#f8faff' }}>
                    <td colSpan={6} style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#57534e' }}>Quote Details</label>
                        <textarea
                          value={quoteText}
                          onChange={e => setQuoteText(e.target.value)}
                          placeholder="Describe the catering package, menu items, inclusions..."
                          rows={3}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={quoteAmount}
                            onChange={e => setQuoteAmount(e.target.value)}
                            placeholder="Total amount ($)"
                            style={{ width: '160px', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px' }}
                          />
                          <button
                            onClick={() => sendQuote.mutate({ token, requestId: r.id, quoteText, totalAmount: quoteAmount })}
                            disabled={sendQuote.isPending || !quoteText || !quoteAmount}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1c1917', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {sendQuote.isPending ? '…' : 'Send Quote Email'}
                          </button>
                          <button
                            onClick={() => setQuotingId(null)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
