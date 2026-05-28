import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Loader2, Shield, Coffee, DollarSign, Users, Activity, Check, X } from 'lucide-react';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'venues'>('overview');

  const loginMutation = trpc.platformAdmin.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('b1-platform-admin-token', data.token);
      setToken(data.token);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const { data: admin } = trpc.platformAdmin.me.useQuery(
    token ? { token } : { token: "" },
    { enabled: !!token, retry: false }
  );

  const { data: stats } = trpc.platformAdmin.stats.useQuery(
    token ? { token } : { token: "" },
    { enabled: !!token && !!admin }
  );

  const { data: allVenues } = trpc.platformAdmin.listVenues.useQuery(
    token ? { token } : { token: "" },
    { enabled: !!token && !!admin }
  );

  const updateVenue = trpc.platformAdmin.updateVenue.useMutation({
    onSuccess: () => window.location.reload(),
  });

  // ── Login form ──────────────────────────────────────────────────────────────
  if (!token || !admin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#B85450', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield size={22} color="#FFFFFF" />
            </div>
            <h1 style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', color: '#09090B', margin: '0 0 6px' }}>Platform Admin</h1>
            <p style={{ fontSize: 13, color: '#71717A', margin: 0 }}>B1 Platform Internal</p>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7', padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#09090B', marginBottom: 6 }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#09090B', marginBottom: 6 }}>Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                />
              </div>
            </div>
            <button
              onClick={() => loginMutation.mutate({ email, password })}
              disabled={loginMutation.isPending}
              style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 8, border: 'none', background: '#5E8B8B', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: loginMutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loginMutation.isPending ? 0.7 : 1 }}
              onMouseEnter={e => { if (!loginMutation.isPending) e.currentTarget.style.background = '#4a7070'; }}
              onMouseLeave={e => { if (!loginMutation.isPending) e.currentTarget.style.background = '#5E8B8B'; }}
            >
              {loginMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#71717A', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#09090B'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; }}
            >
              <ArrowLeft size={14} /> Back to Platform
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #E4E4E7', background: '#18181B', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#B85450', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Platform Admin</div>
              <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>
                {admin.name} — {admin.role?.toUpperCase()}
              </div>
            </div>
          </div>
          <button
            onClick={() => { localStorage.removeItem('b1-platform-admin-token'); window.location.reload(); }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 14px', color: '#A1A1AA', fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; }}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E4E4E7', padding: '0 24px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 4 }}>
          {[{ id: 'overview', label: 'Overview', icon: Activity }, { id: 'venues', label: 'All Venues', icon: Coffee }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '14px 16px',
                fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#09090B' : '#71717A',
                background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#5E8B8B' : 'transparent'}`,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#09090B'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#71717A'; }}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Overview */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Venues', value: stats.totalVenues, icon: Coffee },
                { label: 'Active', value: stats.activeVenues, icon: Check },
                { label: 'In Trial', value: stats.trialVenues, icon: Activity },
                { label: 'Total Orders', value: stats.totalOrders, icon: DollarSign },
                { label: 'Menu Items', value: stats.totalMenuItems, icon: Users },
              ].map((s) => (
                <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 12, padding: '20px 20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <s.icon size={16} style={{ color: '#5E8B8B', marginBottom: 10 }} />
                  <span style={{ fontSize: 12, color: '#71717A', display: 'block', marginBottom: 4 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 24, color: '#09090B' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {stats.tierBreakdown && stats.tierBreakdown.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 style={{ fontWeight: 600, fontSize: 15, color: '#09090B', margin: '0 0 16px' }}>Subscriptions by Tier</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.tierBreakdown.map((t: any) => (
                    <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#71717A', width: 80, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.tier}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F4F4F5', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (t.count / Math.max(stats.totalVenues, 1)) * 100)}%`, background: '#5E8B8B', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#09090B', width: 28, textAlign: 'right' }}>{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Venues List */}
        {activeTab === 'venues' && allVenues && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 600, fontSize: 16, color: '#09090B', margin: 0 }}>All Venues ({allVenues.length})</h2>
            </div>
            {/* Table card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 0, padding: '10px 20px', borderBottom: '1px solid #E4E4E7', background: '#F9F9F9' }}>
                {['Venue', 'Slug', 'Tier', 'Status', 'Actions'].map((col) => (
                  <span key={col} style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                ))}
              </div>
              {/* Table rows */}
              {allVenues.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 0,
                    padding: '14px 20px',
                    borderBottom: idx < allVenues.length - 1 ? '1px solid #E4E4E7' : 'none',
                    alignItems: 'center',
                  }}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: v.isActive ? 'rgba(94,139,139,0.1)' : 'rgba(184,84,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Coffee size={13} color={v.isActive ? '#5E8B8B' : '#B85450'} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>{v.name}</span>
                  </div>
                  {/* Slug */}
                  <span style={{ fontSize: 13, color: '#71717A', fontFamily: 'monospace' }}>{v.slug}</span>
                  {/* Tier */}
                  <span style={{ display: 'inline-flex', alignSelf: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#F4F4F5', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {(v.subscriptionTier || 'trial')}
                    </span>
                  </span>
                  {/* Status */}
                  <span style={{ display: 'inline-flex', alignSelf: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: v.isActive ? 'rgba(94,139,139,0.1)' : 'rgba(184,84,80,0.1)',
                      color: v.isActive ? '#5E8B8B' : '#B85450',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => navigate(`/v/${v.slug}`)}
                      title="View Site"
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E4E4E7', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#71717A' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                      <Coffee size={13} />
                    </button>
                    <button
                      onClick={() => updateVenue.mutate({ token, venueId: v.id, data: { isActive: !v.isActive } })}
                      disabled={updateVenue.isPending}
                      title={v.isActive ? 'Deactivate' : 'Activate'}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E4E4E7', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: updateVenue.isPending ? 'not-allowed' : 'pointer', color: v.isActive ? '#B85450' : '#5E8B8B', opacity: updateVenue.isPending ? 0.5 : 1 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                      {v.isActive ? <X size={13} /> : <Check size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
