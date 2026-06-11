import { useState } from 'react';
import { trpc } from '@/providers/trpc';





// ─── Role-based tab definitions ───

export function TimeOffTab({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const { data: requests, isLoading } = trpc.shiftManagement.listTimeOffRequests.useQuery(
    { token },
    { enabled: !!token, refetchInterval: 30_000 }
  );

  const reviewTimeOff = trpc.shiftManagement.reviewTimeOff.useMutation({
    onSuccess: () => utils.shiftManagement.listTimeOffRequests.invalidate(),
  });

  const list = (requests ?? []) as any[];
  const filtered = filter === 'pending' ? list.filter(r => r.status === 'pending') : list;

  const torStatusColors: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#fef3c7', color: '#d97706' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    denied:   { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Time Off Requests</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: filter === f ? '#1c1917' : '#e7e5e4',
                color: filter === f ? '#fafaf9' : '#57534e',
              }}>
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>
          No {filter === 'pending' ? 'pending ' : ''}time off requests
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dates</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const sc = torStatusColors[r.status] ?? torStatusColors.pending;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{r.staffName ?? `Staff #${r.staffId}`}</td>
                    <td style={{ padding: '14px 16px', color: '#44403c' }}>{r.startDate} → {r.endDate}</td>
                    <td style={{ padding: '14px 16px', color: '#57534e', textTransform: 'capitalize' }}>{r.type}</td>
                    <td style={{ padding: '14px 16px', color: '#78716c' }}>{r.reason ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'approved' })}
                            disabled={reviewTimeOff.isPending}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'denied' })}
                            disabled={reviewTimeOff.isPending}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
