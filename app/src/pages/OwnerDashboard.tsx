import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap, Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X, AlertCircle, Star, Gift, Ticket, MapPin, Briefcase } from 'lucide-react';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering'>('overview');

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#181818' }} />
      </div>
    );
  }

  if (!owner || !venue) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center">
          <Shield size={40} style={{ color: '#B85450' }} className="mx-auto mb-4" />
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>Login Required</h1>
          <p style={{ fontSize: '0.875rem', color: '#5E5E5E', marginBottom: '1.5rem' }}>Please log in to access your dashboard.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-3 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>GO TO LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#F3F2EE' }}>
        <div className="content-container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 style={{ fontWeight: 400, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>{venue.name}</h1>
              <span className="font-data" style={{ color: '#5E5E5E' }}>OWNER DASHBOARD</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', background: venue.subscriptionStatus === 'trial' ? 'rgba(196,149,58,0.12)' : 'rgba(94,139,94,0.12)', color: venue.subscriptionStatus === 'trial' ? '#C4953A' : '#5E8B5E' }}>
              {venue.subscriptionStatus === 'trial' ? 'TRIAL' : (venue.subscriptionTier || '').toUpperCase()}
            </span>
            <button onClick={logout} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="Log Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="content-container flex gap-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'menu' as const, label: 'Menu', icon: Coffee },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
            { id: 'billing' as const, label: 'Billing', icon: CreditCard },
            { id: 'integrations' as const, label: 'Integrations', icon: Link2 },
            { id: 'reviews' as const, label: 'Reviews', icon: Star },
            { id: 'giftcards' as const, label: 'Gift Cards', icon: Gift },
            { id: 'passes' as const, label: 'Passes', icon: Ticket },
            { id: 'locations' as const, label: 'Locations', icon: MapPin },
            { id: 'catering' as const, label: 'Catering', icon: Briefcase },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-2 py-3" style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === tab.id ? '#181818' : '#5E5E5E', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#181818' : 'transparent'}` }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-container py-8">
        {activeTab === 'overview' && <OverviewTab venue={venue} />}
        {activeTab === 'menu' && <MenuTab venue={venue} />}
        {activeTab === 'settings' && <SettingsTab venue={venue} />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'reviews' && venue && <ReviewsTab venueId={venue.id} />}
        {activeTab === 'giftcards' && venue && <GiftCardsTab venueId={venue.id} />}
        {activeTab === 'passes' && venue && <PassesTab venueId={venue.id} />}
        {activeTab === 'locations' && venue && <LocationsTab venue={venue} />}
        {activeTab === 'catering' && venue && <CateringTab venueId={venue.id} />}
      </div>
    </div>
  );
}

