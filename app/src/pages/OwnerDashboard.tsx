import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap, Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X, AlertCircle, Star, Gift, Ticket, MapPin, Briefcase, QrCode, Download, Send, TrendingUp, ChevronDown, ChevronUp, Tag, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import QRCode from 'qrcode';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const token = localStorage.getItem('b1-owner-token') || '';
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'pl' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering' | 'promo' | 'bundles' | 'campaigns' | 'loyalty'>('overview');

  const { data: myVenues } = trpc.venue.listMyVenues.useQuery({ token }, { enabled: !!token });
  const switchVenue = trpc.venue.getVenueToken.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('b1-token', data.token);
      window.location.reload();
    },
  });

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
              <div className="flex items-center gap-3">
                <h1 style={{ fontWeight: 400, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>{venue.name}</h1>
                {myVenues && myVenues.length > 1 && (
                  <select
                    defaultValue={venue.id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId && Number(selectedId) !== venue.id) {
                        switchVenue.mutate({ token, venueId: Number(selectedId) });
                      }
                    }}
                    style={{ background: '#292524', color: '#fafaf9', border: '1px solid #44403c', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }}
                  >
                    {myVenues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                )}
              </div>
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
            { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
            { id: 'pl' as const, label: 'P&L', icon: DollarSign },
            { id: 'menu' as const, label: 'Menu', icon: Coffee },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
            { id: 'billing' as const, label: 'Billing', icon: CreditCard },
            { id: 'integrations' as const, label: 'Integrations', icon: Link2 },
            { id: 'reviews' as const, label: 'Reviews', icon: Star },
            { id: 'giftcards' as const, label: 'Gift Cards', icon: Gift },
            { id: 'passes' as const, label: 'Passes', icon: Ticket },
            { id: 'locations' as const, label: 'Locations', icon: MapPin },
            { id: 'catering' as const, label: 'Catering', icon: Briefcase },
            { id: 'promo' as const, label: 'Promos', icon: Tag },
            { id: 'bundles' as const, label: 'Bundles', icon: Gift },
            { id: 'campaigns' as const, label: 'Campaigns', icon: Send },
            { id: 'loyalty' as const, label: 'Loyalty', icon: Star },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-2 py-3" style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === tab.id ? '#181818' : '#5E5E5E', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#181818' : 'transparent'}` }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-container py-8">
        {activeTab === 'overview' && <OverviewTab venue={venue} setActiveTab={setActiveTab} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'pl' && venue && <PLTab venue={venue} />}
        {activeTab === 'menu' && <MenuTab venue={venue} />}
        {activeTab === 'settings' && <SettingsTab venue={venue} />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'integrations' && <IntegrationsTab venue={venue} />}
        {activeTab === 'reviews' && venue && <ReviewsTab venueId={venue.id} />}
        {activeTab === 'giftcards' && venue && <GiftCardsTab venueId={venue.id} />}
        {activeTab === 'passes' && venue && <PassesTab venueId={venue.id} />}
        {activeTab === 'locations' && venue && <LocationsTab venue={venue} />}
        {activeTab === 'catering' && venue && <CateringTab venueId={venue.id} />}
        {activeTab === 'promo' && venue && <PromoTab venueId={venue.id} />}
        {activeTab === 'bundles' && venue && <BundlesTab venueId={venue.id} />}
        {activeTab === 'campaigns' && venue && <CampaignsTab venueId={venue.id} />}
        {activeTab === 'loyalty' && venue && <LoyaltyTab venueId={venue.id} />}
      </div>
    </div>
  );
}

