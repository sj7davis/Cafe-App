import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Coffee,
  Users,
  CreditCard,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function SubscriptionsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const { data: passes, isLoading } = trpc.venue.listSubscriptionPasses.useQuery({ token }, { enabled: !!token });
  const { data: passConfig } = trpc.venue.getPassConfig.useQuery({ venueId });

  const [editConfig, setEditConfig] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configCredits, setConfigCredits] = useState('');
  const [configPrice, setConfigPrice] = useState('');

  const upsertConfig = trpc.venue.upsertPassConfig.useMutation({
    onSuccess: () => {
      utils.venue.getPassConfig.invalidate();
      setEditConfig(false);
    },
  });

  const activeCount = (passes ?? []).filter(p => p.isActive).length;
  const totalValue = (passes ?? []).reduce((s, p) => s + Number(p.price), 0);
  const totalCreditsRemaining = (passes ?? []).reduce((s, p) => s + p.remainingCredits, 0);

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Subscription Passes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Active Passes" value={String(activeCount)} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Total Value" value={`$${totalValue.toFixed(2)}`} color="#16a34a" />
        <StatCard icon={<Coffee size={20} />} label="Credits Remaining" value={String(totalCreditsRemaining)} color="#d97706" />
      </div>

      {/* Pass Config */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Pass Configuration</h3>
          <button
            onClick={() => {
              setConfigName(passConfig?.name ?? '');
              setConfigCredits(passConfig?.totalCredits ? String(passConfig.totalCredits) : '');
              setConfigPrice(passConfig?.price ? String(passConfig.price) : '');
              setEditConfig(!editConfig);
            }}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {editConfig ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {!editConfig ? (
          passConfig ? (
            <p style={{ margin: 0, fontSize: '14px', color: '#44403c' }}>
              Current Pass: <strong>{passConfig.name}</strong> — {passConfig.totalCredits} credits for ${Number(passConfig.price).toFixed(2)}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: '#78716c' }}>No pass configured</p>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={configName} onChange={e => setConfigName(e.target.value)} placeholder="Monthly Coffee Pass"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Credits</label>
              <input type="number" value={configCredits} onChange={e => setConfigCredits(e.target.value)} placeholder="20"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Price ($)</label>
              <input type="number" value={configPrice} onChange={e => setConfigPrice(e.target.value)} placeholder="30"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <button
              onClick={() => {
                if (!configName || !configCredits || !configPrice) return;
                upsertConfig.mutate({ token, name: configName, totalCredits: Number(configCredits), price: Number(configPrice) });
              }}
              disabled={upsertConfig.isPending}
              style={{ background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}
            >
              {upsertConfig.isPending ? '…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Passes Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Credits</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Price</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Expires</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (passes ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No passes yet</td></tr>
            ) : (passes ?? []).map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.phone}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.name}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.remainingCredits}/{p.totalCredits}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(p.price).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
