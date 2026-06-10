import { useState, useEffect, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, X, AlertCircle,
  DollarSign, Globe, Coffee, BarChart3, TrendingUp, QrCode, Link2, CreditCard, Download, Bell,
  Zap,
} from 'lucide-react';




import QRCode from 'qrcode';


export function IntegrationsTab({ venue }: { venue: { slug: string; name: string } | null }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  // ── Banner state ──────────────────────────────────────────────────────────
  const [connectedBanner, setConnectedBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected') || (params.get('square') === 'connected' ? 'square' : null) || (params.get('xero') === 'connected' ? 'xero' : null);
    if (connected) {
      setConnectedBanner(connected);
      params.delete('connected'); params.delete('square'); params.delete('xero');
      const s = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (s ? '?' + s : ''));
    }
  }, []);

  // ── Square ────────────────────────────────────────────────────────────────
  const { data: squareStatus } = trpc.square.status.useQuery({ token }, { enabled: !!token });
  const { data: oauthData, isLoading: oauthLoading, error: oauthError } = trpc.square.getOAuthUrl.useQuery(
    { token }, { enabled: !!token && !squareStatus?.connected }
  );
  const squareDisconnect = trpc.square.disconnect.useMutation({ onSuccess: () => window.location.reload() });
  const squareSyncMenu = trpc.square.syncMenu.useMutation();
  const squareSyncInventory = trpc.square.syncInventory.useMutation();
  const [squareSyncMenuResult, setSquareSyncMenuResult] = useState<{ imported: number; updated: number; total: number; withImages: number } | null>(null);
  const [squareSyncInvResult, setSquareSyncInvResult] = useState<{ synced: number } | null>(null);
  const squareNotConfigured = oauthError && String(oauthError.message).toLowerCase().includes('not configured');

  // ── Lightspeed ────────────────────────────────────────────────────────────
  const { data: lsConn } = trpc.lightspeed.getConnection.useQuery({ token }, { enabled: !!token });
  const { refetch: fetchLsAuthUrl, isFetching: lsAuthFetching } = trpc.lightspeed.getAuthUrl.useQuery({ token }, { enabled: false });
  const lsSyncMenu = trpc.lightspeed.syncMenu.useMutation();
  const [lsSyncMsg, setLsSyncMsg] = useState('');
  const lsC = lsConn as any;

  async function handleLsConnect() {
    const result = await fetchLsAuthUrl();
    if ((result.data as any)?.url) window.open((result.data as any).url, '_blank');
  }

  // ── Tyro ──────────────────────────────────────────────────────────────────
  const { data: tyroConn } = trpc.tyro.getConnection.useQuery({ token }, { enabled: !!token });
  const tyroConnect = trpc.tyro.connect.useMutation();
  const [tyroForm, setTyroForm] = useState({ apiKey: '', merchantId: '', terminalId: '' });
  const [tyroMsg, setTyroMsg] = useState('');
  const tyroC = tyroConn as any;

  // ── Impos ─────────────────────────────────────────────────────────────────
  const { data: imposConn, refetch: refetchImpos } = trpc.impos.getConnection.useQuery({ token }, { enabled: !!token });
  const imposConnect = trpc.impos.connect.useMutation({ onSuccess: () => refetchImpos() });
  const imposSyncMenu = trpc.impos.syncMenu.useMutation();
  const [imposForm, setImposForm] = useState({ apiKey: '', siteId: '' });
  const [imposConnMsg, setImposConnMsg] = useState('');
  const [imposSyncMsg, setImposSyncMsg] = useState('');
  const imposC = imposConn as any;

  // ── Xero ──────────────────────────────────────────────────────────────────
  const { data: xeroConn, refetch: refetchXeroHub } = trpc.xero.getConnection.useQuery({ token }, { enabled: !!token });
  const { data: xeroAuthUrlData } = trpc.xero.getAuthUrl.useQuery({ token }, { enabled: !!token });
  const xeroDisconnect = trpc.xero.disconnect.useMutation({ onSuccess: () => refetchXeroHub() });
  const xeroSync = trpc.xero.syncRevenue.useMutation();
  const [xeroSyncFrom, setXeroSyncFrom] = useState('');
  const [xeroSyncTo, setXeroSyncTo] = useState('');
  const [xeroMsg, setXeroMsg] = useState('');
  const xeroC = xeroConn as any;

  // ── Google My Business ────────────────────────────────────────────────────
  const { data: gmbConn } = trpc.venue.gmbGetConnection.useQuery({ token }, { enabled: !!token });
  const { refetch: fetchGmbAuthUrl, isFetching: gmbAuthFetching } = trpc.venue.gmbGetAuthUrl.useQuery({ token }, { enabled: false });
  const gmbSyncHours = trpc.venue.gmbSyncHours.useMutation();
  const gmbSyncMenu = trpc.venue.gmbSyncMenu.useMutation();
  const [gmbSyncMsg, setGmbSyncMsg] = useState('');
  const gmbC = gmbConn as any;

  async function handleGmbConnect() {
    const result = await fetchGmbAuthUrl();
    if ((result.data as any)?.url) window.open((result.data as any).url, '_blank');
  }

  // ── Stripe Connect ────────────────────────────────────────────────────────
  const stripeStatusQuery = trpc.franchisee.getConnectStatus.useQuery({ token }, { enabled: !!token });
  const stripeBalanceQuery = trpc.franchisee.getPayoutBalance.useQuery({ token }, { enabled: !!token });
  const stripeConnectMut = trpc.franchisee.createConnectAccountLink.useMutation();
  const franchiseeSetupMut = trpc.franchisee.setup.useMutation();
  const [stripeConnecting, setStripeConnecting] = useState(false);

  async function handleStripeConnect() {
    if (!token) return;
    setStripeConnecting(true);
    try {
      const result = await stripeConnectMut.mutateAsync({ token });
      window.location.href = result.url;
    } catch (err: any) {
      // If franchisee config not yet set up, auto-create with defaults then retry
      if (err?.message?.includes('Set up franchisee config') || err?.data?.code === 'NOT_FOUND') {
        try {
          await franchiseeSetupMut.mutateAsync({ token });
          const result = await stripeConnectMut.mutateAsync({ token });
          window.location.href = result.url;
        } catch (e2: any) {
          showToast(e2?.message || 'Could not start Stripe onboarding', false);
          setStripeConnecting(false);
        }
      } else {
        showToast(err?.message || 'Could not start Stripe onboarding', false);
        setStripeConnecting(false);
      }
    }
  }

  // Refetch Connect status on return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'stripe' || params.get('reauth') === '1') {
      stripeStatusQuery.refetch();
      stripeBalanceQuery.refetch();
    }
  }, []);

  // ── Automation triggers (AUTO-04) ────────────────────────────────────────
  const { data: automationSettings, refetch: refetchAutomation } = trpc.venue.getAutomationSettings.useQuery(
    { token }, { enabled: !!token }
  );
  const updateAutomation = trpc.venue.updateAutomationSettings.useMutation({
    onSuccess: () => { refetchAutomation(); showToast('Automation settings saved'); },
    onError: (e) => showToast(e.message, false),
  });
  const automationValues = automationSettings ?? { reEngagement: true, birthday: true, passExpiry: true };

  function handleAutomationToggle(key: 'reEngagement' | 'birthday' | 'passExpiry') {
    updateAutomation.mutate({
      token,
      ...automationValues,
      [key]: !automationValues[key],
    });
  }

  // ── QR Code ───────────────────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!venue?.slug) return;
    QRCode.toDataURL(`${window.location.origin}/v/${venue.slug}`, { width: 300, margin: 2 })
      .then(setQrDataUrl).catch(() => {});
  }, [venue?.slug]);

  // ── Styles helpers ────────────────────────────────────────────────────────
  const cardStyle: CSSProperties = {
    background: 'var(--op-card-bg)',
    border: '1px solid var(--op-card-border)',
    borderRadius: 'var(--op-radius-card)' as any,
    padding: '1.25rem',
    boxShadow: 'var(--op-shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };
  const sectionHeadStyle: CSSProperties = {
    fontWeight: 400, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--op-text-secondary)',
    marginBottom: '0.5rem', marginTop: '0.25rem',
  };
  const pillConnected: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(94,139,94,0.12)', color: '#5E8B5E',
    fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '2px 8px', borderRadius: 99,
  };
  const pillNotConnected: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(24,24,24,0.06)', color: 'var(--op-text-secondary)',
    fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '2px 8px', borderRadius: 99,
  };
  const primaryBtn: CSSProperties = {
    background: '#181818', color: '#F3F2EE', fontSize: '0.75rem',
    border: 'none', padding: '6px 14px', cursor: 'pointer',
    fontFamily: 'Geist Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
  const ghostBtn: CSSProperties = {
    background: 'transparent', color: '#B85450', fontSize: '0.625rem',
    border: '1px solid rgba(24,24,24,0.15)', padding: '6px 14px', cursor: 'pointer',
    fontFamily: 'Geist Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  const origin = window.location.origin;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Integrations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Connect Stripe, Square, and configure automation.
        </p>
      </div>
      <div className="space-y-8">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#5E8B5E' : '#B85450', color: '#fff',
          padding: '10px 18px', fontSize: '0.8125rem', borderRadius: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.16)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Connected banner */}
      {connectedBanner && (
        <div className="flex items-center justify-between p-4 border" style={{ borderColor: '#5E8B5E', background: 'rgba(94,139,94,0.08)' }}>
          <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Check size={10} className="inline mr-1" />
            {connectedBanner.charAt(0).toUpperCase() + connectedBanner.slice(1)} connected successfully
          </span>
          <button onClick={() => setConnectedBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Section 1: POS Systems ─────────────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>POS Systems</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Square */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={18} style={{ color: '#F3F2EE' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Square POS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Sync menu, inventory &amp; orders</p>
                </div>
              </div>
              {squareStatus?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {squareNotConfigured && (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>
                <AlertCircle size={9} className="inline mr-1" /> Add SQUARE_APP_ID &amp; SQUARE_APP_SECRET to env vars.
              </p>
            )}
            {squareStatus?.connected ? (
              <div style={{ borderTop: '1px solid rgba(24,24,24,0.06)', paddingTop: 12 }}>
                {/* One-way import notice */}
                <p style={{ fontSize: 11, color: 'var(--op-text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                  ↓ <strong>Import from Square only</strong> — changes in B1 are not pushed back to Square.
                  Includes names, prices, descriptions, categories and photos.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button style={{ ...primaryBtn, opacity: squareSyncMenu.isPending ? 0.6 : 1 }}
                    disabled={squareSyncMenu.isPending}
                    onClick={() => {
                      setSquareSyncMenuResult(null);
                      squareSyncMenu.mutate({ token }, {
                        onSuccess: (d: any) => {
                          setSquareSyncMenuResult(d);
                          const imgNote = d.withImages > 0 ? ` (${d.withImages} with photos)` : '';
                          showToast(`Imported ${d.imported} new · ${d.updated ?? 0} updated${imgNote}`);
                        },
                        onError: (e: any) => showToast(e.message, false),
                      });
                    }}>
                    {squareSyncMenu.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    {squareSyncMenu.isPending ? 'Importing from Square…' : 'Import Menu from Square'}
                  </button>
                  <button style={{ ...primaryBtn, opacity: squareSyncInventory.isPending ? 0.6 : 1 }}
                    disabled={squareSyncInventory.isPending}
                    onClick={() => {
                      setSquareSyncInvResult(null);
                      squareSyncInventory.mutate({ token }, {
                        onSuccess: (d: any) => { setSquareSyncInvResult(d); showToast(`Stock levels updated for ${d.synced} items`); },
                        onError: (e: any) => showToast(e.message, false),
                      });
                    }}>
                    {squareSyncInventory.isPending ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                    {squareSyncInventory.isPending ? 'Importing stock…' : 'Import Stock Levels'}
                  </button>
                  <button style={{ ...ghostBtn }} disabled={squareDisconnect.isPending}
                    onClick={() => squareDisconnect.mutate({ token })}>
                    Disconnect
                  </button>
                </div>
                {squareSyncMenuResult && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(94,139,94,0.08)', border: '1px solid rgba(94,139,94,0.2)', borderRadius: 6, fontSize: 12, color: '#3D7A3D', lineHeight: 1.6 }}>
                    ✓ <strong>{squareSyncMenuResult.imported}</strong> new items imported
                    {(squareSyncMenuResult.updated ?? 0) > 0 && <> · <strong>{squareSyncMenuResult.updated}</strong> existing updated</>}
                    {(squareSyncMenuResult.withImages ?? 0) > 0
                      ? <> · <strong>{squareSyncMenuResult.withImages}</strong> photos imported from Square</>
                      : <> · no photos found in Square catalog</>}
                  </div>
                )}
                {squareSyncInvResult && (
                  <p style={{ marginTop: 8, fontSize: 11, color: '#3D7A3D' }}>
                    ✓ Stock levels updated for <strong>{squareSyncInvResult.synced}</strong> items
                  </p>
                )}
              </div>
            ) : squareNotConfigured ? null : (
              <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, opacity: oauthLoading ? 0.6 : 1 }}
                  disabled={oauthLoading || !oauthData?.url}
                  onClick={() => { if (oauthData?.url) window.open(oauthData.url, '_blank'); }}>
                  {oauthLoading ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Connect with Square
                </button>
              </div>
            )}
          </div>

          {/* Lightspeed */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#FF6600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Lightspeed</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Kounta-powered restaurant POS</p>
                </div>
              </div>
              {lsC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {lsC?.connected ? (
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {lsC.lastSyncAt && <p className="font-data w-full" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Last sync: {new Date(lsC.lastSyncAt).toLocaleDateString()}</p>}
                <button style={{ ...primaryBtn, opacity: lsSyncMenu.isPending ? 0.6 : 1 }} disabled={lsSyncMenu.isPending}
                  onClick={() => { setLsSyncMsg(''); lsSyncMenu.mutate({ token }, { onSuccess: () => { setLsSyncMsg('Menu synced!'); showToast('Lightspeed menu synced'); }, onError: (e) => { setLsSyncMsg(e.message); showToast(e.message, false); } }); }}>
                  {lsSyncMenu.isPending ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
                  Sync Menu
                </button>
                <button style={ghostBtn} onClick={() => { if (window.confirm('Disconnect Lightspeed?')) window.location.reload(); }}>Disconnect</button>
                {lsSyncMsg && <span className="font-data self-center" style={{ fontSize: '0.5625rem', color: lsSyncMsg === 'Menu synced!' ? '#5E8B5E' : '#B85450' }}>{lsSyncMsg}</span>}
              </div>
            ) : (
              <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, background: '#FF6600', opacity: lsAuthFetching ? 0.6 : 1 }} disabled={lsAuthFetching} onClick={handleLsConnect}>
                  {lsAuthFetching ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Connect Lightspeed
                </button>
              </div>
            )}
          </div>

          {/* Tyro */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#003087', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Tyro EFTPOS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Terminal reconciliation &amp; settlements</p>
                </div>
              </div>
              {tyroC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {tyroC?.connected ? (
              <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>Terminal: {tyroC.terminalId}</p>
              </div>
            ) : (
              <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {[
                  { label: 'API Key', key: 'apiKey', placeholder: 'tyro-api-key' },
                  { label: 'Merchant ID', key: 'merchantId', placeholder: 'MID-123456' },
                  { label: 'Terminal ID', key: 'terminalId', placeholder: 'TID-001' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={(tyroForm as any)[f.key]}
                      onChange={e => setTyroForm({ ...tyroForm, [f.key]: e.target.value })}
                      style={{ width: '100%', fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px', boxSizing: 'border-box' as const }} />
                  </div>
                ))}
                {tyroMsg && <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>{tyroMsg}</p>}
                <button style={{ ...primaryBtn, background: '#003087', opacity: (!tyroForm.apiKey || !tyroForm.merchantId || !tyroForm.terminalId || tyroConnect.isPending) ? 0.5 : 1 }}
                  disabled={tyroConnect.isPending || !tyroForm.apiKey || !tyroForm.merchantId || !tyroForm.terminalId}
                  onClick={() => { setTyroMsg(''); tyroConnect.mutate({ token, ...tyroForm }, { onSuccess: () => showToast('Tyro connected'), onError: (e) => { setTyroMsg(e.message); showToast(e.message, false); } }); }}>
                  {tyroConnect.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Connect Tyro
                </button>
              </div>
            )}
          </div>

          {/* Impos */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Coffee size={18} style={{ color: '#F3F2EE' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Impos POS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Sync menu &amp; sales from Impos</p>
                </div>
              </div>
              {imposC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {imposC?.connected ? (
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {imposC.lastSyncAt && <p className="font-data w-full" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Last sync: {new Date(imposC.lastSyncAt).toLocaleDateString()}</p>}
                <button style={{ ...primaryBtn, opacity: imposSyncMenu.isPending ? 0.6 : 1 }} disabled={imposSyncMenu.isPending}
                  onClick={() => { setImposSyncMsg(''); imposSyncMenu.mutate({ token }, { onSuccess: () => { setImposSyncMsg('Synced!'); showToast('Impos menu synced'); }, onError: (e) => { setImposSyncMsg(e.message); showToast(e.message, false); } }); }}>
                  {imposSyncMenu.isPending ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
                  Sync Menu
                </button>
                <button style={ghostBtn} onClick={() => { if (window.confirm('Disconnect Impos?')) imposConnect.mutate({ token, apiKey: '', siteId: '' }); }}>Disconnect</button>
                {imposSyncMsg && <span className="font-data self-center" style={{ fontSize: '0.5625rem', color: imposSyncMsg === 'Synced!' ? '#5E8B5E' : '#B85450' }}>{imposSyncMsg}</span>}
              </div>
            ) : (
              <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {[
                  { label: 'API Key', key: 'apiKey', placeholder: 'impos-api-key' },
                  { label: 'Site ID', key: 'siteId', placeholder: 'SITE-001' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={(imposForm as any)[f.key]}
                      onChange={e => setImposForm({ ...imposForm, [f.key]: e.target.value })}
                      style={{ width: '100%', fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px', boxSizing: 'border-box' as const }} />
                  </div>
                ))}
                {imposConnMsg && <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>{imposConnMsg}</p>}
                <button style={{ ...primaryBtn, opacity: (!imposForm.apiKey || !imposForm.siteId || imposConnect.isPending) ? 0.5 : 1 }}
                  disabled={imposConnect.isPending || !imposForm.apiKey || !imposForm.siteId}
                  onClick={() => { setImposConnMsg(''); imposConnect.mutate({ token, ...imposForm }, { onSuccess: () => showToast('Impos connected'), onError: (e) => { setImposConnMsg(e.message); showToast(e.message, false); } }); }}>
                  {imposConnect.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Connect Impos
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Section 2: Accounting ──────────────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Accounting</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Xero */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DollarSign size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Xero</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Sync revenue &amp; invoices to Xero</p>
                </div>
              </div>
              {xeroC?.isConnected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {xeroC?.isConnected ? (
              <div className="pt-1 space-y-3" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {xeroC.updatedAt && <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Last sync: {new Date(xeroC.updatedAt).toLocaleDateString()}</p>}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>From</label>
                    <input type="date" value={xeroSyncFrom} onChange={e => setXeroSyncFrom(e.target.value)}
                      style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px' }} />
                  </div>
                  <div>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>To</label>
                    <input type="date" value={xeroSyncTo} onChange={e => setXeroSyncTo(e.target.value)}
                      style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px' }} />
                  </div>
                  <button style={{ ...primaryBtn, opacity: (!xeroSyncFrom || !xeroSyncTo || xeroSync.isPending) ? 0.5 : 1 }}
                    disabled={xeroSync.isPending || !xeroSyncFrom || !xeroSyncTo}
                    onClick={() => { setXeroMsg(''); xeroSync.mutate({ token, fromDate: xeroSyncFrom, toDate: xeroSyncTo }, { onSuccess: (d: any) => { setXeroMsg(`Synced ${d.invoicesCreated ?? 0} invoices`); showToast('Xero sync complete'); }, onError: (e) => { setXeroMsg(e.message); showToast(e.message, false); } }); }}>
                    {xeroSync.isPending ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                    Sync Revenue
                  </button>
                </div>
                {xeroMsg && <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>{xeroMsg}</p>}
                <button style={ghostBtn} disabled={xeroDisconnect.isPending} onClick={() => xeroDisconnect.mutate({ token })}>Disconnect</button>
              </div>
            ) : (
              <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, background: '#13B5EA' }}
                  onClick={() => { if ((xeroAuthUrlData as any)?.url) window.open((xeroAuthUrlData as any).url, '_blank'); }}>
                  <Link2 size={12} /> Connect Xero
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Section 3: Payments ───────────────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Payments</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Stripe Connect */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#635BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Stripe Connect</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Receive payouts from online orders</p>
                </div>
              </div>
              {stripeStatusQuery.data?.ready
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>{stripeStatusQuery.data?.accountId ? 'Onboarding incomplete' : 'Not connected'}</span>}
            </div>

            <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
              {stripeStatusQuery.data?.ready ? (
                <div className="space-y-2">
                  {/* Payout balance card */}
                  {stripeBalanceQuery.data?.connected && (
                    <div style={{ background: 'rgba(94,139,94,0.06)', border: '1px solid rgba(94,139,94,0.15)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E8B5E' }}>Available Balance</span>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--op-text)' }}>
                          ${stripeBalanceQuery.data.available.toFixed(2)} <span style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{(stripeBalanceQuery.data.currency ?? 'aud').toUpperCase()}</span>
                        </span>
                      </div>
                      {(stripeBalanceQuery.data.pending ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Pending</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>${stripeBalanceQuery.data.pending.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(94,139,94,0.12)', paddingTop: 4, marginTop: 2 }}>
                        <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Last payout</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--op-text-secondary)' }}>
                          {stripeBalanceQuery.data.lastPayoutDate
                            ? new Date(stripeBalanceQuery.data.lastPayoutDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'None yet'}
                        </span>
                      </div>
                    </div>
                  )}
                  {stripeBalanceQuery.isLoading && (
                    <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}><Loader2 size={10} className="inline animate-spin mr-1" />Loading balance…</p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stripeStatusQuery.data?.message && !stripeStatusQuery.data?.ready && stripeStatusQuery.data?.accountId && (
                    <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>
                      <AlertCircle size={9} className="inline mr-1" />{stripeStatusQuery.data.message}
                    </p>
                  )}
                  <button
                    style={{ ...primaryBtn, background: '#635BFF', opacity: stripeConnecting ? 0.6 : 1 }}
                    disabled={stripeConnecting}
                    onClick={handleStripeConnect}
                  >
                    {stripeConnecting ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                    {stripeStatusQuery.data?.accountId ? 'Continue onboarding' : 'Connect Stripe'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Section 4: Delivery Platforms ─────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Delivery Platforms</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {[
            { id: 'uber-eats', label: 'Uber Eats', fee: '30%', color: '#06C167', textColor: '#fff', webhookPath: `/api/webhooks/uber-eats?venue=YOUR_VENUE_ID` },
            { id: 'doordash', label: 'DoorDash', fee: '25%', color: '#FF3008', textColor: '#fff', webhookPath: `/api/webhooks/doordash?venue=YOUR_VENUE_ID` },
            { id: 'menulog', label: 'Menulog', fee: '12%', color: '#E84E1B', textColor: '#fff', webhookPath: `/api/webhooks/menulog?venue=YOUR_VENUE_ID` },
          ].map(platform => {
            const webhookUrl = `${origin}${platform.webhookPath}`;
            return (
              <div key={platform.id} style={cardStyle}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 36, height: 36, background: platform.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Globe size={18} style={{ color: platform.textColor }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>{platform.label}</p>
                      <span style={{ ...pillNotConnected, background: 'rgba(24,24,24,0.06)', color: 'var(--op-text-secondary)' }}>
                        Platform fee: {platform.fee}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                  <label className="font-data block" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Webhook URL</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={webhookUrl}
                      style={{ flex: 1, fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: 'var(--op-text-secondary)', background: 'rgba(24,24,24,0.03)', border: '1px solid rgba(24,24,24,0.10)', padding: '5px 8px', minWidth: 0 }} />
                    <button style={{ ...primaryBtn, flexShrink: 0 }}
                      onClick={() => { navigator.clipboard.writeText(webhookUrl).then(() => showToast('Webhook URL copied')).catch(() => showToast('Copy failed', false)); }}>
                      Copy
                    </button>
                  </div>
                  <p className="font-data" style={{ fontSize: '0.5rem', color: 'var(--op-text-secondary)', lineHeight: 1.6 }}>
                    Paste this URL in your {platform.label} merchant dashboard under Developer Settings → Webhooks. Replace YOUR_VENUE_ID with your venue ID.
                  </p>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* ── Section 4: Google My Business ─────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Business Listings</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Globe size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Google My Business</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Sync hours &amp; menu to your listing</p>
                </div>
              </div>
              {gmbC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {gmbC?.connected ? (
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, opacity: gmbSyncHours.isPending ? 0.6 : 1 }} disabled={gmbSyncHours.isPending}
                  onClick={() => { setGmbSyncMsg(''); gmbSyncHours.mutate({ token }, { onSuccess: () => { setGmbSyncMsg('Hours synced!'); showToast('Hours synced to GMB'); }, onError: (e) => { setGmbSyncMsg(e.message); showToast(e.message, false); } }); }}>
                  {gmbSyncHours.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Sync Hours
                </button>
                <button style={{ ...primaryBtn, background: '#4285F4', opacity: gmbSyncMenu.isPending ? 0.6 : 1 }} disabled={gmbSyncMenu.isPending}
                  onClick={() => { setGmbSyncMsg(''); gmbSyncMenu.mutate({ token }, { onSuccess: () => { setGmbSyncMsg('Menu synced!'); showToast('Menu synced to GMB'); }, onError: (e) => { setGmbSyncMsg(e.message); showToast(e.message, false); } }); }}>
                  {gmbSyncMenu.isPending ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
                  Sync Menu
                </button>
                {gmbSyncMsg && <span className="font-data self-center" style={{ fontSize: '0.5625rem', color: gmbSyncMsg.includes('synced') ? '#5E8B5E' : '#B85450' }}>{gmbSyncMsg}</span>}
              </div>
            ) : (
              <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, background: '#4285F4', opacity: gmbAuthFetching ? 0.6 : 1 }} disabled={gmbAuthFetching} onClick={handleGmbConnect}>
                  {gmbAuthFetching ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Connect Google
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Section 5: Automation Triggers (AUTO-04) ───────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Automation Triggers</p>
        <div style={{ ...cardStyle, maxWidth: 560 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: '#5E8B8B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={18} style={{ color: '#F3F2EE' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Automated Marketing</p>
              <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Daily triggers sent to opted-in customers</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(24,24,24,0.06)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { key: 'reEngagement' as const, label: 'Re-engagement', desc: 'Email/SMS customers who haven\'t ordered in 30 days' },
              { key: 'birthday' as const, label: 'Birthday Greeting', desc: 'Birthday message to customers who opted in' },
              { key: 'passExpiry' as const, label: 'Pass Expiry Nudge', desc: 'SMS when a subscription pass has 1 credit remaining' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between" style={{ gap: 12 }}>
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--op-text)', margin: 0 }}>{label}</p>
                  <p className="font-data" style={{ fontSize: '0.5rem', color: 'var(--op-text-secondary)', margin: 0 }}>{desc}</p>
                </div>
                <button
                  onClick={() => handleAutomationToggle(key)}
                  disabled={updateAutomation.isPending}
                  style={{
                    width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: automationValues[key] ? '#5E8B5E' : 'rgba(24,24,24,0.15)',
                    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}
                  aria-label={`Toggle ${label}`}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: automationValues[key] ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            ))}
          </div>
          <p className="font-data" style={{ fontSize: '0.5rem', color: 'var(--op-text-secondary)', marginTop: 4 }}>
            Triggers only send to customers with marketing opt-in enabled.
          </p>
        </div>
      </div>

      {/* ── QR Code ──────────────────────────────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Venue QR Code</p>
        <div style={{ ...cardStyle, maxWidth: 420 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <QrCode size={18} style={{ color: '#F3F2EE' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--op-text)', marginBottom: 2 }}>Ordering QR Code</p>
              <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Customers scan to open your ordering page</p>
            </div>
          </div>
          <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
            {qrDataUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <img src={qrDataUrl} alt="QR code" style={{ width: 160, height: 160, border: '1px solid rgba(24,24,24,0.08)' }} />
                <p className="font-data" style={{ fontSize: '0.5rem', color: 'var(--op-text-secondary)' }}>{origin}/v/{venue?.slug}</p>
                <button style={primaryBtn} onClick={() => { if (!qrDataUrl || !venue?.slug) return; const a = document.createElement('a'); a.href = qrDataUrl; a.download = `${venue.slug}-qr.png`; a.click(); }}>
                  <Download size={12} /> Download PNG
                </button>
              </div>
            ) : venue?.slug ? (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Generating…</p>
            ) : (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>No venue configured.</p>
            )}
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
