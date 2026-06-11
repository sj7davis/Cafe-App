import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function MyScheduleTab({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [toStart, setToStart] = useState('');
  const [toEnd, setToEnd] = useState('');
  const [toType, setToType] = useState<'annual' | 'sick' | 'unpaid' | 'other'>('annual');
  const [toReason, setToReason] = useState('');
  const [toMsg, setToMsg] = useState('');
  const [toError, setToError] = useState('');

  const { data: shifts, isLoading: shiftsLoading } = trpc.scheduling.getMyShifts.useQuery(
    { token, weeksAhead: 3 },
    { enabled: !!token }
  );

  const { data: availability, isLoading: availLoading } = trpc.shiftManagement.getMyAvailability.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: timeOffRequests, isLoading: torLoading } = trpc.shiftManagement.getMyTimeOffRequests.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: swapRequests } = trpc.shiftManagement.listShiftSwapRequests.useQuery(
    { token },
    { enabled: !!token }
  );

  const setAvailability = trpc.shiftManagement.setAvailability.useMutation({
    onSuccess: () => utils.shiftManagement.getMyAvailability.invalidate(),
  });

  const requestTimeOff = trpc.shiftManagement.requestTimeOff.useMutation({
    onSuccess: () => {
      utils.shiftManagement.getMyTimeOffRequests.invalidate();
      setShowTimeOffForm(false);
      setToStart(''); setToEnd(''); setToReason('');
      setToMsg('Time off request submitted!');
      setToError('');
      setTimeout(() => setToMsg(''), 4000);
    },
    onError: (e: any) => { setToError(e.message); },
  });

  const requestSwap = trpc.shiftManagement.requestShiftSwap.useMutation({
    onSuccess: () => utils.shiftManagement.listShiftSwapRequests.invalidate(),
  });

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group shifts by week label
  const shiftList = (shifts ?? []) as any[];
  const torList = (timeOffRequests ?? []) as any[];
  const availMap: Record<number, { isAvailable: boolean; preferredStart?: string; preferredEnd?: string }> = {};
  if (availability) {
    for (const a of availability as any[]) {
      availMap[a.dayOfWeek] = { isAvailable: a.isAvailable, preferredStart: a.preferredStart ?? undefined, preferredEnd: a.preferredEnd ?? undefined };
    }
  }

  function formatShiftDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${dayNames[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  const torStatusColors: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#fef3c7', color: '#d97706' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    denied:   { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 28px' }}>My Schedule</h2>

      {/* ── Upcoming Shifts ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Upcoming Shifts</h3>
        {shiftsLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : shiftList.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No upcoming shifts scheduled</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shiftList.map((shift: any) => (
              <div key={shift.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: '#f5f5f4',
                borderRadius: '10px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>
                    {formatShiftDate(shift.date)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#57534e', marginTop: '2px' }}>
                    {shift.startTime}–{shift.endTime}
                  </div>
                </div>
                {shift.role && (
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                    fontWeight: 700, background: '#e7e5e4', color: '#57534e', textTransform: 'capitalize',
                  }}>
                    {shift.role}
                  </span>
                )}
                <button
                  onClick={() => requestSwap.mutate({ token, fromShiftId: shift.id })}
                  disabled={requestSwap.isPending}
                  title="Request shift swap"
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid #e7e5e4',
                    background: '#fff', color: '#78716c', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Swap
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── My Availability ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>My Availability</h3>
        {availLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {DAYS.map((day, idx) => {
              const avail = availMap[idx] ?? { isAvailable: true };
              return (
                <div key={idx} style={{
                  borderRadius: '10px',
                  border: '1px solid #e7e5e4',
                  padding: '10px 6px',
                  textAlign: 'center',
                  background: avail.isAvailable ? '#f0fdf4' : '#fef2f2',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', marginBottom: '8px' }}>{day}</div>
                  <button
                    onClick={() => setAvailability.mutate({ token, dayOfWeek: idx, available: !avail.isAvailable })}
                    style={{
                      width: '100%',
                      padding: '5px 0',
                      borderRadius: '6px',
                      border: 'none',
                      background: avail.isAvailable ? '#16a34a' : '#dc2626',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {avail.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                  {avail.isAvailable && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <input
                        type="time"
                        defaultValue={avail.preferredStart ?? ''}
                        onBlur={e => setAvailability.mutate({ token, dayOfWeek: idx, available: true, preferredStartTime: e.target.value || undefined })}
                        style={{ width: '100%', padding: '3px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e7e5e4', boxSizing: 'border-box' }}
                      />
                      <input
                        type="time"
                        defaultValue={avail.preferredEnd ?? ''}
                        onBlur={e => setAvailability.mutate({ token, dayOfWeek: idx, available: true, preferredEndTime: e.target.value || undefined })}
                        style={{ width: '100%', padding: '3px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e7e5e4', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Time Off Requests ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Time Off Requests</h3>
          <button
            onClick={() => setShowTimeOffForm(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: showTimeOffForm ? '#57534e' : '#1c1917',
              color: '#fafaf9', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> {showTimeOffForm ? 'Cancel' : 'Request Time Off'}
          </button>
        </div>

        {toMsg && <div style={{ marginBottom: '12px', fontSize: '13px', color: '#16a34a' }}>{toMsg}</div>}

        {showTimeOffForm && (
          <div style={{ background: '#f5f5f4', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            {toError && <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>{toError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Start Date</label>
                <input type="date" value={toStart} onChange={e => setToStart(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>End Date</label>
                <input type="date" value={toEnd} onChange={e => setToEnd(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Type</label>
                <select value={toType} onChange={e => setToType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Reason (optional)</label>
              <textarea value={toReason} onChange={e => setToReason(e.target.value)} rows={2}
                placeholder="Any additional details…"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <button
              onClick={() => {
                setToError('');
                if (!toStart || !toEnd) { setToError('Start and end date are required'); return; }
                requestTimeOff.mutate({ token, startDate: toStart, endDate: toEnd, leaveType: toType as 'annual' | 'sick' | 'unpaid' | 'other', reason: toReason || undefined });
              }}
              disabled={requestTimeOff.isPending}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {requestTimeOff.isPending ? '…' : 'Submit Request'}
            </button>
          </div>
        )}

        {torLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : torList.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No time off requests yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {torList.map((r: any) => {
              const sc = torStatusColors[r.status] ?? torStatusColors.pending;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f5f5f4', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917' }}>
                      {r.startDate} → {r.endDate}
                    </div>
                    <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px', textTransform: 'capitalize' }}>
                      {r.type}{r.reason ? ` — ${r.reason}` : ''}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.color }}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Shift Swaps ── */}
      {(swapRequests ?? []).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>My Shift Swap Requests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(swapRequests as any[]).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f5f5f4', borderRadius: '8px' }}>
                <div style={{ flex: 1, fontSize: '13px', color: '#44403c' }}>
                  Swap request for shift on {r.shiftDate ?? `#${r.fromShiftId}`}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: '#fef3c7', color: '#d97706' }}>
                  {r.status ?? 'pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
