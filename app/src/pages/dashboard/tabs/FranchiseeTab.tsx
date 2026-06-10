import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, AlertCircle,
  DollarSign,
} from 'lucide-react';






export function FranchiseeTab() {
  const token = localStorage.getItem('b1-owner-token') || '';

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);

  const { data: configData, isLoading: configLoading, error: configError, refetch: refetchConfig } = trpc.franchisee.getConfig.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: splitData, isLoading: splitLoading } = trpc.franchisee.getRevenueSplit.useQuery(
    { token, periodStart, periodEnd }, { enabled: !!token }
  );
  const { data: payoutsData, isLoading: payoutsLoading, refetch: refetchPayouts } = trpc.franchisee.listPayouts.useQuery(
    { token }, { enabled: !!token }
  );

  const setupMutation = trpc.franchisee.setup.useMutation({
    onSuccess: () => { refetchConfig(); setConfigMsg('Config saved!'); },
    onError: (e) => setConfigMsg(e.message),
  });
  const payoutMutation = trpc.franchisee.processMonthlyPayout.useMutation({
    onSuccess: () => { refetchPayouts(); setPayoutMsg('Payout processed!'); },
    onError: (e) => setPayoutMsg(e.message),
  });

  const config = configData as any;
  const split = splitData as any;
  const payouts = (payoutsData as any[]) ?? [];

  const [feeInput, setFeeInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState('monthly');
  const [configMsg, setConfigMsg] = useState('');
  const [payoutMsg, setPayoutMsg] = useState('');
  const [confirmPayout, setConfirmPayout] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  if (config && !configLoaded) {
    setConfigLoaded(true);
    setFeeInput(String(config.platformFeePercent ?? ''));
    setScheduleInput(config.payoutSchedule ?? 'monthly');
  }

  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };
  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Franchisee
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Franchisee account management.
        </p>
      </div>
      <div className="space-y-6">

      {/* Config error */}
      {configError && (
        <div className="border p-4 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450' }} />
          <span style={{ fontSize: '0.875rem', color: '#B85450' }}>{configError.message}</span>
        </div>
      )}

      {/* Config section */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Platform Configuration</h3>
        {configLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!configLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' }}>Platform Fee %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' }}>Payout Schedule</label>
              <select
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
                className={inputCls}
                style={{ ...inputStyle, background: 'transparent' }}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
              </select>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            disabled={setupMutation.isPending || configLoading}
            onClick={() => {
              setConfigMsg('');
              setupMutation.mutate({ token, platformFeePercent: Number(feeInput), payoutSchedule: scheduleInput as 'monthly' | 'weekly' | 'fortnightly' });
            }}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (setupMutation.isPending || configLoading) ? 0.6 : 1 }}
          >
            {setupMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Config</>}
          </button>
          {configMsg && (
            <span className="font-data" style={{ fontSize: '0.625rem', color: configMsg.includes('saved') ? '#5E8B5E' : '#B85450' }}>{configMsg}</span>
          )}
        </div>
      </div>

      {/* Current month revenue split */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Current Month Revenue Split
          <span className="font-data ml-2" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
            {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
        </h3>
        {splitLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!splitLoading && split && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-5" style={statCardStyle}>
              <span style={monoLabel}>Gross Revenue</span>
              <span style={bigNum}>${Number(split.grossRevenue ?? 0).toFixed(2)}</span>
            </div>
            <div className="border p-5" style={statCardStyle}>
              <span style={monoLabel}>Platform Fee ({Number(split.platformFeePercent ?? config?.platformFeePercent ?? 0).toFixed(1)}%)</span>
              <span style={{ ...bigNum, color: '#B85450' }}>${Number(split.platformFee ?? 0).toFixed(2)}</span>
            </div>
            <div className="border p-5" style={statCardStyle}>
              <span style={monoLabel}>Net Payout</span>
              <span style={{ ...bigNum, color: '#5E8B5E' }}>${Number(split.netPayout ?? 0).toFixed(2)}</span>
            </div>
          </div>
        )}
        {!splitLoading && !split && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No revenue data for the current month.</p>
        )}

        {/* Process payout */}
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(24,24,24,0.08)' }}>
          {!confirmPayout ? (
            <button
              onClick={() => setConfirmPayout(true)}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: '#5E8B5E', color: '#F3F2EE', fontSize: '0.75rem' }}
            >
              <DollarSign size={14} /> Process This Month's Payout
            </button>
          ) : (
            <div className="flex items-center gap-3 border p-3" style={{ borderColor: '#C4953A', background: 'rgba(196,149,58,0.08)' }}>
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#C4953A', letterSpacing: '0.06em' }}>
                Process payout for {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}?
              </span>
              <button
                onClick={() => { setPayoutMsg(''); payoutMutation.mutate({ token }); setConfirmPayout(false); }}
                disabled={payoutMutation.isPending}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', opacity: payoutMutation.isPending ? 0.6 : 1 }}
              >
                {payoutMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmPayout(false)}
                className="px-4 py-2 font-data border"
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}
          {payoutMsg && (
            <p className="font-data mt-2" style={{ fontSize: '0.625rem', color: payoutMsg.includes('Payout') ? '#5E8B5E' : '#B85450' }}>{payoutMsg}</p>
          )}
        </div>
      </div>

      {/* Payout history */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Payout History</h3>
        {payoutsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!payoutsLoading && payouts.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No payouts processed yet.</p>
        )}
        {!payoutsLoading && payouts.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Period', 'Gross', 'Fee', 'Net', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map((row: any, i: number) => {
                  const statusColor = row.status === 'paid' ? '#5E8B5E' : '#C4953A';
                  return (
                    <tr key={row.id ?? i} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)', fontFamily: 'Geist Mono', fontSize: '0.625rem', whiteSpace: 'nowrap' as const }}>
                        {row.periodStart ? new Date(row.periodStart).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>${Number(row.grossRevenue ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#B85450' }}>${Number(row.platformFee ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${Number(row.netPayout ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '3px 8px', background: `${statusColor}18`, color: statusColor }}>
                          {row.status ?? 'pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
