import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function InventoryTab({ venueId, isManager }: { venueId: number; isManager: boolean }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<number, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  // Quantity editing state
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});
  const [alertValues, setAlertValues] = useState<Record<number, string>>({});
  const [savingQtyIds, setSavingQtyIds] = useState<Set<number>>(new Set());
  const [qtySavedIds, setQtySavedIds] = useState<Set<number>>(new Set());

  const { data: menuItems } = trpc.venue.listMenu.useQuery({ venueId });
  const { data: inventoryRows } = trpc.venue.getInventory.useQuery({ venueId });
  const { data: invLevels } = trpc.venue.getInventoryLevels.useQuery({ token }, { enabled: !!token });

  const toggleItem = trpc.venue.toggleInventoryItem.useMutation({
    onSuccess: () => utils.venue.getInventory.invalidate(),
  });

  const setInventoryQty = trpc.venue.setInventoryQuantity.useMutation({
    onSuccess: (_data, vars) => {
      utils.venue.getInventoryLevels.invalidate();
      setSavingQtyIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; });
      setQtySavedIds(prev => { const s = new Set(prev); s.add(vars.menuItemId); return s; });
      setTimeout(() => setQtySavedIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; }), 2000);
    },
    onError: (_err, vars) => {
      setSavingQtyIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; });
    },
  });

  // Build a map from menuItemId -> inventory row
  const invMap: Record<number, { isAvailable: boolean; staffNote: string | null; soldOutAt: string | Date | null }> = {};
  if (inventoryRows) {
    for (const row of inventoryRows) {
      invMap[row.menuItemId] = {
        isAvailable: row.isAvailable,
        staffNote: row.staffNote ?? null,
        soldOutAt: row.soldOutAt ?? null,
      };
    }
  }

  // Build a map from menuItemId -> inventory levels
  const levelMap: Record<number, { quantity: number | null; quantityAlert: number | null }> = {};
  if (invLevels) {
    for (const row of invLevels) {
      levelMap[row.menuItemId] = { quantity: row.quantity ?? null, quantityAlert: row.quantityAlert ?? null };
    }
  }

  // Merge menu items with inventory state
  const items = (menuItems ?? []).map((item) => {
    const inv = invMap[item.id];
    const lv = levelMap[item.id];
    return {
      ...item,
      isAvailable: inv ? inv.isAvailable : true,
      staffNote: inv ? (inv.staffNote ?? '') : '',
      soldOutAt: inv ? inv.soldOutAt : null,
      quantity: lv?.quantity ?? null,
      quantityAlert: lv?.quantityAlert ?? null,
    };
  });

  const filteredItems = categoryFilter === 'all'
    ? items
    : items.filter((i) => (i.category ?? '').toLowerCase() === categoryFilter.toLowerCase());

  const totalCount = items.length;
  const availableCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = items.filter((i) => !i.isAvailable).length;
  const lowStockCount = items.filter((i) => i.quantity != null && i.quantityAlert != null && i.quantity <= i.quantityAlert).length;

  const categories = ['all', ...Array.from(new Set((menuItems ?? []).map((i) => (i.category ?? '').toLowerCase()).filter(Boolean)))];

  const categoryColors: Record<string, string> = {
    coffee: '#5E8B8B',
    pastries: '#d97706',
    bread: '#92400e',
  };

  async function handleToggle(menuItemId: number, currentAvailable: boolean) {
    const note = noteValues[menuItemId] ?? invMap[menuItemId]?.staffNote ?? '';
    setTogglingIds((prev) => new Set(prev).add(menuItemId));
    try {
      await toggleItem.mutateAsync({
        token,
        venueId,
        menuItemId,
        isAvailable: !currentAvailable,
        staffNote: note || undefined,
      });
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(menuItemId); return s; });
    }
  }

  async function handleSaveNote(menuItemId: number, isAvailable: boolean) {
    const note = noteValues[menuItemId] ?? '';
    await toggleItem.mutateAsync({
      token,
      venueId,
      menuItemId,
      isAvailable,
      staffNote: note || undefined,
    });
    utils.venue.getInventory.invalidate();
    setEditingNoteId(null);
  }

  function handleSaveQty(menuItemId: number) {
    const qtyStr = qtyValues[menuItemId];
    const alertStr = alertValues[menuItemId];
    const qty = qtyStr !== undefined && qtyStr !== '' ? Number(qtyStr) : undefined;
    const alert = alertStr !== undefined && alertStr !== '' ? Number(alertStr) : undefined;
    if (qty === undefined) return;
    setSavingQtyIds(prev => new Set(prev).add(menuItemId));
    setInventoryQty.mutate({ token, menuItemId, quantity: qty, quantityAlert: alert });
  }

  function getStockStatus(item: { quantity: number | null; quantityAlert: number | null; isAvailable: boolean }) {
    if (!item.isAvailable) return { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2' };
    if (item.quantity == null) return { label: 'In Stock', color: '#16a34a', bg: '#f0fdf4' };
    if (item.quantityAlert != null && item.quantity <= item.quantityAlert) return { label: 'Low Stock', color: '#d97706', bg: '#fffbeb' };
    return { label: 'In Stock', color: '#16a34a', bg: '#f0fdf4' };
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Inventory</h2>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Package size={20} />} label="Total Items" value={String(totalCount)} color="#1c1917" />
        <StatCard icon={<CheckCircle size={20} />} label="Available" value={String(availableCount)} color="#16a34a" />
        <StatCard icon={<XCircle size={20} />} label="Sold Out" value={String(soldOutCount)} color="#dc2626" />
        <StatCard icon={<AlertTriangle size={20} />} label="Low Stock" value={String(lowStockCount)} color="#d97706" />
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: categoryFilter === cat ? '#1c1917' : '#e7e5e4',
              color: categoryFilter === cat ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert At</th>
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Note</th>}
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 8 : 6} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  {menuItems === undefined ? 'Loading...' : 'No items found'}
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const isToggling = togglingIds.has(item.id);
              const isSavingQty = savingQtyIds.has(item.id);
              const isQtySaved = qtySavedIds.has(item.id);
              const catColor = categoryColors[(item.category ?? '').toLowerCase()] ?? '#78716c';
              const noteVal = noteValues[item.id] !== undefined ? noteValues[item.id] : (item.staffNote ?? '');
              const qtyDisplay = qtyValues[item.id] !== undefined ? qtyValues[item.id] : (item.quantity != null ? String(item.quantity) : '');
              const alertDisplay = alertValues[item.id] !== undefined ? alertValues[item.id] : (item.quantityAlert != null ? String(item.quantityAlert) : '');
              const stockStatus = getStockStatus(item);
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #f5f5f4',
                    background: item.isAvailable ? '#fff' : '#fef2f2',
                    opacity: isToggling ? 0.6 : 1,
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                >
                  {/* Name */}
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>
                    {item.name}
                    {!item.isAvailable && item.soldOutAt && (
                      <div style={{ fontSize: '11px', color: '#a8a29e', marginTop: '2px' }}>
                        Sold out {new Date(item.soldOutAt).toLocaleString()}
                      </div>
                    )}
                  </td>

                  {/* Category badge */}
                  <td style={{ padding: '14px 16px' }}>
                    {item.category ? (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: catColor + '1a',
                        color: catColor,
                      }}>
                        {item.category}
                      </span>
                    ) : (
                      <span style={{ color: '#d6d3d1', fontSize: '12px' }}>—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 16px', color: '#44403c' }}>
                    ${Number(item.price).toFixed(2)}
                  </td>

                  {/* Stock Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: stockStatus.bg,
                      color: stockStatus.color,
                    }}>
                      {stockStatus.label}
                    </span>
                  </td>

                  {/* Qty input */}
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      min="0"
                      value={qtyDisplay}
                      onChange={e => setQtyValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="—"
                      style={{
                        width: '64px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e7e5e4',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  {/* Alert at input */}
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      min="0"
                      value={alertDisplay}
                      onChange={e => setAlertValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="—"
                      style={{
                        width: '64px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e7e5e4',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  {/* Staff Note */}
                  {isManager && (
                    <td style={{ padding: '10px 16px', minWidth: '180px' }}>
                      {editingNoteId === item.id ? (
                        <input
                          autoFocus
                          value={noteVal}
                          onChange={(e) => setNoteValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={() => handleSaveNote(item.id, item.isAvailable)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(item.id, item.isAvailable);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                          placeholder="Add staff note…"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e7e5e4',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            width: '100%',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingNoteId(item.id);
                            if (noteValues[item.id] === undefined) {
                              setNoteValues((prev) => ({ ...prev, [item.id]: item.staffNote ?? '' }));
                            }
                          }}
                          style={{
                            color: noteVal ? '#44403c' : '#d6d3d1',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'block',
                            minWidth: '80px',
                          }}
                          title="Click to edit note"
                        >
                          {noteVal || 'Add note…'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Actions: Save qty + Toggle */}
                  {isManager && (
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          disabled={isSavingQty || (qtyValues[item.id] === undefined && alertValues[item.id] === undefined)}
                          onClick={() => handleSaveQty(item.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isQtySaved ? '#f0fdf4' : '#1c1917',
                            color: isQtySaved ? '#16a34a' : '#fafaf9',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: (isSavingQty || (qtyValues[item.id] === undefined && alertValues[item.id] === undefined)) ? 'not-allowed' : 'pointer',
                            opacity: (qtyValues[item.id] === undefined && alertValues[item.id] === undefined) ? 0.4 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSavingQty ? '…' : isQtySaved ? 'Saved' : 'Save'}
                        </button>
                        <button
                          disabled={isToggling}
                          onClick={() => handleToggle(item.id, item.isAvailable)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: item.isAvailable ? '#fef2f2' : '#f0fdf4',
                            color: item.isAvailable ? '#dc2626' : '#16a34a',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isToggling ? 'not-allowed' : 'pointer',
                            opacity: isToggling ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isToggling ? '…' : item.isAvailable ? 'Sold Out' : 'Available'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
