import { useState, useEffect, type ReactNode } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, AlertCircle, Download, PieChart as PieChartIcon,
  DollarSign, ShoppingBag, Receipt, Users,
} from 'lucide-react';


import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { CHART_COLORS, useFeatureGate, UpgradeGate } from '../shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

/** Card shell used for every analytics section — structural shadcn Card,
 * colored via the app's --op-* tokens (shadcn's own --card/--border tokens
 * have no dark-mode override here, so they'd stay light-mode-only). */
function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="shadow-none gap-3" style={{ background: 'transparent', borderColor: 'var(--op-border-soft)' }}>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2" style={{ flexWrap: 'wrap' }}>
          <CardTitle style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)' }}>{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type BadgeTone = 'positive' | 'negative' | 'neutral' | 'warning';
const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  positive: { bg: 'rgba(94,139,94,0.15)', fg: '#5E8B5E' },
  negative: { bg: 'rgba(184,84,80,0.15)', fg: '#B85450' },
  warning: { bg: 'rgba(196,149,58,0.15)', fg: '#C4953A' },
  neutral: { bg: 'var(--op-stat-bg)', fg: 'var(--op-text-secondary)' },
};
function MetricBadge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
  const c = BADGE_TONES[tone];
  return (
    <Badge variant="outline" className="font-data" style={{ background: c.bg, color: c.fg, borderColor: 'transparent' }}>
      {children}
    </Badge>
  );
}

const thStyle = { padding: '8px 10px', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontWeight: 400 };

