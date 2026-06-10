import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus,
} from 'lucide-react';




import { DS, getMonday, addWeekDays, WEEK_DAYS } from '../shared';


export function SchedulingTab({ token, venueId: _venueId }: { token: string; venueId: number }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);
  // shiftDate pre-filled to the first day of the selected week so it's never undefined
  const [addForm, setAddForm] = useState({ staffId: '' as number | '', shiftDate: getMonday(new Date()), startTime: '09:00', endTime: '17:00', role: '', notes: '' });
  const [requestsView, setRequestsView] = useState<'timeoff' | 'swaps'>('timeoff');

  const staff = trpc.scheduling.listStaff.useQuery({ token }, { enabled: !!token });
  const shifts = trpc.scheduling.listShifts.useQuery({ token, weekStart }, { enabled: !!token });
  const timeOffReqs = trpc.shiftManagement.listTimeOffRequests.useQuery({ token, status: 'pending' as const }, { enabled: !!token });
  const swapReqs = trpc.shiftManagement.listShiftSwapRequests.useQuery({ token, status: 'pending' as const }, { enabled: !!token });

  const addShift = trpc.scheduling.addShift.useMutation({ onSuccess: () => { shifts.refetch(); setShowAddForm(false); setAddForm({ staffId: '', shiftDate: weekStart, startTime: '09:00', endTime: '17:00', role: '', notes: '' }); } });
  const deleteShift = trpc.scheduling.deleteShift.useMutation({ onSuccess: () => shifts.refetch() });
  const reviewTimeOff = trpc.shiftManagement.reviewTimeOff.useMutation({ onSuccess: () => timeOffReqs.refetch() });
  const respondSwap = trpc.shiftManagement.respondShiftSwap.useMutation({ onSuccess: () => swapReqs.refetch() });

  const weekDays = WEEK_DAYS.map((_, i) => addWeekDays(weekStart, i));
  const weekDisplay = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const shiftsData = (shifts.data ?? []) as any[];
  const staffData = (staff.data ?? []) as any[];
  const toReqs = (timeOffReqs.data ?? []) as any[];
  const swData = (swapReqs.data ?? []) as any[];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Scheduling</h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Build rosters and approve staff requests.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setWeekStart(addWeekDays(weekStart, -7))} style={{ ...DS.btnSecondary }}>← Prev</button>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>Week of {weekDisplay}</span>
        <button onClick={() => setWeekStart(addWeekDays(weekStart, 7))} style={{ ...DS.btnSecondary }}>Next →</button>
        <button onClick={() => setWeekStart(getMonday(new Date()))} style={{ ...DS.btnSecondary, marginLeft: 'auto' }}>Today</button>
      </div>
      <div style={{ ...DS.card, marginBottom: 20, overflowX: 'auto' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={DS.sectionTitle}>Shifts</h2>
          <button onClick={() => setShowAddForm(v => !v)} style={{ ...DS.btnPrimary }}><Plus size={14} /> Add Shift</button>
        </div>
        {shifts.isLoading ? <div style={DS.emptyState}><Loader2 size={18} className="animate-spin" /></div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12, minWidth: 700 }}>
            <thead><tr><th style={{ ...DS.tableHeader, minWidth: 100 }}>Staff</th>{WEEK_DAYS.map((d, i) => <th key={d} style={{ ...DS.tableHeader, minWidth: 80 }}>{d} {new Date(weekDays[i] + 'T00:00:00').getDate()}</th>)}</tr></thead>
            <tbody>
              {staffData.length === 0 ? <tr><td colSpan={8} style={DS.emptyState}>No staff members found.</td></tr> : staffData.map((s: any) => (
                <tr key={s.id}><td style={{ ...DS.tableCell, fontWeight: 600 }}>{s.name}</td>
                  {weekDays.map(day => {
                    const dayShifts = shiftsData.filter((sh: any) => sh.staffId === s.id && sh.shiftDate?.slice(0, 10) === day);
                    return (
                      <td key={day} style={{ ...DS.tableCell, verticalAlign: 'top' as const, cursor: 'pointer' }}
                        onClick={() => {
                          // Click empty cell → open add form pre-filled with this staff + day
                          setAddForm(f => ({ ...f, staffId: s.id, shiftDate: day }));
                          setShowAddForm(true);
                        }}
                      >
                        {dayShifts.map((sh: any) => (
                          <div key={sh.id} style={{ background: 'rgba(94,139,139,0.12)', borderRadius: 6, padding: '3px 6px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <span>{sh.startTime?.slice(0, 5)}–{sh.endTime?.slice(0, 5)}</span>
                            <button onClick={e => { e.stopPropagation(); deleteShift.mutate({ token, shiftId: sh.id }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-muted)', padding: 0, lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                        {dayShifts.length === 0 && (
                          <span style={{ color: 'var(--op-text-muted)', fontSize: 10, opacity: 0.4 }}>+ add</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {showAddForm && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--op-bg)', borderRadius: 8, border: '1px solid var(--op-card-border)' }}>
            <h3 style={{ ...DS.sectionTitle, marginBottom: 12 }}>Add Shift</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              <div><label style={DS.label}>Staff</label>
                <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: Number(e.target.value) || '' }))} style={{ ...DS.input }}>
                  <option value="">Select…</option>
                  {staffData.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label style={DS.label}>Date</label><input type="date" value={addForm.shiftDate} onChange={e => setAddForm(f => ({ ...f, shiftDate: e.target.value }))} style={{ ...DS.input }} /></div>
              <div><label style={DS.label}>Start</label><input type="time" value={addForm.startTime} onChange={e => setAddForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...DS.input }} /></div>
              <div><label style={DS.label}>End</label><input type="time" value={addForm.endTime} onChange={e => setAddForm(f => ({ ...f, endTime: e.target.value }))} style={{ ...DS.input }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  const date = addForm.shiftDate || weekStart;
                  if (!addForm.staffId || !date) return;
                  addShift.mutate({ token, staffId: addForm.staffId as number, shiftDate: date, startTime: addForm.startTime, endTime: addForm.endTime, role: addForm.role || undefined, notes: addForm.notes || undefined });
                }}
                disabled={!addForm.staffId || !addForm.shiftDate || addShift.isPending}
                style={{ ...DS.btnPrimary, opacity: (!addForm.staffId || !addForm.shiftDate) ? 0.5 : 1 }}
              >
                {addShift.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Add
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ ...DS.btnSecondary }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div style={DS.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ ...DS.sectionTitle, margin: 0 }}>Pending Requests</h2>
          {(toReqs.length + swData.length) > 0 && <span style={{ background: '#5E8B8B', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{toReqs.length + swData.length}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['timeoff', 'swaps'] as const).map(v => (
              <button key={v} onClick={() => setRequestsView(v)} style={{ ...DS.btnSecondary, background: requestsView === v ? 'var(--op-accent)' : undefined, color: requestsView === v ? '#fff' : undefined, fontSize: 12 }}>
                {v === 'timeoff' ? `Time-Off (${toReqs.length})` : `Swaps (${swData.length})`}
              </button>
            ))}
          </div>
        </div>
        {requestsView === 'timeoff' && (toReqs.length === 0 ? <p style={DS.emptyState}>No pending time-off requests.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead><tr>{['Staff','Period','Type','Reason',''].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
            <tbody>{toReqs.map((r: any) => (<tr key={r.id}><td style={DS.tableCell}>{r.staffName}</td><td style={DS.tableCell}>{r.startDate} – {r.endDate}</td><td style={DS.tableCell}>{r.leaveType}</td><td style={{ ...DS.tableCell, maxWidth: 180 }}>{r.reason || '—'}</td><td style={{ ...DS.tableCell, whiteSpace: 'nowrap' as const }}><button onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'approved' })} style={{ ...DS.btnPrimary, fontSize: 11, padding: '4px 10px', marginRight: 4 }}>Approve</button><button onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'denied' })} style={{ ...DS.btnDanger, fontSize: 11, padding: '4px 10px' }}>Deny</button></td></tr>))}</tbody>
          </table>
        ))}
        {requestsView === 'swaps' && (swData.length === 0 ? <p style={DS.emptyState}>No pending swap requests.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead><tr>{['Requesting','Shift','Target','Reason',''].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
            <tbody>{swData.map((r: any) => (<tr key={r.id}><td style={DS.tableCell}>{r.requestingStaffName ?? r.requestingStaffId}</td><td style={DS.tableCell}>#{r.fromShiftId}</td><td style={DS.tableCell}>{r.targetStaffName ?? r.targetStaffId ?? '—'}</td><td style={DS.tableCell}>{r.reason || '—'}</td><td style={{ ...DS.tableCell, whiteSpace: 'nowrap' as const }}><button onClick={() => respondSwap.mutate({ token, requestId: r.id, status: 'approved' })} style={{ ...DS.btnPrimary, fontSize: 11, padding: '4px 10px', marginRight: 4 }}>Approve</button><button onClick={() => respondSwap.mutate({ token, requestId: r.id, status: 'denied' })} style={{ ...DS.btnDanger, fontSize: 11, padding: '4px 10px' }}>Deny</button></td></tr>))}</tbody>
          </table>
        ))}
      </div>
    </div>
  );
}
