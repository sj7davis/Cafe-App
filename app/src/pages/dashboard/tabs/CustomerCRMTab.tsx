import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import { Loader2, Search, Download, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { DS } from '../shared';

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  gold:   { bg: 'rgba(234,179,8,0.15)',  color: '#b45309' },
  silver: { bg: 'rgba(148,163,184,0.15)', color: '#475569' },
  bronze: { bg: 'rgba(180,109,50,0.12)', color: '#92400e' },
};

function exportToCSV(rows: any[]) {
  const headers = ['Name', 'Phone', 'Email', 'Orders', 'Total Spent', 'Last Order', 'Loyalty Tier', 'Points'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.name ?? ''}"`,
      `"${r.phone ?? ''}"`,
      `"${r.email ?? ''}"`,
      r.orderCount,
      r.totalSpent.toFixed(2),
      r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString() : '',
      r.loyaltyTier ?? '',
      r.loyaltyPoints ?? 0,
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CustomerCRMTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  // Debounce search so we don't fire a full-table scan on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: customers, isLoading } = trpc.venue.getCustomerList.useQuery(
    { token, limit: 100, search: debouncedSearch.trim() || undefined },
    { enabled: !!token, staleTime: 2 * 60 * 1000 }
  );

  const { data: orderHistory } = trpc.venue.getCustomerOrderHistory.useQuery(
    { token, customerPhone: expandedPhone!, limit: 5 },
    { enabled: !!token && !!expandedPhone }
  );

  const rows = (customers as any[] | undefined) ?? [];

  const thStyle = {
    textAlign: 'left' as const,
    padding: '8px 10px',
    fontFamily: 'Geist Mono',
    fontSize: '0.55rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--op-text-secondary)',
    borderBottom: '1px solid var(--op-border-soft)',
    whiteSpace: 'nowrap' as const,
  };
  const tdStyle = {
    padding: '10px 10px',
    fontSize: 13,
    color: 'var(--op-text)',
    borderBottom: '1px solid var(--op-border-soft)',
    verticalAlign: 'top' as const,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Customers
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Customer database aggregated from orders and loyalty accounts.
        </p>
      </div>

      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h2 style={{ ...DS.sectionTitle, margin: 0, flex: 1 }}>Customer List</h2>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--op-text-secondary)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid var(--op-border-strong)', borderRadius: 6, fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: 220 }}
            />
          </div>
          {rows.length > 0 && (
            <button
              onClick={() => exportToCSV(rows)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid var(--op-border-strong)', borderRadius: 6, background: 'none', color: 'var(--op-text)', fontSize: 12, cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--op-text-secondary)' }}>
            <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{search ? 'No customers match your search.' : 'No customer data yet.'}</p>
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Total Spent</th>
                  <th style={thStyle}>Last Order</th>
                  <th style={thStyle}>Tier</th>
                  <th style={thStyle}>Points</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const isExpanded = expandedPhone === c.phone;
                  const tierColors = TIER_COLORS[c.loyaltyTier] ?? TIER_COLORS.bronze;
                  return (
                    <>
                      <tr key={c.phone} style={{ cursor: 'pointer', background: isExpanded ? 'rgba(94,139,139,0.04)' : 'transparent' }}
                        onClick={() => setExpandedPhone(isExpanded ? null : c.phone)}>
                        <td style={tdStyle}><span style={{ fontWeight: 600 }}>{c.name || '—'}</span></td>
                        <td style={{ ...tdStyle, fontFamily: 'Geist Mono', fontSize: 12 }}>{c.phone}</td>
                        <td style={tdStyle}>{c.orderCount}</td>
                        <td style={tdStyle}>${c.totalSpent.toFixed(2)}</td>
                        <td style={{ ...tdStyle, color: 'var(--op-text-secondary)', fontSize: 12 }}>
                          {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...tierColors, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize', display: 'inline-block' }}>
                            {c.loyaltyTier ?? 'bronze'}
                          </span>
                        </td>
                        <td style={tdStyle}>{c.loyaltyPoints}</td>
                        <td style={{ ...tdStyle, color: 'var(--op-text-secondary)' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${c.phone}-expanded`}>
                          <td colSpan={8} style={{ padding: '12px 16px 16px', background: 'rgba(94,139,139,0.04)', borderBottom: '1px solid var(--op-border-soft)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Recent Orders
                            </div>
                            {!orderHistory ? (
                              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
                            ) : (orderHistory as any[]).length === 0 ? (
                              <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: 0 }}>No orders found.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(orderHistory as any[]).map((o) => (
                                  <div key={o.id} style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--op-border-soft)' }}>
                                    <span style={{ fontFamily: 'Geist Mono', fontSize: 11, color: 'var(--op-text-secondary)', minWidth: 100 }}>{o.orderNumber}</span>
                                    <span style={{ color: 'var(--op-text)' }}>${Number(o.totalAmount).toFixed(2)}</span>
                                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: o.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'var(--op-border-soft)', color: o.status === 'completed' ? '#065F46' : 'var(--op-text-secondary)', textTransform: 'capitalize' }}>{o.status}</span>
                                    <span style={{ color: 'var(--op-text-secondary)', fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('en-AU')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.email && (
                              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--op-text-secondary)' }}>Email: <span style={{ color: 'var(--op-text)' }}>{c.email}</span></p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
