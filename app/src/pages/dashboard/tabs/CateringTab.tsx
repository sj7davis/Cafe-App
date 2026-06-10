import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Briefcase,
} from 'lucide-react';




import { DS } from '../shared';

const CATERING_STATUS_LABELS: Record<string, string> = {
  new: 'New', quoted: 'Quoted', confirmed: 'Confirmed', completed: 'Completed',
};
const CATERING_STATUS_COLORS: Record<string, string> = {
  new: '#C4953A', quoted: '#2563EB', confirmed: '#5E8B5E', completed: '#5E5E5E',
};
const CATERING_STATUS_NEXT: Record<string, string[]> = {
  new: ['quoted', 'confirmed'], quoted: ['confirmed', 'completed'],
  confirmed: ['completed'], completed: [],
};

export function CateringTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const utils = trpc.useUtils();

  const { data: requestsList } = trpc.venue.listCateringRequests.useQuery({
    token,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });

  const updateStatus = trpc.venue.updateCateringStatus.useMutation({
    onSuccess: () => {
      utils.venue.listCateringRequests.invalidate();
      setEditingId(null);
      setPendingStatus('');
    },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Catering Requests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Enquiries and quotes for catering events.
        </p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={DS.sectionTitle}>Catering Requests</h2>
        <div className="flex gap-2">
          {['all', 'new', 'quoted', 'confirmed', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px',
                background: statusFilter === s ? '#181818' : 'transparent',
                color: statusFilter === s ? '#F3F2EE' : '#5E5E5E',
                border: '1px solid var(--op-border-strong)',
                cursor: 'pointer',
                fontFamily: 'Geist Mono',
                fontSize: '0.5rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {requestsList && requestsList.length === 0 && (
        <div className="border p-8 text-center" style={{ borderColor: 'var(--op-border-soft)', color: 'var(--op-text-secondary)' }}>
          <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No catering requests yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {requestsList?.map((req) => (
          <div key={req.id} className="border p-5" style={{ borderColor: 'var(--op-border-soft)', background: editingId === req.id ? '#E8E4DD' : '#fff' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)', marginBottom: 2 }}>{req.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>{req.phone}{req.email ? ` · ${req.email}` : ''}</div>
              </div>
              <span style={{
                fontFamily: 'Geist Mono', fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 8px', background: `${CATERING_STATUS_COLORS[req.status] || '#5E5E5E'}18`,
                color: CATERING_STATUS_COLORS[req.status] || '#5E5E5E',
              }}>
                {CATERING_STATUS_LABELS[req.status] || req.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Event Date</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{req.eventDate}</div>
              </div>
              <div>
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Guest Count</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{req.guestCount}</div>
              </div>
            </div>
            {req.details && (
              <p style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>{req.details}</p>
            )}

            {/* Confirm-gate: select picks next status, confirm button fires mutation */}
            {CATERING_STATUS_NEXT[req.status]?.length > 0 && (
              <div>
                {editingId === req.id ? (
                  <div className="flex gap-2 items-center">
                    <span style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>Move to <strong>{CATERING_STATUS_LABELS[pendingStatus]}</strong>?</span>
                    <button
                      onClick={() => updateStatus.mutate({ token, requestId: req.id, status: pendingStatus as any })}
                      disabled={updateStatus.isPending}
                      className="px-4 py-2 font-button"
                      style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setPendingStatus(''); }}
                      className="px-4 py-2 font-button border"
                      style={{ background: 'none', color: 'var(--op-text)', fontSize: '0.625rem', borderColor: 'var(--op-border-strong)', cursor: 'pointer' }}
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) { setEditingId(req.id); setPendingStatus(e.target.value); } }}
                    style={{ padding: '6px 10px', border: '1px solid var(--op-border-strong)', background: '#F3F2EE', fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}
                  >
                    <option value="">Update status…</option>
                    {CATERING_STATUS_NEXT[req.status]?.map((s) => (
                      <option key={s} value={s}>{CATERING_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
