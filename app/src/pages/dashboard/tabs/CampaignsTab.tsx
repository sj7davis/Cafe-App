import { useState, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Plus, Send, Trash2,
} from 'lucide-react';




import { DS } from '../shared';


export function CampaignsTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery({ token }, { enabled: !!token });
  const { data: birthdayVouchers } = trpc.venue.getBirthdayVouchers.useQuery({ token, limit: 50 }, { enabled: !!token });
  const createCampaign = trpc.campaigns.create.useMutation({ onSuccess: () => { utils.campaigns.list.invalidate(); setShowForm(false); resetForm(); } });
  const sendCampaign = trpc.campaigns.send.useMutation({ onSuccess: () => utils.campaigns.list.invalidate() });
  const deleteCampaign = trpc.campaigns.delete.useMutation({ onSuccess: () => utils.campaigns.list.invalidate() });

  const emptyForm = { name: '', type: 'email' as 'email' | 'sms', segment: 'all', subject: '', body: '' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const resetForm = () => setForm(emptyForm);

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%' };
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  const segmentLabel: Record<string, string> = { all: 'All Customers', active_30d: 'Active last 30 days', high_value: 'High value (≥100 pts)' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Campaigns
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Email marketing campaigns.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex justify-between items-center">
        <h2 style={DS.sectionTitle}>Campaigns</h2>
        <button onClick={() => { setShowForm(true); resetForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

      {showForm && (
        <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 12 }}>New Campaign</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Summer Promo" /></div>
            <div>
              <label style={labelStyle}>Segment</label>
              <select value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} style={inputStyle}>
                <option value="all">All Customers</option>
                <option value="active_30d">Active last 30 days</option>
                <option value="high_value">High value (≥100 pts)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Type</label>
              <div className="flex gap-6">
                {(['email', 'sms'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 14, color: 'var(--op-text)' }}>
                    <input type="radio" name="camp-type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} style={{ accentColor: '#181818' }} />
                    {t === 'email' ? 'Email' : 'SMS'}
                  </label>
                ))}
              </div>
            </div>
            {form.type === 'email' && (
              <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Subject</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={inputStyle} placeholder="Subject line" /></div>
            )}
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Body *</label><textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Message content…" /></div>
          </div>
          <div className="flex gap-3">
            <button
              disabled={createCampaign.isPending}
              onClick={() => {
                if (!form.name || !form.body) { setMsg('Error: Name and body required'); return; }
                setMsg('');
                createCampaign.mutate({ token, name: form.name, type: form.type, segment: form.segment as 'all' | 'active_30d' | 'high_value', subject: form.subject || undefined, body: form.body });
              }}
              style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
            >{createCampaign.isPending ? 'Saving…' : 'Save Draft'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
      {!isLoading && (!campaigns || (campaigns as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No campaigns yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(campaigns as any[] | undefined)?.map((c) => (
          <div key={c.id} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <div className="flex items-start justify-between gap-4">
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>{c.name}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: c.type === 'email' ? 'rgba(37,99,235,0.10)' : 'rgba(196,149,58,0.12)', color: c.type === 'email' ? '#2563EB' : '#C4953A', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{c.type}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: c.status === 'sent' ? 'rgba(94,139,94,0.12)' : 'rgba(24,24,24,0.06)', color: c.status === 'sent' ? '#5E8B5E' : '#5E5E5E', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{c.status}</span>
                  <span style={{ fontSize: 12, color: 'var(--op-text-secondary)' }}>{segmentLabel[c.segment] || c.segment}</span>
                </div>
                {c.sentAt && <p style={{ fontSize: 11, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Sent: {new Date(c.sentAt).toLocaleString()}</p>}
                {c.recipientCount != null && <p style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Recipients: {c.recipientCount}</p>}
              </div>
              <div className="flex gap-2 items-center">
                {c.status === 'draft' && (
                  <>
                    <button
                      disabled={sendCampaign.isPending}
                      onClick={() => {
                        if (window.confirm('This will send to all matching customers. Continue?')) {
                          sendCampaign.mutate({ token, id: c.id });
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 font-button"
                      style={{ background: '#5E8B8B', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}
                    >
                      <Send size={12} /> Send
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this campaign?')) deleteCampaign.mutate({ token, id: c.id }); }}
                      className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                      style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}
                    ><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Birthday Vouchers Section */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Birthday Vouchers</h2>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 16 }}>
          Auto-generated $10 discount codes sent with birthday greetings.
        </p>
        {!birthdayVouchers || (birthdayVouchers as any[]).length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--op-text-secondary)' }}>No birthday vouchers generated yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(24,24,24,0.08)' }}>
                  {['Code', 'Value', 'Uses', 'Expires', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(birthdayVouchers as any[]).map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.04)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'Geist Mono', fontWeight: 600, color: 'var(--op-text)' }}>{v.code}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--op-text)' }}>${Number(v.value).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--op-text)' }}>{v.usedCount ?? 0} / {v.maxUses ?? 1}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--op-text-secondary)' }}>{v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--op-text-secondary)' }}>{new Date(v.createdAt).toLocaleDateString()}</td>
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
