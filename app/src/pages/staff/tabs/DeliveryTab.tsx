import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
  TrendingUp,
  CreditCard,
  Truck,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function DeliveryTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [platformFilter, setPlatformFilter] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', fee: '' });
  const [logMsg, setLogMsg] = useState('');

  const { data: orders, isLoading } = trpc.delivery.list.useQuery(
    { token, platform: (platformFilter || 'all') as 'all' | 'uber_eats' | 'doordash' | 'menulog' | 'manual', days: 30 },
    { enabled: !!token }
  );

  const updateStatus = trpc.delivery.updateStatus.useMutation({
    onSuccess: () => utils.delivery.list.invalidate(),
  });

  const createOrder = trpc.delivery.create.useMutation({
    onSuccess: () => {
      utils.delivery.list.invalidate();
      setShowLogForm(false);
      setLogForm({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', fee: '' });
      setLogMsg('Order logged!');
      setTimeout(() => setLogMsg(''), 3000);
    },
    onError: (e) => setLogMsg(e.message),
  });

  const list = orders ?? [];
  const totalOrders = list.length;
  const totalRevenue = list.reduce((s: number, o: any) => s + Number(o.subtotal ?? 0), 0);
  const totalFees = list.reduce((s: number, o: any) => s + Number(o.fee ?? 0), 0);

  const platformColors: Record<string, { bg: string; color: string }> = {
    uber_eats: { bg: '#fef3c7', color: '#d97706' },
    doordash: { bg: '#fee2e2', color: '#dc2626' },
    menulog: { bg: '#dbeafe', color: '#2563eb' },
    manual: { bg: '#f0fdf4', color: '#16a34a' },
  };

  const platformLabel: Record<string, string> = {
    uber_eats: 'Uber Eats',
    doordash: 'DoorDash',
    menulog: 'Menulog',
    manual: 'Manual',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Delivery Orders</h2>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: showLogForm ? '#57534e' : '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> {showLogForm ? 'Cancel' : 'Log Order'}
        </button>
      </div>

      {/* Log Order Form */}
      {showLogForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>Log Delivery Order</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Platform</label>
              <select value={logForm.platform} onChange={e => setLogForm(f => ({ ...f, platform: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                <option value="uber_eats">Uber Eats</option>
                <option value="doordash">DoorDash</option>
                <option value="menulog">Menulog</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Customer Name</label>
              <input value={logForm.customerName} onChange={e => setLogForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Customer"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Subtotal ($)</label>
              <input type="number" min="0" step="0.01" value={logForm.subtotal} onChange={e => setLogForm(f => ({ ...f, subtotal: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Fee ($)</label>
              <input type="number" min="0" step="0.01" value={logForm.fee} onChange={e => setLogForm(f => ({ ...f, fee: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Items</label>
            <textarea value={logForm.items} onChange={e => setLogForm(f => ({ ...f, items: e.target.value }))}
              placeholder="List items here…"
              rows={2}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setLogMsg('');
                if (!logForm.customerName || !logForm.subtotal) { setLogMsg('Customer name and subtotal required'); return; }
                createOrder.mutate({ token, platform: logForm.platform as 'uber_eats' | 'doordash' | 'menulog' | 'manual', customerName: logForm.customerName, itemsJson: logForm.items, subtotal: (Number(logForm.subtotal) || 0).toFixed(2), platformFee: (Number(logForm.fee) || 0).toFixed(2) });
              }}
              disabled={createOrder.isPending}
              style={{ padding: '8px 20px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createOrder.isPending ? '…' : 'Log Order'}
            </button>
            {logMsg && <span style={{ fontSize: '13px', color: logMsg.includes('!') ? '#16a34a' : '#dc2626' }}>{logMsg}</span>}
          </div>
        </div>
      )}

      {/* Platform Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[{ value: '', label: 'All' }, { value: 'uber_eats', label: 'Uber Eats' }, { value: 'doordash', label: 'DoorDash' }, { value: 'menulog', label: 'Menulog' }, { value: 'manual', label: 'Manual' }].map(p => (
          <button key={p.value} onClick={() => setPlatformFilter(p.value)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              background: platformFilter === p.value ? '#1c1917' : '#e7e5e4',
              color: platformFilter === p.value ? '#fafaf9' : '#57534e',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<Truck size={20} />} label="Total Orders" value={String(totalOrders)} color="#1c1917" />
        <StatCard icon={<TrendingUp size={20} />} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="#16a34a" />
        <StatCard icon={<CreditCard size={20} />} label="Total Fees Paid" value={`$${totalFees.toFixed(2)}`} color="#dc2626" />
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net $</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No delivery orders found</td></tr>
            ) : list.map((o: any) => {
              const pc = platformColors[o.platform] ?? { bg: '#f5f5f4', color: '#57534e' };
              const net = Number(o.subtotal ?? 0) - Number(o.fee ?? 0);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: pc.bg, color: pc.color }}>
                      {platformLabel[o.platform] ?? o.platform}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#1c1917', fontWeight: 500 }}>{o.customerName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={o.status ?? 'received'}
                      onChange={e => updateStatus.mutate({ token, id: o.id, status: e.target.value as 'received' | 'preparing' | 'ready' | 'picked_up' | 'cancelled' })}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                    >
                      {['received', 'preparing', 'ready', 'picked_up', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: net >= 0 ? '#16a34a' : '#dc2626' }}>
                    ${net.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-AU') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
