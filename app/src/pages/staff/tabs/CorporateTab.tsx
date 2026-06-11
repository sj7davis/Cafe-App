import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
  Briefcase,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function CorporateTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', paymentTerms: 'net_7' as const });
  const [formError, setFormError] = useState('');

  const { data: accounts, isLoading } = trpc.venue.listCorporateAccounts.useQuery({ token }, { enabled: !!token });

  const createAccount = trpc.venue.createCorporateAccount.useMutation({
    onSuccess: () => {
      utils.venue.listCorporateAccounts.invalidate();
      setShowForm(false);
      setForm({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', paymentTerms: 'net_7' });
      setFormError('');
    },
    onError: (e) => setFormError(e.message),
  });

  const termsColors: Record<string, { bg: string; color: string }> = {
    prepaid: { bg: '#dcfce7', color: '#16a34a' },
    net_7: { bg: '#dbeafe', color: '#1d4ed8' },
    net_14: { bg: '#fef9c3', color: '#a16207' },
    net_30: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Corporate Accounts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: showForm ? '#57534e' : '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Company'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Briefcase size={20} />} label="Companies" value={String((accounts ?? []).length)} color="#1c1917" />
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Add Corporate Account</h3>
          {formError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{formError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Company Name</label>
              <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Acme Corp"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Name</label>
              <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Jane Smith"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Phone</label>
              <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+61 4xx xxx xxx"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Email</label>
              <input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="jane@acme.com"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value as any })}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                <option value="prepaid">Prepaid</option>
                <option value="net_7">Net 7</option>
                <option value="net_14">Net 14</option>
                <option value="net_30">Net 30</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  if (!form.companyName || !form.contactName || !form.contactPhone) { setFormError('Company name, contact name and phone are required'); return; }
                  createAccount.mutate({ token, ...form, contactEmail: form.contactEmail || undefined });
                }}
                disabled={createAccount.isPending}
                style={{ width: '100%', background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}
              >
                {createAccount.isPending ? '…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Company</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Contact</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Terms</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (accounts ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No corporate accounts yet</td></tr>
            ) : (accounts ?? []).map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{a.companyName}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{a.contactName}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{a.contactPhone}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{a.contactEmail ?? '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...(termsColors[a.paymentTerms ?? 'net_7'] ?? { bg: '#f5f5f4', color: '#57534e' }) }}>
                    {(a.paymentTerms ?? 'net_7').replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
