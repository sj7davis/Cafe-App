import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Loader2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const REASONS = ['Expired', 'Damaged', 'Overproduction', 'Wrong order', 'Dropped', 'Other'];

export function WasteTab() {
  const token = localStorage.getItem('b1-owner-token') || '';

  const { data: entries, isLoading, refetch } = trpc.waste.list.useQuery(
    { token }, { enabled: !!token, staleTime: 60 * 1000 }
  );
  const { data: summary } = trpc.waste.getSummary.useQuery(
    { token }, { enabled: !!token, staleTime: 60 * 1000 }
  );
  const logMutation = trpc.waste.log.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); resetForm(); },
  });
  const deleteMutation = trpc.waste.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [showForm, setShowForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState(REASONS[0]);
  const [costEstimate, setCostEstimate] = useState('');

  function resetForm() {
    setItemName(''); setQuantity('1'); setReason(REASONS[0]); setCostEstimate('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !quantity) return;
    logMutation.mutate({
      token,
      itemName: itemName.trim(),
      quantity: parseInt(quantity, 10),
      reason,
      costEstimate: costEstimate ? costEstimate : undefined,
    });
  }

  const rows = (entries as any[] | undefined) ?? [];
  const sum = summary as any;

  const monoLabel = {
    fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)',
    display: 'block', marginBottom: '0.5rem',
  };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };
  const statCard = { borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' };
  const inputStyle = {
    fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)',
    background: 'transparent', border: '1px solid var(--op-border-strong)',
    padding: '8px 10px', width: '100%',
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
            Waste Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
            Track spoilage and overproduction to reduce food cost.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
        >
          <Plus size={14} /> Log Waste
        </button>
      </div>

      <div className="space-y-6">

      {/* Log form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border p-6 space-y-4" style={{ borderColor: 'var(--op-border-strong)' }}>
          <h2 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--op-text)', margin: 0 }}>Log waste entry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={monoLabel}>Item name</label>
              <input
                required value={itemName} onChange={e => setItemName(e.target.value)}
                placeholder="e.g. Flat White, Banana Bread"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={monoLabel}>Quantity</label>
              <input
                required type="number" min={1} max={9999} value={quantity}
                onChange={e => setQuantity(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={monoLabel}>Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={monoLabel}>Cost estimate ($)</label>
              <input
                type="number" min={0} step="0.01" value={costEstimate}
                onChange={e => setCostEstimate(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit" disabled={logMutation.isPending}
              style={{ padding: '8px 18px', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {logMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Save entry
            </button>
            <button
              type="button" onClick={() => { setShowForm(false); resetForm(); }}
              style={{ padding: '8px 18px', background: 'transparent', color: 'var(--op-text-secondary)', border: '1px solid var(--op-border-strong)', fontSize: 13, cursor: 'pointer', borderRadius: 4 }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Summary cards */}
      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border p-5" style={statCard}>
            <span style={monoLabel}>Total entries</span>
            <span style={bigNum}>{sum.totalWasteEntries ?? 0}</span>
          </div>
          <div className="border p-5" style={statCard}>
            <span style={monoLabel}>Estimated cost lost</span>
            <span style={{ ...bigNum, color: '#B85450' }}>${Number(sum.totalCost ?? 0).toFixed(2)}</span>
          </div>
          {sum.topWastedItems?.length > 0 && (
            <div className="border p-5" style={statCard}>
              <span style={monoLabel}>Most wasted item</span>
              <span style={{ ...bigNum, fontSize: '1rem' }}>{sum.topWastedItems[0].itemName}</span>
              <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>
                {sum.topWastedItems[0].quantity} units
              </span>
            </div>
          )}
        </div>
      )}

      {/* Daily waste bar chart */}
      {sum?.last7Days?.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
            Waste Events — Last 7 Days
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sum.last7Days} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--op-border-soft)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Bar dataKey="count" fill="#B85450" radius={[2, 2, 0, 0]} name="Waste entries" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top wasted items */}
      {sum?.topWastedItems?.length > 1 && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Top Wasted Items</h2>
          <div className="space-y-2">
            {sum.topWastedItems.map((item: { itemName: string; quantity: number }, idx: number) => {
              const maxQty = sum.topWastedItems[0].quantity;
              return (
                <div key={item.itemName} className="flex items-center gap-3">
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', width: '1.25rem', textAlign: 'right' }}>{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{item.itemName}</span>
                      <span className="font-data" style={{ fontSize: '0.625rem', color: '#B85450' }}>{item.quantity} wasted</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--op-border-soft)', borderRadius: 2 }}>
                      <div style={{ height: 4, background: '#B85450', borderRadius: 2, width: `${(item.quantity / maxQty) * 100}%`, opacity: 0.7 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log entries table */}
      <div className="border" style={{ borderColor: 'var(--op-border-soft)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', margin: 0 }}>Recent Entries</h2>
        </div>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertTriangle size={28} style={{ color: 'var(--op-text-secondary)', opacity: 0.5 }} />
            <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No waste entries yet. Log your first entry above.</p>
          </div>
        )}
        {rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--op-border-mid)' }}>
                  {['Date', 'Item', 'Qty', 'Reason', 'Est. Cost', ''].map((h, i) => (
                    <th key={h + i} className="font-data" style={{
                      textAlign: i === 0 || i === 1 ? 'left' : 'right',
                      padding: '10px 12px',
                      fontSize: '0.5625rem', letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--op-border-soft)' }}>
                    <td className="font-data" style={{ padding: '10px 12px', color: 'var(--op-text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(row.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--op-text)', fontWeight: 500 }}>{row.itemName}</td>
                    <td className="font-data" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--op-text-secondary)' }}>{row.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--op-text-secondary)' }}>{row.reason}</td>
                    <td className="font-data" style={{ padding: '10px 12px', textAlign: 'right', color: row.costEstimate ? '#B85450' : 'var(--op-text-muted)' }}>
                      {row.costEstimate ? `$${Number(row.costEstimate).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => { if (confirm('Delete this waste entry?')) deleteMutation.mutate({ token, id: row.id }); }}
                        disabled={deleteMutation.isPending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-secondary)', padding: 4, opacity: 0.6 }}
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