function OverviewTab({ venue }: { venue: any }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Your Site', value: `v/${venue.slug}`, icon: Globe },
          { label: 'Plan', value: (venue.subscriptionTier || 'trial').toUpperCase(), icon: CreditCard },
          { label: 'Status', value: (venue.subscriptionStatus || 'trial').toUpperCase(), icon: Shield },
          { label: 'Square', value: venue.squareEnabled ? 'Connected' : 'Not Connected', icon: Zap },
        ].map((s) => (
          <div key={s.label} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <s.icon size={18} style={{ color: '#5E5E5E' }} className="mb-3" />
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>{s.label}</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '1rem', color: '#181818' }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href={`/v/${venue.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', textDecoration: 'none' }}>
            <Coffee size={16} /> View Your Live Site
          </a>
          <button onClick={() => alert('Coming soon')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Users size={16} /> Manage Staff
          </button>
          <button onClick={() => alert('Coming soon')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <BarChart3 size={16} /> View Analytics
          </button>
          <button onClick={() => alert('Coming soon')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Settings size={16} /> Edit Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [form, setForm] = useState({ name: venue.name || '', address: venue.address || '', phone: venue.phone || '', description: venue.description || '', hoursWeekday: venue.hoursWeekday || '', hoursSaturday: venue.hoursSaturday || '', hoursSunday: venue.hoursSunday || '' });
  const [saveMessage, setSaveMessage] = useState('');
  const updateMutation = trpc.venue.update.useMutation({ onSuccess: () => setSaveMessage('Settings saved!') });
  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };

  return (
    <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Venue Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Cafe Name', key: 'name', type: 'text' },
          { label: 'Phone', key: 'phone', type: 'text' },
          { label: 'Mon-Fri Hours', key: 'hoursWeekday', type: 'text' },
          { label: 'Saturday Hours', key: 'hoursSaturday', type: 'text' },
          { label: 'Sunday Hours', key: 'hoursSunday', type: 'text' },
        ].map((f) => (
          <div key={f.key} className={f.key === 'name' || f.key === 'phone' ? '' : ''}>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Address</label>
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} style={inputStyle} />
        </div>
        <div className="md:col-span-2">
          <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} style={inputStyle} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => { setSaveMessage(''); updateMutation.mutate({ token, data: form }); }} disabled={updateMutation.isPending} className="px-6 py-3 font-button flex items-center gap-2" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          {updateMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
        </button>
        {saveMessage && <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>{saveMessage}</span>}
      </div>
    </div>
  );
}

function BillingTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: status } = trpc.billing.status.useQuery({ token }, { enabled: !!token });
  const { data: tiers } = trpc.billing.tiers.useQuery();
  const changeTier = trpc.billing.changeTier.useMutation({ onSuccess: () => window.location.reload() });

  return (
    <div>
      <div className="border p-6 mb-6" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-data block mb-1" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Current Plan</span>
            <h2 style={{ fontWeight: 500, fontSize: '1.5rem', color: '#181818' }}>{status?.tierDetails?.name || 'Trial'}</h2>
          </div>
          <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: status?.status === 'trial' ? 'rgba(196,149,58,0.12)' : 'rgba(94,139,94,0.12)', color: status?.status === 'trial' ? '#C4953A' : '#5E8B5E' }}>
            {status?.status?.toUpperCase() || 'TRIAL'}
          </span>
        </div>
        {status?.isTrial && status.trialEndsAt && (
          <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
            Trial ends: {new Date(status.trialEndsAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers && Object.entries(tiers).map(([key, tier]: [string, any]) => (
          <div key={key} className="border p-5 flex flex-col" style={{ borderColor: status?.tier === key ? '#181818' : 'rgba(24,24,24,0.15)' }}>
            <h3 className="font-data mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>{tier.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span style={{ fontWeight: 500, fontSize: '1.5rem', color: '#181818' }}>${tier.monthlyPrice}</span>
              <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.625rem' }}>/mo AUD</span>
            </div>
            <ul className="space-y-1.5 mb-6 flex-1">
              {tier.features.map((f: string) => (
                <li key={f} className="flex items-start gap-2" style={{ fontSize: '0.8125rem', color: '#181818' }}>
                  <Check size={12} style={{ color: '#5E8B5E', flexShrink: 0, marginTop: 3 }} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => changeTier.mutate({ token, tier: key as any })} disabled={status?.tier === key || changeTier.isPending} className="w-full py-3 font-button" style={{ background: status?.tier === key ? '#5E8B5E' : '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {status?.tier === key ? 'Current Plan' : `Switch to ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: squareStatus } = trpc.square.status.useQuery({ token }, { enabled: !!token });
  const disconnect = trpc.square.disconnect.useMutation({ onSuccess: () => window.location.reload() });

  return (
    <div className="space-y-4">
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#181818' }}>
              <Zap size={20} style={{ color: '#F3F2EE' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.25rem' }}>Square POS</h3>
              <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', lineHeight: 1.5 }}>
                Sync your menu, inventory, and orders with Square Point of Sale.<br />
                When a customer orders online, it appears in your Square dashboard.
              </p>
              {squareStatus?.connected && (
                <p className="font-data mt-2" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>
                  <Check size={10} className="inline mr-1" /> Connected
                </p>
              )}
            </div>
          </div>
          <div>
            {squareStatus?.connected ? (
              <button onClick={() => disconnect.mutate({ token })} disabled={disconnect.isPending} className="px-4 py-2 font-data border" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#B85450', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent' }}>
                {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button onClick={() => alert('Square OAuth would open here')} className="px-4 py-2 font-button flex items-center gap-2" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
                <Link2 size={14} /> Connect Square
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsTab({ venueId }: { venueId: number }) {
  const { data: reviewsList, isLoading } = trpc.venue.listReviews.useQuery(
    { venueId, limit: 100 },
    { enabled: !!venueId }
  );

  if (isLoading) return <p style={{ color: '#5E5E5E' }}>Loading reviews…</p>;
  if (!reviewsList || reviewsList.length === 0) {
    return <p style={{ color: '#5E5E5E' }}>No reviews yet.</p>;
  }

  const avg = reviewsList.reduce((s, r) => s + r.rating, 0) / reviewsList.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Star size={20} fill="#F5B400" color="#F5B400" />
        <span style={{ fontSize: 18, fontWeight: 700, color: '#181818' }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: 14, color: '#5E5E5E' }}>across {reviewsList.length} reviews</span>
      </div>
      {reviewsList.map((r) => (
        <div key={r.id} style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          border: '1px solid rgba(24,24,24,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14}
                  fill={i <= r.rating ? '#F5B400' : '#D1D1D1'}
                  color={i <= r.rating ? '#F5B400' : '#D1D1D1'} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.customerName}</span>
            <span style={{ fontSize: 12, color: '#5E5E5E', marginLeft: 'auto' }}>
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, color: '#5E5E5E', margin: 0 }}>{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function MenuTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.venue.listMenu.useQuery({ venueId: venue.id });

  const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'coffee' as 'coffee' | 'pastries' | 'bread',
    dietary: '',
    image: '',
  });
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E' };

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64);

  const showSaved = () => {
    setSaveMessage('Saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const createMutation = trpc.venue.createMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setMode('list');
      showSaved();
    },
  });

  const updateMutation = trpc.venue.updateMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setMode('list');
      showSaved();
    },
  });

  const deleteMutation = trpc.venue.deleteMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setDeleteConfirm(null);
      showSaved();
    },
    onError: (err) => {
      setDeleteError(err.message);
      setDeleteConfirm(null);
    },
  });

  const startCreate = () => {
    setForm({ name: '', description: '', price: '', category: 'coffee', dietary: '', image: '' });
    setDeleteError('');
    setMode('create');
  };

  const startEdit = (item: any) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category: item.category || 'coffee',
      dietary: item.dietary || '',
      image: item.image || '',
    });
    setDeleteError('');
    setMode({ type: 'edit', id: item.id });
  };

  const handleDiscard = () => {
    setMode('list');
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price.trim()) return;
    if (mode === 'create') {
      createMutation.mutate({
        venueId: venue.id,
        slug: slugify(form.name),
        name: form.name.trim(),
        description: form.description || undefined,
        price: form.price,
        category: form.category,
        dietary: form.dietary || undefined,
        image: form.image || undefined,
      });
    } else if (typeof mode === 'object' && mode.type === 'edit') {
      updateMutation.mutate({
        token,
        menuItemId: mode.id,
        data: {
          name: form.name.trim(),
          description: form.description || undefined,
          price: form.price,
          category: form.category,
          dietary: form.dietary || undefined,
          image: form.image || undefined,
        },
      });
    }
  };

  const isFormMode = mode === 'create' || (typeof mode === 'object' && mode.type === 'edit');
  const isEditMode = typeof mode === 'object' && mode.type === 'edit';
  const isPending = createMutation.isPending || updateMutation.isPending;

  const categoryLabel = (cat: string) => {
    if (cat === 'coffee') return 'Coffee';
    if (cat === 'pastries') return 'Pastries';
    if (cat === 'bread') return 'Bread';
    return cat;
  };

  return (
    <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Menu Management</h2>
        {!isFormMode && (
          <button
            onClick={startCreate}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className="mb-4">
          <span className="font-data" style={{ fontSize: '0.75rem', color: '#5E8B5E', fontFamily: 'Geist Mono' }}>{saveMessage}</span>
        </div>
      )}

      {/* Delete error banner */}
      {deleteError && (
        <div className="mb-4 flex items-start gap-2 p-3 border" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.8125rem', color: '#B85450' }}>
            This item has existing orders and cannot be deleted. View your order history for details.
          </span>
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B85450' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: '#5E5E5E' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items?.length === 0 && !isFormMode && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Coffee size={40} style={{ color: '#5E5E5E', marginBottom: 16 }} />
          <h3 style={{ fontWeight: 500, fontSize: '1rem', color: '#181818', marginBottom: 8 }}>No menu items yet</h3>
          <p style={{ fontSize: '0.875rem', color: '#5E5E5E', marginBottom: 24 }}>Add your first item to start building your menu.</p>
          <button
            onClick={startCreate}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      )}

      {/* Item list */}
      {!isLoading && items && items.length > 0 && (
        <div className="space-y-2 mb-6">
          {items.map((item: any) => (
            <div key={item.id}>
              <div
                className="flex items-center justify-between gap-4 p-4 rounded"
                style={{ background: '#E8E4DD' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#181818', display: 'block', marginBottom: 2 }}>{item.name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5E5E5E', background: 'rgba(24,24,24,0.08)', padding: '2px 6px', borderRadius: 3 }}>
                        {categoryLabel(item.category)}
                      </span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 13, color: '#181818', fontWeight: 600 }}>
                        ${Number(item.price).toFixed(2)}
                      </span>
                      {item.image && (
                        <span style={{ fontFamily: 'Geist Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5E8B5E', background: 'rgba(94,139,94,0.12)', padding: '2px 6px', borderRadius: 3 }}>
                          IMG
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    aria-label="Edit item"
                    className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                    style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(item.id); setDeleteError(''); }}
                    aria-label="Delete item"
                    title="Delete Item"
                    className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                    style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Delete confirmation inline */}
              {deleteConfirm === item.id && (
                <div className="p-4 border-x border-b" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#F3F2EE' }}>
                  <p style={{ fontSize: '0.8125rem', color: '#181818', marginBottom: 12 }}>
                    Delete this item? Orders referencing it will be preserved.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => deleteMutation.mutate({ token, menuItemId: item.id })}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 font-button flex items-center gap-2"
                      style={{ background: '#B85450', color: '#F3F2EE', fontSize: '0.75rem' }}
                    >
                      {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 font-button"
                      style={{ background: 'transparent', color: '#181818', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}
                    >
                      Keep Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Form */}
      {isFormMode && (
        <div className="border p-6 mt-2" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#FAFAF8' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1.25rem' }}>
            {isEditMode ? 'Edit Item' : 'New Menu Item'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="Flat White"
              />
            </div>

            {/* Price */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Price</label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="4.50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as 'coffee' | 'pastries' | 'bread' })}
                className={inputCls}
                style={inputStyle}
              >
                <option value="coffee">Coffee</option>
                <option value="pastries">Pastries</option>
                <option value="bread">Bread</option>
              </select>
            </div>

            {/* Dietary */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Dietary</label>
              <input
                type="text"
                value={form.dietary}
                onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="vegan, gluten-free, etc."
              />
            </div>

            {/* Description — full width */}
            <div className="md:col-span-2">
              <label className="font-data block mb-1.5" style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={inputCls}
                style={inputStyle}
                placeholder="A short description of the item…"
              />
            </div>

            {/* Image URL — full width */}
            <div className="md:col-span-2">
              <label className="font-data block mb-1.5" style={labelStyle}>Image URL</label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="https://example.com/coffee.jpg"
              />
              <p className="font-data mt-1" style={{ fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em' }}>
                Leave blank to hide image on your public menu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || !form.price.trim()}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
            <button
              onClick={handleDiscard}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: 'transparent', color: '#181818', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}
            >
              <X size={14} /> Discard Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GiftCardsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  // ── Queries & mutations ─────────────────────────────────
  const { data: cards, refetch: refetchCards } = trpc.venue.listGiftCards.useQuery(
    { token },
    { enabled: !!token }
  );

  const [form, setForm] = useState({
    amount: '',
    senderName: '',
    recipientName: '',
    recipientPhone: '',
    message: '',
  });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const createCard = trpc.venue.createGiftCard.useMutation({
    onSuccess: (data) => {
      setNewCode(data.code);
      setForm({ amount: '', senderName: '', recipientName: '', recipientPhone: '', message: '' });
      refetchCards();
    },
    onError: (err) => setFormError(err.message),
  });

  const handleCreate = () => {
    setFormError('');
    setNewCode(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Amount must be a positive number');
      return;
    }
    createCard.mutate({
      token,
      amount,
      senderName: form.senderName || undefined,
      recipientName: form.recipientName || undefined,
      recipientPhone: form.recipientPhone || undefined,
      message: form.message || undefined,
    });
  };

  const inputStyle = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
    fontSize: 13, background: '#fff', color: '#181818', width: '100%',
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Create Card Form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 16 }}>
          Create Gift Card
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Amount ($) *</label>
            <input type="number" min="1" step="0.01" placeholder="e.g. 25.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Sender Name</label>
            <input type="text" placeholder="e.g. Jane" value={form.senderName}
              onChange={e => setForm({ ...form, senderName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Recipient Name</label>
            <input type="text" placeholder="e.g. John" value={form.recipientName}
              onChange={e => setForm({ ...form, recipientName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Recipient Phone</label>
            <input type="tel" placeholder="e.g. 0412345678" value={form.recipientPhone}
              onChange={e => setForm({ ...form, recipientPhone: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Message (optional)</label>
          <textarea rows={2} placeholder="A personal message..." value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        {formError && (
          <p style={{ color: '#B85450', fontSize: 13, marginBottom: 8 }}>{formError}</p>
        )}
        <button onClick={handleCreate} disabled={createCard.isPending}
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: createCard.isPending ? 0.7 : 1 }}>
          {createCard.isPending ? 'Creating...' : 'Create Gift Card'}
        </button>

        {/* Show generated code prominently after creation */}
        {newCode && (
          <div style={{ marginTop: 16, padding: 16, background: '#E8F5E9', borderRadius: 8, border: '1px solid #A5D6A7' }}>
            <p style={{ fontSize: 12, color: '#388E3C', marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Gift Card Created — Share this code:
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#181818', letterSpacing: 4, fontFamily: 'Geist Mono' }}>
              {newCode}
            </p>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 16 }}>
          All Gift Cards
        </h2>
        {!cards || cards.length === 0 ? (
          <p style={{ color: '#5E5E5E', fontSize: 14 }}>No gift cards yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Code', 'Amount', 'Balance', 'Recipient', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'Geist Mono', fontWeight: 700, letterSpacing: 2 }}>{card.code}</td>
                    <td style={{ padding: '10px 12px' }}>${Number(card.amount).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: Number(card.balance) > 0 ? '#16a34a' : '#5E5E5E' }}>
                      ${Number(card.balance).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#5E5E5E' }}>{card.recipientName || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#5E5E5E', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {new Date(card.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PassesTab({ venueId }: { venueId: number }) {
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
    padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
    fontSize: 13, background: '#fff', color: '#181818', width: '100%',
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Pass Configuration */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 4 }}>
          Pass Configuration
        </h2>
        <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 16 }}>
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
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: upsertConfig.isPending ? 0.7 : 1 }}>
          {upsertConfig.isPending ? 'Saving...' : passConfig ? 'Update Pass Config' : 'Save Pass Config'}
        </button>
      </div>

      {/* Issue Pass to Customer */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 4 }}>
          Issue Pass to Customer
        </h2>
        <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 16 }}>
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
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: purchasePass.isPending || !passConfig ? 0.6 : 1 }}>
          {purchasePass.isPending ? 'Issuing...' : 'Issue Pass'}
        </button>
      </div>

    </div>
  );
}
