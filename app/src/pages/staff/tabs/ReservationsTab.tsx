import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function ReservationsTab({ venueId, token }: { venueId: number; token: string }) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'floor'>('list');
  const [selectedFloorTable, setSelectedFloorTable] = useState<number | null>(null);
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: '', shape: 'rect', section: '' });
  const [walkIn, setWalkIn] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    reservationTime: new Date().toTimeString().slice(0, 5),
    notes: '',
  });
  const [walkInMsg, setWalkInMsg] = useState('');

  const { data: reservations, isLoading } = trpc.reservations.list.useQuery(
    { token, date: selectedDate, status: statusFilter !== 'all' ? statusFilter as any : undefined },
    { refetchInterval: 30000 }
  );

  const { data: tablesList } = trpc.venue.listTables.useQuery({ token });

  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => utils.reservations.list.invalidate(),
  });

  const assignTable = trpc.venue.assignReservationTable.useMutation({
    onSuccess: () => utils.reservations.list.invalidate(),
  });

  const saveTable = trpc.venue.saveTable.useMutation({
    onSuccess: () => {
      utils.venue.listTables.invalidate();
      setNewTable({ tableNumber: '', capacity: '', shape: 'rect', section: '' });
    },
  });

  const deleteTable = trpc.venue.deleteTable.useMutation({
    onSuccess: () => utils.venue.listTables.invalidate(),
  });

  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      utils.reservations.list.invalidate();
      setShowWalkInForm(false);
      setWalkIn({ customerName: '', customerPhone: '', partySize: 2, reservationTime: new Date().toTimeString().slice(0, 5), notes: '' });
      setWalkInMsg('Walk-in added!');
      setTimeout(() => setWalkInMsg(''), 3000);
    },
    onError: (e) => setWalkInMsg(e.message),
  });

  const list = reservations ?? [];
  const pendingCount = list.filter((r: any) => r.status === 'pending').length;
  const confirmedCount = list.filter((r: any) => r.status === 'confirmed').length;
  const seatedCount = list.filter((r: any) => r.status === 'seated').length;
  const tables = tablesList ?? [];

  // Build map of tableId -> today's reservation
  const tableReservationMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    const todayResv = list.filter((r: any) => r.reservationDate === today || !r.reservationDate);
    for (const r of todayResv) {
      if (r.tableId) map[r.tableId] = r;
    }
    return map;
  }, [list, today]);

  function getTableColor(table: any) {
    const resv = tableReservationMap[table.id];
    if (!resv) return '#d6d3d1';
    if (resv.status === 'seated') return '#dc2626';
    if (resv.status === 'confirmed') return '#16a34a';
    if (resv.status === 'pending') return '#d97706';
    return '#d6d3d1';
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fffbeb', color: '#d97706' },
    confirmed: { bg: '#f0fdfa', color: '#0d9488' },
    seated: { bg: '#f0fdf4', color: '#16a34a' },
    cancelled: { bg: '#f5f5f4', color: '#78716c' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Reservations</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* List/Floor toggle */}
          <div style={{ display: 'flex', gap: '4px', background: '#e7e5e4', padding: '4px', borderRadius: '8px' }}>
            {(['list', 'floor'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  background: viewMode === v ? '#1c1917' : 'transparent',
                  color: viewMode === v ? '#fafaf9' : '#57534e',
                }}>
                {v === 'list' ? 'List View' : 'Floor Plan'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowWalkInForm(!showWalkInForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: showWalkInForm ? '#57534e' : '#1c1917',
              color: '#fafaf9', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> {showWalkInForm ? 'Cancel' : 'Add Walk-in'}
          </button>
        </div>
      </div>

      {/* Walk-in form */}
      {showWalkInForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>Add Walk-in Reservation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
              <input value={walkIn.customerName} onChange={e => setWalkIn(w => ({ ...w, customerName: e.target.value }))}
                placeholder="Customer name"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phone</label>
              <input value={walkIn.customerPhone} onChange={e => setWalkIn(w => ({ ...w, customerPhone: e.target.value }))}
                placeholder="+61 4xx xxx xxx"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Party Size</label>
              <input type="number" min="1" value={walkIn.partySize} onChange={e => setWalkIn(w => ({ ...w, partySize: Number(e.target.value) }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Time</label>
              <input type="time" value={walkIn.reservationTime} onChange={e => setWalkIn(w => ({ ...w, reservationTime: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Notes</label>
            <input value={walkIn.notes} onChange={e => setWalkIn(w => ({ ...w, notes: e.target.value }))}
              placeholder="Dietary requirements, special occasions…"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setWalkInMsg('');
                if (!walkIn.customerName) { setWalkInMsg('Name is required'); return; }
                if (!walkIn.customerPhone) { setWalkInMsg('Phone is required'); return; }
                createReservation.mutate({
                  venueId,
                  customerName: walkIn.customerName,
                  customerPhone: walkIn.customerPhone,
                  partySize: walkIn.partySize,
                  reservationDate: selectedDate,
                  reservationTime: walkIn.reservationTime,
                  notes: walkIn.notes || undefined,
                });
              }}
              disabled={createReservation.isPending}
              style={{ padding: '8px 20px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createReservation.isPending ? '…' : 'Add Walk-in'}
            </button>
            {walkInMsg && <span style={{ fontSize: '13px', color: walkInMsg.includes('!') ? '#16a34a' : '#dc2626' }}>{walkInMsg}</span>}
          </div>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'pending', 'confirmed', 'seated', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: statusFilter === s ? '#1c1917' : '#e7e5e4',
                color: statusFilter === s ? '#fafaf9' : '#57534e',
              }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Pending', count: pendingCount, color: '#d97706', bg: '#fffbeb' },
          { label: 'Confirmed', count: confirmedCount, color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Seated', count: seatedCount, color: '#16a34a', bg: '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '10px 18px', borderRadius: '10px', background: stat.bg,
            border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.count}</span>
            <span style={{ fontSize: '13px', color: stat.color, fontWeight: 500 }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Floor Plan View */}
      {viewMode === 'floor' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#57534e' }}>
              {[
                { color: '#d6d3d1', label: 'Available' },
                { color: '#16a34a', label: 'Confirmed' },
                { color: '#d97706', label: 'Pending' },
                { color: '#dc2626', label: 'Occupied' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowTableEditor(!showTableEditor)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {showTableEditor ? 'Hide Editor' : 'Edit Tables'}
            </button>
          </div>

          {/* Table Editor */}
          {showTableEditor && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Table Editor</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Table #</label>
                  <input value={newTable.tableNumber} onChange={e => setNewTable(t => ({ ...t, tableNumber: e.target.value }))}
                    placeholder="e.g. T1"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Capacity</label>
                  <input type="number" min="1" value={newTable.capacity} onChange={e => setNewTable(t => ({ ...t, capacity: e.target.value }))}
                    placeholder="4"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Shape</label>
                  <select value={newTable.shape} onChange={e => setNewTable(t => ({ ...t, shape: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                    <option value="rect">Rectangle</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Section</label>
                  <input value={newTable.section} onChange={e => setNewTable(t => ({ ...t, section: e.target.value }))}
                    placeholder="Indoor"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <button
                  onClick={() => {
                    if (!newTable.tableNumber || !newTable.capacity) return;
                    saveTable.mutate({ token, tableNumber: newTable.tableNumber, capacity: Number(newTable.capacity), shape: newTable.shape as 'round' | 'rect', section: newTable.section || undefined });
                  }}
                  disabled={saveTable.isPending}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              {tables.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Table</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Capacity</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Shape</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Section</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.tableNumber}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c' }}>{t.capacity}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c', textTransform: 'capitalize' }}>{t.shape ?? 'rect'}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c' }}>{t.section ?? '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <button
                            onClick={() => deleteTable.mutate({ token, id: t.id })}
                            disabled={deleteTable.isPending}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Floor Plan Canvas */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', minHeight: '300px', position: 'relative' }}>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#78716c', padding: '40px', fontSize: '14px' }}>
                No tables configured. Click "Edit Tables" to add tables.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {tables.map((t: any) => {
                  const color = getTableColor(t);
                  const isSelected = selectedFloorTable === t.id;
                  const isCircle = t.shape === 'circle';
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedFloorTable(isSelected ? null : t.id)}
                      style={{
                        width: isCircle ? '80px' : '100px',
                        height: '80px',
                        borderRadius: isCircle ? '50%' : '10px',
                        background: color,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #1c1917' : '3px solid transparent',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 0 0 2px #1c191744' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{t.tableNumber}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{t.capacity} seats</div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Selected table info popup */}
            {selectedFloorTable && (() => {
              const t = tables.find((t: any) => t.id === selectedFloorTable);
              const resv = t ? tableReservationMap[t.id] : null;
              return t ? (
                <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f5f5f4', borderRadius: '10px', fontSize: '13px' }}>
                  <strong>Table {t.tableNumber}</strong> — {t.capacity} seats {t.section ? `(${t.section})` : ''}
                  {resv ? (
                    <div style={{ marginTop: '6px', color: '#44403c' }}>
                      <strong>{resv.customerName}</strong> — {resv.reservationTime} — {resv.partySize} people
                      <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: statusColors[resv.status]?.bg ?? '#f5f5f4', color: statusColors[resv.status]?.color ?? '#78716c' }}>
                        {resv.status}
                      </span>
                    </div>
                  ) : (
                    <span style={{ marginLeft: '8px', color: '#78716c' }}>No reservation today</span>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Reservation cards */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: '#fff',
              borderRadius: '12px', border: '1px solid #e7e5e4', color: '#78716c', fontSize: '14px',
            }}>
              No reservations for this date
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {list.map((r: any) => {
                const sc = statusColors[r.status] ?? statusColors.pending;
                return (
                  <div key={r.id} style={{
                    background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    {/* Time badge */}
                    <div style={{
                      minWidth: '72px', padding: '10px 8px', borderRadius: '10px',
                      background: sc.bg, textAlign: 'center', flexShrink: 0,
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: sc.color, lineHeight: 1 }}>
                        {r.reservationTime ?? '—'}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: sc.color, textTransform: 'uppercase', marginTop: '3px' }}>
                        {r.status}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1c1917', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {r.customerName ?? 'Unknown'}
                        {r.tableId && tables.find((t: any) => t.id === r.tableId) && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>
                            Table {tables.find((t: any) => t.id === r.tableId)?.tableNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: '#78716c', flexWrap: 'wrap' }}>
                        {r.customerPhone && <span>{r.customerPhone}</span>}
                        <span>👥 {r.partySize} {r.partySize === 1 ? 'person' : 'people'}</span>
                      </div>
                      {r.notes && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#57534e', fontStyle: 'italic' }}>
                          {r.notes}
                        </div>
                      )}
                      {/* Table assignment */}
                      {tables.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Assign Table:</label>
                          <select
                            value={r.tableId ?? ''}
                            onChange={e => {
                              const tableId = e.target.value ? Number(e.target.value) : null;
                              assignTable.mutate({ token, reservationId: r.id, tableId });
                            }}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                          >
                            <option value="">Unassigned</option>
                            {tables.map((t: any) => (
                              <option key={t.id} value={t.id}>Table {t.tableNumber} ({t.capacity} seats)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {r.status === 'pending' && (
                        <button
                          onClick={() => updateStatus.mutate({ token, id: r.id, status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#f0fdfa', color: '#0d9488', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Confirm
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus.mutate({ token, id: r.id, status: 'seated' })}
                          disabled={updateStatus.isPending}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Seat
                        </button>
                      )}
                      {(r.status === 'pending' || r.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ token, id: r.id, status: 'no_show' })}
                            disabled={updateStatus.isPending}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#fff7ed', color: '#ea580c', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            No Show
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ token, id: r.id, status: 'cancelled' })}
                            disabled={updateStatus.isPending}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
