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


export function AnalyticsTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedDays, setSelectedDays] = useState(30);
  const [triggerExport, setTriggerExport] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverview.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: dailyRevenue, isLoading: dailyLoading } = trpc.analytics.getDailyRevenue.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, { enabled: !!token }
  );
  const { data: topItems } = trpc.analytics.getTopItems.useQuery(
    { token, days: selectedDays, limit: 5 }, { enabled: !!token }
  );
  const { data: hourlyDist } = trpc.analytics.getHourlyDistribution.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, { enabled: !!token }
  );
  const { data: orderTypeBreakdown } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: itemsByHour } = trpc.analytics.getItemsByHour.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: selloutEvents } = trpc.analytics.getSelloutEvents.useQuery(
    { token, days: 30 }, { enabled: !!token }
  );
  const { data: ordersExportData, isFetching: exporting } = trpc.audit.exportOrders.useQuery(
    { token, fromDate: thirtyDaysAgo, toDate: today },
    { enabled: triggerExport && !!token }
  );
  useEffect(() => {
    if (ordersExportData && (ordersExportData as any).csv) {
      setTriggerExport(false);
      const blob = new Blob([(ordersExportData as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders-export.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [ordersExportData]);

  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

  // Build heatmap data
  const heatmapHours = Array.from({ length: 17 }, (_, i) => i + 6); // 6–22
  const heatmapItems: Record<string, Record<number, number>> = {};
  if (itemsByHour) {
    for (const row of itemsByHour as { itemName: string; hour: number; qty: number }[]) {
      if (!heatmapItems[row.itemName]) heatmapItems[row.itemName] = {};
      heatmapItems[row.itemName][row.hour] = row.qty;
    }
  }
  // Get top 8 items by total qty
  const heatmapTopItems = Object.entries(heatmapItems)
    .map(([name, hours]) => ({ name, total: Object.values(hours).reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(x => x.name);
  const heatmapMax = heatmapTopItems.length > 0
    ? Math.max(...heatmapTopItems.flatMap(item => heatmapHours.map(h => heatmapItems[item]?.[h] ?? 0)))
    : 1;

  const hourLabel = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;

  const pieData = orderTypeBreakdown
    ? (orderTypeBreakdown as { orderType: string | null; count: number; revenue: string }[]).map(r => ({
        name: r.orderType ?? 'Unknown',
        value: r.count,
      }))
    : [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Revenue trends, top items, and hourly insights.
        </p>
      </div>
      <div className="space-y-6">
      {/* Days selector + Export */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setSelectedDays(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: selectedDays === d ? '#181818' : 'transparent', color: selectedDays === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setTriggerExport(true)}
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid rgba(24,24,24,0.15)', background: '#181818', color: '#F3F2EE', fontSize: 12, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1, borderRadius: 4 }}
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export CSV (30d)
        </button>
      </div>

      {/* Overview stats */}
      {overviewLoading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${overview.totalRevenue}` },
            { label: 'Orders', value: String(overview.orderCount) },
            { label: 'Avg Order', value: `$${overview.avgOrder}` },
            { label: 'Loyalty Members', value: String(overview.loyaltyMembers) },
          ].map((s) => (
            <div key={s.label} className="border p-5" style={statCardStyle}>
              <span style={monoLabel}>{s.label}</span>
              <span style={bigNum}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily revenue chart */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Daily Revenue</h2>
        {dailyLoading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!dailyLoading && dailyRevenue && dailyRevenue.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyRevenue as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke="#5E8B8B" fill="rgba(94,139,139,0.15)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!dailyLoading && (!dailyRevenue || dailyRevenue.length === 0) && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No data for this period.</p>
        )}
      </div>

      {/* Top items */}
      {topItems && topItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Top Selling Items</h2>
          <div className="space-y-2">
            {(topItems as { name: string; quantity: number; revenue: string }[]).map((item, idx) => {
              const maxQty = Math.max(...(topItems as { name: string; quantity: number }[]).map(i => i.quantity));
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', width: '1.25rem', textAlign: 'right' }}>{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{item.quantity} sold</span>
                        <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>${item.revenue}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'rgba(24,24,24,0.08)', borderRadius: 2 }}>
                      <div style={{ height: 4, background: '#5E8B8B', borderRadius: 2, width: `${(item.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly distribution */}
      {hourlyDist && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Orders by Hour</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyDist as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" />
              <XAxis dataKey="label" tick={{ fontFamily: 'Geist Mono', fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Bar dataKey="orders" fill="#5E8B8B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Order type breakdown */}
      {pieData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Order Type Breakdown</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Orders']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{entry.name || 'Unknown'}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Item-by-hour heatmap */}
      {heatmapTopItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Item Popularity by Hour</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', fontFamily: 'Geist Mono', fontSize: 9, textAlign: 'left', color: 'var(--op-text-secondary)', minWidth: 120 }}>Item</th>
                  {heatmapHours.map(h => (
                    <th key={h} style={{ padding: '4px 6px', fontFamily: 'Geist Mono', fontSize: 9, color: 'var(--op-text-secondary)', textAlign: 'center', minWidth: 36 }}>{hourLabel(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapTopItems.map(itemName => (
                  <tr key={itemName}>
                    <td style={{ padding: '3px 8px', fontSize: 12, color: 'var(--op-text)', fontWeight: 500 }}>{itemName}</td>
                    {heatmapHours.map(h => {
                      const qty = heatmapItems[itemName]?.[h] ?? 0;
                      const intensity = heatmapMax > 0 ? qty / heatmapMax : 0;
                      const bg = intensity === 0
                        ? '#F3F2EE'
                        : `rgba(94,139,139,${0.15 + intensity * 0.85})`;
                      return (
                        <td key={h} title={qty > 0 ? `${qty} orders` : undefined}
                          style={{ padding: '3px 6px', textAlign: 'center', background: bg, fontSize: 11, color: intensity > 0.5 ? '#fff' : '#5E5E5E', border: '1px solid rgba(24,24,24,0.04)' }}>
                          {qty > 0 ? qty : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-data mt-3" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Darker cells = more orders at that hour. Based on last {selectedDays} days.</p>
        </div>
      )}

      {/* Sellout events */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Sellout Events (Last 30 Days)</h2>
        {!selloutEvents || (selloutEvents as any[]).length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No sellout events recorded in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            {(selloutEvents as { itemName: string; soldOutAt: Date | string; hour: number }[]).map((ev, i) => {
              const d = new Date(ev.soldOutAt);
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                  <AlertCircle size={12} style={{ color: '#B85450', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{ev.itemName}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
                    sold out at {hourLabel(ev.hour)} on {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnalyticsExtras analyticsRange={selectedDays} />
      </div>
    </div>
  );
}
