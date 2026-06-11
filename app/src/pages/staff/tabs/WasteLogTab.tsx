import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  CreditCard,
  Trash2,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function WasteLogTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const { data: menuItems } = trpc.venue.listMenu.useQuery({ venueId });
  const { data: wasteEntries, isLoading: wasteLoading } = trpc.waste.list.useQuery({ token }, { enabled: !!token });

  const [itemName, setItemName] = useState('');
  const [menuItemId, setMenuItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<string>('Spoiled');
  const [costEstimate, setCostEstimate] = useState<string>('');
  const [formMsg, setFormMsg] = useState('');

  const logWaste = trpc.waste.log.useMutation({
    onSuccess: () => {
      utils.waste.list.invalidate();
      utils.waste.getSummary.invalidate();
      setItemName('');
      setMenuItemId('');
      setQuantity(1);
      setReason('Spoiled');
      setCostEstimate('');
      setFormMsg('Waste logged successfully');
      setTimeout(() => setFormMsg(''), 3000);
    },
    onError: (e) => setFormMsg(e.message),
  });

  const deleteWaste = trpc.waste.delete.useMutation({
    onSuccess: () => {
      utils.waste.list.invalidate();
      utils.waste.getSummary.invalidate();
    },
  });

  const todayStr = new Date().toDateString();
  const todayEntries = (wasteEntries ?? []).filter((e: any) => new Date(e.createdAt).toDateString() === todayStr);
  const todayCount = todayEntries.reduce((s: number, e: any) => s + (e.quantity ?? 0), 0);
  const todayCost = todayEntries.reduce((s: number, e: any) => s + (Number(e.costEstimate) || 0), 0);

  function handleLog() {
    setFormMsg('');
    const name = itemName.trim();
    if (!name && !menuItemId) { setFormMsg('Enter an item name or select from menu'); return; }
    logWaste.mutate({
      token,
      menuItemId: menuItemId !== '' ? Number(menuItemId) : undefined,
      itemName: name || (menuItems ?? []).find((m: any) => m.id === menuItemId)?.name || '',
      quantity,
      reason,
      costEstimate: costEstimate !== '' ? Number(costEstimate).toFixed(2) : undefined,
    });
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Waste Log</h2>

      {/* Today summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<Trash2 size={20} />} label="Today's Waste Items" value={String(todayCount)} color="#d97706" />
        <StatCard icon={<CreditCard size={20} />} label="Today's Est. Cost" value={`$${todayCost.toFixed(2)}`} color="#dc2626" />
      </div>

      {/* Log Waste Form */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Log Waste</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Item Name</label>
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Croissant"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Menu Item (optional)</label>
            <select
              value={menuItemId}
              onChange={e => {
                const val = e.target.value;
                setMenuItemId(val === '' ? '' : Number(val));
                if (val !== '') {
                  const found = (menuItems ?? []).find((m: any) => m.id === Number(val));
                  if (found) setItemName(found.name);
                }
              }}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}
            >
              <option value="">Select from menu…</option>
              {(menuItems ?? []).map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Reason</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}
            >
              {['Spoiled', 'Dropped', 'Overproduced', 'Expired', 'Other'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Est. cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costEstimate}
              onChange={e => setCostEstimate(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleLog}
              disabled={logWaste.isPending}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#1c1917',
                color: '#fafaf9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: logWaste.isPending ? 'not-allowed' : 'pointer',
                opacity: logWaste.isPending ? 0.7 : 1,
              }}
            >
              {logWaste.isPending ? 'Logging…' : 'Log Waste'}
            </button>
          </div>
        </div>
        {formMsg && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: formMsg.includes('success') ? '#16a34a' : '#dc2626' }}>
            {formMsg}
          </p>
        )}
      </div>

      {/* Recent Waste Entries */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Recent Entries</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Cost</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date/Time</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}></th>
            </tr>
          </thead>
          <tbody>
            {wasteLoading ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (wasteEntries ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No waste entries yet</td></tr>
            ) : (wasteEntries ?? []).slice(0, 20).map((entry: any) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{entry.itemName}</td>
                <td style={{ padding: '12px 16px', color: '#44403c' }}>{entry.quantity}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#fef3c7',
                    color: '#d97706',
                  }}>
                    {entry.reason}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#44403c' }}>
                  {entry.costEstimate != null ? `$${Number(entry.costEstimate).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => deleteWaste.mutate({ token, id: entry.id })}
                    disabled={deleteWaste.isPending}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#a8a29e',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
