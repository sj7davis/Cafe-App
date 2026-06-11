import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
  ListOrdered,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function WaitlistTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [formMsg, setFormMsg] = useState('');

  const { data: queue, isLoading: queueLoading } = trpc.waitlist.getQueue.useQuery(
    { token },
    { refetchInterval: 30_000, enabled: !!token }
  );

  const joinMut = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      utils.waitlist.getQueue.invalidate();
      setName('');
      setPhone('');
      setPartySize(2);
      setFormMsg('Added to queue');
      setTimeout(() => setFormMsg(''), 3000);
    },
    onError: (e) => setFormMsg(e.message),
  });

  const notifyMut = trpc.waitlist.notify.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const seatMut = trpc.waitlist.seat.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const cancelMut = trpc.waitlist.cancel.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const waitingCount = (queue ?? []).filter((e: any) => e.status === 'waiting').length;

  function handleAdd() {
    setFormMsg('');
    if (!name.trim() || !phone.trim()) { setFormMsg('Name and phone are required'); return; }
    joinMut.mutate({ venueId, name: name.trim(), phone: phone.trim(), partySize });
  }

  function formatWaitTime(joinedAt: string) {
    const diff = Date.now() - new Date(joinedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Waitlist</h2>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          background: waitingCount > 0 ? '#fef3c7' : '#f5f5f4',
          color: waitingCount > 0 ? '#d97706' : '#78716c',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          <ListOrdered size={14} />
          Queue length: {waitingCount} waiting
        </div>
      </div>

      {/* Add to Waitlist Form */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Add to Queue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Customer name"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+61 …"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Party Size</label>
            <input
              type="number"
              min="1"
              value={partySize}
              onChange={e => setPartySize(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={joinMut.isPending}
            style={{
              padding: '8px 20px',
              background: '#1c1917',
              color: '#fafaf9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: joinMut.isPending ? 'not-allowed' : 'pointer',
              opacity: joinMut.isPending ? 0.7 : 1,
              height: '36px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} /> {joinMut.isPending ? 'Adding…' : 'Add to Queue'}
          </button>
        </div>
        {formMsg && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: formMsg.includes('required') || formMsg.includes('Error') ? '#dc2626' : '#16a34a' }}>
            {formMsg}
          </p>
        )}
      </div>

      {/* Current Queue */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Current Queue</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Party</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wait</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueLoading ? (
              <tr><td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (queue ?? []).length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No one in the queue</td></tr>
            ) : (queue ?? []).map((entry: any, idx: number) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                waiting: { bg: '#fef3c7', text: '#d97706' },
                notified: { bg: '#dbeafe', text: '#2563eb' },
                seated: { bg: '#d1fae5', text: '#059669' },
                cancelled: { bg: '#fee2e2', text: '#dc2626' },
              };
              const sc = statusColors[entry.status] ?? statusColors.waiting;
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1c1917' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{entry.name}</td>
                  <td style={{ padding: '12px 16px', color: '#44403c' }}>{entry.partySize}</td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>{entry.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: sc.bg,
                      color: sc.text,
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                    {formatWaitTime(entry.joinedAt ?? entry.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {entry.status === 'waiting' && (
                        <button
                          onClick={() => notifyMut.mutate({ token, id: entry.id })}
                          disabled={notifyMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#dbeafe',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Notify
                        </button>
                      )}
                      {entry.status === 'notified' && (
                        <button
                          onClick={() => seatMut.mutate({ token, id: entry.id })}
                          disabled={seatMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#d1fae5',
                            color: '#059669',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Seat
                        </button>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'notified') && (
                        <button
                          onClick={() => cancelMut.mutate({ token, id: entry.id })}
                          disabled={cancelMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
