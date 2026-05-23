import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap, Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'billing' | 'integrations' | 'menu'>('overview');

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
