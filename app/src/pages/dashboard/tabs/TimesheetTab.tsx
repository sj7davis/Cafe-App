import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Download,
} from 'lucide-react';




import { DS } from '../shared';


export function TimesheetTab({ token }: { token: string }) {
  const [days, setDays] = useState<7 | 14 | 28>(14);
  const summary = trpc.clock.getHoursSummary.useQuery({ token, days }, { enabled: !!token });
  const summaryData = (summary.data ?? []) as any[];

  const handleExport = () => {
    const rows = [['Staff Name', 'Total Hours', 'Shifts', 'Penalty Flags']];
    for (const s of summaryData) {
      const hours = s.totalHours ?? (s.totalMinutes != null ? (s.totalMinutes / 60).toFixed(1) : '0.0');
      rows.push([s.name ?? '', String(hours), String(s.shifts ?? 0), (s.penaltyFlags ?? []).join('; ')]);
    }
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `timesheet-${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Timesheets</h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Staff hours with AEST penalty flags. CSV export for Xero.</p>
      </div>
      <div style={DS.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([7, 14, 28] as const).map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ ...DS.btnSecondary, background: days === d ? 'var(--op-accent)' : undefined, color: days === d ? '#fff' : undefined, fontSize: 12 }}>{d} days</button>
            ))}
          </div>
          <button onClick={handleExport} disabled={summaryData.length === 0} style={{ ...DS.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: summaryData.length === 0 ? 0.5 : 1 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
        {summary.isLoading
          ? <div style={{ ...DS.emptyState, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={22} className="animate-spin" /></div>
          : summaryData.length === 0
            ? <p style={DS.emptyState}>No clock events in the selected period.</p>
            : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                  <thead><tr>{['Staff','Shifts','Total Hours','Penalty Flags'].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
                  <tbody>{summaryData.map((s: any, i: number) => {
                    const hours = s.totalHours ?? (s.totalMinutes != null ? (s.totalMinutes / 60).toFixed(1) : '0.0');
                    const flags: string[] = s.penaltyFlags ?? [];
                    return (
                      <tr key={s.staffId ?? i} style={{ borderBottom: '1px solid var(--op-card-border)' }}>
                        <td style={{ ...DS.tableCell, fontWeight: 600 }}>{s.name}</td>
                        <td style={DS.tableCell}>{s.shifts ?? 0}</td>
                        <td style={{ ...DS.tableCell, fontFamily: 'monospace', fontWeight: 700 }}>{hours} h</td>
                        <td style={DS.tableCell}>{flags.length === 0 ? <span style={{ color: 'var(--op-text-muted)' }}>—</span> : flags.map((f: string, fi: number) => <span key={fi} style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 }}>{f}</span>)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--op-bg)', borderRadius: 8, fontSize: 12, color: 'var(--op-text-muted)', lineHeight: 1.5 }}>
          Penalty rates flagged based on AEST clock-in time: Sat 125%, Sun 200%, late night/early morning (21:00–06:00) 125%. Export CSV to Xero for payroll calculation.
        </div>
      </div>
    </div>
  );
}
