import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus,
} from 'lucide-react';

type DeliveryPlatform = 'all' | 'uber_eats' | 'doordash' | 'menulog' | 'manual';






export function DeliveryTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [platformFilter, setPlatformFilter] = useState<DeliveryPlatform>('all');
  const [days, setDays] = useState(30);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', platformFee: '', notes: '' });
  const [logMsg, setLogMsg] = useState('');

  const { data: deliveryOrders, refetch: refetchDelivery } = trpc.delivery.list.useQuery(
    { token, platform: platformFilter === 'all' ? undefined : platformFilter, days },
    { enabled: !!token }
  );
  const { data: deliverySummary } = trpc.delivery.getSummary.useQuery(
    { token, days },
    { enabled: !!token }
  );
  const logManual = trpc.delivery.logManualOrder.useMutation({
    onSuccess: () => {
      setLogMsg('Order logged!');
      setLogForm({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', platformFee: '', notes: '' });
      refetchDelivery();
    },
    onError: (e) => setLogMsg(e.message),
  });

  const platformBadgeColor = (p: string) => {
    if (p === 'uber_eats') return { bg: 'rgba(255,102,0,0.12)', color: '#FF6600' };
    if (p === 'doordash') return { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30' };
    if (p === 'menulog') return { bg: 'rgba(94,139,94,0.12)', color: '#5E8B5E' };
    return { bg: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' };
  };
  const platformLabel = (p: string) => ({ uber_eats: 'Uber Eats', doordash: 'DoorDash', menulog: 'Menulog', manual: 'Manual' } as Record<string, string>)[p] ?? p;

  const orders = (deliveryOrders as any[] | undefined) ?? [];
  const summary = deliverySummary as any;
  const totalOrders = summary?.totalOrders ?? orders.length;
  const totalNet = summary?.totalNet ?? orders.reduce((s: number, o: any) => s + Number(o.net ?? 0), 0);
  const totalFees = summary?.totalFees ?? orders.reduce((s: number, o: any) => s + Number(o.platformFee ?? 0), 0);

  const inputCls = "w-full bg-transparent border px-3 py-2 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.375rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Delivery
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Delivery zone and fee configuration.
        </p>
      </div>
      <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PLATFORM:</span>
          {(['all', 'uber_eats', 'doordash', 'menulog', 'manual'] as DeliveryPlatform[]).map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: platformFilter === p ? '#181818' : 'transparent', color: platformFilter === p ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {platformLabel(p)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>DAYS:</span>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: days === d ? '#181818' : 'transparent', color: days === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {d}D
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={() => { setShowLogForm(!showLogForm); setLogMsg(''); }}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
            <Plus size={14} /> Log Manual Order
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: String(totalOrders) },
          { label: 'Net Revenue', value: `$${Number(totalNet).toFixed(2)}` },
          { label: 'Platform Fees', value: `$${Number(totalFees).toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>{s.label}</span>
            <span style={{ fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Log Manual Order form */}
      {showLogForm && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Log Manual Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={labelStyle}>Platform</label>
              <select value={logForm.platform} onChange={e => setLogForm({ ...logForm, platform: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="uber_eats">Uber Eats</option>
                <option value="doordash">DoorDash</option>
                <option value="menulog">Menulog</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input type="text" value={logForm.customerName} onChange={e => setLogForm({ ...logForm, customerName: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="Customer name" />
            </div>
            <div className="md:col-span-2">
              <label style={labelStyle}>Items</label>
              <textarea value={logForm.items} onChange={e => setLogForm({ ...logForm, items: e.target.value })}
                rows={2} className={inputCls} style={inputStyle} placeholder="e.g. 2x Flat White, 1x Croissant" />
            </div>
            <div>
              <label style={labelStyle}>Subtotal ($)</label>
              <input type="number" step="0.01" value={logForm.subtotal} onChange={e => setLogForm({ ...logForm, subtotal: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Platform Fee ($)</label>
              <input type="number" step="0.01" value={logForm.platformFee} onChange={e => setLogForm({ ...logForm, platformFee: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <label style={labelStyle}>Notes</label>
              <input type="text" value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="Optional notes" />
            </div>
          </div>
          {logMsg && <p className="font-data mb-3" style={{ fontSize: '0.625rem', color: logMsg === 'Order logged!' ? '#5E8B5E' : '#B85450' }}>{logMsg}</p>}
          <div className="flex items-center gap-3">
            <button
              disabled={logManual.isPending}
              onClick={() => {
                setLogMsg('');
                logManual.mutate({
                  token,
                  platform: logForm.platform as Exclude<DeliveryPlatform, 'all'>,
                  customerName: logForm.customerName || undefined,
                  itemsJson: logForm.items,
                  subtotal: (Number(logForm.subtotal) || 0).toFixed(2),
                  platformFee: (Number(logForm.platformFee) || 0).toFixed(2),
                  notes: logForm.notes || undefined,
                });
              }}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {logManual.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Order
            </button>
            <button onClick={() => setShowLogForm(false)}
              className="px-4 py-2 font-data border"
              style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Orders</h2>
        {orders.length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No delivery orders for this period.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Platform', 'Customer', 'Items', 'Subtotal', 'Fee', 'Net', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const badge = platformBadgeColor(order.platform);
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {platformLabel(order.platform)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>{order.customerName || '—'}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.items}>
                        {order.items ? (order.items.length > 40 ? order.items.slice(0, 40) + '…' : order.items) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>${Number(order.subtotal ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#B85450' }}>${Number(order.platformFee ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${Number(order.net ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: 'rgba(94,139,94,0.1)', color: '#5E8B5E', textTransform: 'uppercase' }}>
                          {order.status || 'delivered'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
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
    </div>
  );
}