function OverviewTab({ venue, setActiveTab }: { venue: any; setActiveTab: (tab: 'overview' | 'analytics' | 'pl' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering' | 'promo' | 'bundles' | 'campaigns' | 'loyalty') => void }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: summary, isLoading: summaryLoading } = trpc.venue.getDailySummary.useQuery(
    { token },
    { enabled: !!token }
  );
  const sendEmail = trpc.venue.sendDailySummaryEmail.useMutation();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const handleSendEmail = () => {
    setEmailStatus('idle');
    sendEmail.mutate({ token }, {
      onSuccess: () => setEmailStatus('sent'),
      onError: () => setEmailStatus('error'),
    });
  };

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
      <div className="border p-6 mb-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href={`/v/${venue.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', textDecoration: 'none' }}>
            <Coffee size={16} /> View Your Live Site
          </a>
          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Users size={16} /> Manage Staff
          </button>
          <button onClick={() => setActiveTab('overview')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <BarChart3 size={16} /> View Analytics
          </button>
          <button onClick={() => setActiveTab('menu')} className="flex items-center gap-3 p-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all text-left" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Settings size={16} /> Edit Menu
          </button>
        </div>
      </div>

      {/* Today at a Glance */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} style={{ color: '#5E5E5E' }} />
            <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Today at a Glance</h2>
            {summary?.date && (
              <span className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>
                {new Date(summary.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {emailStatus === 'sent' && (
              <span className="font-data flex items-center gap-1" style={{ fontSize: '0.625rem', color: '#5E8B5E', letterSpacing: '0.08em' }}>
                <Check size={10} /> SENT
              </span>
            )}
            {emailStatus === 'error' && (
              <span className="font-data flex items-center gap-1" style={{ fontSize: '0.625rem', color: '#B85450', letterSpacing: '0.08em' }}>
                <AlertCircle size={10} /> FAILED
              </span>
            )}
            <button
              onClick={handleSendEmail}
              disabled={sendEmail.isPending}
              className="flex items-center gap-2 px-4 py-2 font-button"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: sendEmail.isPending ? 'not-allowed' : 'pointer', opacity: sendEmail.isPending ? 0.6 : 1 }}
            >
              {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send Summary Email
            </button>
          </div>
        </div>

        {summaryLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />
          </div>
        )}

        {!summaryLoading && summary && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Orders', value: String(summary.orderCount ?? 0) },
                { label: 'Completed', value: String(summary.completedCount ?? 0) },
                { label: 'Pending', value: String(summary.pendingCount ?? 0) },
                { label: 'Revenue', value: `$${Number(summary.totalRevenue ?? 0).toFixed(2)}` },
              ].map((stat) => (
                <div key={stat.label} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
                  <span className="font-data block mb-2" style={{ fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>{stat.label}</span>
                  <span style={{ fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' }}>{stat.value}</span>
                </div>
              ))}
            </div>

            {summary.topItems && summary.topItems.length > 0 && (
              <div>
                <span className="font-data block mb-3" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Top Items Today</span>
                <div className="space-y-2">
                  {summary.topItems.slice(0, 5).map((item: { name: string; qty: number }, idx: number) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', width: '1.25rem', textAlign: 'right' }}>{idx + 1}.</span>
                      <div className="flex-1 flex items-center justify-between border-b py-1" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                        <span style={{ fontSize: '0.875rem', color: '#181818' }}>{item.name}</span>
                        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>{item.qty} sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!summary.topItems || summary.topItems.length === 0) && summary.orderCount === 0 && (
              <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E', textAlign: 'center', padding: '1.5rem 0' }}>No orders yet today.</p>
            )}
          </div>
        )}

        {!summaryLoading && !summary && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>Could not load today's summary.</p>
        )}
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
const CHART_COLORS = ['#5E8B8B', '#C4953A', '#5E8B5E', '#B85450', '#8B7355', '#5E5E8B'];

function AnalyticsTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedDays, setSelectedDays] = useState(30);

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getOverview.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: dailyRevenue, isLoading: dailyLoading } = trpc.analytics.getDailyRevenue.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, { enabled: !!token }
  );
  const { data: topItems } = trpc.analytics.getTopItems.useQuery(
    { token, days: selectedDays, limit: 10 }, { enabled: !!token }
  );
  const { data: hourlyDist } = trpc.analytics.getHourlyDistribution.useQuery(
    { token, days: selectedDays as 7 | 30 | 90 }, { enabled: !!token }
  );
  const { data: orderTypeBreakdown } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: itemsByHour } = trpc.analytics.getItemsByHour.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: selloutEvents } = trpc.analytics.getSelloutEvents.useQuery(
    { token, days: 30 }, { enabled: !!token }
  );

  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' };

  // Build heatmap data
  const heatmapHours = Array.from({ length: 17 }, (_, i) => i + 6); // 6–22
  const heatmapItems: Record<string, Record<number, number>> = {};
  if (itemsByHour) {
    for (const row of itemsByHour as { itemName: string; hour: number; qty: number }[]) {
      if (!heatmapItems[row.itemName]) heatmapItems[row.itemName] = {};
      heatmapItems[row.itemName][row.hour] = row.qty;
    }
  }
  // Get top 8 items by total qty
  const heatmapTopItems = Object.entries(heatmapItems)
    .map(([name, hours]) => ({ name, total: Object.values(hours).reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(x => x.name);
  const heatmapMax = heatmapTopItems.length > 0
    ? Math.max(...heatmapTopItems.flatMap(item => heatmapHours.map(h => heatmapItems[item]?.[h] ?? 0)))
    : 1;

  const hourLabel = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;

  const pieData = orderTypeBreakdown
    ? (orderTypeBreakdown as { orderType: string | null; count: number; revenue: string }[]).map(r => ({
        name: r.orderType ?? 'Unknown',
        value: r.count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Days selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>PERIOD:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setSelectedDays(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: selectedDays === d ? '#181818' : 'transparent', color: selectedDays === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
      </div>

      {/* Overview stats */}
      {overviewLoading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${overview.totalRevenue}` },
            { label: 'Orders', value: String(overview.orderCount) },
            { label: 'Avg Order', value: `$${overview.avgOrder}` },
            { label: 'Loyalty Members', value: String(overview.loyaltyMembers) },
          ].map((s) => (
            <div key={s.label} className="border p-5" style={statCardStyle}>
              <span style={monoLabel}>{s.label}</span>
              <span style={bigNum}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily revenue chart */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Daily Revenue</h2>
        {dailyLoading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
        {!dailyLoading && dailyRevenue && dailyRevenue.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyRevenue as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke="#5E8B8B" fill="rgba(94,139,139,0.15)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!dailyLoading && (!dailyRevenue || dailyRevenue.length === 0) && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No data for this period.</p>
        )}
      </div>

      {/* Top items */}
      {topItems && topItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Top Selling Items</h2>
          <div className="space-y-2">
            {(topItems as { name: string; quantity: number; revenue: string }[]).map((item, idx) => {
              const maxQty = Math.max(...(topItems as { name: string; quantity: number }[]).map(i => i.quantity));
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', width: '1.25rem', textAlign: 'right' }}>{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '0.875rem', color: '#181818' }}>{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>{item.quantity} sold</span>
                        <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>${item.revenue}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'rgba(24,24,24,0.08)', borderRadius: 2 }}>
                      <div style={{ height: 4, background: '#5E8B8B', borderRadius: 2, width: `${(item.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly distribution */}
      {hourlyDist && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Orders by Hour</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyDist as any[]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" />
              <XAxis dataKey="label" tick={{ fontFamily: 'Geist Mono', fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
              <Bar dataKey="orders" fill="#5E8B8B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Order type breakdown */}
      {pieData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Order Type Breakdown</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Orders']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#181818' }}>{entry.name || 'Unknown'}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Item-by-hour heatmap */}
      {heatmapTopItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Item Popularity by Hour</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', fontFamily: 'Geist Mono', fontSize: 9, textAlign: 'left', color: '#5E5E5E', minWidth: 120 }}>Item</th>
                  {heatmapHours.map(h => (
                    <th key={h} style={{ padding: '4px 6px', fontFamily: 'Geist Mono', fontSize: 9, color: '#5E5E5E', textAlign: 'center', minWidth: 36 }}>{hourLabel(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapTopItems.map(itemName => (
                  <tr key={itemName}>
                    <td style={{ padding: '3px 8px', fontSize: 12, color: '#181818', fontWeight: 500 }}>{itemName}</td>
                    {heatmapHours.map(h => {
                      const qty = heatmapItems[itemName]?.[h] ?? 0;
                      const intensity = heatmapMax > 0 ? qty / heatmapMax : 0;
                      const bg = intensity === 0
                        ? '#F3F2EE'
                        : `rgba(94,139,139,${0.15 + intensity * 0.85})`;
                      return (
                        <td key={h} title={qty > 0 ? `${qty} orders` : undefined}
                          style={{ padding: '3px 6px', textAlign: 'center', background: bg, fontSize: 11, color: intensity > 0.5 ? '#fff' : '#5E5E5E', border: '1px solid rgba(24,24,24,0.04)' }}>
                          {qty > 0 ? qty : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-data mt-3" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Darker cells = more orders at that hour. Based on last {selectedDays} days.</p>
        </div>
      )}

      {/* Sellout events */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Sellout Events (Last 30 Days)</h2>
        {!selloutEvents || (selloutEvents as any[]).length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No sellout events recorded in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            {(selloutEvents as { itemName: string; soldOutAt: Date | string; hour: number }[]).map((ev, i) => {
              const d = new Date(ev.soldOutAt);
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                  <AlertCircle size={12} style={{ color: '#B85450', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#181818' }}>{ev.itemName}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
                    sold out at {hourLabel(ev.hour)} on {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────
function PLTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedDays, setSelectedDays] = useState(30);

  const { data: overview } = trpc.analytics.getOverview.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: revenueByCategory } = trpc.analytics.getRevenueByCategory.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: orderTypeBreakdown } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );
  const { data: repeatRate } = trpc.analytics.getRepeatCustomerRate.useQuery(
    { token, days: selectedDays }, { enabled: !!token }
  );

  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' };

  const catData = revenueByCategory
    ? (revenueByCategory as { category: string; revenue: string; quantity: number }[]).map(r => ({
        category: r.category || 'Other',
        revenue: Number(r.revenue),
      })).sort((a, b) => b.revenue - a.revenue)
    : [];

  const typeData = orderTypeBreakdown
    ? (orderTypeBreakdown as { orderType: string | null; count: number; revenue: string }[]).map(r => ({
        name: r.orderType || 'Unknown',
        value: r.count,
      }))
    : [];

  const CHART_COLORS_PL = ['#5E8B8B', '#C4953A', '#5E8B5E', '#B85450', '#8B7355'];

  const totalRevenue = overview ? Number(overview.totalRevenue) : 0;

  return (
    <div className="space-y-6">
      {/* Days selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>PERIOD:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setSelectedDays(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: selectedDays === d ? '#181818' : 'transparent', color: selectedDays === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
      </div>

      {/* Revenue card */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Revenue</span>
            <span style={bigNum}>${overview.totalRevenue}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Orders</span>
            <span style={bigNum}>{overview.orderCount}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Avg Order Value</span>
            <span style={bigNum}>${overview.avgOrder}</span>
          </div>
        </div>
      )}

      {/* Revenue by category — horizontal bar chart */}
      {catData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={Math.max(120, catData.length * 48)}>
            <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="category" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} width={55} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#5E8B8B" radius={[0, 3, 3, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS_PL[i % CHART_COLORS_PL.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue by order type — pie chart */}
      {typeData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Revenue by Order Type</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS_PL[i % CHART_COLORS_PL.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {typeData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS_PL[i % CHART_COLORS_PL.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#181818' }}>{entry.name}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estimated margins table */}
      {catData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>Estimated Margins</h2>
          <p className="font-data mb-4" style={{ fontSize: '0.625rem', color: '#5E5E5E', letterSpacing: '0.06em' }}>
            Cost estimates are based on typical cafe margins. Set actual costs per item in Menu settings.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Category', 'Revenue', 'Est. Cost (40%)', 'Est. Profit', 'Margin %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catData.map((row) => {
                  const estCost = row.revenue * 0.4;
                  const estProfit = row.revenue - estCost;
                  const margin = row.revenue > 0 ? Math.round((estProfit / row.revenue) * 100) : 0;
                  const rowColor = margin < 35 ? 'rgba(184,84,80,0.08)' : margin < 50 ? 'rgba(196,149,58,0.08)' : 'transparent';
                  const marginColor = margin < 35 ? '#B85450' : margin < 50 ? '#C4953A' : '#5E8B5E';
                  return (
                    <tr key={row.category} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)', background: rowColor }}>
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: '#181818', textTransform: 'capitalize' }}>{row.category}</td>
                      <td style={{ padding: '10px 10px' }}>${row.revenue.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E5E5E' }}>${estCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${estProfit.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '2px 8px', background: `${marginColor}18`, color: marginColor }}>{margin}%</span>
                      </td>
                    </tr>
                  );
                })}
                {totalRevenue > 0 && (
                  <tr style={{ borderTop: '2px solid rgba(24,24,24,0.1)', background: '#E8E4DD' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#181818' }}>Total</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>${totalRevenue.toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E' }}>${(totalRevenue * 0.4).toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#5E8B5E' }}>${(totalRevenue * 0.6).toFixed(2)}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '2px 8px', background: 'rgba(94,139,94,0.12)', color: '#5E8B5E' }}>60%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeat customers */}
      {repeatRate && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Repeat Customers</h2>
          <div className="flex items-center gap-6">
            <div className="border p-5" style={{ ...statCardStyle, minWidth: 120 }}>
              <span style={monoLabel}>Repeat Rate</span>
              <span style={{ ...bigNum, fontSize: '2rem', color: '#5E8B8B' }}>{repeatRate.rate}%</span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#5E5E5E', lineHeight: 1.6 }}>
              <strong style={{ color: '#181818' }}>{repeatRate.repeat}</strong> of <strong style={{ color: '#181818' }}>{repeatRate.total}</strong> customers ordered more than once in the last {selectedDays} days.
            </p>
          </div>
        </div>
      )}
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

  // Happy Hour state
  const { data: hhData } = trpc.venue.getHappyHour.useQuery({ venueId: venue.id }, { enabled: !!venue.id });
  const setHappyHour = trpc.venue.setHappyHour.useMutation();
  const [hhForm, setHhForm] = useState({ enabled: false, startTime: '', endTime: '', discountPercent: '', label: '' });
  const [hhMsg, setHhMsg] = useState('');
  const [hhLoaded, setHhLoaded] = useState(false);
  if (hhData && !hhLoaded) {
    setHhLoaded(true);
    setHhForm({
      enabled: !!(hhData as any).enabled,
      startTime: (hhData as any).startTime || '',
      endTime: (hhData as any).endTime || '',
      discountPercent: String((hhData as any).discountPercent ?? ''),
      label: (hhData as any).label || '',
    });
  }

  // Xero state
  const { data: xeroConn, refetch: refetchXero } = trpc.xero.getConnection.useQuery();
  const { data: xeroAuthUrl } = trpc.xero.getAuthUrl.useQuery();
  const xeroDisconnect = trpc.xero.disconnect.useMutation({ onSuccess: () => refetchXero() });
  const xeroSync = trpc.xero.syncRevenue.useMutation();
  const [xeroSyncFrom, setXeroSyncFrom] = useState('');
  const [xeroSyncTo, setXeroSyncTo] = useState('');
  const [xeroMsg, setXeroMsg] = useState('');

  return (
    <div className="space-y-6">
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
            <div key={f.key}>
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

      {/* Happy Hour */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Happy Hour</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="hh-enabled" checked={hhForm.enabled} onChange={e => setHhForm({ ...hhForm, enabled: e.target.checked })} style={{ accentColor: '#181818', width: 16, height: 16 }} />
            <label htmlFor="hh-enabled" className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#181818', cursor: 'pointer' }}>Enable Happy Hour</label>
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Start Time (HH:MM)</label>
            <input type="time" value={hhForm.startTime} onChange={e => setHhForm({ ...hhForm, startTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>End Time (HH:MM)</label>
            <input type="time" value={hhForm.endTime} onChange={e => setHhForm({ ...hhForm, endTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Discount Percent (0–100)</label>
            <input type="number" min={0} max={100} value={hhForm.discountPercent} onChange={e => setHhForm({ ...hhForm, discountPercent: e.target.value })} className={inputCls} style={inputStyle} placeholder="e.g. 20" />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Label</label>
            <input type="text" value={hhForm.label} onChange={e => setHhForm({ ...hhForm, label: e.target.value })} className={inputCls} style={inputStyle} placeholder="Happy Hour — 20% off!" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            disabled={setHappyHour.isPending}
            onClick={() => {
              setHhMsg('');
              setHappyHour.mutate({ venueId: venue.id, enabled: hhForm.enabled, startTime: hhForm.startTime, endTime: hhForm.endTime, discountPercent: Number(hhForm.discountPercent) || 0, label: hhForm.label }, {
                onSuccess: () => setHhMsg('Happy hour saved!'),
                onError: (e) => setHhMsg(e.message),
              });
            }}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            {setHappyHour.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Happy Hour</>}
          </button>
          {hhMsg && <span className="font-data" style={{ fontSize: '0.625rem', color: hhMsg.includes('saved') ? '#5E8B5E' : '#B85450' }}>{hhMsg}</span>}
        </div>
      </div>

      {/* Xero Integration */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: '#13B5EA' }}>
            <Link2 size={20} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.25rem' }}>Xero Accounting</h3>
            <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', lineHeight: 1.5, marginBottom: 12 }}>
              Connect your Xero account to automatically sync daily revenue.
            </p>
            {(xeroConn as any)?.connected ? (
              <div>
                <p className="font-data mb-2" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>
                  <Check size={10} className="inline mr-1" /> Connected
                  {(xeroConn as any).lastSyncAt && <span style={{ color: '#5E5E5E', marginLeft: 8 }}>Last sync: {new Date((xeroConn as any).lastSyncAt).toLocaleDateString()}</span>}
                </p>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <input type="date" value={xeroSyncFrom} onChange={e => setXeroSyncFrom(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#5E5E5E' }}>to</span>
                  <input type="date" value={xeroSyncTo} onChange={e => setXeroSyncTo(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
                  <button
                    disabled={xeroSync.isPending || !xeroSyncFrom || !xeroSyncTo}
                    onClick={() => {
                      setXeroMsg('');
                      xeroSync.mutate({ from: xeroSyncFrom, to: xeroSyncTo }, {
                        onSuccess: () => setXeroMsg('Revenue synced to Xero!'),
                        onError: (e) => setXeroMsg(e.message),
                      });
                    }}
                    className="px-4 py-2 font-button flex items-center gap-2"
                    style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!xeroSyncFrom || !xeroSyncTo) ? 0.5 : 1 }}
                  >
                    {xeroSync.isPending ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                    Sync Revenue
                  </button>
                  <button
                    disabled={xeroDisconnect.isPending}
                    onClick={() => { if (window.confirm('Disconnect Xero?')) xeroDisconnect.mutate(); }}
                    className="px-4 py-2 font-data border"
                    style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#B85450', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
                  >
                    Disconnect
                  </button>
                </div>
                {xeroMsg && <p className="font-data" style={{ fontSize: '0.625rem', color: xeroMsg.includes('synced') ? '#5E8B5E' : '#B85450' }}>{xeroMsg}</p>}
              </div>
            ) : (
              <div>
                {xeroAuthUrl?.configured ? (
                  <button
                    onClick={() => { if (xeroAuthUrl.url) window.open(xeroAuthUrl.url, '_blank'); }}
                    disabled={!xeroAuthUrl.url}
                    className="px-4 py-2 font-button flex items-center gap-2"
                    style={{ background: '#13B5EA', color: '#fff', fontSize: '0.75rem', opacity: !xeroAuthUrl.url ? 0.5 : 1 }}
                  >
                    <Link2 size={14} /> Connect Xero
                  </button>
                ) : (
                  <p className="font-data" style={{ fontSize: '0.625rem', color: '#B85450' }}>
                    <AlertCircle size={10} className="inline mr-1" /> Xero credentials not configured in environment.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: status } = trpc.billing.status.useQuery({ token }, { enabled: !!token });
  const { data: tiers } = trpc.billing.tiers.useQuery();
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const portalQuery = trpc.billing.getBillingPortalUrl.useQuery(
    { token },
    { enabled: false },
  );

  const changeTier = trpc.billing.changeTier.useMutation({
    onSuccess: async (data) => {
      if (data.clientSecret) {
        // Payment required for new subscription — redirect to billing portal
        setPaymentMessage('Payment required — redirecting to billing portal...');
        const result = await portalQuery.refetch();
        if (result.data?.url) {
          window.location.href = result.data.url;
        } else {
          setPaymentMessage('Payment required. Please manage your subscription in the billing portal.');
        }
      } else {
        window.location.reload();
      }
    },
  });

  const handleManageBilling = async () => {
    const result = await portalQuery.refetch();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  return (
    <div>
      <div className="border p-6 mb-6" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-data block mb-1" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Current Plan</span>
            <h2 style={{ fontWeight: 500, fontSize: '1.5rem', color: '#181818' }}>{status?.tierDetails?.name || 'Trial'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: status?.status === 'trial' ? 'rgba(196,149,58,0.12)' : 'rgba(94,139,94,0.12)', color: status?.status === 'trial' ? '#C4953A' : '#5E8B5E' }}>
              {status?.status?.toUpperCase() || 'TRIAL'}
            </span>
            {status?.hasStripeCustomer && (
              <button
                onClick={handleManageBilling}
                disabled={portalQuery.isFetching}
                className="font-button"
                style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: 'transparent', border: '1px solid rgba(24,24,24,0.3)', color: '#181818', cursor: 'pointer' }}
              >
                {portalQuery.isFetching ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>
        {status?.isTrial && status.trialEndsAt && (
          <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
            Trial ends: {new Date(status.trialEndsAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {paymentMessage && (
          <p className="font-data mt-3" style={{ fontSize: '0.75rem', color: '#C4953A' }}>{paymentMessage}</p>
        )}
        {changeTier.error && (
          <p className="font-data mt-3" style={{ fontSize: '0.75rem', color: '#C44444' }}>{(changeTier.error as any).message}</p>
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
              {changeTier.isPending ? 'Updating...' : status?.tier === key ? 'Current Plan' : `Switch to ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab({ venue }: { venue: { slug: string; name: string } | null }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: squareStatus } = trpc.square.status.useQuery({ token }, { enabled: !!token });
  const { data: oauthData, isLoading: oauthLoading, error: oauthError } = trpc.square.getOAuthUrl.useQuery(
    { token },
    { enabled: !!token && !squareStatus?.connected }
  );
  const disconnect = trpc.square.disconnect.useMutation({ onSuccess: () => window.location.reload() });
  const syncMenu = trpc.square.syncMenu.useMutation();
  const syncInventory = trpc.square.syncInventory.useMutation();

  const [squareConnectedBanner, setSquareConnectedBanner] = useState(false);
  const [syncMenuResult, setSyncMenuResult] = useState<{ imported: number; total: number } | null>(null);
  const [syncInventoryResult, setSyncInventoryResult] = useState<{ synced: number } | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('square') === 'connected') {
      setSquareConnectedBanner(true);
      params.delete('square');
      const newSearch = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
    }
  }, []);

  useEffect(() => {
    if (!venue?.slug) return;
    const url = `${window.location.origin}/v/${venue.slug}`;
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then(setQrDataUrl)
      .catch((err: unknown) => console.error('[qr] generation failed:', err));
  }, [venue?.slug]);

  function handleQrDownload() {
    if (!qrDataUrl || !venue?.slug) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${venue.slug}-qr.png`;
    a.click();
  }

  function handleSyncMenu() {
    setSyncMenuResult(null);
    syncMenu.mutate({ token }, {
      onSuccess: (data) => setSyncMenuResult(data),
    });
  }

  function handleSyncInventory() {
    setSyncInventoryResult(null);
    syncInventory.mutate({ token }, {
      onSuccess: (data) => setSyncInventoryResult(data),
    });
  }

  const squareNotConfigured = oauthError && String(oauthError.message).toLowerCase().includes('not configured');

  return (
    <div className="space-y-4">
      {squareConnectedBanner && (
        <div className="border p-4 flex items-center justify-between" style={{ borderColor: '#5E8B5E', background: 'rgba(94,139,94,0.08)' }}>
          <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Check size={10} className="inline mr-1" /> Square connected successfully
          </span>
          <button onClick={() => setSquareConnectedBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
            <X size={14} />
          </button>
        </div>
      )}

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
                <div className="mt-2 space-y-1">
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>
                    <Check size={10} className="inline mr-1" /> Connected
                  </p>
                  {squareStatus.merchantId && (
                    <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>
                      Merchant ID: {squareStatus.merchantId}
                    </p>
                  )}
                </div>
              )}
              {squareNotConfigured && (
                <p className="font-data mt-2" style={{ fontSize: '0.5625rem', color: '#B85450' }}>
                  <AlertCircle size={10} className="inline mr-1" /> Add SQUARE_APP_ID and SQUARE_APP_SECRET to Railway env vars to enable Square.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {squareStatus?.connected ? (
              <button onClick={() => disconnect.mutate({ token })} disabled={disconnect.isPending} className="px-4 py-2 font-data border" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#B85450', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent' }}>
                {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : squareNotConfigured ? null : (
              <button
                onClick={() => { if (oauthData?.url) window.location.href = oauthData.url; }}
                disabled={oauthLoading || !oauthData?.url}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: oauthLoading ? 0.6 : 1 }}
              >
                {oauthLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {oauthLoading ? 'Loading...' : 'Connect Square'}
              </button>
            )}
          </div>
        </div>

        {squareStatus?.connected && (
          <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(24,24,24,0.08)' }}>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSyncMenu}
                disabled={syncMenu.isPending}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: syncMenu.isPending ? 0.6 : 1 }}
              >
                {syncMenu.isPending ? <Loader2 size={14} className="animate-spin" /> : <Coffee size={14} />}
                Sync Menu
              </button>
              {syncMenuResult && (
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>
                  Imported {syncMenuResult.imported} / {syncMenuResult.total} items
                </p>
              )}
              {syncMenu.isError && (
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>Sync failed</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSyncInventory}
                disabled={syncInventory.isPending}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: syncInventory.isPending ? 0.6 : 1 }}
              >
                {syncInventory.isPending ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                Sync Inventory
              </button>
              {syncInventoryResult && (
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>
                  Synced {syncInventoryResult.synced} inventory levels
                </p>
              )}
              {syncInventory.isError && (
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#B85450' }}>Sync failed</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Section */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#181818' }}>
            <QrCode size={20} style={{ color: '#F3F2EE' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.25rem' }}>QR Code</h3>
            <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', lineHeight: 1.5, marginBottom: 16 }}>
              Display this QR code in your venue. Customers scan it to open your ordering page directly.
            </p>
            {qrDataUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <img
                  src={qrDataUrl}
                  alt="Venue QR code"
                  style={{ width: 180, height: 180, border: '1px solid rgba(24,24,24,0.08)' }}
                />
                <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>
                  Links to: {window.location.origin}/v/{venue?.slug}
                </p>
                <button
                  onClick={handleQrDownload}
                  className="px-4 py-2 font-button flex items-center gap-2"
                  style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                >
                  <Download size={14} /> Download PNG
                </button>
              </div>
            )}
            {!qrDataUrl && venue?.slug && (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Generating QR code…</p>
            )}
            {!venue?.slug && (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>No venue configured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewReplyForm({ reviewId, onSuccess }: { reviewId: number; onSuccess: () => void }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);

  const replyMutation = trpc.venue.replyToReview.useMutation({
    onSuccess: () => {
      setReply('');
      setOpen(false);
      onSuccess();
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 8, fontSize: '0.75rem', color: '#5E5E5E', background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
      >
        Reply to this review
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(24,24,24,0.03)', border: '1px solid rgba(24,24,24,0.08)' }}>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        placeholder="Write your reply…"
        style={{ width: '100%', fontSize: 13, color: '#181818', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 10px', resize: 'vertical', fontFamily: 'Inter', boxSizing: 'border-box' as const }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => replyMutation.mutate({ token, reviewId, reply })}
          disabled={replyMutation.isPending || !reply.trim()}
          style={{ fontSize: '0.625rem', background: '#181818', color: '#F3F2EE', border: 'none', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, opacity: replyMutation.isPending || !reply.trim() ? 0.6 : 1 }}
        >
          {replyMutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
        <button
          onClick={() => { setOpen(false); setReply(''); }}
          style={{ fontSize: '0.625rem', background: 'none', color: '#5E5E5E', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
        >
          Cancel
        </button>
      </div>
      {replyMutation.isError && (
        <p style={{ fontSize: 12, color: '#B85450', marginTop: 6 }}>{replyMutation.error?.message}</p>
      )}
    </div>
  );
}

function ReviewsTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
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
          {(r as any).ownerReply ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(24,24,24,0.04)', border: '1px solid rgba(24,24,24,0.08)', borderRadius: 6 }}>
              <span style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: 4 }}>Owner reply:</span>
              <p style={{ fontSize: 13, color: '#181818', margin: 0 }}>{(r as any).ownerReply}</p>
            </div>
          ) : (
            <ReviewReplyForm
              reviewId={r.id}
              onSuccess={() => utils.venue.listReviews.invalidate()}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Modifier option parser ────────────────────────────────────────────────────
// Parses "Oat (+0.50), Almond (+0.80), Regular" → [{name, priceAdj}]
function parseModifierOptions(raw: string): { name: string; priceAdj: number }[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^(.+?)\s*\(([+-]\d+(?:\.\d+)?)\)\s*$/);
      if (match) {
        return { name: match[1].trim(), priceAdj: parseFloat(match[2]) };
      }
      return { name: segment, priceAdj: 0 };
    });
}

// ── Modifier Panel (per menu item) ────────────────────────────────────────────
function ModifiersPanel({ menuItemId, venueId }: { menuItemId: number; venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();

  const { data: allModifiers, isLoading } = trpc.venue.listMenuModifiers.useQuery(
    { venueId },
    { enabled: !!venueId }
  );
  const modifiers = allModifiers?.filter((m: any) => m.menuItemId === menuItemId) ?? [];

  const addMutation = trpc.venue.addMenuModifier.useMutation({
    onSuccess: () => {
      utils.venue.listMenuModifiers.invalidate();
      setAddForm({ name: '', options: '', required: false });
      setAddError('');
    },
    onError: (err) => setAddError(err.message),
  });

  const deleteMutation = trpc.venue.deleteMenuModifier.useMutation({
    onSuccess: () => utils.venue.listMenuModifiers.invalidate(),
  });

  const [addForm, setAddForm] = useState({ name: '', options: '', required: false });
  const [addError, setAddError] = useState('');

  const handleAdd = () => {
    if (!addForm.name.trim() || !addForm.options.trim()) {
      setAddError('Group name and at least one option are required.');
      return;
    }
    const parsedOptions = parseModifierOptions(addForm.options);
    addMutation.mutate({
      token,
      menuItemId,
      name: addForm.name.trim(),
      options: parsedOptions,
      required: addForm.required,
      sortOrder: modifiers.length,
    });
  };

  const panelInputCls = "w-full bg-transparent border px-3 py-2 focus:outline-none";
  const panelInputStyle = { fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };
  const panelLabelStyle = { fontSize: '0.5625rem', letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#5E5E5E', fontFamily: 'Geist Mono' };

  return (
    <div style={{ background: '#FAFAF8', borderTop: '1px solid rgba(24,24,24,0.08)', padding: '1rem 1.25rem' }}>
      <span className="font-data block mb-3" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Modifier Groups</span>

      {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: '#5E5E5E' }} />}

      {!isLoading && modifiers.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: '#5E5E5E', marginBottom: '0.75rem' }}>No modifier groups yet.</p>
      )}

      {/* Existing modifier groups */}
      <div className="space-y-2 mb-4">
        {modifiers.map((mod: any) => (
          <div key={mod.id} className="border p-3 flex items-start justify-between gap-3" style={{ borderColor: 'rgba(24,24,24,0.10)', background: '#F3F2EE' }}>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#181818' }}>{mod.name}</span>
                {mod.required && (
                  <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 5px', background: 'rgba(24,24,24,0.08)', color: '#5E5E5E' }}>Required</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {mod.options?.map((opt: { name: string; priceAdj: number }, i: number) => (
                  <span key={i} className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.06em', padding: '2px 6px', background: 'rgba(24,24,24,0.06)', color: '#5E5E5E' }}>
                    {opt.name}{opt.priceAdj !== 0 ? ` (${opt.priceAdj > 0 ? '+' : ''}${opt.priceAdj.toFixed(2)})` : ''}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate({ token, modifierId: mod.id })}
              disabled={deleteMutation.isPending}
              className="p-1.5 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
              style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent', flexShrink: 0 }}
              aria-label="Delete modifier group"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add modifier group form */}
      <div className="border p-3" style={{ borderColor: 'rgba(24,24,24,0.10)', background: '#F3F2EE' }}>
        <span className="font-data block mb-2" style={{ fontSize: '0.5625rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#5E5E5E' }}>Add Modifier Group</span>
        <div className="grid grid-cols-1 gap-2 mb-2">
          <div>
            <label className="font-data block mb-1" style={panelLabelStyle}>Group Name</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={panelInputCls}
              style={panelInputStyle}
              placeholder="e.g. Milk Type"
            />
          </div>
          <div>
            <label className="font-data block mb-1" style={panelLabelStyle}>Options (comma-separated, optional price adj)</label>
            <input
              type="text"
              value={addForm.options}
              onChange={(e) => setAddForm({ ...addForm, options: e.target.value })}
              className={panelInputCls}
              style={panelInputStyle}
              placeholder="Oat (+0.50), Almond (+0.80), Regular"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.8125rem', color: '#181818' }}>
            <input
              type="checkbox"
              checked={addForm.required}
              onChange={(e) => setAddForm({ ...addForm, required: e.target.checked })}
              style={{ accentColor: '#181818' }}
            />
            <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E' }}>Required</span>
          </label>
        </div>
        {addError && (
          <p className="font-data mb-2" style={{ fontSize: '0.625rem', color: '#B85450' }}>{addError}</p>
        )}
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 font-button"
          style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer', opacity: addMutation.isPending ? 0.6 : 1 }}
        >
          {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add Modifier Group
        </button>
      </div>
    </div>
  );
}

function MenuTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.venue.listMenu.useQuery({ venueId: venue.id });
  const { data: inventoryLevels, refetch: refetchInventory } = trpc.venue.getInventoryLevels.useQuery(undefined, { enabled: !!venue.id });
  const setInventoryQty = trpc.venue.setInventoryQuantity.useMutation({ onSuccess: () => { refetchInventory(); } });
  const [stockFormOpen, setStockFormOpen] = useState<number | null>(null);
  const [stockForm, setStockForm] = useState({ quantity: '', quantityAlert: '' });

  const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
  const [openModifiers, setOpenModifiers] = useState<Set<number>>(new Set());
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
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,24,24,0.06)', borderRadius: 4 }}>
                      <Coffee size={20} style={{ color: '#5E5E5E' }} />
                    </div>
                  )}
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
                {/* Inventory inline */}
                {(() => {
                  const inv = (inventoryLevels as any[])?.find((r: any) => r.menuItemId === item.id);
                  const qty = inv?.quantity ?? null;
                  const alert = inv?.quantityAlert ?? null;
                  const isLow = qty !== null && alert !== null && qty <= alert;
                  return (
                    <div className="flex flex-col items-end mr-2" style={{ minWidth: 80 }}>
                      <div className="flex items-center gap-1 mb-1">
                        {qty !== null ? (
                          <span className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.06em', color: isLow ? '#B85450' : '#5E5E5E' }}>
                            {qty} in stock
                          </span>
                        ) : (
                          <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>—</span>
                        )}
                        {isLow && <span className="font-data" style={{ fontSize: '0.5rem', background: 'rgba(184,84,80,0.12)', color: '#B85450', padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Low</span>}
                      </div>
                      {stockFormOpen === item.id ? (
                        <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
                          <input type="number" min={0} placeholder="Qty" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} style={{ border: '1px solid rgba(24,24,24,0.15)', padding: '3px 6px', fontSize: 12, background: '#fff', color: '#181818', width: '100%' }} />
                          <input type="number" min={0} placeholder="Alert at" value={stockForm.quantityAlert} onChange={e => setStockForm(f => ({ ...f, quantityAlert: e.target.value }))} style={{ border: '1px solid rgba(24,24,24,0.15)', padding: '3px 6px', fontSize: 12, background: '#fff', color: '#181818', width: '100%' }} />
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setInventoryQty.mutate({ menuItemId: item.id, quantity: Number(stockForm.quantity), quantityAlert: stockForm.quantityAlert ? Number(stockForm.quantityAlert) : undefined }, { onSuccess: () => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); } });
                              }}
                              style={{ flex: 1, background: '#181818', color: '#F3F2EE', border: 'none', fontSize: 11, padding: '3px 6px', cursor: 'pointer' }}
                            >Save</button>
                            <button onClick={() => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', fontSize: 11, padding: '3px 6px', cursor: 'pointer', color: '#5E5E5E' }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setStockFormOpen(item.id); setStockForm({ quantity: qty !== null ? String(qty) : '', quantityAlert: alert !== null ? String(alert) : '' }); }}
                          style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '2px 7px', cursor: 'pointer', color: '#5E5E5E' }}
                        >Set Stock</button>
                      )}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setOpenModifiers((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                      return next;
                    })}
                    aria-label="Manage modifiers"
                    title="Manage Modifiers"
                    className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all flex items-center gap-1"
                    style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent', fontSize: '0' }}
                  >
                    {openModifiers.has(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
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

              {/* Modifiers accordion panel */}
              {openModifiers.has(item.id) && (
                <ModifiersPanel menuItemId={item.id} venueId={venue.id} />
              )}

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
              <label className="font-data block mb-1.5" style={labelStyle}>Dietary Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                {[
                  { tag: 'vegan', label: 'Vegan' },
                  { tag: 'gluten-free', label: 'GF' },
                  { tag: 'dairy-free', label: 'Dairy-free' },
                  { tag: 'nut-free', label: 'Nut-free' },
                  { tag: 'vegetarian', label: 'Vegetarian' },
                ].map(({ tag, label }) => {
                  const tags = form.dietary ? form.dietary.split(',').map((t) => t.trim()).filter(Boolean) : [];
                  const checked = tags.includes(tag);
                  return (
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#181818' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = form.dietary ? form.dietary.split(',').map((t) => t.trim()).filter(Boolean) : [];
                          const next = e.target.checked
                            ? [...current, tag]
                            : current.filter((t) => t !== tag);
                          setForm({ ...form, dietary: next.join(', ') });
                        }}
                        style={{ accentColor: '#181818' }}
                      />
                      <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E' }}>{label}</span>
                    </label>
                  );
                })}
              </div>
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
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="https://images.unsplash.com/..."
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
    recipientEmail: '',
    message: '',
  });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const createCard = trpc.venue.createGiftCard.useMutation({
    onSuccess: (data) => {
      setNewCode(data.code);
      setForm({ amount: '', senderName: '', recipientName: '', recipientPhone: '', recipientEmail: '', message: '' });
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
      recipientEmail: form.recipientEmail || undefined,
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
          <div>
            <label style={labelStyle}>Recipient Email (sends digital card)</label>
            <input type="email" placeholder="e.g. jane@example.com" value={form.recipientEmail}
              onChange={e => setForm({ ...form, recipientEmail: e.target.value })} style={inputStyle} />
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

function LocationsTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
  const [form, setForm] = useState({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false });
  const [deleteError, setDeleteError] = useState('');
  const utils = trpc.useUtils();

  const { data: locationsList } = trpc.venue.listLocations.useQuery({ venueId: venue.id });

  const addMutation = trpc.venue.addLocation.useMutation({
    onSuccess: () => { utils.venue.listLocations.invalidate(); setMode('list'); setForm({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false }); },
  });

  const updateMutation = trpc.venue.updateLocation.useMutation({
    onSuccess: () => { utils.venue.listLocations.invalidate(); setMode('list'); },
  });

  const deleteMutation = trpc.venue.deleteLocation.useMutation({
    onSuccess: () => utils.venue.listLocations.invalidate(),
    onError: (err) => setDeleteError(err.message),
  });

  const handleEdit = (loc: any) => {
    setMode({ type: 'edit', id: loc.id });
    setForm({ name: loc.name || '', address: loc.address || '', phone: loc.phone || '', hoursWeekday: loc.hoursWeekday || '', hoursSaturday: loc.hoursSaturday || '', hoursSunday: loc.hoursSunday || '', isDefault: loc.isDefault || false });
  };

  const handleSubmit = () => {
    if (!form.name || !form.address) return;
    if (mode === 'create') {
      addMutation.mutate({ token, ...form });
    } else if (typeof mode === 'object' && mode.type === 'edit') {
      updateMutation.mutate({ token, locationId: mode.id, ...form });
    }
  };

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };

  if (mode === 'create' || (typeof mode === 'object' && mode.type === 'edit')) {
    const isEdit = typeof mode === 'object';
    return (
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>
            {isEdit ? 'Edit Location' : 'Add Location'}
          </h2>
          <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Name *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. City Centre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Address *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 123 Main St" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Phone</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 03 9999 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Weekday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 7am — 4pm" value={form.hoursWeekday} onChange={e => setForm(f => ({ ...f, hoursWeekday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Saturday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 8am — 2pm" value={form.hoursSaturday} onChange={e => setForm(f => ({ ...f, hoursSaturday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>Sunday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 9am — 1pm or Closed" value={form.hoursSunday} onChange={e => setForm(f => ({ ...f, hoursSunday: e.target.value }))} />
          </div>
        </div>
        {(addMutation.error || updateMutation.error) && (
          <div className="flex items-center gap-2 mb-4" style={{ color: '#B85450', fontSize: '0.875rem' }}>
            <AlertCircle size={14} />
            {addMutation.error?.message || updateMutation.error?.message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.address || addMutation.isPending || updateMutation.isPending}
            className="px-6 py-3 font-button"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!form.name || !form.address) ? 0.5 : 1 }}
          >
            {isEdit ? 'SAVE CHANGES' : 'ADD LOCATION'}
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 font-button border" style={{ background: 'none', color: '#181818', fontSize: '0.75rem', borderColor: 'rgba(24,24,24,0.15)' }}>
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Locations</h2>
        <button onClick={() => { setMode('create'); setForm({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false }); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> ADD LOCATION
        </button>
      </div>
      {deleteError && (
        <div className="flex items-center gap-2 mb-4 p-3 border" style={{ color: '#B85450', borderColor: '#B85450', fontSize: '0.875rem' }}>
          <AlertCircle size={14} /> {deleteError}
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B85450' }}><X size={14} /></button>
        </div>
      )}
      {locationsList && locationsList.length === 0 && (
        <div className="border p-8 text-center" style={{ borderColor: 'rgba(24,24,24,0.08)', color: '#5E5E5E' }}>
          <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No locations added yet. Add your first location to enable location-based ordering.</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {locationsList?.map((loc) => (
          <div key={loc.id} className="border p-5 flex items-start justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#181818', marginBottom: 4 }}>{loc.name}</div>
              <div style={{ fontSize: '0.8125rem', color: '#5E5E5E', marginBottom: 2 }}>{loc.address}</div>
              {loc.phone && <div style={{ fontSize: '0.8125rem', color: '#5E5E5E', marginBottom: 2 }}>{loc.phone}</div>}
              {loc.hoursWeekday && <div className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E', marginTop: 6 }}>Mon–Fri: {loc.hoursWeekday}</div>}
              {loc.hoursSaturday && <div className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>Sat: {loc.hoursSaturday}</div>}
              {loc.hoursSunday && <div className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>Sun: {loc.hoursSunday}</div>}
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button onClick={() => handleEdit(loc)} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => { setDeleteError(''); deleteMutation.mutate({ token, locationId: loc.id }); }}
                disabled={deleteMutation.isPending}
                className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CATERING_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  completed: 'Completed',
};

const CATERING_STATUS_COLORS: Record<string, string> = {
  new: '#C4953A',
  quoted: '#2563EB',
  confirmed: '#5E8B5E',
  completed: '#5E5E5E',
};

const CATERING_STATUS_NEXT: Record<string, string[]> = {
  new: ['quoted', 'confirmed'],
  quoted: ['confirmed', 'completed'],
  confirmed: ['completed'],
  completed: [],
};

function CateringTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const utils = trpc.useUtils();

  const { data: requestsList } = trpc.venue.listCateringRequests.useQuery({
    token,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });

  const updateStatus = trpc.venue.updateCateringStatus.useMutation({
    onSuccess: () => {
      utils.venue.listCateringRequests.invalidate();
      setEditingId(null);
      setPendingStatus('');
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Catering Requests</h2>
        <div className="flex gap-2">
          {['all', 'new', 'quoted', 'confirmed', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px',
                background: statusFilter === s ? '#181818' : 'transparent',
                color: statusFilter === s ? '#F3F2EE' : '#5E5E5E',
                border: '1px solid rgba(24,24,24,0.15)',
                cursor: 'pointer',
                fontFamily: 'Geist Mono',
                fontSize: '0.5rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {requestsList && requestsList.length === 0 && (
        <div className="border p-8 text-center" style={{ borderColor: 'rgba(24,24,24,0.08)', color: '#5E5E5E' }}>
          <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No catering requests yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {requestsList?.map((req) => (
          <div key={req.id} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: editingId === req.id ? '#E8E4DD' : '#fff' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#181818', marginBottom: 2 }}>{req.name}</div>
                <div style={{ fontSize: '0.8125rem', color: '#5E5E5E' }}>{req.phone}{req.email ? ` · ${req.email}` : ''}</div>
              </div>
              <span style={{
                fontFamily: 'Geist Mono', fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 8px', background: `${CATERING_STATUS_COLORS[req.status] || '#5E5E5E'}18`,
                color: CATERING_STATUS_COLORS[req.status] || '#5E5E5E',
              }}>
                {CATERING_STATUS_LABELS[req.status] || req.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E' }}>Event Date</span>
                <div style={{ fontSize: '0.875rem', color: '#181818' }}>{req.eventDate}</div>
              </div>
              <div>
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E' }}>Guest Count</span>
                <div style={{ fontSize: '0.875rem', color: '#181818' }}>{req.guestCount}</div>
              </div>
            </div>
            {req.details && (
              <p style={{ fontSize: '0.875rem', color: '#5E5E5E', marginBottom: 12, fontStyle: 'italic' }}>{req.details}</p>
            )}

            {/* Confirm-gate: select picks next status, confirm button fires mutation */}
            {CATERING_STATUS_NEXT[req.status]?.length > 0 && (
              <div>
                {editingId === req.id ? (
                  <div className="flex gap-2 items-center">
                    <span style={{ fontSize: '0.8125rem', color: '#5E5E5E' }}>Move to <strong>{CATERING_STATUS_LABELS[pendingStatus]}</strong>?</span>
                    <button
                      onClick={() => updateStatus.mutate({ token, requestId: req.id, status: pendingStatus as any })}
                      disabled={updateStatus.isPending}
                      className="px-4 py-2 font-button"
                      style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setPendingStatus(''); }}
                      className="px-4 py-2 font-button border"
                      style={{ background: 'none', color: '#181818', fontSize: '0.625rem', borderColor: 'rgba(24,24,24,0.15)', cursor: 'pointer' }}
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) { setEditingId(req.id); setPendingStatus(e.target.value); } }}
                    style={{ padding: '6px 10px', border: '1px solid rgba(24,24,24,0.15)', background: '#F3F2EE', fontSize: '0.8125rem', color: '#181818', cursor: 'pointer' }}
                  >
                    <option value="">Update status…</option>
                    {CATERING_STATUS_NEXT[req.status]?.map((s) => (
                      <option key={s} value={s}>{CATERING_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bundles Tab ─────────────────────────────────────────────────────────────
function BundlesTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: bundles, isLoading } = trpc.venue.listBundles.useQuery({ venueId }, { enabled: !!venueId });
  const createBundle = trpc.venue.createBundle.useMutation({ onSuccess: () => { utils.venue.listBundles.invalidate(); setShowForm(false); resetForm(); } });
  const updateBundle = trpc.venue.updateBundle.useMutation({ onSuccess: () => { utils.venue.listBundles.invalidate(); setEditId(null); } });
  const deleteBundle = trpc.venue.deleteBundle.useMutation({ onSuccess: () => utils.venue.listBundles.invalidate() });

  const emptyForm = { name: '', description: '', itemSlugs: '', bundlePrice: '', isActive: true };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const resetForm = () => setForm(emptyForm);

  const inputStyle = { padding: '8px 12px', border: '1px solid rgba(24,24,24,0.15)', fontSize: 13, background: '#fff', color: '#181818', width: '100%' };
  const labelStyle: React.CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex justify-between items-center">
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Bundles</h2>
        <button onClick={() => { setShowForm(true); resetForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <Plus size={14} /> New Bundle
        </button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

      {showForm && (
        <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#FAFAF8' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: 12 }}>New Bundle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Breakfast Combo" /></div>
            <div><label style={labelStyle}>Bundle Price ($) *</label><input type="number" min="0" step="0.01" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} style={inputStyle} placeholder="e.g. 12.00" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Item Slugs (comma-separated)</label><input value={form.itemSlugs} onChange={e => setForm({ ...form, itemSlugs: e.target.value })} style={inputStyle} placeholder="flat-white,croissant" /><p style={{ fontSize: 11, color: '#5E5E5E', marginTop: 3, fontFamily: 'Geist Mono' }}>Enter the slugs of menu items to include, separated by commas.</p></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="bundle-active-new" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ accentColor: '#181818' }} />
            <label htmlFor="bundle-active-new" style={{ fontSize: '0.8125rem', color: '#181818', cursor: 'pointer' }}>Active</label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { if (!form.name || !form.bundlePrice) { setMsg('Error: Name and price required'); return; } setMsg(''); createBundle.mutate({ venueId, name: form.name, description: form.description || undefined, itemSlugs: form.itemSlugs.split(',').map(s => s.trim()).filter(Boolean), bundlePrice: form.bundlePrice, isActive: form.isActive }); }} disabled={createBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
              {createBundle.isPending ? 'Saving…' : 'Create Bundle'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: '#181818' }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />}
      {!isLoading && (!bundles || (bundles as any[]).length === 0) && <p style={{ color: '#5E5E5E', fontSize: 14 }}>No bundles yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(bundles as any[] | undefined)?.map((b) => (
          <div key={b.id} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            {editId === b.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={labelStyle}>Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bundle Price ($)</label><input type="number" min="0" step="0.01" value={editForm.bundlePrice} onChange={e => setEditForm({ ...editForm, bundlePrice: e.target.value })} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Item Slugs</label><input value={editForm.itemSlugs} onChange={e => setEditForm({ ...editForm, itemSlugs: e.target.value })} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" id={`bundle-active-${b.id}`} checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} style={{ accentColor: '#181818' }} />
                  <label htmlFor={`bundle-active-${b.id}`} style={{ fontSize: '0.8125rem', color: '#181818', cursor: 'pointer' }}>Active</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { updateBundle.mutate({ bundleId: b.id, name: editForm.name, description: editForm.description || undefined, itemSlugs: editForm.itemSlugs.split(',').map((s: string) => s.trim()).filter(Boolean), bundlePrice: editForm.bundlePrice, isActive: editForm.isActive }); }} disabled={updateBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: '#181818' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{b.name}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '1px 6px', background: b.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: b.isActive ? '#5E8B5E' : '#B85450' }}>{b.isActive ? 'ACTIVE' : 'OFF'}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: '#181818' }}>${Number(b.bundlePrice).toFixed(2)}</span>
                  </div>
                  {b.description && <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 4 }}>{b.description}</p>}
                  <p style={{ fontSize: 11, color: '#5E5E5E', fontFamily: 'Geist Mono' }}>Items: {Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || '').slice(0, 60)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(b.id); setEditForm({ name: b.name, description: b.description || '', itemSlugs: Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || ''), bundlePrice: String(b.bundlePrice), isActive: !!b.isActive }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}><Edit2 size={14} /></button>
                  {deleteConfirm === b.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { deleteBundle.mutate({ bundleId: b.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(b.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────
function CampaignsTab({ venueId: _venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const createCampaign = trpc.campaigns.create.useMutation({ onSuccess: () => { utils.campaigns.list.invalidate(); setShowForm(false); resetForm(); } });
  const sendCampaign = trpc.campaigns.send.useMutation({ onSuccess: () => utils.campaigns.list.invalidate() });
  const deleteCampaign = trpc.campaigns.delete.useMutation({ onSuccess: () => utils.campaigns.list.invalidate() });

  const emptyForm = { name: '', type: 'email' as 'email' | 'sms', segment: 'all', subject: '', body: '' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const resetForm = () => setForm(emptyForm);

  const inputStyle = { padding: '8px 12px', border: '1px solid rgba(24,24,24,0.15)', fontSize: 13, background: '#fff', color: '#181818', width: '100%' };
  const labelStyle: React.CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  const segmentLabel: Record<string, string> = { all: 'All Customers', active30: 'Active last 30 days', highvalue: 'High value (≥100 pts)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex justify-between items-center">
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Campaigns</h2>
        <button onClick={() => { setShowForm(true); resetForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

      {showForm && (
        <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#FAFAF8' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: 12 }}>New Campaign</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Summer Promo" /></div>
            <div>
              <label style={labelStyle}>Segment</label>
              <select value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} style={inputStyle}>
                <option value="all">All Customers</option>
                <option value="active30">Active last 30 days</option>
                <option value="highvalue">High value (≥100 pts)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Type</label>
              <div className="flex gap-6">
                {(['email', 'sms'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 14, color: '#181818' }}>
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
                createCampaign.mutate({ name: form.name, type: form.type, segment: form.segment, subject: form.subject || undefined, body: form.body });
              }}
              style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
            >{createCampaign.isPending ? 'Saving…' : 'Save Draft'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: '#181818' }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />}
      {!isLoading && (!campaigns || (campaigns as any[]).length === 0) && <p style={{ color: '#5E5E5E', fontSize: 14 }}>No campaigns yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(campaigns as any[] | undefined)?.map((c) => (
          <div key={c.id} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <div className="flex items-start justify-between gap-4">
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{c.name}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: c.type === 'email' ? 'rgba(37,99,235,0.10)' : 'rgba(196,149,58,0.12)', color: c.type === 'email' ? '#2563EB' : '#C4953A', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{c.type}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: c.status === 'sent' ? 'rgba(94,139,94,0.12)' : 'rgba(24,24,24,0.06)', color: c.status === 'sent' ? '#5E8B5E' : '#5E5E5E', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{c.status}</span>
                  <span style={{ fontSize: 12, color: '#5E5E5E' }}>{segmentLabel[c.segment] || c.segment}</span>
                </div>
                {c.sentAt && <p style={{ fontSize: 11, color: '#5E5E5E', fontFamily: 'Geist Mono' }}>Sent: {new Date(c.sentAt).toLocaleString()}</p>}
                {c.recipientCount != null && <p style={{ fontSize: 11, color: '#5E5E5E' }}>Recipients: {c.recipientCount}</p>}
              </div>
              <div className="flex gap-2 items-center">
                {c.status === 'draft' && (
                  <>
                    <button
                      disabled={sendCampaign.isPending}
                      onClick={() => {
                        if (window.confirm('This will send to all matching customers. Continue?')) {
                          sendCampaign.mutate({ campaignId: c.id });
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 font-button"
                      style={{ background: '#5E8B8B', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}
                    >
                      <Send size={12} /> Send
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this campaign?')) deleteCampaign.mutate({ campaignId: c.id }); }}
                      className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                      style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}
                    ><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loyalty Tab (with Rewards Catalogue) ────────────────────────────────────
function LoyaltyTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: accounts, isLoading: accsLoading } = trpc.venue.listLoyaltyAccounts.useQuery({ venueId }, { enabled: !!venueId });
  const { data: rewards, isLoading: rewardsLoading } = trpc.loyaltyRewards.listAll.useQuery();
  const createReward = trpc.loyaltyRewards.create.useMutation({ onSuccess: () => { utils.loyaltyRewards.listAll.invalidate(); setShowRewardForm(false); resetRewardForm(); } });
  const updateReward = trpc.loyaltyRewards.update.useMutation({ onSuccess: () => { utils.loyaltyRewards.listAll.invalidate(); setEditRewardId(null); } });
  const deleteReward = trpc.loyaltyRewards.delete.useMutation({ onSuccess: () => utils.loyaltyRewards.listAll.invalidate() });

  const emptyReward = { name: '', description: '', pointsCost: '', rewardType: 'free_item' as string, rewardValue: '', menuItemSlug: '', sortOrder: '' };
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [editRewardId, setEditRewardId] = useState<number | null>(null);
  const [editRewardForm, setEditRewardForm] = useState(emptyReward);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const resetRewardForm = () => setRewardForm(emptyReward);

  const inputStyle = { padding: '8px 12px', border: '1px solid rgba(24,24,24,0.15)', fontSize: 13, background: '#fff', color: '#181818', width: '100%' };
  const labelStyle: React.CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  const rewardTypeOpts = [
    { value: 'free_item', label: 'Free Item' },
    { value: 'discount_percent', label: 'Discount %' },
    { value: 'discount_fixed', label: 'Discount Fixed ($)' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Loyalty Accounts */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 16 }}>Loyalty Accounts</h2>
        {accsLoading && <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />}
        {!accsLoading && (!accounts || (accounts as any[]).length === 0) && <p style={{ color: '#5E5E5E', fontSize: 14 }}>No loyalty accounts yet.</p>}
        {(accounts as any[] | undefined) && (accounts as any[]).length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Customer', 'Phone', 'Points', 'Tier', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(accounts as any[]).map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 500, color: '#181818' }}>{a.customerName || '—'}</td>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E', fontFamily: 'Geist Mono', fontSize: 12 }}>{a.phone || '—'}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#181818' }}>{a.points ?? 0}</td>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E' }}>{a.tier || 'bronze'}</td>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E', fontFamily: 'Geist Mono', fontSize: 11 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rewards Catalogue */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Rewards Catalogue</h2>
          <button onClick={() => { setShowRewardForm(true); resetRewardForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
            <Plus size={14} /> New Reward
          </button>
        </div>

        {msg && <p style={{ fontSize: 13, marginBottom: 8, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

        {showRewardForm && (
          <div className="border p-4 mb-4" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#FAFAF8' }}>
            <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: 12 }}>New Reward</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={labelStyle}>Name *</label><input value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} style={inputStyle} placeholder="e.g. Free Coffee" /></div>
              <div><label style={labelStyle}>Points Cost *</label><input type="number" min="1" value={rewardForm.pointsCost} onChange={e => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} style={inputStyle} placeholder="e.g. 100" /></div>
              <div>
                <label style={labelStyle}>Reward Type</label>
                <select value={rewardForm.rewardType} onChange={e => setRewardForm({ ...rewardForm, rewardType: e.target.value })} style={inputStyle}>
                  {rewardTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Reward Value</label><input value={rewardForm.rewardValue} onChange={e => setRewardForm({ ...rewardForm, rewardValue: e.target.value })} style={inputStyle} placeholder="e.g. flat-white or 20%" /></div>
              <div><label style={labelStyle}>Menu Item Slug (optional)</label><input value={rewardForm.menuItemSlug} onChange={e => setRewardForm({ ...rewardForm, menuItemSlug: e.target.value })} style={inputStyle} placeholder="e.g. flat-white" /></div>
              <div><label style={labelStyle}>Sort Order</label><input type="number" min="0" value={rewardForm.sortOrder} onChange={e => setRewardForm({ ...rewardForm, sortOrder: e.target.value })} style={inputStyle} placeholder="0" /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>
            <div className="flex gap-3">
              <button
                disabled={createReward.isPending}
                onClick={() => {
                  if (!rewardForm.name || !rewardForm.pointsCost) { setMsg('Error: Name and points cost required'); return; }
                  setMsg('');
                  createReward.mutate({ name: rewardForm.name, description: rewardForm.description || undefined, pointsCost: Number(rewardForm.pointsCost), rewardType: rewardForm.rewardType, rewardValue: rewardForm.rewardValue || undefined, menuItemSlug: rewardForm.menuItemSlug || undefined, sortOrder: rewardForm.sortOrder ? Number(rewardForm.sortOrder) : undefined });
                }}
                style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
              >{createReward.isPending ? 'Saving…' : 'Create Reward'}</button>
              <button onClick={() => { setShowRewardForm(false); resetRewardForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: '#181818' }}>Cancel</button>
            </div>
          </div>
        )}

        {rewardsLoading && <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />}
        {!rewardsLoading && (!rewards || (rewards as any[]).length === 0) && <p style={{ color: '#5E5E5E', fontSize: 14 }}>No rewards yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(rewards as any[] | undefined)?.map((r) => (
            <div key={r.id} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
              {editRewardId === r.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={labelStyle}>Name</label><input value={editRewardForm.name} onChange={e => setEditRewardForm({ ...editRewardForm, name: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Points Cost</label><input type="number" min="1" value={editRewardForm.pointsCost} onChange={e => setEditRewardForm({ ...editRewardForm, pointsCost: e.target.value })} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Reward Type</label>
                      <select value={editRewardForm.rewardType} onChange={e => setEditRewardForm({ ...editRewardForm, rewardType: e.target.value })} style={inputStyle}>
                        {rewardTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Reward Value</label><input value={editRewardForm.rewardValue} onChange={e => setEditRewardForm({ ...editRewardForm, rewardValue: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Menu Item Slug</label><input value={editRewardForm.menuItemSlug} onChange={e => setEditRewardForm({ ...editRewardForm, menuItemSlug: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Sort Order</label><input type="number" min="0" value={editRewardForm.sortOrder} onChange={e => setEditRewardForm({ ...editRewardForm, sortOrder: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={updateReward.isPending} onClick={() => { updateReward.mutate({ rewardId: r.id, name: editRewardForm.name, pointsCost: Number(editRewardForm.pointsCost), rewardType: editRewardForm.rewardType, rewardValue: editRewardForm.rewardValue || undefined, menuItemSlug: editRewardForm.menuItemSlug || undefined, sortOrder: editRewardForm.sortOrder ? Number(editRewardForm.sortOrder) : undefined }); }} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditRewardId(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: '#181818' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{r.name}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'rgba(94,139,139,0.12)', color: '#5E8B8B' }}>{r.pointsCost} PTS</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'rgba(24,24,24,0.06)', color: '#5E5E5E', textTransform: 'uppercase' as const }}>{r.rewardType?.replace('_', ' ')}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: r.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: r.isActive ? '#5E8B5E' : '#B85450' }}>{r.isActive ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                    {r.description && <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 2 }}>{r.description}</p>}
                    {r.rewardValue && <p style={{ fontSize: 12, color: '#5E5E5E', fontFamily: 'Geist Mono' }}>Value: {r.rewardValue}</p>}
                    {r.menuItemSlug && <p style={{ fontSize: 12, color: '#5E5E5E', fontFamily: 'Geist Mono' }}>Item: {r.menuItemSlug}</p>}
                    {r.sortOrder != null && <p style={{ fontSize: 11, color: '#5E5E5E' }}>Sort: {r.sortOrder}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditRewardId(r.id); setEditRewardForm({ name: r.name, description: r.description || '', pointsCost: String(r.pointsCost), rewardType: r.rewardType || 'free_item', rewardValue: r.rewardValue || '', menuItemSlug: r.menuItemSlug || '', sortOrder: r.sortOrder != null ? String(r.sortOrder) : '' }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}><Edit2 size={14} /></button>
                    {deleteConfirm === r.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => { deleteReward.mutate({ rewardId: r.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F85450] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Promo / Discount Codes Tab ───────────────────────────────────────────────
function PromoTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();

  const codesQuery = trpc.promo.listDiscountCodes.useQuery({ token }, { enabled: !!token });
  const createMut = trpc.promo.createDiscountCode.useMutation({
    onSuccess: () => {
      utils.promo.listDiscountCodes.invalidate();
      setForm({ code: '', type: 'percentage', value: '', minOrderAmount: '', maxUses: '', expiresAt: '' });
      setMsg('✅ Code created');
    },
    onError: (e: any) => setMsg(`❌ ${e.message}`),
  });
  const toggleMut = trpc.promo.toggleDiscountCode.useMutation({
    onSuccess: () => utils.promo.listDiscountCodes.invalidate(),
  });
  const deleteMut = trpc.promo.deleteDiscountCode.useMutation({
    onSuccess: () => utils.promo.listDiscountCodes.invalidate(),
  });

  const [form, setForm] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed',
    value: '', minOrderAmount: '', maxUses: '', expiresAt: '',
  });
  const [msg, setMsg] = useState('');

  const inputStyle = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
    fontSize: 13, background: '#fff', color: '#181818', width: '100%', boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  function handleCreate() {
    setMsg('');
    const v = Number(form.value);
    if (!form.code || !v) { setMsg('Code and value are required'); return; }
    createMut.mutate({
      token,
      code: form.code,
      type: form.type,
      value: v,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      expiresAt: form.expiresAt || undefined,
    });
  }

  const codes = codesQuery.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 16 }}>
          New Discount Code
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Code *</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. WELCOME10" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
              style={inputStyle}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Value *</label>
            <input type="number" min="0.01" step="0.01"
              placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
              value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Min Order ($)</label>
            <input type="number" min="0" step="0.01" placeholder="No minimum"
              value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max Uses</label>
            <input type="number" min="1" step="1" placeholder="Unlimited"
              value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Expires At</label>
            <input type="datetime-local" value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              style={inputStyle} />
          </div>
        </div>
        {msg && <p style={{ fontSize: 13, marginBottom: 8, color: msg.startsWith('✅') ? '#16a34a' : '#B85450' }}>{msg}</p>}
        <button onClick={handleCreate} disabled={createMut.isPending}
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          {createMut.isPending ? 'Creating…' : 'Create Code'}
        </button>
      </div>

      {/* Codes list */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: 16 }}>
          All Codes ({codes.length})
        </h2>
        {codes.length === 0 ? (
          <p style={{ color: '#5E5E5E', fontSize: 14 }}>No discount codes yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(24,24,24,0.08)', color: '#5E5E5E', fontFamily: 'Geist Mono', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Discount</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Used</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Limit</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Expires</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Status</th>
                <th style={{ padding: '8px 4px' }} />
              </tr>
            </thead>
            <tbody>
              {codes.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.04)' }}>
                  <td style={{ padding: '10px 4px', fontFamily: 'Geist Mono', fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: '10px 4px' }}>
                    {c.type === 'percentage' ? `${c.value}% off` : `$${Number(c.value).toFixed(2)} off`}
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>{c.usedCount}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', color: '#5E5E5E' }}>{c.maxUses ?? '∞'}</td>
                  <td style={{ padding: '10px 4px', color: '#5E5E5E', fontSize: 12 }}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', borderRadius: 99,
                      background: c.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)',
                      color: c.isActive ? '#5E8B5E' : '#B85450',
                    }}>
                      {c.isActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => toggleMut.mutate({ token, id: c.id, isActive: !c.isActive })}
                      style={{ fontSize: 12, background: 'none', border: '1px solid rgba(24,24,24,0.15)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#181818' }}>
                      {c.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this code?')) deleteMut.mutate({ token, id: c.id }); }}
                      style={{ fontSize: 12, background: 'none', border: '1px solid rgba(184,84,80,0.3)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#B85450' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
