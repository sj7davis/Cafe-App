import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Loader2, Bell, CheckCircle, X, Users, RefreshCw } from 'lucide-react';

export function WaitlistTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();

  const { data: queue, isLoading, refetch, isFetching } = trpc.waitlist.getQueue.useQuery(
    { token },
    { enabled: !!token, refetchInterval: 30_000 }
  );

  const notifyMut = trpc.waitlist.notify.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });
  const seatMut = trpc.waitlist.seat.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });
  const cancelMut = trpc.waitlist.cancel.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const [confirmClear, setConfirmClear] = useState(false);

  const entries = (queue ?? []) as any[];
  const waiting = entries.filter(e => e.status === 'waiting' || e.status === 'notified');

  function formatWait(joinedAt: string) {
    const diff = Date.now() - new Date(joinedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  const labelStyle = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
              Waitlist
            </h1>
            <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
              Manage dine-in queue — auto-refreshes every 30 seconds.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid var(--op-card-border)', borderRadius: 7, background: 'var(--op-bg)', color: 'var(--op-text)', fontSize: 12, cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 18px', background: waiting.length > 0 ? '#FEF3C7' : 'var(--op-bg)', border: '1px solid var(--op-card-border)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Waiting</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: waiting.length > 0 ? '#d97706' : 'var(--op-text)' }}>{waiting.length}</div>
        </div>
        {waiting.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {confirmClear ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--op-text-secondary)', alignSelf: 'center' }}>Clear all waiting entries?</span>
                <button
                  onClick={() => {
                    waiting.forEach(e => cancelMut.mutate({ token, id: e.id }));
                    setConfirmClear(false);
                  }}
                  style={{ padding: '6px 14px', background: '#B85450', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  Confirm Clear
                </button>
                <button onClick={() => setConfirmClear(false)} style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--op-card-border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--op-text)' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(184,84,80,0.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#B85450' }}
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!isLoading && waiting.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--op-text-secondary)' }}>
            <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No one in the queue right now.</p>
          </div>
        )}
        {waiting.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['#', 'Name', 'Party', 'Wait', 'Status', 'Phone', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waiting.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--op-text)', fontFamily: 'Geist Mono' }}>{e.position}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--op-text)' }}>{e.name}</td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>{e.partySize}</td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: 11 }}>{formatWait(e.createdAt)}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: e.status === 'notified' ? '#D1FAE5' : '#FEF3C7',
                        color: e.status === 'notified' ? '#065F46' : '#92400E',
                      }}>
                        {e.status === 'notified' ? 'Notified' : 'Waiting'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: 11 }}>{e.phone || '—'}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {e.status === 'waiting' && (
                          <button
                            disabled={notifyMut.isPending}
                            onClick={() => notifyMut.mutate({ token, id: e.id })}
                            title="Notify customer"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            <Bell size={11} /> Notify
                          </button>
                        )}
                        <button
                          disabled={seatMut.isPending}
                          onClick={() => seatMut.mutate({ token, id: e.id })}
                          title="Mark seated"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(94,139,94,0.12)', color: '#5E8B5E', border: '1px solid rgba(94,139,94,0.2)', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          <CheckCircle size={11} /> Seated
                        </button>
                        <button
                          disabled={cancelMut.isPending}
                          onClick={() => cancelMut.mutate({ token, id: e.id })}
                          title="Mark left"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(184,84,80,0.08)', color: '#B85450', border: '1px solid rgba(184,84,80,0.15)', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          <X size={11} /> Left
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--op-text-secondary)', marginTop: 10, fontFamily: 'Geist Mono' }}>
        <span style={labelStyle as any}>Note:</span> Seated and Left entries are hidden. Use Notify to send an SMS to the customer.
      </p>
    </div>
  );
}
