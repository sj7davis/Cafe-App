import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  ShoppingBag,
  Star,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Truck,
  Trash2,
  MessageSquare,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard, CHART_COLORS, DOW_LABELS } from '../shared';

export function AnalyticsTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [days, setDays] = useState(30);
  const analyticsRange = days;

  const overviewQuery = trpc.analytics.getOverview.useQuery({ token, days }, { enabled: !!token });
  const revenueQuery = trpc.analytics.getDailyRevenue.useQuery({ token, days }, { enabled: !!token });
  const topItemsQuery = trpc.analytics.getTopItems.useQuery({ token, days, limit: 8 }, { enabled: !!token });
  const hourlyQuery = trpc.analytics.getHourlyDistribution.useQuery({ token, days }, { enabled: !!token });
  const categoryQuery = trpc.analytics.getRevenueByCategory.useQuery({ token, days }, { enabled: !!token });
  const npsQuery = trpc.nps.getStats.useQuery({ token }, { enabled: !!token });
  const wasteSummaryQuery = trpc.waste.getSummary.useQuery({ token }, { enabled: !!token });
  const invLevelsQuery = trpc.venue.getInventoryLevels.useQuery({ token }, { enabled: !!token });

  // Wave 4 new queries
  const { data: itemsByHour } = trpc.analytics.getItemsByHour.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: selloutEvents } = trpc.analytics.getSelloutEvents.useQuery(
    { token, days: 30 },
    { enabled: !!token }
  );
  const { data: orderTypes } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: repeatRate } = trpc.analytics.getRepeatCustomerRate.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: itemsByDow } = trpc.analytics.getItemPopularityByDayOfWeek.useQuery(
    { token, days: 60 },
    { enabled: !!token }
  );

  // Heatmap computation
  const heatmapData = React.useMemo(() => {
    if (!itemsByHour) return { items: [] as string[], hours: [] as number[], map: {} as Record<string, Record<number, number>>, maxQty: 1 };
    const map: Record<string, Record<number, number>> = {};
    for (const row of itemsByHour) {
      if (!map[row.itemName]) map[row.itemName] = {};
      map[row.itemName][row.hour] = (map[row.itemName][row.hour] ?? 0) + row.qty;
    }
    const items = Object.entries(map)
      .map(([name, hours]) => ({ name, total: Object.values(hours).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(x => x.name);
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    const maxQty = Math.max(...Object.values(map).flatMap(h => Object.values(h)), 1);
    return { items, hours, map, maxQty };
  }, [itemsByHour]);

  // Sellout events grouped by item
  const selloutGrouped = React.useMemo(() => {
    if (!selloutEvents) return [];
    const byItem: Record<string, { count: number; events: typeof selloutEvents }> = {};
    for (const ev of selloutEvents) {
      if (!byItem[ev.itemName]) byItem[ev.itemName] = { count: 0, events: [] };
      byItem[ev.itemName].count += 1;
      byItem[ev.itemName].events.push(ev);
    }
    return Object.entries(byItem).map(([name, info]) => ({ name, count: info.count, latest: info.events[0] }));
  }, [selloutEvents]);

  // Item popularity by day of week — top 5 items with busiest day
  const dowData = React.useMemo(() => {
    if (!itemsByDow || itemsByDow.length === 0) return [];
    const map: Record<string, Record<number, number>> = {};
    for (const row of itemsByDow) {
      if (!map[row.itemName]) map[row.itemName] = {};
      map[row.itemName][row.dow] = (map[row.itemName][row.dow] ?? 0) + row.qty;
    }
    return Object.entries(map)
      .map(([name, dowMap]) => {
        const total = Object.values(dowMap).reduce((a, b) => a + b, 0);
        const busiestDow = Object.entries(dowMap).sort((a, b) => b[1] - a[1])[0];
        const chartData = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], qty: dowMap[i] ?? 0 }));
        return { name, total, busiestDow: busiestDow ? Number(busiestDow[0]) : 0, chartData };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [itemsByDow]);

  const overview = overviewQuery.data;
  const revenueData = revenueQuery.data ?? [];
  const topItems = topItemsQuery.data ?? [];
  const hourlyData = hourlyQuery.data ?? [];
  const categoryData = categoryQuery.data ?? [];
  const nps = npsQuery.data;
  const topWastedItems = wasteSummaryQuery.data?.topWastedItems ?? [];
  const totalWasteEntries = wasteSummaryQuery.data?.totalWasteEntries ?? 0;
  const totalWasteCost = wasteSummaryQuery.data?.totalCost ?? 0;
  const invLevels = invLevelsQuery.data ?? [];

  const topItem = topItems[0]?.name ?? '—';

  const npsColor = nps == null ? '#78716c'
    : (nps.npsScore ?? 0) >= 50 ? '#16a34a'
    : (nps.npsScore ?? 0) >= 0 ? '#d97706'
    : '#dc2626';

  // Low stock items: quantity not null and quantity <= quantityAlert
  const lowStockItems = invLevels.filter((i: any) => i.quantity != null && i.quantityAlert != null && i.quantity <= i.quantityAlert);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Analytics</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                background: days === d ? '#1c1917' : '#fff',
                color: days === d ? '#fff' : '#78716c',
                border: '1px solid #e7e5e4', borderRadius: '6px',
                padding: '5px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<TrendingUp size={20} />} label={`Revenue (${days}d)`} value={overview ? `$${Number(overview.totalRevenue).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '…'} color="#16a34a" />
        <StatCard icon={<ShoppingBag size={20} />} label="Orders" value={overview ? String(overview.orderCount) : '…'} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Avg Order" value={overview ? `$${overview.avgOrder}` : '…'} color="#2563eb" />
        <StatCard icon={<Star size={20} />} label="Top Item" value={topItem} color="#d97706" />
      </div>

      {/* NPS Score Card */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="#5E8B8B" /> NPS Score
        </h3>
        {npsQuery.isLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : !nps ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No NPS data available</p>
        ) : (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '56px', fontWeight: 800, color: npsColor, lineHeight: 1 }}>{nps.npsScore ?? '—'}</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px' }}>NPS Score</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                <span style={{ color: '#57534e' }}>Responses: <strong>{nps.totalResponses}</strong></span>
                <span style={{ color: '#57534e' }}>Avg score: <strong>{nps.averageScore ? Number(nps.averageScore).toFixed(1) : '—'}/10</strong></span>
              </div>
              {nps.recentResponses && nps.recentResponses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Responses</div>
                  {nps.recentResponses.slice(0, 5).map((resp: { score: number; comment?: string | null; createdAt: string | Date }, i: number) => (
                    <div key={i} style={{
                      background: '#f5f5f4',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#57534e',
                    }}>
                      <span style={{ fontWeight: 600, marginRight: '8px' }}>{resp.score}/10</span>
                      {resp.comment && <span style={{ fontStyle: 'italic' }}>"{resp.comment}"</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revenue trend chart */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Revenue Trend</h3>
        {revenueData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5E8B8B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5E8B8B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={d => {
                  const parts = d.split('-');
                  return `${parts[2]}/${parts[1]}`;
                }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#5E8B8B" strokeWidth={2}
                fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Top items */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Top Items by Quantity</h3>
          {topItems.length === 0 ? (
            <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#1c1917" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by category */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Revenue by Category</h3>
          {categoryData.length === 0 ? (
            <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} dataKey="revenue" nameKey="category"
                  cx="50%" cy="50%" outerRadius={80} label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {categoryData.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hourly heat map */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Busiest Hours</h3>
        {hourlyData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#5E8B8B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Supplier Suggestions */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={16} color="#5E8B8B" /> Supplier Suggestions
        </h3>

        {/* Top wasted items */}
        {topWastedItems.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              High Waste Items {totalWasteEntries > 0 && <span style={{ fontWeight: 400, textTransform: 'none' }}>({totalWasteEntries} total entries, ${totalWasteCost.toFixed(2)} est. cost)</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topWastedItems.slice(0, 5).map((item: any, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#fffbeb',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                }}>
                  <Trash2 size={14} color="#d97706" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1c1917' }}>{item.itemName}</span>
                    <span style={{ color: '#d97706', fontSize: '12px', marginLeft: '8px' }}>{item.totalQuantity} units wasted</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic' }}>
                    Consider reducing order of {item.itemName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low stock items */}
        {lowStockItems.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Low Stock — Reorder Needed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lowStockItems.map((item: any, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                }}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <span style={{ fontSize: '13px', color: '#1c1917' }}>
                    <strong>{item.itemName ?? item.name}</strong>
                    {' '}— {item.quantity} remaining, reorder needed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topWastedItems.length === 0 && lowStockItems.length === 0 && (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No supplier suggestions at this time.</p>
        )}
      </div>

      {/* ─── Order Type Breakdown ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Order Type Breakdown</h3>
        {!orderTypes || orderTypes.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(['pickup', 'dine_in', 'online'] as const).map(type => {
              const row = orderTypes.find((r: any) => r.orderType === type);
              const labels: Record<string, string> = { pickup: 'Pickup', dine_in: 'Dine-in', online: 'Online' };
              const colors: Record<string, string> = { pickup: '#2563eb', dine_in: '#d97706', online: '#16a34a' };
              return (
                <div key={type} style={{
                  flex: 1, minWidth: '140px', padding: '20px', borderRadius: '12px',
                  background: '#f8f8f8', border: '1px solid #e7e5e4', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: colors[type] ?? '#1c1917' }}>
                    {row ? row.count : 0}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#44403c', marginTop: '4px' }}>
                    {labels[type]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
                    ${row ? Number(row.revenue).toFixed(2) : '0.00'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Repeat Customer Rate ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Repeat Customer Rate</h3>
        {!repeatRate ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: repeatRate.rate >= 50 ? '#16a34a' : repeatRate.rate >= 25 ? '#d97706' : '#dc2626' }}>
                {repeatRate.rate}%
              </span>
              <span style={{ fontSize: '14px', color: '#78716c' }}>repeat customers</span>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e7e5e4', borderRadius: '4px', height: '8px', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                width: `${repeatRate.rate}%`,
                background: repeatRate.rate >= 50 ? '#16a34a' : repeatRate.rate >= 25 ? '#d97706' : '#dc2626',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#78716c' }}>
              {repeatRate.repeat} of {repeatRate.total} customers came back in the last {analyticsRange} days
            </p>
          </div>
        )}
      </div>

      {/* ─── Item Popularity Heatmap ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Item Popularity Heatmap (by Hour)</h3>
        {heatmapData.items.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '11px', minWidth: 'max-content' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'right', color: '#78716c', fontWeight: 600, minWidth: '120px' }}>Item</th>
                  {heatmapData.hours.map(h => (
                    <th key={h} style={{ padding: '4px 4px', textAlign: 'center', color: '#78716c', fontWeight: 500, width: '36px' }}>
                      {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.items.map(itemName => (
                  <tr key={itemName}>
                    <td style={{ padding: '3px 8px', color: '#1c1917', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'right', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {itemName}
                    </td>
                    {heatmapData.hours.map(h => {
                      const qty = heatmapData.map[itemName]?.[h] ?? 0;
                      const intensity = qty / heatmapData.maxQty;
                      return (
                        <td key={h} style={{ padding: '3px 4px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '4px',
                            background: qty === 0 ? '#f5f5f4' : `rgba(94,139,139,${Math.max(0.15, intensity)})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: intensity > 0.5 ? '#fff' : '#44403c', fontWeight: 600,
                          }}>
                            {qty > 0 ? qty : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Sellout Events ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>
          ⚠️ Sellout Events (last 30 days)
        </h3>
        {!selloutEvents ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : selloutGrouped.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#16a34a' }}>
            <span>✓</span>
            <span>No sellouts recorded in last 30 days</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selloutGrouped.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#1c1917', fontWeight: 500 }}>
                  {item.name}
                  {item.count > 1 && (
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      — sold out {item.count}× in last 30 days
                    </span>
                  )}
                  {item.count === 1 && item.latest.soldOutAt && (
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: '#78716c' }}>
                      — sold out at {new Date(item.latest.soldOutAt).toLocaleString()}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Item Popularity by Day of Week ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px', marginBottom: '8px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Item Popularity by Day of Week (top 5)</h3>
        {dowData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {dowData.map(item => (
              <div key={item.name}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', color: '#78716c' }}>
                    — most popular on <strong>{DOW_LABELS[item.busiestDow]}</strong>
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={item.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v, 'Orders']} />
                    <Bar dataKey="qty" fill="#5E8B8B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
