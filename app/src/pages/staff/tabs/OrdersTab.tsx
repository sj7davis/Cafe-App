import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '@/providers/trpc';
import { useVenueSSE } from '@/hooks/useVenueSSE';


import {
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { playNewOrderChime, printReceipt, StatCard, StatusBadge } from '../shared';

export function OrdersTab({ venueId, token, venue }: { venueId: number; token: string; venue?: any }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [waitInput, setWaitInput] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const [printerSize, setPrinterSize] = useState<'80mm' | '58mm' | 'a4'>('80mm');
  const utils = trpc.useUtils();
  const { data: ordersList } = trpc.venue.listOrders.useQuery(
    { venueId, status: statusFilter === 'all' ? undefined : statusFilter, locationId: locationFilter ?? undefined, limit: 50 },
    { refetchInterval: false }
  );

  useVenueSSE({
    venueId: venueId ?? null,
    token: token ?? null,
    events: ['order_update', 'order_new'],
    onEvent: () => {
      utils.venue.listOrders.invalidate();
    },
  });
  const { data: locationsList } = trpc.venue.listLocations.useQuery({ venueId });

  const updateStatus = trpc.venue.updateOrderStatus.useMutation({
    onSuccess: () => utils.venue.listOrders.invalidate(),
  });

  const setWaitTime = trpc.venue.setWaitTime.useMutation({
    onSuccess: () => {
      setWaitMsg('✓ Updated');
      setTimeout(() => setWaitMsg(''), 3000);
    },
  });

  const knownIds = useRef<Set<number>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [staffNoteDraft, setStaffNoteDraft] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: selectedOrderItems } = trpc.venue.getOrderItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  const filteredOrders = (ordersList ?? []).filter(o =>
    !orderSearch ||
    (o.customerName ?? '').toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.customerPhone ?? '').includes(orderSearch) ||
    (o.orderNumber ?? '').includes(orderSearch.toUpperCase())
  );

  function handleExportCSV() {
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Order Number', 'Customer Name', 'Phone', 'Status', 'Total', 'Pickup Time', 'Date', 'Payment Method'];
    const rows = filteredOrders.map(o => [
      escape(o.orderNumber ?? ''),
      escape(o.customerName ?? ''),
      escape(o.customerPhone ?? ''),
      escape(o.status ?? ''),
      escape(Number(o.totalAmount).toFixed(2)),
      escape(o.pickupTime ? new Date(o.pickupTime).toLocaleTimeString() : ''),
      escape(o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : ''),
      escape(o.paymentMethod ?? ''),
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!ordersList) return;
    const incoming = new Set(ordersList.map(o => o.id));
    const isFirstLoad = knownIds.current.size === 0;
    if (!isFirstLoad) {
      const fresh = new Set([...incoming].filter(id => !knownIds.current.has(id)));
      if (fresh.size > 0) {
        playNewOrderChime();
        setNewOrderIds(prev => {
          const merged = new Set(prev);
          fresh.forEach(id => merged.add(id));
          return merged;
        });
        // Auto-clear highlight after 8 seconds
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            fresh.forEach(id => next.delete(id));
            return next;
          });
        }, 8_000);
      }
    }
    knownIds.current = incoming;
  }, [ordersList]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: holidayInfo } = trpc.venue.isPublicHoliday.useQuery({ venueId, date: todayStr });

  return (
    <div>
      {holidayInfo?.isHoliday && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
          🎉 Today is a public holiday. Check your surcharge settings are configured.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Orders</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Wait time setter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#57534e' }}>
            <span>Current wait:</span>
            <input
              type="number"
              value={waitInput}
              onChange={e => setWaitInput(e.target.value)}
              placeholder="10"
              style={{
                width: '52px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            />
            <span>min</span>
            <button
              onClick={() => {
                const mins = Number(waitInput);
                if (!mins || mins < 1) return;
                setWaitTime.mutate({ token, minutes: mins });
              }}
              disabled={setWaitTime.isPending}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: '#1c1917',
                color: '#fafaf9',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {setWaitTime.isPending ? '…' : 'Set'}
            </button>
            {waitMsg && <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>{waitMsg}</span>}
          </div>

          {/* CSV export */}
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #e7e5e4',
              background: '#fff',
              color: '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Printer size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#78716c' }}>Printer:</span>
        {(['80mm', '58mm', 'a4'] as const).map(size => (
          <button
            key={size}
            onClick={() => setPrinterSize(size)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${printerSize === size ? '#1c1917' : '#e7e5e4'}`,
              background: printerSize === size ? '#1c1917' : '#fff',
              color: printerSize === size ? '#fff' : '#44403c',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {size === 'a4' ? 'A4' : size}
          </button>
        ))}
      </div>

      {/* Status filter row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'pending', 'confirmed', 'ready', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: statusFilter === status ? '#1c1917' : '#e7e5e4',
              color: statusFilter === status ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          placeholder="Search by name, phone, or order number…"
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            borderRadius: '8px',
            border: '1px solid #e7e5e4',
            fontSize: '13px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {orderSearch && (
          <button
            onClick={() => setOrderSearch('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#a8a29e',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 2px',
            }}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Location filter — only renders when venue has 2+ locations */}
      {locationsList && locationsList.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setLocationFilter(null)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: locationFilter === null ? '#1c1917' : '#e7e5e4',
              color: locationFilter === null ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All Locations
          </button>
          {locationsList.map(loc => (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: locationFilter === loc.id ? '#1c1917' : '#e7e5e4',
                color: locationFilter === loc.id ? '#fafaf9' : '#57534e',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats Cards — real data from ordersList */}
      {(() => {
        const todayStr = new Date().toDateString();
        const todayOrders = (ordersList ?? []).filter(o => new Date(o.createdAt).toDateString() === todayStr);
        const todayPending = todayOrders.filter(o => o.status === 'pending').length;
        const todayCompleted = todayOrders.filter(o => o.status === 'completed').length;
        const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <StatCard icon={<ShoppingBag size={20} />} label="Today's Orders" value={String(todayOrders.length)} color="#1c1917" />
            <StatCard icon={<Clock size={20} />} label="Pending" value={String(todayPending)} color="#d97706" />
            <StatCard icon={<CheckCircle size={20} />} label="Completed" value={String(todayCompleted)} color="#16a34a" />
            <StatCard icon={<TrendingUp size={20} />} label="Revenue" value={`$${todayRevenue.toFixed(2)}`} color="#2563eb" />
          </div>
        );
      })()}

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Print</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => {
              const isExpanded = selectedOrderId === order.id;
              const isNew = newOrderIds.has(order.id);
              return (
                <React.Fragment key={order.id}>
                  <tr
                    data-order-id={order.id}
                    data-testid={`order-row-${order.id}`}
                    data-new-order={isNew ? 'true' : undefined}
                    onClick={() => setSelectedOrderId(isExpanded ? null : order.id)}
                    style={{
                      borderBottom: isExpanded ? 'none' : '1px solid #f5f5f4',
                      transition: 'background 0.15s',
                      background: isNew ? '#fffbeb' : isExpanded ? '#f0fdf4' : '#fff',
                      borderLeft: isNew ? '3px solid #d97706' : isExpanded ? '3px solid #059669' : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!isNew && !isExpanded) e.currentTarget.style.background = '#fafaf9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? '#fffbeb' : isExpanded ? '#f0fdf4' : '#fff'; }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>
                      <span style={{ marginRight: 6, fontSize: 10, color: '#a8a29e' }}>{isExpanded ? '▼' : '▶'}</span>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#44403c' }}>{order.customerName}</td>
                    <td style={{ padding: '14px 16px', color: '#78716c' }}>${Number(order.totalAmount).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      {editingOrderId === order.id ? (
                        <div data-testid={`confirm-panel-${order.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                          <div style={{ fontSize: 11, color: '#57534e' }}>
                            New status: <strong style={{ textTransform: 'capitalize' }}>{pendingStatus}</strong>
                          </div>
                          <textarea
                            data-testid={`staff-note-input-${order.id}`}
                            value={staffNoteDraft}
                            onChange={(e) => setStaffNoteDraft(e.target.value)}
                            placeholder="Internal note (optional)"
                            rows={2}
                            style={{
                              padding: '6px 8px', borderRadius: 6, border: '1px solid #e7e5e4',
                              fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              data-testid={`confirm-status-${order.id}`}
                              onClick={() => {
                                updateStatus.mutate({
                                  token,
                                  orderId: order.id,
                                  status: pendingStatus as any,
                                  staffNote: staffNoteDraft.trim() ? staffNoteDraft.trim() : undefined,
                                });
                                setEditingOrderId(null);
                                setPendingStatus('');
                                setStaffNoteDraft('');
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: 'none',
                                background: '#181818', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrderId(null);
                                setPendingStatus('');
                                setStaffNoteDraft('');
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid #e7e5e4',
                                background: '#fafaf9', color: '#57534e', fontSize: 12, cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === order.status) return;
                            setEditingOrderId(order.id);
                            setPendingStatus(next);
                            setStaffNoteDraft('');
                          }}
                          style={{
                            padding: '4px 8px', borderRadius: 6, border: '1px solid #e7e5e4',
                            fontSize: 12, background: '#fafaf9', cursor: 'pointer',
                          }}
                        >
                          {['pending', 'confirmed', 'ready', 'completed', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#78716c', fontSize: '12px' }}>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => printReceipt(order, venue, printerSize)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #e7e5e4',
                          background: '#fafaf9',
                          color: '#44403c',
                          fontSize: 12,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🖨️ Print
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid #f5f5f4', background: '#f8fffe' }}>
                      <td colSpan={7} style={{ padding: '0 16px 14px 36px' }}>
                        {!selectedOrderItems ? (
                          <div style={{ fontSize: 12, color: '#a8a29e', paddingTop: 8 }}>Loading items...</div>
                        ) : selectedOrderItems.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#a8a29e', paddingTop: 8 }}>No items found.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {selectedOrderItems.map((item: any) => (
                              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#44403c' }}>
                                <span style={{ fontWeight: 500 }}>{item.quantity}× {item.itemName ?? item.name}</span>
                                <span style={{ color: '#78716c' }}>${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  {orderSearch ? 'No orders match your search' : 'No orders found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
