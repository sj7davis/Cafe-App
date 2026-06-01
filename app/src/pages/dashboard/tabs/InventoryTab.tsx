import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Loader2, Package, AlertTriangle, CheckCircle, XCircle, Edit2, Check, X } from 'lucide-react';
import { DS } from '../shared';

interface InventoryItem {
  id: number;
  name: string;
  category: string | null;
  price: string;
  isAvailable: boolean | null;
  quantity: number | null;
  quantityAlert: number | null;
  soldOutAt: Date | null;
  updatedAt: Date | null;
  status: 'in_stock' | 'low_stock' | 'sold_out';
}

const STATUS = {
  in_stock:  { label: 'In Stock',   color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle },
  low_stock: { label: 'Low Stock',  color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
  sold_out:  { label: 'Sold Out',   color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
} as const;

export function InventoryTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editAlert, setEditAlert] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'sold_out'>('all');

  const overview = trpc.venue.getInventoryOverview.useQuery({ token }, { enabled: !!token });
  const setStock = trpc.venue.setStockLevel.useMutation({ onSuccess: () => { overview.refetch(); setEditingId(null); } });
  const toggle = trpc.venue.toggleInventoryItem.useMutation({ onSuccess: () => overview.refetch() });

  const items = (overview.data ?? []) as InventoryItem[];
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const lowCount = items.filter(i => i.status === 'low_stock').length;
  const soldOutCount = items.filter(i => i.status === 'sold_out').length;

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditQty(item.quantity !== null ? String(item.quantity) : '');
    setEditAlert(item.quantityAlert !== null ? String(item.quantityAlert) : '');
  }

  function saveEdit(menuItemId: number) {
    const qty = editQty === '' ? null : parseInt(editQty, 10);
    const alert = editAlert === '' ? null : parseInt(editAlert, 10);
    setStock.mutate({ token, menuItemId, quantity: qty, quantityAlert: alert });
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Inventory
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Track stock levels and mark items sold out. Low-stock alerts help you restock before you run out.
        </p>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {[
          { key: 'all',       label: `All items (${items.length})`,      color: 'var(--op-text)',    bg: 'var(--op-card-bg)' },
          { key: 'low_stock', label: `Low stock (${lowCount})`,          color: '#D97706',          bg: '#FFFBEB' },
          { key: 'sold_out',  label: `Sold out (${soldOutCount})`,       color: '#DC2626',          bg: '#FEF2F2' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            style={{ padding: '7px 16px', borderRadius: 99, border: `1px solid ${filter === f.key ? f.color : 'var(--op-card-border)'}`, background: filter === f.key ? f.bg : 'var(--op-card-bg)', color: f.color, fontSize: 13, fontWeight: filter === f.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.12s' }}>
            {f.label}
          </button>
        ))}
        <button onClick={() => overview.refetch()} style={{ ...DS.btnSecondary, marginLeft: 'auto', fontSize: 12 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div style={DS.cardFlush}>
        {overview.isLoading ? (
          <div style={DS.emptyState}><Loader2 size={22} className="animate-spin" style={{ color: 'var(--op-text-muted)' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={DS.emptyState}>
            <Package size={32} style={{ color: 'var(--op-text-muted)', marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No items {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'in your menu'}</p>
            {filter !== 'all' && <p style={{ margin: '6px 0 0', fontSize: 12 }}>All items are well-stocked!</p>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead>
              <tr>
                {['Item', 'Category', 'Status', 'Qty on hand', 'Alert at', 'Actions'].map(h => (
                  <th key={h} style={DS.tableHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const s = STATUS[item.status];
                const StatusIcon = s.icon;
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} style={{ background: item.status !== 'in_stock' ? s.bg + '50' : undefined }}>
                    <td style={{ ...DS.tableCell, fontWeight: 600 }}>{item.name}</td>
                    <td style={{ ...DS.tableCell, color: 'var(--op-text-secondary)', textTransform: 'capitalize' as const }}>{item.category || '—'}</td>
                    <td style={DS.tableCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
                          <StatusIcon size={11} />{s.label}
                        </span>
                      </div>
                    </td>
                    <td style={DS.tableCell}>
                      {isEditing ? (
                        <input type="number" min={0} value={editQty} onChange={e => setEditQty(e.target.value)}
                          placeholder="∞"
                          style={{ ...DS.input, width: 72, padding: '4px 8px', fontSize: 13 }} />
                      ) : (
                        <span style={{ color: item.quantity === null ? 'var(--op-text-muted)' : undefined }}>
                          {item.quantity !== null ? item.quantity : '∞ (unlimited)'}
                        </span>
                      )}
                    </td>
                    <td style={DS.tableCell}>
                      {isEditing ? (
                        <input type="number" min={0} value={editAlert} onChange={e => setEditAlert(e.target.value)}
                          placeholder="—"
                          style={{ ...DS.input, width: 72, padding: '4px 8px', fontSize: 13 }} />
                      ) : (
                        <span style={{ color: item.quantityAlert === null ? 'var(--op-text-muted)' : undefined }}>
                          {item.quantityAlert !== null ? item.quantityAlert : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ ...DS.tableCell, whiteSpace: 'nowrap' as const }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveEdit(item.id)} disabled={setStock.isPending}
                            style={{ ...DS.btnPrimary, padding: '4px 10px', fontSize: 11 }}>
                            <Check size={12} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ ...DS.btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEdit(item)}
                            style={{ ...DS.btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                            <Edit2 size={11} /> Edit
                          </button>
                          <button
                            onClick={() => toggle.mutate({ token, venueId: 0, menuItemId: item.id, isAvailable: item.isAvailable === false })}
                            style={{
                              padding: '4px 10px', borderRadius: 'var(--op-radius)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              background: item.isAvailable === false ? '#D1FAE5' : '#FEF2F2',
                              color: item.isAvailable === false ? '#065F46' : '#DC2626',
                            }}>
                            {item.isAvailable === false ? '✓ Restock' : '✕ Sold Out'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--op-bg)', borderRadius: 8, fontSize: 12, color: 'var(--op-text-muted)', lineHeight: 1.5 }}>
        💡 Set <strong>Qty on hand</strong> to track physical stock. Set <strong>Alert at</strong> to get notified when stock is running low. Leave blank for unlimited/untracked items.
      </div>
    </div>
  );
}
