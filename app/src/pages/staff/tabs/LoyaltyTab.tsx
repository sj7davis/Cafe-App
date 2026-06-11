import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Users,
  Star,
  TrendingUp,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function LoyaltyTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [search, setSearch] = useState('');
  const [adjustPhone, setAdjustPhone] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMsg, setAdjustMsg] = useState('');

  const accountsQuery = trpc.loyalty.listAccounts.useQuery(
    { token },
    { enabled: !!token }
  );
  const adjustMut = trpc.loyalty.adjustPoints.useMutation();
  const utils = trpc.useUtils();

  const accounts = accountsQuery.data ?? [];
  const filtered = accounts.filter((a: any) =>
    !search || a.phone.includes(search) || (a.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = accounts.length;
  const totalPoints = accounts.reduce((s: number, a: any) => s + (a.pointsBalance ?? 0), 0);
  const totalLifetime = accounts.reduce((s: number, a: any) => s + (a.totalLifetimePoints ?? 0), 0);

  async function handleAdjust() {
    setAdjustMsg('');
    try {
      const pts = Number(adjustPoints);
      if (!adjustPhone || !pts || !adjustReason) { setAdjustMsg('Fill all fields'); return; }
      const result = await adjustMut.mutateAsync({ token, phone: adjustPhone, points: pts, reason: adjustReason });
      setAdjustMsg(`✅ Done — new balance: ${result.newBalance} pts`);
      setAdjustPhone(''); setAdjustPoints(''); setAdjustReason('');
      utils.loyalty.listAccounts.invalidate();
    } catch (e: any) {
      setAdjustMsg(`❌ ${e.message}`);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Loyalty Program</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Members" value={String(totalMembers)} color="#1c1917" />
        <StatCard icon={<Star size={20} />} label="Points Active" value={totalPoints >= 1000 ? `${(totalPoints/1000).toFixed(1)}k` : String(totalPoints)} color="#d97706" />
        <StatCard icon={<TrendingUp size={20} />} label="Lifetime Points" value={totalLifetime >= 1000 ? `${(totalLifetime/1000).toFixed(1)}k` : String(totalLifetime)} color="#16a34a" />
      </div>

      {/* Manual adjustment */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Manual Points Adjustment</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Phone</label>
            <input value={adjustPhone} onChange={e => setAdjustPhone(e.target.value)}
              placeholder="+61 ..."
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Points (+/−)</label>
            <input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)}
              placeholder="e.g. 50 or -10"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Reason</label>
            <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              placeholder="Staff goodwill, error correction…"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAdjust} disabled={adjustMut.isPending}
            style={{ background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}>
            {adjustMut.isPending ? '…' : 'Apply'}
          </button>
        </div>
        {adjustMsg && <p style={{ margin: '10px 0 0', fontSize: '13px', color: adjustMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{adjustMsg}</p>}
      </div>

      {/* Accounts table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Members ({filtered.length})</h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone or name…"
            style={{ border: '1px solid #e7e5e4', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', width: '220px' }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e7e5e4', color: '#78716c' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Name</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Balance</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#78716c', padding: '20px' }}>No members yet</td></tr>
            )}
            {filtered.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '8px 4px' }}>{a.phone}</td>
                <td style={{ padding: '8px 4px', color: '#78716c' }}>{a.name ?? '—'}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>{a.pointsBalance} pts</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#78716c' }}>{a.totalLifetimePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
