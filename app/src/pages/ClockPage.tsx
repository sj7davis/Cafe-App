import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';

// ─── Types ───
type Screen = 'pin' | 'action' | 'confirm';
type ClockStatus = 'not_clocked_in' | 'clocked_in' | 'on_break';
type ConfirmResult = { message: string; penalty?: string | null; success: boolean };

// ─── Design tokens ───
const T = {
  bg: '#0F0F0F',
  card: '#1C1C1E',
  cardBorder: '#2C2C2E',
  text: '#F5F5F5',
  muted: '#8E8E93',
  pinDot: '#5E8B8B',
  clockInBtn: '#34C759',
  clockOutBtn: '#FF3B30',
  breakBtn: '#FF9500',
  keypadBtn: '#2C2C2E',
  keypadHover: '#3A3A3C',
  errorColor: '#FF3B30',
};

// ─── Format AEST time ───
function nowAEST() {
  return new Date().toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeAEST(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── PIN display dots ───
function PinDots({ length, maxLen = 4 }: { length: number; maxLen?: number }) {
  return (
    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', minHeight: '24px' }}>
      {Array.from({ length: maxLen }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: i < length ? T.pinDot : 'transparent',
            border: `2px solid ${i < length ? T.pinDot : T.muted}`,
            transition: 'background 0.1s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Numpad ───
function Numpad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled: boolean;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  const btnStyle = (key: string): React.CSSProperties => ({
    width: '80px',
    height: '64px',
    borderRadius: '12px',
    border: 'none',
    background: hoveredKey === key ? T.keypadHover : T.keypadBtn,
    color: key === '' ? 'transparent' : T.text,
    fontSize: '22px',
    fontWeight: 500,
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: key === '' || disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s',
    opacity: disabled ? 0.5 : 1,
    pointerEvents: key === '' ? 'none' : disabled ? 'none' : 'auto',
    minWidth: '80px',
    minHeight: '64px',
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 80px)',
        gap: '12px',
        justifyContent: 'center',
      }}
    >
      {keys.map((key, i) => (
        <button
          key={i}
          style={btnStyle(key)}
          onMouseEnter={() => key && key !== '' && setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
          onTouchStart={() => key && key !== '' && setHoveredKey(key)}
          onTouchEnd={() => setHoveredKey(null)}
          onClick={() => {
            if (disabled || key === '') return;
            if (key === '⌫') onBackspace();
            else onDigit(key);
          }}
          aria-label={key === '⌫' ? 'Backspace' : key === '' ? '' : key}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

// ─── Clock status helper ───
function getClockStatus(lastEventType: string | null): ClockStatus {
  if (!lastEventType) return 'not_clocked_in';
  if (lastEventType === 'in' || lastEventType === 'break_end') return 'clocked_in';
  if (lastEventType === 'break_start') return 'on_break';
  return 'not_clocked_in'; // 'out'
}

// ─── Main ClockPage ───
export default function ClockPage() {
  const { slug } = useParams<{ slug: string }>();

  // ─── Screen state ───
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [shake, setShake] = useState(false);

  // ─── Auth state (after PIN entry) — stored in React state only, never localStorage ───
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [venueName, setVenueName] = useState('');

  // ─── Confirmation screen ───
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);

  // ─── AEST clock ───
  const [currentTime, setCurrentTime] = useState(nowAEST());

  // ─── Action errors ───
  const [actionError, setActionError] = useState('');

  // ─── Inactivity timer ───
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetToPin = useCallback(() => {
    setScreen('pin');
    setPin('');
    setPinError('');
    setStaffToken(null);
    setStaffName('');
    setConfirmResult(null);
    setActionError('');
  }, []);

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(resetToPin, 30_000);
  }, [resetToPin]);

  // ─── Tick clock ───
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(nowAEST()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Inactivity on action screen ───
  useEffect(() => {
    if (screen === 'action') {
      resetInactivity();
      return () => {
        if (inactivityRef.current) clearTimeout(inactivityRef.current);
      };
    }
  }, [screen, resetInactivity]);

  // ─── Auto-reset from confirm screen after 4s ───
  useEffect(() => {
    if (screen === 'confirm') {
      const id = setTimeout(resetToPin, 4000);
      return () => clearTimeout(id);
    }
  }, [screen, resetToPin]);

  // ─── tRPC mutations ───
  const loginByPin = trpc.clock.loginByPin.useMutation({
    onSuccess: (data) => {
      setStaffToken(data.token);
      setStaffName(data.staffName);
      setVenueName(data.venueName);
      setPin('');
      setScreen('action');
    },
    onError: () => {
      setShake(true);
      setPinError('Invalid PIN');
      setPin('');
      setTimeout(() => {
        setShake(false);
        setPinError('');
      }, 2000);
    },
  });

  const clockInMut = trpc.clock.clockIn.useMutation({
    onSuccess: (data) => {
      setConfirmResult({
        message: `Clocked in at ${formatTimeAEST(data.clockedAt)} AEST`,
        penalty: data.penaltyFlag,
        success: true,
      });
      setScreen('confirm');
    },
    onError: (e) => {
      setActionError(e.message || 'Could not clock in');
      resetInactivity();
    },
  });

  const clockOutMut = trpc.clock.clockOut.useMutation({
    onSuccess: (data) => {
      setConfirmResult({
        message: `Clocked out at ${formatTimeAEST(data.clockedAt)} AEST`,
        success: true,
      });
      setScreen('confirm');
    },
    onError: (e) => {
      setActionError(e.message || 'Could not clock out');
      resetInactivity();
    },
  });

  const breakStartMut = trpc.clock.breakStart.useMutation({
    onSuccess: (data) => {
      setConfirmResult({
        message: `Break started at ${formatTimeAEST(data.clockedAt)} AEST`,
        success: true,
      });
      setScreen('confirm');
    },
    onError: (e) => {
      setActionError(e.message || 'Could not start break');
      resetInactivity();
    },
  });

  const breakEndMut = trpc.clock.breakEnd.useMutation({
    onSuccess: (data) => {
      setConfirmResult({
        message: `Break ended at ${formatTimeAEST(data.clockedAt)} AEST`,
        success: true,
      });
      setScreen('confirm');
    },
    onError: (e) => {
      setActionError(e.message || 'Could not end break');
      resetInactivity();
    },
  });

  // ─── Clock status query (only when token available) ───
  const statusQuery = trpc.clock.getMyStatus.useQuery(
    { token: staffToken ?? '' },
    { enabled: !!staffToken && screen === 'action', refetchOnWindowFocus: false }
  );

  const lastEventType = (statusQuery.data?.lastEvent as any)?.eventType ?? null;
  const clockStatus = getClockStatus(lastEventType);
  const lastEventAt = (statusQuery.data?.lastEvent as any)?.clockedAt
    ? new Date((statusQuery.data!.lastEvent as any).clockedAt).toISOString()
    : null;

  // ─── PIN handlers ───
  const handleDigit = useCallback((d: string) => {
    setPin((prev) => {
      const next = prev + d;
      if (next.length === 4) {
        // Auto-submit
        setTimeout(() => {
          loginByPin.mutate({ slug: slug ?? '', pin: next });
        }, 0);
      }
      return next.length <= 4 ? next : prev;
    });
  }, [slug, loginByPin]);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const anyPending =
    clockInMut.isPending || clockOutMut.isPending || breakStartMut.isPending || breakEndMut.isPending;

  // ──────────────────────────────────────────────────
  // SCREEN A — PIN Entry
  // ──────────────────────────────────────────────────
  if (screen === 'pin') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
          userSelect: 'none',
        }}
      >
        {/* Venue name */}
        <div style={{ marginBottom: '8px', fontSize: '15px', color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {venueName || (slug ?? '')}
        </div>

        {/* Current time */}
        <div style={{ fontSize: '56px', fontWeight: 700, color: T.text, letterSpacing: '-1px', marginBottom: '32px', lineHeight: 1 }}>
          {currentTime}
        </div>

        {/* PIN display */}
        <div
          style={{
            marginBottom: '28px',
            animation: shake ? 'shake 0.35s ease' : undefined,
          }}
        >
          <PinDots length={pin.length} maxLen={4} />
          {pinError && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: T.errorColor, textAlign: 'center' }}>
              {pinError}
            </div>
          )}
        </div>

        {/* Numpad */}
        <Numpad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          disabled={loginByPin.isPending || pin.length === 4}
        />

        {loginByPin.isPending && (
          <div style={{ marginTop: '20px', fontSize: '13px', color: T.muted }}>Verifying…</div>
        )}

        {/* Staff login link */}
        <div style={{ marginTop: '40px' }}>
          <Link to="/staff-login" style={{ fontSize: '12px', color: T.muted, textDecoration: 'none' }}>
            Staff Login →
          </Link>
        </div>

        {/* Shake keyframe */}
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // SCREEN B — Action (clock in/out/break)
  // ──────────────────────────────────────────────────
  if (screen === 'action') {
    const bigBtnBase: React.CSSProperties = {
      border: 'none',
      borderRadius: '14px',
      fontSize: '18px',
      fontWeight: 700,
      color: '#fff',
      cursor: anyPending ? 'not-allowed' : 'pointer',
      padding: '18px 32px',
      minWidth: '160px',
      minHeight: '72px',
      fontFamily: 'Inter, system-ui, sans-serif',
      opacity: anyPending ? 0.7 : 1,
      transition: 'opacity 0.1s',
    };

    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
          userSelect: 'none',
        }}
        onClick={resetInactivity}
      >
        {/* Time */}
        <div style={{ fontSize: '40px', fontWeight: 700, color: T.text, marginBottom: '4px', letterSpacing: '-0.5px' }}>
          {currentTime}
        </div>
        <div style={{ fontSize: '13px', color: T.muted, marginBottom: '32px' }}>AEST</div>

        {/* Staff card */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: '20px',
            padding: '32px 40px',
            textAlign: 'center',
            minWidth: '320px',
            maxWidth: '420px',
            width: '100%',
          }}
        >
          {/* Staff name */}
          <div style={{ fontSize: '28px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
            {staffName}
          </div>

          {/* Clock status */}
          {statusQuery.isLoading ? (
            <div style={{ color: T.muted, fontSize: '14px', marginBottom: '24px' }}>Loading status…</div>
          ) : (
            <div style={{ fontSize: '14px', color: T.muted, marginBottom: '24px' }}>
              {clockStatus === 'not_clocked_in' && 'Not clocked in'}
              {clockStatus === 'clocked_in' && lastEventAt && `Clocked in since ${formatTimeAEST(lastEventAt)}`}
              {clockStatus === 'clocked_in' && !lastEventAt && 'Clocked in'}
              {clockStatus === 'on_break' && lastEventAt && `On break since ${formatTimeAEST(lastEventAt)}`}
              {clockStatus === 'on_break' && !lastEventAt && 'On break'}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {clockStatus === 'not_clocked_in' && (
              <button
                style={{ ...bigBtnBase, background: T.clockInBtn }}
                onClick={() => { resetInactivity(); clockInMut.mutate({ token: staffToken! }); }}
                disabled={anyPending}
              >
                {clockInMut.isPending ? 'Clocking In…' : 'Clock In'}
              </button>
            )}

            {clockStatus === 'clocked_in' && (
              <>
                <button
                  style={{ ...bigBtnBase, background: T.breakBtn }}
                  onClick={() => { resetInactivity(); breakStartMut.mutate({ token: staffToken! }); }}
                  disabled={anyPending}
                >
                  {breakStartMut.isPending ? 'Starting…' : 'Start Break'}
                </button>
                <button
                  style={{ ...bigBtnBase, background: T.clockOutBtn }}
                  onClick={() => { resetInactivity(); clockOutMut.mutate({ token: staffToken! }); }}
                  disabled={anyPending}
                >
                  {clockOutMut.isPending ? 'Clocking Out…' : 'Clock Out'}
                </button>
              </>
            )}

            {clockStatus === 'on_break' && (
              <button
                style={{ ...bigBtnBase, background: T.clockInBtn }}
                onClick={() => { resetInactivity(); breakEndMut.mutate({ token: staffToken! }); }}
                disabled={anyPending}
              >
                {breakEndMut.isPending ? 'Ending Break…' : 'End Break'}
              </button>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div style={{ marginTop: '16px', fontSize: '13px', color: T.errorColor }}>
              {actionError}
            </div>
          )}
        </div>

        {/* Cancel / back */}
        <button
          style={{
            marginTop: '28px',
            background: 'transparent',
            border: 'none',
            color: T.muted,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
          onClick={resetToPin}
        >
          ← Back
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // SCREEN C — Confirmation
  // ──────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px',
        userSelect: 'none',
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: '72px', marginBottom: '24px', lineHeight: 1 }}>
        {confirmResult?.success ? '✓' : '✗'}
      </div>

      {/* Message */}
      <div style={{ fontSize: '24px', fontWeight: 700, color: T.text, textAlign: 'center', marginBottom: '16px' }}>
        {confirmResult?.message ?? ''}
      </div>

      {/* Penalty flag */}
      {confirmResult?.penalty && (
        <div
          style={{
            background: '#78350f',
            color: '#fef3c7',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          {confirmResult.penalty}
        </div>
      )}

      <div style={{ fontSize: '13px', color: T.muted }}>Returning to PIN entry…</div>
    </div>
  );
}
