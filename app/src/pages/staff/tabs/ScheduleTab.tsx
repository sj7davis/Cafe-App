import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';





// ─── Role-based tab definitions ───
import { getWeekStart, getWeekDays, formatDayLabel, formatWeekRange } from '../shared';

export function ScheduleTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newShift, setNewShift] = useState({ staffId: '', startTime: '', endTime: '', role: '' });
  const [addMsg, setAddMsg] = useState('');

  const utils = trpc.useUtils();
  const weekStart = getWeekStart(weekOffset);
  const weekDays = getWeekDays(weekStart);

  const staffQuery = trpc.scheduling.listStaff.useQuery({ token }, { enabled: !!token });
  const shiftsQuery = trpc.scheduling.listShifts.useQuery({ token, weekStart }, { enabled: !!token });

  const addShift = trpc.scheduling.addShift.useMutation({
    onSuccess: () => {
      utils.scheduling.listShifts.invalidate();
      setAddingDay(null);
      setNewShift({ staffId: '', startTime: '', endTime: '', role: '' });
      setAddMsg('');
    },
    onError: (e) => setAddMsg(e.message),
  });

  const deleteShift = trpc.scheduling.deleteShift.useMutation({
    onSuccess: () => utils.scheduling.listShifts.invalidate(),
  });

  const staffList = staffQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e7e5e4',
    fontSize: '12px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Header with week navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Schedule</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e5e4',
              background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >
            ← Prev Week
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', minWidth: '220px', textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e5e4',
              background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Next Week →
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: '#e7e5e4', color: '#57534e', fontSize: '12px', cursor: 'pointer',
              }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 7-column day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {weekDays.map((day) => {
          const dayShifts = shifts.filter((s: any) => s.date === day);
          const isAdding = addingDay === day;
          const todayStr = new Date().toISOString().split('T')[0];
          const isToday = day === todayStr;

          return (
            <div
              key={day}
              style={{
                background: '#fff',
                borderRadius: '10px',
                border: isToday ? '2px solid #1c1917' : '1px solid #e7e5e4',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Day header */}
              <div style={{
                padding: '10px 12px',
                background: isToday ? '#1c1917' : '#fafaf9',
                borderBottom: '1px solid #e7e5e4',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isToday ? '#fafaf9' : '#1c1917',
                }}>
                  {formatDayLabel(day)}
                </div>
                <div style={{ fontSize: '10px', color: isToday ? '#a8a29e' : '#78716c' }}>
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Shifts list */}
              <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dayShifts.map((shift: any) => (
                  <div
                    key={shift.id}
                    style={{
                      background: '#f5f5f4',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#1c1917', marginBottom: '2px', paddingRight: '16px' }}>
                      {shift.staffName}
                    </div>
                    <div style={{ color: '#57534e' }}>
                      {shift.startTime}–{shift.endTime}
                    </div>
                    {shift.role && (
                      <div style={{
                        marginTop: '4px',
                        display: 'inline-block',
                        padding: '2px 6px',
                        background: '#e7e5e4',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#78716c',
                        textTransform: 'capitalize',
                      }}>
                        {shift.role}
                      </div>
                    )}
                    <button
                      onClick={() => deleteShift.mutate({ token, shiftId: shift.id })}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#a8a29e',
                        fontSize: '14px',
                        lineHeight: 1,
                        padding: '0 2px',
                      }}
                      title="Delete shift"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Add shift inline form */}
                {isAdding ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <select
                      value={newShift.staffId}
                      onChange={e => setNewShift(s => ({ ...s, staffId: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">Select staff…</option>
                      {staffList.map((st: any) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={newShift.startTime}
                      onChange={e => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                      style={inputStyle}
                      placeholder="Start time"
                    />
                    <input
                      type="time"
                      value={newShift.endTime}
                      onChange={e => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                      style={inputStyle}
                      placeholder="End time"
                    />
                    <input
                      type="text"
                      value={newShift.role}
                      onChange={e => setNewShift(s => ({ ...s, role: e.target.value }))}
                      style={inputStyle}
                      placeholder="Role (e.g. Barista)"
                    />
                    {addMsg && <div style={{ color: '#dc2626', fontSize: '11px' }}>{addMsg}</div>}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          if (!newShift.staffId || !newShift.startTime || !newShift.endTime) {
                            setAddMsg('Staff, start and end time are required');
                            return;
                          }
                          addShift.mutate({
                            token,
                            shiftDate: day,
                            staffId: Number(newShift.staffId),
                            startTime: newShift.startTime,
                            endTime: newShift.endTime,
                            role: newShift.role || undefined,
                          });
                        }}
                        disabled={addShift.isPending}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                          background: '#1c1917', color: '#fafaf9', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {addShift.isPending ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setAddingDay(null); setNewShift({ staffId: '', startTime: '', endTime: '', role: '' }); setAddMsg(''); }}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e7e5e4',
                          background: '#fafaf9', color: '#57534e', fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingDay(day); setAddMsg(''); }}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px dashed #d6d3d1',
                      background: 'transparent',
                      color: '#a8a29e',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add shift
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
