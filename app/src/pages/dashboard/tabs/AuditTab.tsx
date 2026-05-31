import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send, Tag,
  DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp, CalendarDays,
  Clock, Shield, Building2, Percent, MessageSquare, QrCode, Link2, CreditCard,
  MapPin, Briefcase, Edit2, Trash2, GripVertical, Download, ChevronDown,
  ChevronUp, Monitor, Smartphone, RefreshCw, Bell, Eye, EyeOff, CheckCircle,
  Users, PieChart as PieChartIcon, Circle,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import QRCode from 'qrcode';
import { SetupChecklist } from '@/components/SetupChecklist';
import { DS, getMonday, addWeekDays, WEEK_DAYS, TemplatePreviewCard, ImageUpload, SortableMenuRow, TabletPinSection } from '../shared';


export function AuditTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [days, setDays] = useState(30);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [triggerOrderExport, setTriggerOrderExport] = useState(false);
  const [triggerCustomerExport, setTriggerCustomerExport] = useState(false);

  const { data: auditRows, isLoading: auditLoading } = trpc.audit.list.useQuery(
    { token, days, entityType: entityFilter === 'all' ? undefined : entityFilter },
    { enabled: !!token }
  );
  const { data: ordersExport } = trpc.audit.exportOrders.useQuery(
    { token, fromDate: exportFromDate, toDate: exportToDate },
    { enabled: triggerOrderExport && !!exportFromDate && !!exportToDate }
  );
  const { data: customersExport } = trpc.audit.exportCustomers.useQuery(
    { token },
    { enabled: triggerCustomerExport }
  );

  useEffect(() => {
    if (ordersExport && (ordersExport as any).csv) {
      setTriggerOrderExport(false);
      const blob = new Blob([(ordersExport as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [ordersExport]);

  useEffect(() => {
    if (customersExport && (customersExport as any).csv) {
      setTriggerCustomerExport(false);
      const blob = new Blob([(customersExport as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'customers.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [customersExport]);

  const rows = (auditRows as any[] | undefined) ?? [];
  const entityTypes = ['all', 'orders', 'menu', 'staff', 'settings'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Audit Log
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Activity history across your account.
        </p>
      </div>
      <div className="space-y-6">
      {/* Export buttons */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Exports</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Orders From</label>
            <input type="date" value={exportFromDate} onChange={e => { setExportFromDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>To</label>
            <input type="date" value={exportToDate} onChange={e => { setExportToDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <button
            disabled={!exportFromDate || !exportToDate}
            onClick={() => setTriggerOrderExport(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!exportFromDate || !exportToDate) ? 0.5 : 1 }}
          >
            <Download size={14} /> Export Orders CSV
          </button>
          <button
            onClick={() => setTriggerCustomerExport(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#5E8B8B', color: '#fff', fontSize: '0.75rem' }}
          >
            <Download size={14} /> Export Customers CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>ENTITY:</span>
          {entityTypes.map((e) => (
            <button key={e} onClick={() => setEntityFilter(e)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: entityFilter === e ? '#181818' : 'transparent', color: entityFilter === e ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {e}
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
      </div>

      {/* Audit log table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Audit Log</h2>
        {auditLoading && (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
        {!auditLoading && rows.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No audit entries for this period.</p>
        )}
        {!auditLoading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => {
                  let detailStr = '';
                  try { detailStr = typeof row.details === 'string' ? row.details : JSON.stringify(row.details); } catch { detailStr = ''; }
                  return (
                    <tr key={row.id ?? idx} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', fontFamily: 'Geist Mono', fontSize: 11, color: 'var(--op-text-secondary)' }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>{row.actor || row.actorEmail || '—'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: 'rgba(94,139,139,0.1)', color: '#5E8B8B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {row.action || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', textTransform: 'capitalize' }}>{row.entityType || '—'}{row.entityId ? ` #${row.entityId}` : ''}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailStr}>
                        {detailStr.length > 60 ? detailStr.slice(0, 60) + '…' : detailStr}
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
