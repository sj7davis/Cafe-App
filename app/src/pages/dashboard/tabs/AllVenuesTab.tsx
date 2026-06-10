import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, AlertCircle, ChevronDown,
  ChevronUp,
} from 'lucide-react';






export function AllVenuesTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const { data: allVenues, isLoading: venuesLoading, error: venuesError } = trpc.multiVenue.getAllVenues.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: consolidated, isLoading: consolidatedLoading } = trpc.multiVenue.getConsolidatedRevenue.useQuery(
    { token, days: period }, { enabled: !!token }
  );
  const { data: comparison, isLoading: comparisonLoading } = trpc.multiVenue.getVenueComparison.useQuery(
    { token, days: period }, { enabled: !!token }
  );

  const venues: any[] = allVenues?.venues ?? [];
  const consolidatedData = consolidated as any;
  const comparisonData: any[] = comparison?.venues ?? [];

  const statCardStyle = { borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          All Venues
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Multi-venue overview and management.
        </p>
      </div>
      <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
        {([7, 30, 90] as const).map((d) => (
          <button key={d} onClick={() => setPeriod(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid var(--op-border-strong)', background: period === d ? '#181818' : 'transparent', color: period === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
      </div>

      {/* Consolidated revenue card */}
      {(consolidatedLoading) && (
        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
      )}
      {!consolidatedLoading && consolidatedData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Revenue (All Venues)</span>
            <span style={bigNum}>${Number(consolidatedData.totalRevenue ?? 0).toFixed(2)}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Orders</span>
            <span style={bigNum}>{consolidatedData.totalOrders ?? 0}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Active Venues</span>
            <span style={bigNum}>{consolidatedData.activeVenues ?? venues.length}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {venuesError && (
        <div className="border p-4 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450' }} />
          <span style={{ fontSize: '0.875rem', color: '#B85450' }}>{venuesError.message}</span>
        </div>
      )}

      {/* Loading */}
      {venuesLoading && (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
      )}

      {/* Per-venue cards */}
      {!venuesLoading && venues.length === 0 && !venuesError && (
        <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No venues found.</p>
      )}

      {!venuesLoading && venues.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Venue Breakdown</h3>
          {(comparisonLoading) && (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((v: any) => {
              const stats = comparisonData.find((c: any) => c.venueId === v.id) as any | undefined;
              const change = stats?.revenueChange ?? null;
              const isPositive = change !== null && change >= 0;
              return (
                <div key={v.id} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.1)', background: 'var(--op-stat-bg)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--op-text)', display: 'block' }}>{v.name}</span>
                      {v.address && (
                        <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>{v.address}</span>
                      )}
                    </div>
                    <a
                      href={`/dashboard?v=${v.id}`}
                      className="px-3 py-1.5 font-data"
                      style={{ fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.2)', color: 'var(--op-text)', textDecoration: 'none', background: 'transparent', whiteSpace: 'nowrap' as const }}>
                      Open Dashboard
                    </a>
                  </div>
                  {stats ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span style={monoLabel}>Revenue</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)' }}>${Number(stats.revenue ?? 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Orders</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)' }}>{stats.orderCount ?? 0}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Change</span>
                        {change !== null ? (
                          <span className="flex items-center gap-1" style={{ fontWeight: 500, fontSize: '0.9375rem', color: isPositive ? '#5E8B5E' : '#B85450' }}>
                            {isPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {Math.abs(Number(change)).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)' }}>—</span>
                        )}
                      </div>
                    </div>
                  ) : !comparisonLoading ? (
                    <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>No data for this period.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