export function AnalyticsTab({ onUpgrade }: { onUpgrade?: () => void }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const gate = useFeatureGate('analytics');
  const [selectedDays, setSelectedDays] = useState(30);
  const [triggerExport, setTriggerExport] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Cache for 5 minutes — analytics don't need real-time refresh. Queries stay
  // disabled until the plan is confirmed to include analytics (avoids 403s on
  // locked plans).
  const analyticsOpts = { enabled: !!token && gate.allowed, staleTime: 5 * 60 * 1000 };

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverview.useQuery(
    { token, days: selectedDays }, analyticsOpts
  );
  const { data: dailyRevenue, isLoading: dailyLoading } = trpc.analytics.getDailyRevenue.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, analyticsOpts
  );
  const { data: topItems } = trpc.analytics.getTopItems.useQuery(
    { token, days: selectedDays, limit: 5 }, analyticsOpts
  );
  const { data: profitByItem } = trpc.analytics.getProfitByItem.useQuery(
    { token, days: selectedDays, limit: 10 }, analyticsOpts
  );
  const { data: hourlyDist } = trpc.analytics.getHourlyDistribution.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, analyticsOpts
  );
  const { data: orderTypeBreakdown } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: selectedDays }, analyticsOpts
  );
  const { data: itemsByHour } = trpc.analytics.getItemsByHour.useQuery(
    { token, days: selectedDays }, analyticsOpts
  );
  const { data: selloutEvents } = trpc.analytics.getSelloutEvents.useQuery(
    { token, days: 30 }, analyticsOpts
  );
  const { data: ordersExportData, isFetching: exporting } = trpc.audit.exportOrders.useQuery(
    { token, fromDate: thirtyDaysAgo, toDate: today },
    { enabled: triggerExport && !!token }
  );
  useEffect(() => {
    if (ordersExportData && ordersExportData.csv) {
      setTriggerExport(false);
      const blob = new Blob([ordersExportData.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders-export.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [ordersExportData]);

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

  if (gate.locked) {
    return (
      <UpgradeGate
        title="Analytics is a Pro feature"
        description={`Your ${gate.planLabel} plan doesn't include the analytics dashboard. Upgrade to unlock revenue trends, top items, hourly heatmaps and CSV exports.`}
        onUpgrade={onUpgrade}
      />
    );
  }

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
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid var(--op-border-strong)', background: selectedDays === d ? 'var(--op-btn-bg)' : 'transparent', color: selectedDays === d ? 'var(--op-btn-text)' : 'var(--op-text-secondary)', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setTriggerExport(true)}
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid var(--op-border-strong)', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: 12, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1, borderRadius: 4 }}
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export CSV (30d)
        </button>
      </div>

      {/* Overview stats */}
      {overviewLoading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Total Revenue" value={`$${overview.totalRevenue}`} />
          <StatCard icon={ShoppingBag} label="Orders" value={String(overview.orderCount)} />
          <StatCard icon={Receipt} label="Avg Order" value={`$${overview.avgOrder}`} />
          <StatCard icon={Users} label="Loyalty Members" value={String(overview.loyaltyMembers)} />
        </div>
      )}

      {/* Daily revenue chart */}
      <SectionCard title="Daily Revenue">
        {dailyLoading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!dailyLoading && dailyRevenue && dailyRevenue.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyRevenue as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--op-border-soft)" />
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
      </SectionCard>

      {/* Top items */}
      {topItems && topItems.length > 0 && (
        <SectionCard title="Top Selling Items">
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
                    <div style={{ height: 4, background: 'var(--op-border-soft)', borderRadius: 2 }}>
                      <div style={{ height: 4, background: '#5E8B8B', borderRadius: 2, width: `${(item.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Profit by item (uses menu item cost / COGS) */}
      {profitByItem && profitByItem.items.length > 0 && (
        <SectionCard
          title="Profit by Item"
          action={
            <span className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>
              Total profit: <strong style={{ color: '#5E8B5E' }}>${profitByItem.totalProfit}</strong>
            </span>
          }
        >
          {profitByItem.withoutCost > 0 && (
            <p className="font-data" style={{ fontSize: '0.625rem', color: '#C4953A', marginBottom: 12 }}>
              {profitByItem.withoutCost} item{profitByItem.withoutCost === 1 ? '' : 's'} with no cost set — add costs in the Menu tab to see their margins.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--op-border-mid)' }}>
                <TableHead className="font-data" style={{ ...thStyle, textAlign: 'left' }}>Item</TableHead>
                <TableHead className="font-data text-right" style={thStyle}>Sold</TableHead>
                <TableHead className="font-data text-right" style={thStyle}>Revenue</TableHead>
                <TableHead className="font-data text-right" style={thStyle}>Cost/ea</TableHead>
                <TableHead className="font-data text-right" style={thStyle}>Profit</TableHead>
                <TableHead className="font-data text-right" style={thStyle}>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitByItem.items.map((it) => (
                <TableRow key={it.name} style={{ borderColor: 'var(--op-border-soft)' }}>
                  <TableCell style={{ color: 'var(--op-text)', whiteSpace: 'normal' }}>{it.name}</TableCell>
                  <TableCell className="font-data text-right" style={{ color: 'var(--op-text-secondary)' }}>{it.units}</TableCell>
                  <TableCell className="font-data text-right" style={{ color: 'var(--op-text)' }}>${it.revenue}</TableCell>
                  <TableCell className="font-data text-right" style={{ color: 'var(--op-text-secondary)' }}>{it.unitCost != null ? `$${it.unitCost}` : '—'}</TableCell>
                  <TableCell className="font-data text-right" style={{ fontWeight: 700, color: it.profit == null ? 'var(--op-text-muted)' : Number(it.profit) >= 0 ? '#5E8B5E' : '#B85450' }}>
                    {it.profit != null ? `$${it.profit}` : 'set cost'}
                  </TableCell>
                  <TableCell className="text-right">
                    {it.marginPct != null
                      ? <MetricBadge tone={it.marginPct >= 20 ? 'positive' : it.marginPct >= 0 ? 'neutral' : 'negative'}>{it.marginPct}%</MetricBadge>
                      : <span className="font-data" style={{ color: 'var(--op-text-muted)' }}>—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {/* Hourly distribution */}
      {hourlyDist && (
        <SectionCard title="Orders by Hour">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyDist as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--op-border-soft)" />
              <XAxis dataKey="label" tick={{ fontFamily: 'Geist Mono', fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Bar dataKey="orders" fill="#5E8B8B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Order type breakdown */}
      {pieData.length > 0 && (
        <SectionCard title="Order Type Breakdown">
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
        </SectionCard>
      )}

      {/* Item-by-hour heatmap */}
      {heatmapTopItems.length > 0 && (
        <SectionCard title="Item Popularity by Hour">
          <div style={{ overflowX: 'auto' }}>
            <Table style={{ whiteSpace: 'nowrap' }}>
              <TableHeader>
                <TableRow style={{ borderColor: 'var(--op-border-soft)' }}>
                  <TableHead className="font-data" style={{ fontSize: 9, textAlign: 'left', color: 'var(--op-text-secondary)', minWidth: 120 }}>Item</TableHead>
                  {heatmapHours.map(h => (
                    <TableHead key={h} className="font-data text-center" style={{ fontSize: 9, color: 'var(--op-text-secondary)', minWidth: 36 }}>{hourLabel(h)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {heatmapTopItems.map(itemName => (
                  <TableRow key={itemName} style={{ borderColor: 'var(--op-border-soft)' }}>
                    <TableCell style={{ fontSize: 12, color: 'var(--op-text)', fontWeight: 500 }}>{itemName}</TableCell>
                    {heatmapHours.map(h => {
                      const qty = heatmapItems[itemName]?.[h] ?? 0;
                      const intensity = heatmapMax > 0 ? qty / heatmapMax : 0;
                      const bg = intensity === 0
                        ? 'var(--op-bg)'
                        : `rgba(94,139,139,${0.15 + intensity * 0.85})`;
                      return (
                        <TableCell key={h} title={qty > 0 ? `${qty} orders` : undefined}
                          className="text-center"
                          style={{ background: bg, fontSize: 11, color: intensity > 0.5 ? '#fff' : 'var(--op-text-secondary)', border: '1px solid var(--op-border-soft)' }}>
                          {qty > 0 ? qty : ''}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="font-data mt-3" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Darker cells = more orders at that hour. Based on last {selectedDays} days.</p>
        </SectionCard>
      )}

      {/* Sellout events */}
      <SectionCard title="Sellout Events (Last 30 Days)">
        {!selloutEvents || (selloutEvents as any[]).length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No sellout events recorded in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            {(selloutEvents as { itemName: string; soldOutAt: Date | string; hour: number }[]).map((ev, i) => {
              const d = new Date(ev.soldOutAt);
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--op-border-soft)' }}>
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
      </SectionCard>

      <AnalyticsExtras analyticsRange={selectedDays} />
      </div>
    </div>
  );
}
function AnalyticsExtras({ analyticsRange }: { analyticsRange: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  const { data: periodComparison } = trpc.analytics.getPeriodComparison.useQuery(
    { token, days: analyticsRange }, { enabled: !!token }
  );
  const { data: revenueForecast } = trpc.analytics.getRevenueForecast.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: menuScorecard } = trpc.analytics.getMenuScorecard.useQuery(
    { token, days: analyticsRange }, { enabled: !!token }
  );

  const [gstFromDate, setGstFromDate] = useState('');
  const [gstToDate, setGstToDate] = useState('');
  const [showGST, setShowGST] = useState(false);
  const { data: gstSummary, isFetching: gstFetching } = trpc.analytics.getGSTSummary.useQuery(
    { token, fromDate: gstFromDate, toDate: gstToDate },
    { enabled: showGST && !!gstFromDate && !!gstToDate }
  );

  const statCardStyle = { borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

  function downloadGSTCsv() {
    if (!gstSummary) return;
    const gs = gstSummary as any;
    const lines = [
      ['Payment Method', 'Revenue', 'GST', 'Net Ex-GST'].join(','),
      ...(gs.byPaymentMethod ?? []).map((r: any) => [
        `"${r.paymentMethod ?? 'Other'}"`,
        Number(r.total ?? 0).toFixed(2),
        Number(r.gst ?? 0).toFixed(2),
        Number(r.netExGst ?? 0).toFixed(2),
      ].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gst-report.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const pc = periodComparison as any;
  const forecastRows = Array.isArray(revenueForecast) ? (revenueForecast as any[]) : [];
  const forecastTotal = forecastRows.reduce((s, d) => s + Number(d.predictedRevenue ?? 0), 0);

  return (
    <>
      {/* Period Comparison */}
      {pc && (
        <SectionCard title="Period Comparison">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Revenue', cur: Number(pc.current?.revenue ?? 0), prev: Number(pc.previous?.revenue ?? 0), prefix: '$' },
              { label: 'Orders', cur: Number(pc.current?.orders ?? 0), prev: Number(pc.previous?.orders ?? 0), prefix: '' },
              { label: 'Avg Order', cur: Number(pc.current?.avgOrder ?? 0), prev: Number(pc.previous?.avgOrder ?? 0), prefix: '$' },
            ].map((card) => {
              const change = card.prev > 0 ? ((card.cur - card.prev) / card.prev) * 100 : null;
              const delta = change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : undefined;
              return (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={`${card.prefix}${card.cur.toFixed(2)}`}
                  delta={delta ? `${delta} vs ${card.prefix}${card.prev.toFixed(2)} prev` : undefined}
                />
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Revenue Forecast */}
      {forecastRows.length > 0 && (
        <SectionCard title="Predicted Revenue — Next 7 Days">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={forecastRows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--op-border-soft)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Predicted']} labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Area type="monotone" dataKey="predictedRevenue" stroke="#C4953A" fill="rgba(196,149,58,0.15)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="font-data mt-3" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
            Predicted 7-day total: <span style={{ color: 'var(--op-text)', fontWeight: 600 }}>${forecastTotal.toFixed(2)}</span>
          </p>
        </SectionCard>
      )}

      {/* Menu Scorecard */}
      {menuScorecard && (menuScorecard as any[]).length > 0 && (
        <SectionCard title="Menu Scorecard">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--op-border-mid)' }}>
                {['Rank', 'Item', 'Units Sold', 'Revenue', 'Rev Share %', 'Trend'].map(h => (
                  <TableHead key={h} className="font-data" style={thStyle}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuScorecard.map((row, idx) => {
                const trendPct = Number(row.trend) || 0;
                const trendTone: BadgeTone = trendPct > 5 ? 'positive' : trendPct < -5 ? 'negative' : 'neutral';
                const trendArrow = trendPct > 5 ? '↑' : trendPct < -5 ? '↓' : '→';
                return (
                  <TableRow key={row.name} style={{ borderColor: 'var(--op-border-soft)' }}>
                    <TableCell className="font-data" style={{ color: 'var(--op-text-secondary)' }}>{idx + 1}</TableCell>
                    <TableCell style={{ fontWeight: 500, color: 'var(--op-text)', whiteSpace: 'normal' }}>{row.name}</TableCell>
                    <TableCell style={{ color: 'var(--op-text)' }}>{row.totalQty}</TableCell>
                    <TableCell style={{ color: '#5E8B5E' }}>${Number(row.totalRevenue).toFixed(2)}</TableCell>
                    <TableCell style={{ color: 'var(--op-text)' }}>{Number(row.revenueShare).toFixed(1)}%</TableCell>
                    <TableCell>
                      <MetricBadge tone={trendTone}>{trendArrow} {Math.abs(trendPct).toFixed(1)}%</MetricBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {/* GST Summary */}
      <SectionCard title="GST Summary">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>From</label>
            <input type="date" value={gstFromDate} onChange={e => { setGstFromDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'var(--op-border-strong)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>To</label>
            <input type="date" value={gstToDate} onChange={e => { setGstToDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'var(--op-border-strong)' }} />
          </div>
          <button
            disabled={!gstFromDate || !gstToDate || gstFetching}
            onClick={() => setShowGST(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.75rem', opacity: (!gstFromDate || !gstToDate) ? 0.5 : 1 }}
          >
            {gstFetching ? <Loader2 size={14} className="animate-spin" /> : <PieChartIcon size={14} />}
            Generate
          </button>
        </div>
        {gstSummary && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Total Revenue', value: `$${Number((gstSummary as any).totalRevenue ?? 0).toFixed(2)}` },
                { label: 'GST (1/11th)', value: `$${Number((gstSummary as any).gst ?? 0).toFixed(2)}` },
                { label: 'Net Ex-GST', value: `$${Number((gstSummary as any).netExGst ?? 0).toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="border p-4" style={statCardStyle}>
                  <span style={monoLabel}>{s.label}</span>
                  <span style={bigNum}>{s.value}</span>
                </div>
              ))}
            </div>
            {(gstSummary as any).byPaymentMethod && (gstSummary as any).byPaymentMethod.length > 0 && (
              <Table style={{ marginBottom: 12 }}>
                <TableHeader>
                  <TableRow style={{ borderColor: 'var(--op-border-mid)' }}>
                    {['Payment Method', 'Revenue', 'GST', 'Net Ex-GST'].map(h => (
                      <TableHead key={h} className="font-data" style={thStyle}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(gstSummary as any).byPaymentMethod.map((row: any) => (
                    <TableRow key={row.method} style={{ borderColor: 'var(--op-border-soft)' }}>
                      <TableCell style={{ textTransform: 'capitalize', color: 'var(--op-text)' }}>{row.paymentMethod || 'Other'}</TableCell>
                      <TableCell style={{ color: 'var(--op-text)' }}>${Number(row.revenue).toFixed(2)}</TableCell>
                      <TableCell style={{ color: '#C4953A' }}>${Number(row.gst).toFixed(2)}</TableCell>
                      <TableCell style={{ color: '#5E8B5E' }}>${Number(row.netExGst ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <button
              onClick={downloadGSTCsv}
              className="px-4 py-2 font-button flex items-center gap-2"
              style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.75rem' }}
            >
              <Download size={14} /> Download GST Report
            </button>
          </div>
        )}
      </SectionCard>
    </>
  );
}
