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

  // Login form
  if (!token || !admin) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
        <div className="w-full max-w-sm mx-4">
          <div className="text-center mb-8">
            <div className="w-10 h-10 flex items-center justify-center mx-auto mb-4" style={{ background: '#B85450' }}>
              <Shield size={20} style={{ color: '#F3F2EE' }} />
            </div>
            <h1 style={{ fontWeight: 400, fontSize: '1.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>Platform Admin</h1>
            <p className="font-data mt-2" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>B1 PLATFORM INTERNAL</p>
          </div>

          <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            {error && <div className="mb-4 p-3 border" style={{ background: 'rgba(184,84,80,0.08)', borderColor: '#B85450' }}><p className="font-data" style={{ fontSize: '0.625rem', color: '#B85450' }}>{error}</p></div>}
            <div className="space-y-4">
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
            </div>
            <button onClick={() => loginMutation.mutate({ email, password })} disabled={loginMutation.isPending} className="w-full mt-6 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.875rem' }}>
              {loginMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </div>
          <button onClick={() => navigate('/')} className="w-full mt-4 text-center font-data hover:opacity-60 transition-opacity" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', background: 'none', border: 'none' }}>
            <ArrowLeft size={12} className="inline mr-1" /> Back to Platform
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-[100dvh]" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#181818' }}>
        <div className="content-container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: '#B85450' }}>
              <Shield size={16} style={{ color: '#F3F2EE' }} />
            </div>
            <div>
              <h1 style={{ fontWeight: 400, fontSize: '1rem', letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#F3F2EE' }}>Platform Admin</h1>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>
                {admin.name} — {admin.role?.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('b1-platform-admin-token'); window.location.reload(); }} className="font-data hover:opacity-60 transition-opacity" style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none' }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="content-container flex gap-6">
          {[{ id: 'overview', label: 'Overview', icon: Activity }, { id: 'venues', label: 'All Venues', icon: Coffee }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex items-center gap-2 py-3" style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === tab.id ? '#181818' : '#5E5E5E', borderBottom: `2px solid ${activeTab === tab.id ? '#181818' : 'transparent'}`, background: 'none', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: activeTab === tab.id ? '#181818' : 'transparent' }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="content-container py-8">
        {/* Overview */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Total Venues', value: stats.totalVenues, icon: Coffee },
                { label: 'Active', value: stats.activeVenues, icon: Check },
                { label: 'In Trial', value: stats.trialVenues, icon: Activity },
                { label: 'Total Orders', value: stats.totalOrders, icon: DollarSign },
                { label: 'Menu Items', value: stats.totalMenuItems, icon: Users },
              ].map((s) => (
                <div key={s.label} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
                  <s.icon size={16} style={{ color: '#5E5E5E' }} className="mb-2" />
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block' }}>{s.label}</span>
                  <span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '1.5rem', color: '#181818' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {stats.tierBreakdown && stats.tierBreakdown.length > 0 && (
              <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Subscriptions by Tier</h2>
                <div className="space-y-2">
                  {stats.tierBreakdown.map((t: any) => (
                    <div key={t.tier} className="flex items-center gap-3">
                      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', width: '6rem', textTransform: 'uppercase' }}>{t.tier}</span>
                      <div className="flex-1 h-4" style={{ background: 'rgba(24,24,24,0.06)' }}>
                        <div className="h-full" style={{ width: `${Math.min(100, (t.count / Math.max(stats.totalVenues, 1)) * 100)}%`, background: '#181818' }} />
                      </div>
                      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#181818', width: '2rem', textAlign: 'right' }}>{t.count}</span>
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
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>All Venues ({allVenues.length})</h2>
            </div>
            <div className="space-y-2">
              {allVenues.map((v) => (
                <div key={v.id} className="border p-4 flex items-center justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center" style={{ background: v.isActive ? '#5E8B5E20' : '#B8545020' }}>
                      <Coffee size={14} style={{ color: v.isActive ? '#5E8B5E' : '#B85450' }} />
                    </div>
                    <div>
                      <span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: '#181818', display: 'block' }}>{v.name}</span>
                      <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>
                        {v.slug} &middot; {(v.subscriptionTier || 'trial').toUpperCase()} &middot; {(v.subscriptionStatus || 'trial').toUpperCase()}
                        {v.squareEnabled && ' &middot; Square'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/v/${v.slug}`)} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="View Site">
                      <Coffee size={14} />
                    </button>
                    <button onClick={() => updateVenue.mutate({ token, venueId: v.id, data: { isActive: !v.isActive } })} disabled={updateVenue.isPending} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: v.isActive ? '#B85450' : '#5E8B5E' }} title={v.isActive ? 'Deactivate' : 'Activate'}>
                      {v.isActive ? <X size={14} /> : <Check size={14} />}
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
