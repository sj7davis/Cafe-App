import { useState } from 'react';
import { trpc } from '@/providers/trpc';



import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';


export function PLTab({ venue: _venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedDays, setSelectedDays] = useState(30);

  const { data: overview } = trpc.analytics.getOverview.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: revenueByCategory } = trpc.analytics.getRevenueByCategory.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: orderTypeBreakdown } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: repeatRate } = trpc.analytics.getRepeatCustomerRate.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );

  const statCardStyle = { borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

  const catData = revenueByCategory
    ? (revenueByCategory as { category: string; revenue: string; quantity: number }[]).map(r => ({
        category: r.category || 'Other',
        revenue: Number(r.revenue),
      })).sort((a, b) => b.revenue - a.revenue)
    : [];

  const typeData = orderTypeBreakdown
    ? (orderTypeBreakdown as { orderType: string | null; count: number; revenue: string }[]).map(r => ({
        name: r.orderType || 'Unknown',
        value: r.count,
      }))
    : [];

  const CHART_COLORS_PL = ['#5E8B8B', '#C4953A', '#5E8B5E', '#B85450', '#8B7355'];

  const totalRevenue = overview ? Number(overview.totalRevenue) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          P&amp;L Report
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Profit and loss summary across your venues.
        </p>
      </div>
      <div className="space-y-6">
      {/* Days selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setSelectedDays(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid var(--op-border-strong)', background: selectedDays === d ? 'var(--op-btn-bg)' : 'transparent', color: selectedDays === d ? 'var(--op-btn-text)' : 'var(--op-text-secondary)', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
      </div>

      {/* Revenue card */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Revenue</span>
            <span style={bigNum}>${overview.totalRevenue}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Orders</span>
            <span style={bigNum}>{overview.orderCount}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Avg Order Value</span>
            <span style={bigNum}>${overview.avgOrder}</span>
          </div>
        </div>
      )}

      {/* Revenue by category — horizontal bar chart */}
      {catData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={Math.max(120, catData.length * 48)}>
            <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--op-border-soft)" horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="category" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} width={55} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#5E8B8B" radius={[0, 3, 3, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS_PL[i % CHART_COLORS_PL.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue by order type — pie chart */}
      {typeData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Revenue by Order Type</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS_PL[i % CHART_COLORS_PL.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {typeData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS_PL[i % CHART_COLORS_PL.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{entry.name}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estimated margins table */}
      {catData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.5rem' }}>Estimated Margins</h2>
          <p className="font-data mb-4" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
            Cost estimates are based on typical cafe margins. Set actual costs per item in Menu settings.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--op-border-mid)' }}>
                  {['Category', 'Revenue', 'Est. Cost (40%)', 'Est. Profit', 'Margin %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catData.map((row) => {
                  const estCost = row.revenue * 0.4;
                  const estProfit = row.revenue - estCost;
                  const margin = row.revenue > 0 ? Math.round((estProfit / row.revenue) * 100) : 0;
                  const rowColor = margin < 35 ? 'rgba(184,84,80,0.08)' : margin < 50 ? 'rgba(196,149,58,0.08)' : 'transparent';
                  const marginColor = margin < 35 ? '#B85450' : margin < 50 ? '#C4953A' : '#5E8B5E';
                  return (
                    <tr key={row.category} style={{ borderBottom: '1px solid var(--op-border-soft)', background: rowColor }}>
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--op-text)', textTransform: 'capitalize' }}>{row.category}</td>
                      <td style={{ padding: '10px 10px' }}>${row.revenue.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>${estCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${estProfit.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '2px 8px', background: `${marginColor}18`, color: marginColor }}>{margin}%</span>
                      </td>
                    </tr>
                  );
                })}
                {totalRevenue > 0 && (
                  <tr style={{ borderTop: '2px solid var(--op-border-mid)', background: 'var(--op-stat-bg)' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--op-text)' }}>Total</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>${totalRevenue.toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>${(totalRevenue * 0.4).toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#5E8B5E' }}>${(totalRevenue * 0.6).toFixed(2)}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '2px 8px', background: 'rgba(94,139,94,0.12)', color: '#5E8B5E' }}>60%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeat customers */}
      {repeatRate && (
        <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Repeat Customers</h2>
          <div className="flex items-center gap-6">
            <div className="border p-5" style={{ ...statCardStyle, minWidth: 120 }}>
              <span style={monoLabel}>Repeat Rate</span>
              <span style={{ ...bigNum, fontSize: '2rem', color: '#5E8B8B' }}>{repeatRate.rate}%</span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--op-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--op-text)' }}>{repeatRate.repeat}</strong> of <strong style={{ color: 'var(--op-text)' }}>{repeatRate.total}</strong> customers ordered more than once in the last {selectedDays} days.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
