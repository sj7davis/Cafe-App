import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';





// ─── Role-based tab definitions ───

export function SettingsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();

  // ── Wait Time ──
  const { data: waitTimeData } = trpc.venue.getWaitTime.useQuery({ venueId }, { enabled: !!venueId });
  const [waitInput, setWaitInput] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const setWaitTime = trpc.venue.setWaitTime.useMutation({
    onSuccess: (data) => {
      setWaitMsg(`✓ Wait time set to ${data.minutes} min`);
      utils.venue.getWaitTime.invalidate();
      setTimeout(() => setWaitMsg(''), 3000);
    },
    onError: (e) => setWaitMsg(`Error: ${e.message}`),
  });

  // ── Venue Hours ──
  // Stored as 3 free-text fields: hoursWeekday (Mon-Fri), hoursSaturday, hoursSunday
  const [hoursWeekday, setHoursWeekday] = useState('');
  const [hoursSaturday, setHoursSaturday] = useState('');
  const [hoursSunday, setHoursSunday] = useState('');
  const [hoursMsg, setHoursMsg] = useState('');
const updateVenueMut = trpc.venue.update.useMutation({
    onSuccess: () => {
      setHoursMsg('✓ Hours saved');
      setTimeout(() => setHoursMsg(''), 3000);
    },
    onError: (e) => setHoursMsg(`Error: ${e.message}`),
  });

  // ── Notification Preferences (localStorage) ──
  const [chimeEnabled, setChimeEnabled] = useState(() => {
    const v = localStorage.getItem('b1-chime-enabled');
    return v === null ? true : v === 'true';
  });
  const [desktopNotif, setDesktopNotif] = useState(() => {
    const v = localStorage.getItem('b1-desktop-notif');
    return v === null ? true : v === 'true';
  });

  function handleChimeToggle(val: boolean) {
    setChimeEnabled(val);
    localStorage.setItem('b1-chime-enabled', String(val));
  }

  function handleDesktopNotifToggle(val: boolean) {
    setDesktopNotif(val);
    localStorage.setItem('b1-desktop-notif', String(val));
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7e5e4',
    padding: '24px',
    marginBottom: '16px',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#78716c',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
  };
  const inputStyle: React.CSSProperties = {
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const saveBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    background: '#1c1917',
    color: '#fafaf9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  };
  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f4',
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Venue Settings</h2>

      {/* ── Venue Hours ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Business Hours</h3>
        <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px' }}>
          Enter opening hours as text, e.g. "7:00am – 4:00pm". Leave blank if closed.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '4px' }}>
          <div>
            <label style={labelStyle}>Mon – Fri</label>
            <input
              value={hoursWeekday}
              onChange={e => setHoursWeekday(e.target.value)}
              placeholder="7:00am – 4:00pm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Saturday</label>
            <input
              value={hoursSaturday}
              onChange={e => setHoursSaturday(e.target.value)}
              placeholder="8:00am – 3:00pm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sunday</label>
            <input
              value={hoursSunday}
              onChange={e => setHoursSunday(e.target.value)}
              placeholder="Closed"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={() => {
              setHoursMsg('');
              updateVenueMut.mutate({
                token,
                data: {
                  hoursWeekday: hoursWeekday || undefined,
                  hoursSaturday: hoursSaturday || undefined,
                  hoursSunday: hoursSunday || undefined,
                },
              });
            }}
            disabled={updateVenueMut.isPending}
            style={saveBtnStyle}
          >
            {updateVenueMut.isPending ? 'Saving…' : 'Save Hours'}
          </button>
          {hoursMsg && (
            <span style={{ fontSize: '13px', color: hoursMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {hoursMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Wait Time ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Current Wait Time</h3>
        {waitTimeData != null && (
          <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 12px' }}>
            Current: <strong>{waitTimeData.minutes} min</strong>
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min="0"
            max="120"
            value={waitInput}
            onChange={e => setWaitInput(e.target.value)}
            placeholder="e.g. 15"
            style={{ ...inputStyle, width: '80px' }}
          />
          <span style={{ fontSize: '13px', color: '#78716c' }}>minutes</span>
          <button
            onClick={() => {
              const mins = Number(waitInput);
              if (!waitInput || mins < 0) return;
              setWaitMsg('');
              setWaitTime.mutate({ token, minutes: mins });
            }}
            disabled={setWaitTime.isPending}
            style={{ ...saveBtnStyle, marginTop: 0 }}
          >
            {setWaitTime.isPending ? 'Saving…' : 'Save'}
          </button>
          {waitMsg && (
            <span style={{ fontSize: '13px', color: waitMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {waitMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Notification Preferences ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>Notification Preferences</h3>
        <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px' }}>
          These settings are saved to this browser only.
        </p>
        <div>
          <div style={toggleRowStyle}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Play chime on new order</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>Plays an audio chime when a new order arrives</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={chimeEnabled}
                onChange={e => handleChimeToggle(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1c1917', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#57534e' }}>{chimeEnabled ? 'On' : 'Off'}</span>
            </label>
          </div>
          <div style={{ ...toggleRowStyle, borderBottom: 'none' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Show desktop notifications</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>Shows browser notifications for new and ready orders</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={desktopNotif}
                onChange={e => handleDesktopNotifToggle(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1c1917', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#57534e' }}>{desktopNotif ? 'On' : 'Off'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
