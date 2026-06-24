import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, AlertCircle, Send,
} from 'lucide-react';





const SMS_SEGMENTS = [
  { id: 'all', label: 'All Customers', description: 'Every customer in your database' },
  { id: 'lapsed_30d', label: 'Lapsed 30 Days', description: 'No order in last 30 days' },
  { id: 'lapsed_60d', label: 'Lapsed 60 Days', description: 'No order in last 60 days' },
  { id: 'birthday_month', label: 'Birthday This Month', description: 'Customers with birthday this month' },
  { id: 'top_spenders', label: 'Top Spenders', description: 'Top 20% by lifetime value' },
] as const;

type SmsSegmentId = typeof SMS_SEGMENTS[number]['id'];

export function SmsMarketingTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedSegment, setSelectedSegment] = useState<SmsSegmentId>('all');
  const [message, setMessage] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const { data: segmentsData, isLoading: segmentsLoading } = trpc.smsMarketing.getSegments.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.smsMarketing.getCampaignHistory.useQuery(
    { token }, { enabled: !!token }
  );

  const sendBulk = trpc.smsMarketing.sendBulkSms.useMutation({
    onSuccess: (data: any) => {
      setSendResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setConfirmVisible(false);
      setMessage('');
      refetchHistory();
    },
    onError: () => {
      setConfirmVisible(false);
    },
  });

  const segments: any[] = (segmentsData as any)?.segments ?? [];
  const history: any[] = (historyData as any[]) ?? [];

  const currentSegment = segments.find((s: any) => s.key === selectedSegment || s.id === selectedSegment) as any | undefined;
  const customerCount = currentSegment?.count ?? 0;
  const charCount = message.length;
  const maxChars = 160;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          SMS Marketing
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Send targeted SMS campaigns to your customers.
        </p>
      </div>
      <div className="space-y-6">

      {/* Segment selector */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Select Audience</h3>
        {segmentsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SMS_SEGMENTS.map((seg) => {
            const segStats = segments.find((s: any) => (s.key ?? s.id) === seg.id) as any | undefined;
            const count = segStats?.count ?? '—';
            const isSelected = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => { setSelectedSegment(seg.id); setSendResult(null); }}
                style={{
                  background: isSelected ? '#181818' : '#E8E4DD',
                  border: `1px solid ${isSelected ? '#181818' : 'var(--op-border-mid)'}`,
                  color: isSelected ? '#F3F2EE' : '#181818',
                  padding: '12px 16px',
                  textAlign: 'left' as const,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block' }}>{seg.label}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.06em', opacity: 0.7 }}>{seg.description}</span>
                </div>
                <span style={{ fontFamily: 'Geist Mono', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                  {count} customers
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message composer */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Compose Message</h3>
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            rows={4}
            placeholder="Type your SMS message here…"
            style={{
              width: '100%',
              fontFamily: 'Inter',
              fontSize: '0.9375rem',
              color: 'var(--op-text)',
              background: 'transparent',
              border: '1px solid var(--op-border-strong)',
              padding: '12px 14px',
              resize: 'vertical' as const,
              boxSizing: 'border-box' as const,
            }}
          />
          <span className="font-data" style={{
            fontSize: '0.5625rem',
            letterSpacing: '0.08em',
            position: 'absolute',
            bottom: 10,
            right: 12,
            color: charCount >= maxChars ? '#B85450' : '#5E5E5E',
          }}>
            {charCount}/{maxChars}
          </span>
        </div>

        {sendResult && (
          <div className="mt-3 border p-3 flex items-center gap-2" style={{ borderColor: '#5E8B5E', background: 'rgba(94,139,94,0.08)' }}>
            <Check size={14} style={{ color: '#5E8B5E' }} />
            <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E', letterSpacing: '0.08em' }}>
              Sent {sendResult.sent} messages{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}.
            </span>
          </div>
        )}

        {sendBulk.isError && (
          <div className="mt-3 border p-3 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
            <AlertCircle size={14} style={{ color: '#B85450' }} />
            <span className="font-data" style={{ fontSize: '0.625rem', color: '#B85450', letterSpacing: '0.08em' }}>
              {sendBulk.error?.message ?? 'Send failed.'}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          {!confirmVisible ? (
            <button
              disabled={!message.trim() || customerCount === 0}
              onClick={() => setConfirmVisible(true)}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{
                background: 'var(--op-btn-bg)',
                color: 'var(--op-btn-text)',
                fontSize: '0.75rem',
                opacity: (!message.trim() || customerCount === 0) ? 0.5 : 1,
                cursor: (!message.trim() || customerCount === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} /> Send SMS
            </button>
          ) : (
            <div className="flex items-center gap-3 border p-3" style={{ borderColor: '#C4953A', background: 'rgba(196,149,58,0.08)' }}>
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#C4953A', letterSpacing: '0.06em' }}>
                Send to {customerCount} customers?
              </span>
              <button
                onClick={() => sendBulk.mutate({ token, segment: selectedSegment, message })}
                disabled={sendBulk.isPending}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.625rem', opacity: sendBulk.isPending ? 0.6 : 1 }}
              >
                {sendBulk.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmVisible(false)}
                disabled={sendBulk.isPending}
                className="px-4 py-2 font-data border"
                style={{ borderColor: 'var(--op-border-strong)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campaign history */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Campaign History</h3>
        {historyLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!historyLoading && history.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No campaigns sent yet.</p>
        )}
        {!historyLoading && history.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--op-border-mid)' }}>
                  {['Date', 'Segment', 'Message', 'Sent'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row: any, i: number) => (
                  <tr key={row.id ?? i} style={{ borderBottom: '1px solid var(--op-border-soft)' }}>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', whiteSpace: 'nowrap' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {new Date(row.sentAt ?? row.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text)', textTransform: 'capitalize' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {SMS_SEGMENTS.find((s) => s.id === row.segment)?.label ?? row.segment}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {row.body ?? row.message}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#5E8B5E', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {row.recipientCount ?? row.sentCount ?? row.sent ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
