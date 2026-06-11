import { useState } from 'react';
import { trpc } from '@/providers/trpc';





// ─── Role-based tab definitions ───

export function ClockHistoryTab({ token }: { token: string }) {
  const [days, setDays] = useState(14);

  const { data: shiftHistory, isLoading: historyLoading } = trpc.clock.getShiftHistory.useQuery({ token, days });
  const { data: hoursSummary, isLoading: summaryLoading } = trpc.clock.getHoursSummary.useQuery({ token, days });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Clock History</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 14, 30].map(d => (
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

      {/* Hours Summary Cards */}
      {summaryLoading ? (
        <div style={{ color: '#78716c', padding: '16px', fontSize: '14px' }}>Loading summary…</div>
      ) : (hoursSummary ?? []).length === 0 ? (
        <div style={{ color: '#78716c', padding: '16px', fontSize: '14px' }}>No clock data for this period.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {(hoursSummary ?? []).map((s: any) => (
            <div key={s.staffId} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', marginBottom: '8px' }}>{s.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '4px' }}>
                <span>Total Hours</span>
                <span style={{ fontWeight: 700, color: '#1c1917' }}>{Number(s.totalHours ?? 0).toFixed(1)}h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '4px' }}>
                <span>Shifts</span>
                <span style={{ fontWeight: 600 }}>{s.shiftCount}</span>
              </div>
              {s.penaltyFlags && s.penaltyFlags.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {s.penaltyFlags.map((flag: string, i: number) => (
                    <span key={i} style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#d97706', marginRight: '4px', marginBottom: '4px',
                    }}>
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event Log Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Event Log</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (shiftHistory ?? []).length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No clock events in this period</td></tr>
            ) : (shiftHistory ?? []).map((ev: any) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px 16px', color: '#44403c', fontSize: '12px' }}>
                  {new Date(ev.clockedAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{ev.staffName ?? ev.staffId}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    background: ev.type === 'clock_in' ? '#dcfce7' : '#fee2e2',
                    color: ev.type === 'clock_in' ? '#16a34a' : '#dc2626',
                  }}>
                    {ev.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>{ev.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
