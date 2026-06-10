import { useState } from 'react';
import { trpc } from '@/providers/trpc';





import { DS } from '../shared';


export function PassesTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  // ── Pass config ──────────────────────────────────────────
  const { data: passConfig, refetch: refetchConfig } = trpc.venue.getPassConfig.useQuery(
    { venueId },
    { enabled: !!venueId }
  );

  const [configForm, setConfigForm] = useState({
    name: '',
    totalCredits: '',
    price: '',
  });
  const [configMessage, setConfigMessage] = useState('');

  // Pre-fill form when config loads
  const configLoaded = !!passConfig;
  if (configLoaded && !configForm.name && passConfig.name) {
    setConfigForm({
      name: passConfig.name,
      totalCredits: String(passConfig.totalCredits),
      price: String(passConfig.price),
    });
  }

  const upsertConfig = trpc.venue.upsertPassConfig.useMutation({
    onSuccess: () => {
      setConfigMessage('Pass configuration saved!');
      refetchConfig();
    },
    onError: (err) => setConfigMessage(err.message),
  });

  const handleSaveConfig = () => {
    const credits = parseInt(configForm.totalCredits, 10);
    const price = parseFloat(configForm.price);
    if (!configForm.name || isNaN(credits) || credits <= 0 || isNaN(price) || price <= 0) {
      setConfigMessage('Please fill in all fields with valid values');
      return;
    }
    setConfigMessage('');
    upsertConfig.mutate({ token, name: configForm.name, totalCredits: credits, price });
  };

  // ── Customer pass purchase ────────────────────────────────
  const [customerForm, setCustomerForm] = useState({ phone: '', name: '' });
  const [purchaseMessage, setPurchaseMessage] = useState('');

  const purchasePass = trpc.venue.purchasePass.useMutation({
    onSuccess: (data) => {
      setPurchaseMessage(`Pass created! ${data.remainingCredits} credits issued.`);
      setCustomerForm({ phone: '', name: '' });
    },
    onError: (err) => setPurchaseMessage(err.message),
  });

  const handlePurchase = () => {
    if (!customerForm.phone || !customerForm.name) {
      setPurchaseMessage('Phone and name are required');
      return;
    }
    setPurchaseMessage('');
    purchasePass.mutate({ token, phone: customerForm.phone, name: customerForm.name });
  };

  const inputStyle = {
    padding: '8px 12px', borderRadius: 'var(--op-radius-input)', border: '1px solid var(--op-card-border)',
    fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%',
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: 'var(--op-text-muted)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Coffee Passes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Subscription pass configuration and active passes.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Pass Configuration */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h2 style={DS.sectionTitle}>
          Pass Configuration
        </h2>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 16 }}>
          Define the pass your customers purchase (e.g. "10 coffees for $45").
          {passConfig && (
            <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 600 }}>
              Currently active: {passConfig.name} — {passConfig.totalCredits} credits for ${Number(passConfig.price).toFixed(2)}
            </span>
          )}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Pass Name *</label>
            <input type="text" placeholder="e.g. Coffee Pass" value={configForm.name}
              onChange={e => setConfigForm({ ...configForm, name: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Credits *</label>
            <input type="number" min="1" step="1" placeholder="e.g. 10" value={configForm.totalCredits}
              onChange={e => setConfigForm({ ...configForm, totalCredits: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Price ($) *</label>
            <input type="number" min="0.01" step="0.01" placeholder="e.g. 45.00" value={configForm.price}
              onChange={e => setConfigForm({ ...configForm, price: e.target.value })} style={inputStyle} />
          </div>
        </div>
        {configMessage && (
          <p style={{ fontSize: 13, marginBottom: 8, color: configMessage.includes('saved') ? '#16a34a' : '#B85450' }}>
            {configMessage}
          </p>
        )}
        <button onClick={handleSaveConfig} disabled={upsertConfig.isPending}
          style={{ padding: '10px 20px', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: upsertConfig.isPending ? 0.7 : 1 }}>
          {upsertConfig.isPending ? 'Saving...' : passConfig ? 'Update Pass Config' : 'Save Pass Config'}
        </button>
      </div>

      {/* Issue Pass to Customer */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 4 }}>
          Issue Pass to Customer
        </h2>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 16 }}>
          Record a pass purchase for a customer by phone number.
        </p>
        {!passConfig && (
          <p style={{ fontSize: 13, color: '#B85450', marginBottom: 12 }}>
            Configure a pass above before issuing passes to customers.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Customer Phone *</label>
            <input type="tel" placeholder="e.g. 0412345678" value={customerForm.phone}
              onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
              style={inputStyle} disabled={!passConfig} />
          </div>
          <div>
            <label style={labelStyle}>Customer Name *</label>
            <input type="text" placeholder="e.g. Jane Smith" value={customerForm.name}
              onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
              style={inputStyle} disabled={!passConfig} />
          </div>
        </div>
        {purchaseMessage && (
          <p style={{ fontSize: 13, marginBottom: 8, color: purchaseMessage.includes('created') ? '#16a34a' : '#B85450' }}>
            {purchaseMessage}
          </p>
        )}
        <button onClick={handlePurchase} disabled={purchasePass.isPending || !passConfig}
          style={{ padding: '10px 20px', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: purchasePass.isPending || !passConfig ? 0.6 : 1 }}>
          {purchasePass.isPending ? 'Issuing...' : 'Issue Pass'}
        </button>
      </div>

      </div>
    </div>
  );
}
