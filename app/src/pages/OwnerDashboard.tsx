import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap, Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X, AlertCircle, Star, Gift, Ticket, MapPin, Briefcase, QrCode, Download, Send, TrendingUp, ChevronDown, ChevronUp, Tag, DollarSign, PieChart as PieChartIcon, Building2, MessageSquare, Percent, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import QRCode from 'qrcode';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const token = localStorage.getItem('b1-owner-token') || '';
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'pl' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering' | 'promo' | 'bundles' | 'campaigns' | 'loyalty' | 'delivery' | 'audit' | 'allvenues' | 'smsmarketing' | 'franchisee' | 'qrcodes' | 'website'>('overview');

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', background: '#F7F8FA' }}>

      {/* Top Header Bar */}
      <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', paddingInline: 20, gap: 16, flexShrink: 0, zIndex: 40, position: 'sticky', top: 0 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 220, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Coffee size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', letterSpacing: '-0.02em' }}>B1 Platform</span>
        </div>

        {/* Venue name + switcher */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{venue.name}</span>
          </div>
          {myVenues && myVenues.length > 1 && (
            <select
              defaultValue={venue.id}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId && Number(selectedId) !== venue.id) switchVenue.mutate({ token, venueId: Number(selectedId) });
              }}
              style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              {myVenues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: venue.subscriptionStatus === 'trial' ? '#FEF3C7' : '#D1FAE5', color: venue.subscriptionStatus === 'trial' ? '#92400E' : '#065F46' }}>
            {venue.subscriptionStatus === 'trial' ? 'Trial' : (venue.subscriptionTier || 'Active')}
          </span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href={`/v/${venue.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151', textDecoration: 'none', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
          >
            <Globe size={13} /> View Site
          </a>
          <a href={`/book/${venue.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151', textDecoration: 'none', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
          >
            <MapPin size={13} /> Bookings
          </a>
          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'default' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{(owner.name || owner.email || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name || owner.email}</span>
          </div>
          <button onClick={logout} title="Sign out" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

        {/* Sidebar */}
        <nav style={{ width: 240, flexShrink: 0, background: '#111827', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: 16 }}>
          {([
            { group: 'Overview', items: [
              { id: 'overview' as const, label: 'Dashboard', icon: BarChart3 },
              { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
              { id: 'pl' as const, label: 'P&L Report', icon: DollarSign },
            ]},
            { group: 'Venue', items: [
              { id: 'menu' as const, label: 'Menu', icon: Coffee },
              { id: 'locations' as const, label: 'Locations', icon: MapPin },
              { id: 'bundles' as const, label: 'Bundles', icon: Gift },
              { id: 'catering' as const, label: 'Catering', icon: Briefcase },
              { id: 'delivery' as const, label: 'Delivery', icon: Globe },
            ]},
            { group: 'Customers', items: [
              { id: 'loyalty' as const, label: 'Loyalty Program', icon: Star },
              { id: 'reviews' as const, label: 'Reviews', icon: Star },
              { id: 'giftcards' as const, label: 'Gift Cards', icon: Gift },
              { id: 'passes' as const, label: 'Passes', icon: Ticket },
            ]},
            { group: 'Marketing', items: [
              { id: 'campaigns' as const, label: 'Campaigns', icon: Send },
              { id: 'smsmarketing' as const, label: 'SMS Marketing', icon: MessageSquare },
              { id: 'promo' as const, label: 'Promotions', icon: Tag },
            ]},
            { group: 'Operations', items: [
              { id: 'audit' as const, label: 'Audit Log', icon: Shield },
              { id: 'allvenues' as const, label: 'All Venues', icon: Building2 },
              { id: 'franchisee' as const, label: 'Franchisee', icon: Percent },
            ]},
            { group: 'Finance', items: [
              { id: 'billing' as const, label: 'Billing & Plans', icon: CreditCard },
            ]},
            { group: 'Settings', items: [
              { id: 'website' as const, label: 'Website Builder', icon: Globe },
              { id: 'settings' as const, label: 'Venue Settings', icon: Settings },
              { id: 'integrations' as const, label: 'Integrations', icon: Link2 },
              { id: 'qrcodes' as const, label: 'QR Codes', icon: QrCode },
            ]},
          ] as const).map(({ group, items }) => (
            <div key={group} style={{ marginTop: 8 }}>
              <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{group}</div>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 16px', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? '#5E8B8B' : 'transparent'}`, cursor: 'pointer', fontSize: 13, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: isActive ? 600 : 400, textAlign: 'left', transition: 'all 0.1s' }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Sidebar footer */}
          <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>B1 Platform</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>cafe-app-production</div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F7F8FA', minWidth: 0 }}>
          <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
            {activeTab === 'overview' && <OverviewTab venue={venue} owner={owner} setActiveTab={setActiveTab} />}
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
            {activeTab === 'delivery' && <DeliveryTab />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'allvenues' && <AllVenuesTab />}
            {activeTab === 'smsmarketing' && <SmsMarketingTab />}
            {activeTab === 'franchisee' && <FranchiseeTab />}
            {activeTab === 'qrcodes' && venue && <QRCodesTab venue={venue} />}
            {activeTab === 'website' && <WebsiteTab venue={venue} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewTab({ venue, owner, setActiveTab }: { venue: any; owner: any; setActiveTab: (tab: any) => void }) {
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

  const cardStyle: CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Welcome back{owner?.name ? `, ${owner.name}` : ''}. Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Your Site', value: `/${venue.slug}`, icon: Globe, color: '#5E8B8B', bg: '#F0F9F9' },
          { label: 'Plan', value: (venue.subscriptionTier || 'Trial'), icon: CreditCard, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Status', value: (venue.subscriptionStatus || 'trial'), icon: Shield, color: '#059669', bg: '#ECFDF5' },
          { label: 'POS', value: venue.squareEnabled ? 'Square ✓' : 'Not connected', icon: Zap, color: '#D97706', bg: '#FFFBEB' },
        ].map((s) => (
          <div key={s.label} style={cardStyle}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { label: 'View Live Site', icon: Globe, href: `/v/${venue.slug}` },
            { label: 'Edit Menu', icon: Coffee, tab: 'menu' as const },
            { label: 'Analytics', icon: BarChart3, tab: 'analytics' as const },
            { label: 'Website Builder', icon: Settings, tab: 'website' as const },
          ].map((action) => action.href ? (
            <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#FAFAFA', textDecoration: 'none', color: '#374151', fontSize: 13, fontWeight: 500, transition: 'all 0.12s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
            >
              <action.icon size={14} style={{ color: '#5E8B8B' }} /> {action.label}
            </a>
          ) : (
            <button key={action.label} onClick={() => setActiveTab(action.tab!)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#FAFAFA', color: '#374151', fontSize: 13, fontWeight: 500, transition: 'all 0.12s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
            >
              <action.icon size={14} style={{ color: '#5E8B8B' }} /> {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Today at a Glance */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Today at a Glance</h2>
            {summary?.date && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '3px 0 0' }}>
                {new Date(summary.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {emailStatus === 'sent' && <span style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Sent</span>}
            {emailStatus === 'error' && <span style={{ fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Failed</span>}
            <button onClick={handleSendEmail} disabled={sendEmail.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151', cursor: sendEmail.isPending ? 'not-allowed' : 'pointer', opacity: sendEmail.isPending ? 0.6 : 1 }}>
              {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Email Summary
            </button>
          </div>
        </div>

        {summaryLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#9CA3AF' }} />
          </div>
        )}

        {!summaryLoading && summary && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Orders', value: summary.orderCount ?? 0, prefix: '', color: '#5E8B8B' },
                { label: 'Completed', value: summary.completedCount ?? 0, prefix: '', color: '#059669' },
                { label: 'Pending', value: summary.pendingCount ?? 0, prefix: '', color: '#D97706' },
                { label: 'Revenue', value: Number(summary.totalRevenue ?? 0).toFixed(2), prefix: '$', color: '#7C3AED' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{stat.prefix}{stat.value}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {summary.topItems && summary.topItems.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Top Items Today</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {summary.topItems.slice(0, 5).map((item: { name: string; qty: number }, idx: number) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 6, background: idx === 0 ? '#F0F9F9' : 'transparent' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: idx === 0 ? '#5E8B8B' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: idx === 0 ? '#fff' : '#9CA3AF', flexShrink: 0 }}>{idx + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: idx === 0 ? 600 : 400 }}>{item.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: idx === 0 ? '#5E8B8B' : '#9CA3AF' }}>{item.qty} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!summary.topItems || summary.topItems.length === 0) && summary.orderCount === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
                No orders yet today. Share your site link to start taking orders!
              </div>
            )}
          </div>
        )}

        {!summaryLoading && !summary && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>Could not load today's summary.</div>
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
  const [triggerExport, setTriggerExport] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
  const { data: ordersExportData, isFetching: exporting } = trpc.audit.exportOrders.useQuery(
    { token, fromDate: thirtyDaysAgo, toDate: today },
    { enabled: triggerExport && !!token }
  );
  useEffect(() => {
    if (ordersExportData && (ordersExportData as any).csv) {
      setTriggerExport(false);
      const blob = new Blob([(ordersExportData as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders-export.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [ordersExportData]);

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
      {/* Days selector + Export */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>PERIOD:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setSelectedDays(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: selectedDays === d ? '#181818' : 'transparent', color: selectedDays === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setTriggerExport(true)}
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid rgba(24,24,24,0.15)', background: '#181818', color: '#F3F2EE', fontSize: 12, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1, borderRadius: 4 }}
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export CSV (30d)
        </button>
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

      <AnalyticsExtras analyticsRange={selectedDays} />
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

// ─── Image upload component used inside the website block editor ─────────────
const IMG_UPLOAD_INPUT: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid #E5E7EB',
  borderRadius: 6, fontSize: 11, color: '#9CA3AF', background: '#fff',
  boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif',
};
const IMG_UPLOAD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
};

function ImageUpload({
  value, onChange, label = 'Image', compact = false,
}: {
  value: string; onChange: (url: string) => void; label?: string; compact?: boolean;
}) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) { setError('Please pick an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
      onChange(json.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) doUpload(f);
  };

  if (compact) {
    // Square thumbnail for gallery grid
    return (
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: uploading ? 'wait' : 'pointer',
          border: `2px dashed ${dragOver ? '#5E8B8B' : '#D1D5DB'}`,
          background: value ? 'transparent' : (dragOver ? '#F0F9F9' : '#F9FAFB'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}
      >
        {value && !uploading
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : uploading
            ? <div style={{ fontSize: 18 }}>⏳</div>
            : <div style={{ fontSize: 22, color: '#9CA3AF' }}>📷</div>
        }
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={IMG_UPLOAD_LABEL}>{label}</label>}

      {/* Drop zone / preview */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%', height: value ? 110 : 78, borderRadius: 8, overflow: 'hidden',
          border: `2px dashed ${dragOver ? '#5E8B8B' : '#D1D5DB'}`,
          background: value ? 'transparent' : (dragOver ? '#F0F9F9' : '#F9FAFB'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer', position: 'relative',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {value && !uploading ? (
          <>
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.55)', padding: '5px 10px',
              fontSize: 11, color: '#fff', fontWeight: 600, textAlign: 'center',
            }}>
              Click or drag to replace
            </div>
          </>
        ) : uploading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Uploading…</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Upload photo</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Drag & drop or click · JPG PNG WebP · max 5 MB</div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: '#DC2626' }}>{error}</div>}

      {/* URL paste fallback */}
      <input
        style={IMG_UPLOAD_INPUT}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Or paste a URL…"
      />

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
    </div>
  );
}

function WebsiteTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  type BlockType = 'hero' | 'about' | 'gallery' | 'booking_cta' | 'hours' | 'social' | 'divider';
  type Block = { id: string; type: BlockType; data: Record<string, any> };

  const genId = () => Math.random().toString(36).slice(2, 9);

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const saved = (venue as any).websiteBlocks;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const updateMutation = trpc.venue.update.useMutation({ onSuccess: () => setSaveMsg('✓ Published') });

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/v/${venue.slug}` : `/v/${venue.slug}`;
  const bookUrl = typeof window !== 'undefined' ? `${window.location.origin}/book/${venue.slug}` : `/book/${venue.slug}`;

  const handleSave = () => {
    setSaveMsg('');
    updateMutation.mutate({ token, data: { websiteBlocks: blocks } as any });
  };

  const DEFAULTS: Record<BlockType, Record<string, any>> = {
    hero: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80', title: venue.name || 'Welcome', tagline: 'Specialty coffee & fresh food', ctaText: 'Order Now' },
    about: { title: 'Our Story', body: 'Tell customers what makes your cafe special...' },
    gallery: { images: [] },
    booking_cta: { title: 'Reserve a Table', subtitle: 'Book online in seconds — no phone call needed.', buttonText: 'Book Now' },
    hours: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' },
    social: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' },
    divider: { style: 'space' },
  };

  const addBlock = (type: BlockType) => {
    const nb: Block = { id: genId(), type, data: { ...DEFAULTS[type] } };
    setBlocks(b => [...b, nb]);
    setEditingId(nb.id);
    setShowCatalog(false);
  };
  const updateBlock = (id: string, data: Record<string, any>) => setBlocks(b => b.map(bl => bl.id === id ? { ...bl, data } : bl));
  const removeBlock = (id: string) => { setBlocks(b => b.filter(bl => bl.id !== id)); if (editingId === id) setEditingId(null); };

  const handleDragStart = (e: React.DragEvent, i: number) => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragging !== null && dragging !== i) {
      const arr = [...blocks];
      const [item] = arr.splice(dragging, 1);
      arr.splice(i, 0, item);
      setBlocks(arr);
    }
    setDragging(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const TEMPLATES: { id: string; name: string; desc: string; color: string; blocks: () => Block[] }[] = [
    { id: 'minimal', name: 'Minimal', desc: 'Clean & simple', color: '#1c1917',
      blocks: () => [
        { id: genId(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80', title: venue.name, tagline: 'Specialty coffee, served with care.', ctaText: 'Order Now' } },
        { id: genId(), type: 'booking_cta', data: { title: 'Reserve a Table', subtitle: 'Book online in seconds.', buttonText: 'Book Now' } },
        { id: genId(), type: 'hours', data: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' } },
      ] },
    { id: 'story', name: 'Story', desc: 'Narrative flow', color: '#3D2B1F',
      blocks: () => [
        { id: genId(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1400&q=80', title: venue.name, tagline: 'Handcrafted coffee & fresh baked goods.', ctaText: 'See Our Menu' } },
        { id: genId(), type: 'about', data: { title: 'Our Story', body: 'We believe great coffee starts with great relationships — with our farmers, our team, and you.' } },
        { id: genId(), type: 'gallery', data: { images: [] } },
        { id: genId(), type: 'hours', data: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' } },
        { id: genId(), type: 'booking_cta', data: { title: 'Reserve a Table', subtitle: 'Join us for a meal.', buttonText: 'Book Now' } },
      ] },
    { id: 'visual', name: 'Visual', desc: 'Photo-first', color: '#1E3A5F',
      blocks: () => [
        { id: genId(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1400&q=80', title: venue.name, tagline: 'Bold coffee for bold mornings.', ctaText: 'Order Now' } },
        { id: genId(), type: 'gallery', data: { images: [] } },
        { id: genId(), type: 'about', data: { title: 'Our Coffee', body: 'Sourced from the best farms, roasted to perfection.' } },
        { id: genId(), type: 'booking_cta', data: { title: 'Come Visit Us', subtitle: '', buttonText: 'Reserve Now' } },
      ] },
    { id: 'community', name: 'Community', desc: 'Local-first', color: '#4A7C59',
      blocks: () => [
        { id: genId(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=80', title: venue.name, tagline: 'Fresh food. Good coffee. Happy people.', ctaText: 'Order Now' } },
        { id: genId(), type: 'about', data: { title: 'Part of the Community', body: 'We source locally, bake daily, and grow with our community.' } },
        { id: genId(), type: 'hours', data: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' } },
        { id: genId(), type: 'social', data: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' } },
        { id: genId(), type: 'booking_cta', data: { title: 'Join Us', subtitle: '', buttonText: 'Book a Table' } },
      ] },
    { id: 'prestige', name: 'Prestige', desc: 'Premium experience', color: '#1E2B4A',
      blocks: () => [
        { id: genId(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=1400&q=80', title: venue.name, tagline: 'An exceptional coffee experience.', ctaText: 'Reserve a Table' } },
        { id: genId(), type: 'about', data: { title: 'The Art of Coffee', body: "We've spent years refining every detail — from bean selection to your final sip." } },
        { id: genId(), type: 'gallery', data: { images: [] } },
        { id: genId(), type: 'hours', data: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' } },
        { id: genId(), type: 'booking_cta', data: { title: 'Reserve Your Experience', subtitle: 'Tables fill fast — book ahead.', buttonText: 'Book Now' } },
      ] },
  ];

  const CATALOG: { type: BlockType; label: string; icon: string; desc: string }[] = [
    { type: 'hero', label: 'Hero Banner', icon: '🖼️', desc: 'Full-width image with title & CTA' },
    { type: 'about', label: 'About Us', icon: '📖', desc: 'Your story in text' },
    { type: 'gallery', label: 'Photo Gallery', icon: '📷', desc: 'Grid of up to 9 photos' },
    { type: 'booking_cta', label: 'Book a Table', icon: '📅', desc: 'Reservation call-to-action' },
    { type: 'hours', label: 'Opening Hours', icon: '🕐', desc: 'Mon-Fri, Sat, Sun hours' },
    { type: 'social', label: 'Social Links', icon: '📱', desc: 'Instagram & Facebook' },
    { type: 'divider', label: 'Spacer', icon: '➖', desc: 'Add space between sections' },
  ];

  const LABELS: Record<BlockType, string> = { hero: 'Hero Banner', about: 'About Us', gallery: 'Photo Gallery', booking_cta: 'Book a Table', hours: 'Opening Hours', social: 'Social Links', divider: 'Spacer' };
  const ICONS: Record<BlockType, string> = { hero: '🖼️', about: '📖', gallery: '📷', booking_cta: '📅', hours: '🕐', social: '📱', divider: '➖' };

  const editingBlock = blocks.find(b => b.id === editingId) ?? null;

  const iStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111827', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' };
  const lStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}>Website Builder</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Drag blocks to reorder · Click Edit to customise · Publish to go live</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{saveMsg}</span>}
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
            🔗 Preview Site
          </a>
          <button onClick={handleSave} disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: '#111827', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: updateMutation.isPending ? 'not-allowed' : 'pointer', opacity: updateMutation.isPending ? 0.7 : 1 }}>
            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Templates */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTemplates ? 16 : 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Templates</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Start from a pre-built layout</div>
              </div>
              <button onClick={() => setShowTemplates(v => !v)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                {showTemplates ? 'Hide' : '✦ Browse Templates'}
              </button>
            </div>
            {showTemplates && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {TEMPLATES.map(t => (
                  <div key={t.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <div style={{ height: 56, background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '55%', height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                    </div>
                    <div style={{ padding: '10px 10px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8 }}>{t.desc}</div>
                      <button onClick={() => { setBlocks(t.blocks()); setShowTemplates(false); setEditingId(null); setSaveMsg('Template applied — click Publish to go live'); }}
                        style={{ width: '100%', padding: '5px 0', background: '#111827', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocks list */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                Page Blocks
                <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', marginLeft: 6 }}>({blocks.length})</span>
              </div>
              <button onClick={() => setShowCatalog(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, background: showCatalog ? '#374151' : '#111827', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={13} /> Add Block
              </button>
            </div>

            {showCatalog && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {CATALOG.map(c => (
                  <button key={c.type} onClick={() => addBlock(c.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#111827'; e.currentTarget.style.background = '#F3F4F6'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff'; }}
                  >
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {blocks.length === 0 && !showCatalog && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No blocks yet</div>
                <div style={{ fontSize: 12 }}>Apply a template or click "Add Block" to start building</div>
              </div>
            )}

            <div>
              {blocks.map((block, i) => (
                <div key={block.id}
                  draggable
                  onDragStart={e => handleDragStart(e, i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={e => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, border: `2px solid ${dragOver === i && dragging !== i ? '#5E8B8B' : editingId === block.id ? '#111827' : '#F3F4F6'}`, background: editingId === block.id ? '#F9FAFB' : '#fff', marginBottom: 8, cursor: 'grab', opacity: dragging === i ? 0.45 : 1, transition: 'border-color 0.1s' }}
                >
                  <span style={{ color: '#D1D5DB', fontSize: 16, userSelect: 'none', flexShrink: 0 }}>⠿</span>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{ICONS[block.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{LABELS[block.type]}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {block.type === 'hero' && (block.data.tagline || block.data.title || '')}
                      {block.type === 'about' && (block.data.title || '')}
                      {block.type === 'gallery' && `${(block.data.images || []).filter((x: any) => x.url).length} photos`}
                      {block.type === 'booking_cta' && (block.data.title || '')}
                      {block.type === 'hours' && 'Hours display'}
                      {block.type === 'social' && 'Social links'}
                      {block.type === 'divider' && 'Section spacer'}
                    </div>
                  </div>
                  <button onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: editingId === block.id ? '#111827' : '#F9FAFB', color: editingId === block.id ? '#fff' : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                    {editingId === block.id ? 'Done' : 'Edit'}
                  </button>
                  <button onClick={() => removeBlock(block.id)}
                    style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}
                  ><X size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: editor + quick links */}
        <div style={{ position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Block editor */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 20 }}>
            {editingBlock ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{ICONS[editingBlock.type]}</span> {LABELS[editingBlock.type]}
                </div>

                {editingBlock.type === 'hero' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ImageUpload
                      label="Hero Image"
                      value={editingBlock.data.imageUrl || ''}
                      onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })}
                    />
                    <div><label style={lStyle}>Headline</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Your cafe name" /></div>
                    <div><label style={lStyle}>Tagline</label><input style={iStyle} value={editingBlock.data.tagline || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, tagline: e.target.value })} placeholder="Specialty coffee, served with care." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.ctaText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, ctaText: e.target.value })} placeholder="Order Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'about' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={lStyle}>Section Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Our Story" /></div>
                    <div><label style={lStyle}>Body Text</label><textarea style={{ ...iStyle, minHeight: 100, resize: 'vertical' }} value={editingBlock.data.body || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, body: e.target.value })} placeholder="Tell your story..." /></div>
                    <ImageUpload
                      label="Side Image (optional)"
                      value={editingBlock.data.imageUrl || ''}
                      onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })}
                    />
                  </div>
                )}
                {editingBlock.type === 'gallery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Up to 9 photos — drag & drop or tap to upload</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {((editingBlock.data.images || []) as { url: string; caption: string }[]).map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <ImageUpload
                            compact
                            value={img.url}
                            onChange={url => {
                              const imgs = [...(editingBlock.data.images || [])];
                              imgs[i] = { ...img, url };
                              updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs });
                            }}
                          />
                          <button
                            onClick={() => { const imgs = (editingBlock.data.images || []).filter((_: any, idx: number) => idx !== i); updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                            style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, lineHeight: 1 }}
                          >×</button>
                        </div>
                      ))}
                      {(editingBlock.data.images || []).length < 9 && (
                        <button
                          onClick={() => { const imgs = [...(editingBlock.data.images || []), { url: '', caption: '' }]; updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                          style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed #D1D5DB', background: '#F9FAFB', fontSize: 24, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >+</button>
                      )}
                    </div>
                  </div>
                )}
                {editingBlock.type === 'booking_cta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={lStyle}>Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Reserve a Table" /></div>
                    <div><label style={lStyle}>Subtitle</label><input style={iStyle} value={editingBlock.data.subtitle || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, subtitle: e.target.value })} placeholder="Book online in seconds." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.buttonText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, buttonText: e.target.value })} placeholder="Book Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'hours' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={lStyle}>Monday – Friday</label><input style={iStyle} value={editingBlock.data.weekday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, weekday: e.target.value })} placeholder="7:00am – 4:00pm" /></div>
                    <div><label style={lStyle}>Saturday</label><input style={iStyle} value={editingBlock.data.saturday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, saturday: e.target.value })} placeholder="8:00am – 3:00pm" /></div>
                    <div><label style={lStyle}>Sunday</label><input style={iStyle} value={editingBlock.data.sunday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, sunday: e.target.value })} placeholder="9:00am – 2:00pm" /></div>
                  </div>
                )}
                {editingBlock.type === 'social' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={lStyle}>Instagram URL</label><input style={iStyle} value={editingBlock.data.instagram || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, instagram: e.target.value })} placeholder="https://instagram.com/yourcafe" /></div>
                    <div><label style={lStyle}>Facebook URL</label><input style={iStyle} value={editingBlock.data.facebook || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, facebook: e.target.value })} placeholder="https://facebook.com/yourcafe" /></div>
                  </div>
                )}
                {editingBlock.type === 'divider' && (
                  <div>
                    <label style={lStyle}>Style</label>
                    <select style={iStyle} value={editingBlock.data.style || 'space'} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, style: e.target.value })}>
                      <option value="space">Space (gap)</option>
                      <option value="line">Line separator</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✏️</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Select a block to edit</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Click Edit on any block in the list</div>
              </div>
            )}
          </div>

          {/* Live links */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Live Links</div>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', textDecoration: 'none', fontSize: 12, marginBottom: 8 }}>
              🌐 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            </a>
            <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', textDecoration: 'none', fontSize: 12 }}>
              📅 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookUrl}</span>
            </a>
          </div>
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
  const [squareSyncMenuResult, setSquareSyncMenuResult] = useState<{ imported: number; total: number } | null>(null);
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
  const { data: xeroConn, refetch: refetchXeroHub } = trpc.xero.getConnection.useQuery();
  const { data: xeroAuthUrlData } = trpc.xero.getAuthUrl.useQuery();
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

  // ── QR Code ───────────────────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!venue?.slug) return;
    QRCode.toDataURL(`${window.location.origin}/v/${venue.slug}`, { width: 300, margin: 2 })
      .then(setQrDataUrl).catch(() => {});
  }, [venue?.slug]);

  // ── Styles helpers ────────────────────────────────────────────────────────
  const cardStyle: CSSProperties = {
    background: '#fff',
    border: '1px solid rgba(24,24,24,0.10)',
    borderRadius: 2,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };
  const sectionHeadStyle: CSSProperties = {
    fontWeight: 400, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#5E5E5E',
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
    background: 'rgba(24,24,24,0.06)', color: '#5E5E5E',
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
          <button onClick={() => setConnectedBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Square POS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Sync menu, inventory &amp; orders</p>
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
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                <button style={{ ...primaryBtn, opacity: squareSyncMenu.isPending ? 0.6 : 1 }}
                  disabled={squareSyncMenu.isPending}
                  onClick={() => { setSquareSyncMenuResult(null); squareSyncMenu.mutate({ token }, { onSuccess: (d) => { setSquareSyncMenuResult(d); showToast(`Imported ${d.imported}/${d.total} items`); }, onError: (e) => showToast(e.message, false) }); }}>
                  {squareSyncMenu.isPending ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
                  Sync Menu
                </button>
                <button style={{ ...primaryBtn, opacity: squareSyncInventory.isPending ? 0.6 : 1 }}
                  disabled={squareSyncInventory.isPending}
                  onClick={() => { setSquareSyncInvResult(null); squareSyncInventory.mutate({ token }, { onSuccess: (d) => { setSquareSyncInvResult(d); showToast(`Synced ${d.synced} levels`); }, onError: (e) => showToast(e.message, false) }); }}>
                  {squareSyncInventory.isPending ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                  Sync Inventory
                </button>
                <button style={{ ...ghostBtn }} disabled={squareDisconnect.isPending}
                  onClick={() => squareDisconnect.mutate({ token })}>
                  Disconnect
                </button>
                {squareSyncMenuResult && <span className="font-data self-center" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>Imported {squareSyncMenuResult.imported}/{squareSyncMenuResult.total}</span>}
                {squareSyncInvResult && <span className="font-data self-center" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>Synced {squareSyncInvResult.synced}</span>}
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Lightspeed</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Kounta-powered restaurant POS</p>
                </div>
              </div>
              {lsC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {lsC?.connected ? (
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {lsC.lastSyncAt && <p className="font-data w-full" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Last sync: {new Date(lsC.lastSyncAt).toLocaleDateString()}</p>}
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Tyro EFTPOS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Terminal reconciliation &amp; settlements</p>
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
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E5E5E' }}>{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={(tyroForm as any)[f.key]}
                      onChange={e => setTyroForm({ ...tyroForm, [f.key]: e.target.value })}
                      style={{ width: '100%', fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px', boxSizing: 'border-box' as const }} />
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Impos POS</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Sync menu &amp; sales from Impos</p>
                </div>
              </div>
              {imposC?.connected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {imposC?.connected ? (
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {imposC.lastSyncAt && <p className="font-data w-full" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Last sync: {new Date(imposC.lastSyncAt).toLocaleDateString()}</p>}
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
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E5E5E' }}>{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={(imposForm as any)[f.key]}
                      onChange={e => setImposForm({ ...imposForm, [f.key]: e.target.value })}
                      style={{ width: '100%', fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px', boxSizing: 'border-box' as const }} />
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Xero</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Sync revenue &amp; invoices to Xero</p>
                </div>
              </div>
              {xeroC?.isConnected
                ? <span style={pillConnected}><Check size={8} /> Connected</span>
                : <span style={pillNotConnected}>Not connected</span>}
            </div>
            {xeroC?.isConnected ? (
              <div className="pt-1 space-y-3" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                {xeroC.updatedAt && <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Last sync: {new Date(xeroC.updatedAt).toLocaleDateString()}</p>}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E5E5E' }}>From</label>
                    <input type="date" value={xeroSyncFrom} onChange={e => setXeroSyncFrom(e.target.value)}
                      style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px' }} />
                  </div>
                  <div>
                    <label className="font-data block mb-1" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E5E5E' }}>To</label>
                    <input type="date" value={xeroSyncTo} onChange={e => setXeroSyncTo(e.target.value)}
                      style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '5px 10px' }} />
                  </div>
                  <button style={{ ...primaryBtn, opacity: (!xeroSyncFrom || !xeroSyncTo || xeroSync.isPending) ? 0.5 : 1 }}
                    disabled={xeroSync.isPending || !xeroSyncFrom || !xeroSyncTo}
                    onClick={() => { setXeroMsg(''); xeroSync.mutate({ from: xeroSyncFrom, to: xeroSyncTo }, { onSuccess: (d: any) => { setXeroMsg(`Synced ${d.invoicesCreated ?? 0} invoices`); showToast('Xero sync complete'); }, onError: (e) => { setXeroMsg(e.message); showToast(e.message, false); } }); }}>
                    {xeroSync.isPending ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                    Sync Revenue
                  </button>
                </div>
                {xeroMsg && <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E8B5E' }}>{xeroMsg}</p>}
                <button style={ghostBtn} disabled={xeroDisconnect.isPending} onClick={() => xeroDisconnect.mutate()}>Disconnect</button>
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

      {/* ── Section 3: Delivery Platforms ─────────────────────────────────── */}
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
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>{platform.label}</p>
                      <span style={{ ...pillNotConnected, background: 'rgba(24,24,24,0.06)', color: '#5E5E5E' }}>
                        Platform fee: {platform.fee}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                  <label className="font-data block" style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E5E5E' }}>Webhook URL</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={webhookUrl}
                      style={{ flex: 1, fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', background: 'rgba(24,24,24,0.03)', border: '1px solid rgba(24,24,24,0.10)', padding: '5px 8px', minWidth: 0 }} />
                    <button style={{ ...primaryBtn, flexShrink: 0 }}
                      onClick={() => { navigator.clipboard.writeText(webhookUrl).then(() => showToast('Webhook URL copied')).catch(() => showToast('Copy failed', false)); }}>
                      Copy
                    </button>
                  </div>
                  <p className="font-data" style={{ fontSize: '0.5rem', color: '#5E5E5E', lineHeight: 1.6 }}>
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
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Google My Business</p>
                  <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Sync hours &amp; menu to your listing</p>
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

      {/* ── QR Code ──────────────────────────────────────────────────────────── */}
      <div>
        <p style={sectionHeadStyle}>Venue QR Code</p>
        <div style={{ ...cardStyle, maxWidth: 420 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <QrCode size={18} style={{ color: '#F3F2EE' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181818', marginBottom: 2 }}>Ordering QR Code</p>
              <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Customers scan to open your ordering page</p>
            </div>
          </div>
          <div className="pt-1" style={{ borderTop: '1px solid rgba(24,24,24,0.06)' }}>
            {qrDataUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <img src={qrDataUrl} alt="QR code" style={{ width: 160, height: 160, border: '1px solid rgba(24,24,24,0.08)' }} />
                <p className="font-data" style={{ fontSize: '0.5rem', color: '#5E5E5E' }}>{origin}/v/{venue?.slug}</p>
                <button style={primaryBtn} onClick={() => { if (!qrDataUrl || !venue?.slug) return; const a = document.createElement('a'); a.href = qrDataUrl; a.download = `${venue.slug}-qr.png`; a.click(); }}>
                  <Download size={12} /> Download PNG
                </button>
              </div>
            ) : venue?.slug ? (
              <p className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>Generating…</p>
            ) : (
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

// ── Sortable menu item row (dnd-kit) ─────────────────────────────────────────
function SortableMenuRow({
  item, venue, token, inventoryLevels, stockFormOpen, stockForm,
  setStockFormOpen, setStockForm, setInventoryQty,
  openModifiers, setOpenModifiers,
  deleteConfirm, setDeleteConfirm, deleteMutation, startEdit,
}: {
  item: any; venue: any; token: string; inventoryLevels: any[];
  stockFormOpen: number | null; stockForm: { quantity: string; quantityAlert: string };
  setStockFormOpen: (id: number | null) => void;
  setStockForm: (f: any) => void;
  setInventoryQty: any;
  openModifiers: Set<number>; setOpenModifiers: React.Dispatch<React.SetStateAction<Set<number>>>;
  deleteConfirm: number | null; setDeleteConfirm: (id: number | null) => void;
  deleteMutation: any; startEdit: (item: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const dragStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative',
  };
  const inv = (inventoryLevels as any[])?.find((r: any) => r.menuItemId === item.id);
  const qty = inv?.quantity ?? null;
  const alert = inv?.quantityAlert ?? null;
  const isLow = qty !== null && alert !== null && qty <= alert;

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <div className="flex items-center justify-between gap-3 p-4" style={{ background: '#fff', border: '1px solid rgba(24,24,24,0.08)' }}>
        {/* Drag handle */}
        <div
          {...attributes} {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#D1D5DB', flexShrink: 0, touchAction: 'none', padding: '2px 0' }}
          title="Drag to reorder"
        >
          <GripVertical size={15} />
        </div>

        {/* Thumbnail */}
        {item.image ? (
          <img src={item.image} alt={item.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,24,24,0.04)', borderRadius: 6, border: '1px dashed rgba(24,24,24,0.12)' }}>
            <Coffee size={18} style={{ color: '#9CA3AF' }} />
          </div>
        )}

        {/* Name / price / badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#181818', display: 'block', marginBottom: 3 }}>{item.name}</span>
          <span style={{ fontFamily: 'Geist Mono', fontSize: 13, color: '#181818', fontWeight: 700 }}>${Number(item.price).toFixed(2)}</span>
          {((Array.isArray(item.allergens) && item.allergens.length > 0) || (Array.isArray(item.dietaryTags) && item.dietaryTags.length > 0)) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {(Array.isArray(item.allergens) ? item.allergens : []).map((a: string) => (
                <span key={a} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{a}</span>
              ))}
              {(Array.isArray(item.dietaryTags) ? item.dietaryTags : []).map((t: string) => (
                <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="flex flex-col items-end mr-1" style={{ minWidth: 80 }}>
          <div className="flex items-center gap-1 mb-1">
            {qty !== null ? (
              <span className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.06em', color: isLow ? '#B85450' : '#5E5E5E' }}>{qty} in stock</span>
            ) : (
              <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>—</span>
            )}
            {isLow && <span className="font-data" style={{ fontSize: '0.5rem', background: 'rgba(184,84,80,0.12)', color: '#B85450', padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Low</span>}
          </div>
          {stockFormOpen === item.id ? (
            <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
              <input type="number" min={0} placeholder="Qty" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} style={{ border: '1px solid rgba(24,24,24,0.15)', padding: '3px 6px', fontSize: 12, background: '#fff', color: '#181818', width: '100%' }} />
              <input type="number" min={0} placeholder="Alert at" value={stockForm.quantityAlert} onChange={e => setStockForm({ ...stockForm, quantityAlert: e.target.value })} style={{ border: '1px solid rgba(24,24,24,0.15)', padding: '3px 6px', fontSize: 12, background: '#fff', color: '#181818', width: '100%' }} />
              <div className="flex gap-1">
                <button onClick={() => { setInventoryQty.mutate({ menuItemId: item.id, quantity: Number(stockForm.quantity), quantityAlert: stockForm.quantityAlert ? Number(stockForm.quantityAlert) : undefined }, { onSuccess: () => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); } }); }} style={{ flex: 1, background: '#181818', color: '#F3F2EE', border: 'none', fontSize: 11, padding: '3px 6px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', fontSize: 11, padding: '3px 6px', cursor: 'pointer', color: '#5E5E5E' }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setStockFormOpen(item.id); setStockForm({ quantity: qty !== null ? String(qty) : '', quantityAlert: alert !== null ? String(alert) : '' }); }} style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '2px 7px', cursor: 'pointer', color: '#5E5E5E' }}>Set Stock</button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setOpenModifiers(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} title="Manage Modifiers" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            {openModifiers.has(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => startEdit(item)} title="Edit" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => setDeleteConfirm(item.id)} title="Delete" className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', background: 'transparent' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {openModifiers.has(item.id) && <ModifiersPanel menuItemId={item.id} venueId={venue.id} />}

      {deleteConfirm === item.id && (
        <div className="p-4 border-x border-b" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#F3F2EE' }}>
          <p style={{ fontSize: '0.8125rem', color: '#181818', marginBottom: 12 }}>Delete this item? Orders referencing it will be preserved.</p>
          <div className="flex items-center gap-3">
            <button onClick={() => deleteMutation.mutate({ token, menuItemId: item.id })} disabled={deleteMutation.isPending} className="px-4 py-2 font-button flex items-center gap-2" style={{ background: '#B85450', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 font-button" style={{ background: 'transparent', color: '#181818', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}>
              Keep Item
            </button>
          </div>
        </div>
      )}
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
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formDietaryTags, setFormDietaryTags] = useState<string[]>([]);
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

  // Local ordered list — kept in sync with server; used for optimistic drag reorder
  const [localItems, setLocalItems] = useState<any[]>([]);
  useEffect(() => {
    if (items) setLocalItems(items as any[]);
  }, [items]);

  const reorderMutation = trpc.venue.reorderMenuItems.useMutation({
    onSuccess: () => utils.venue.listMenu.invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      // Persist new sortOrder values
      reorderMutation.mutate({
        token,
        venueId: venue.id,
        items: next.map((item, idx) => ({ id: item.id, sortOrder: idx })),
      });
      return next;
    });
  };

  const startCreate = () => {
    setForm({ name: '', description: '', price: '', category: 'coffee', dietary: '', image: '' });
    setFormAllergens([]);
    setFormDietaryTags([]);
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
    setFormAllergens(Array.isArray(item.allergens) ? item.allergens : (item.allergens ? String(item.allergens).split(',').map((s: string) => s.trim()).filter(Boolean) : []));
    setFormDietaryTags(Array.isArray(item.dietaryTags) ? item.dietaryTags : (item.dietaryTags ? String(item.dietaryTags).split(',').map((s: string) => s.trim()).filter(Boolean) : []));
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
        allergens: formAllergens.length > 0 ? formAllergens : undefined,
        dietaryTags: formDietaryTags.length > 0 ? formDietaryTags : undefined,
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
          allergens: formAllergens.length > 0 ? formAllergens : undefined,
          dietaryTags: formDietaryTags.length > 0 ? formDietaryTags : undefined,
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

      {/* Item list — grouped by category, drag-to-reorder */}
      {!isLoading && localItems.length > 0 && (() => {
        const CAT_ORDER = ['coffee', 'pastries', 'bread'];
        const allCats = [...new Set(localItems.map((i: any) => i.category as string))];
        const sortedCats = [
          ...CAT_ORDER.filter(c => allCats.includes(c)),
          ...allCats.filter(c => !CAT_ORDER.includes(c)),
        ];
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-6 mb-6">
            {sortedCats.map(cat => {
              const catItems = localItems.filter((i: any) => i.category === cat);
              return (
                <div key={cat}>
                  {/* Category section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: '#5E5E5E' }}>
                      {categoryLabel(cat)}
                    </span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', color: '#9CA3AF' }}>({catItems.length})</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(24,24,24,0.08)' }} />
                  </div>
                  <SortableContext items={catItems.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {catItems.map((item: any) => (
                        <SortableMenuRow
                          key={item.id}
                          item={item}
                          venue={venue}
                          token={token}
                          inventoryLevels={inventoryLevels as any[] || []}
                          stockFormOpen={stockFormOpen}
                          stockForm={stockForm}
                          setStockFormOpen={setStockFormOpen}
                          setStockForm={setStockForm}
                          setInventoryQty={setInventoryQty}
                          openModifiers={openModifiers}
                          setOpenModifiers={setOpenModifiers}
                          deleteConfirm={deleteConfirm}
                          setDeleteConfirm={(id) => { setDeleteConfirm(id); if (id !== null) setDeleteError(''); }}
                          deleteMutation={deleteMutation}
                          startEdit={startEdit}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          </DndContext>
        );
      })()}

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

            {/* Photo upload — full width */}
            <div className="md:col-span-2">
              <ImageUpload
                label="Item Photo"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
              />
              <p className="font-data mt-1" style={{ fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em' }}>
                Leave blank to hide image on your public menu.
              </p>
            </div>

            {/* Allergens */}
            <div className="md:col-span-2" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Allergens</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'sesame', 'shellfish', 'fish', 'sulphites'].map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '4px 8px', border: `1px solid ${formAllergens.includes(a) ? '#DC2626' : '#E5E7EB'}`, borderRadius: 5, background: formAllergens.includes(a) ? '#FEF2F2' : '#fff', color: formAllergens.includes(a) ? '#DC2626' : '#374151' }}>
                    <input type="checkbox" checked={formAllergens.includes(a)}
                      onChange={e => setFormAllergens(prev => e.target.checked ? [...prev, a] : prev.filter(x => x !== a))}
                      style={{ display: 'none' }} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* Dietary tags */}
            <div className="md:col-span-2" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Dietary</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'paleo', 'keto'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '4px 8px', border: `1px solid ${formDietaryTags.includes(t) ? '#16A34A' : '#E5E7EB'}`, borderRadius: 5, background: formDietaryTags.includes(t) ? '#F0FDF4' : '#fff', color: formDietaryTags.includes(t) ? '#16A34A' : '#374151' }}>
                    <input type="checkbox" checked={formDietaryTags.includes(t)}
                      onChange={e => setFormDietaryTags(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                      style={{ display: 'none' }} />
                    {t}
                  </label>
                ))}
              </div>
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
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

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
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

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
function LoyaltyTab({ venueId: _venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const loyaltyToken = localStorage.getItem('b1-owner-token') || '';
  const { data: accounts, isLoading: accsLoading } = trpc.loyalty.listAccounts.useQuery({ token: loyaltyToken }, { enabled: !!loyaltyToken });
  const [loyaltySearch, setLoyaltySearch] = useState('');
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
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

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
        {/* Tier thresholds info box */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '10px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, color: '#374151', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Tier Thresholds:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: '#FEF9C3', color: '#713F12', fontSize: 11, fontWeight: 600 }}>Bronze</span> 0 pts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: '#F3F4F6', color: '#374151', fontSize: 11, fontWeight: 600 }}>Silver</span> 500 pts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>Gold</span> 2,000 pts</span>
        </div>
        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search by phone..."
            value={loyaltySearch}
            onChange={e => setLoyaltySearch(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid rgba(24,24,24,0.15)', fontSize: 13, background: '#fff', color: '#181818', width: '100%', maxWidth: 280 }}
          />
        </div>
        {accsLoading && <Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} />}
        {!accsLoading && (!accounts || (accounts as any[]).length === 0) && <p style={{ color: '#5E5E5E', fontSize: 14 }}>No loyalty accounts yet.</p>}
        {(accounts as any[] | undefined) && (accounts as any[]).length > 0 && (() => {
          const getTier = (pts: number) => pts >= 2000 ? { label: 'Gold', bg: '#FEF3C7', color: '#92400E' }
            : pts >= 500 ? { label: 'Silver', bg: '#F3F4F6', color: '#374151' }
            : { label: 'Bronze', bg: '#FEF9C3', color: '#713F12' };
          const filtered = loyaltySearch
            ? (accounts as any[]).filter(a => a.phone?.includes(loyaltySearch))
            : (accounts as any[]);
          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                    {['Phone', 'Points', 'Lifetime Pts', 'Tier', 'Joined'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a: any) => {
                    const tier = getTier(a.totalLifetimePoints ?? 0);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                        <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: 12, color: '#374151' }}>{a.phone || '—'}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: '#181818' }}>{a.pointsBalance ?? 0}</td>
                        <td style={{ padding: '10px 10px', color: '#5E5E5E' }}>{a.totalLifetimePoints ?? 0}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: tier.bg, color: tier.color, fontSize: 11, fontWeight: 600 }}>{tier.label}</span>
                        </td>
                        <td style={{ padding: '10px 10px', color: '#5E5E5E', fontFamily: 'Geist Mono', fontSize: 11 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
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

// ─── Analytics Extras (Period Comparison, Forecast, Menu Scorecard, GST) ─────
function AnalyticsExtras({ analyticsRange }: { analyticsRange: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  const { data: periodComparison } = trpc.analytics.getPeriodComparison.useQuery(
    { token, days: analyticsRange }, { enabled: !!token }
  );
  const { data: revenueForecast } = trpc.analytics.getRevenueForecast.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: menuScorecard } = trpc.analytics.getMenuScorecard.useQuery(
    { token, days: analyticsRange }, { enabled: !!token }
  );

  const [gstFromDate, setGstFromDate] = useState('');
  const [gstToDate, setGstToDate] = useState('');
  const [showGST, setShowGST] = useState(false);
  const { data: gstSummary, isFetching: gstFetching } = trpc.analytics.getGSTSummary.useQuery(
    { token, fromDate: gstFromDate, toDate: gstToDate },
    { enabled: showGST && !!gstFromDate && !!gstToDate }
  );

  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' };

  function downloadGSTCsv() {
    if (!(gstSummary as any)?.csv) return;
    const blob = new Blob([(gstSummary as any).csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gst-report.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const pc = periodComparison as any;

  return (
    <>
      {/* Period Comparison */}
      {pc && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Period Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Revenue', cur: pc.revenue?.current, prev: pc.revenue?.previous, prefix: '$' },
              { label: 'Orders', cur: pc.orders?.current, prev: pc.orders?.previous, prefix: '' },
              { label: 'Avg Order', cur: pc.avgOrder?.current, prev: pc.avgOrder?.previous, prefix: '$' },
            ].map((card) => {
              const change = card.prev && card.prev !== 0
                ? ((card.cur - card.prev) / card.prev) * 100
                : null;
              const up = change !== null && change >= 0;
              return (
                <div key={card.label} className="border p-5" style={statCardStyle}>
                  <span style={monoLabel}>{card.label}</span>
                  <span style={bigNum}>{card.prefix}{typeof card.cur === 'number' ? card.cur.toFixed(2) : '—'}</span>
                  {card.prev !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>
                        prev: {card.prefix}{typeof card.prev === 'number' ? card.prev.toFixed(2) : '—'}
                      </span>
                      {change !== null && (
                        <span className="font-data" style={{ fontSize: '0.5625rem', color: up ? '#5E8B5E' : '#B85450' }}>
                          {up ? '↑' : '↓'}{Math.abs(change).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue Forecast */}
      {revenueForecast && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Predicted Revenue — Next 7 Days</h2>
          {(revenueForecast as any).days && (revenueForecast as any).days.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={(revenueForecast as any).days} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,24,24,0.06)" />
                <XAxis dataKey="date" tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontFamily: 'Geist Mono', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Predicted']} labelStyle={{ fontFamily: 'Geist Mono', fontSize: 11 }} />
                <Area type="monotone" dataKey="predicted" stroke="#C4953A" fill="rgba(196,149,58,0.15)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {(revenueForecast as any).total !== undefined && (
            <p className="font-data mt-3" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
              Predicted total: <span style={{ color: '#181818', fontWeight: 600 }}>${Number((revenueForecast as any).total).toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Menu Scorecard */}
      {menuScorecard && (menuScorecard as any[]).length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Menu Scorecard</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Rank', 'Item', 'Units Sold', 'Revenue', 'Rev Share %', 'Trend'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(menuScorecard as { name: string; unitsSold: number; revenue: number; revenueShare: number; trendPct: number }[]).map((row, idx) => {
                  const trendColor = row.trendPct > 5 ? '#5E8B5E' : row.trendPct < -5 ? '#B85450' : '#5E5E5E';
                  const trendArrow = row.trendPct > 5 ? '↑' : row.trendPct < -5 ? '↓' : '→';
                  return (
                    <tr key={row.name} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: '0.75rem', color: '#5E5E5E' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: '#181818' }}>{row.name}</td>
                      <td style={{ padding: '10px 10px' }}>{row.unitsSold}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E' }}>${Number(row.revenue).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>{Number(row.revenueShare).toFixed(1)}%</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span className="font-data" style={{ fontSize: '0.625rem', color: trendColor }}>
                          {trendArrow} {Math.abs(row.trendPct).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GST Summary */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>GST Summary</h2>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>From</label>
            <input type="date" value={gstFromDate} onChange={e => { setGstFromDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>To</label>
            <input type="date" value={gstToDate} onChange={e => { setGstToDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <button
            disabled={!gstFromDate || !gstToDate || gstFetching}
            onClick={() => setShowGST(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!gstFromDate || !gstToDate) ? 0.5 : 1 }}
          >
            {gstFetching ? <Loader2 size={14} className="animate-spin" /> : <PieChartIcon size={14} />}
            Generate
          </button>
        </div>
        {gstSummary && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Total Revenue', value: `$${Number((gstSummary as any).totalRevenue ?? 0).toFixed(2)}` },
                { label: 'GST (1/11th)', value: `$${Number((gstSummary as any).gstComponent ?? 0).toFixed(2)}` },
                { label: 'Net Ex-GST', value: `$${Number((gstSummary as any).netExGST ?? 0).toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="border p-4" style={statCardStyle}>
                  <span style={monoLabel}>{s.label}</span>
                  <span style={bigNum}>{s.value}</span>
                </div>
              ))}
            </div>
            {(gstSummary as any).byPaymentMethod && (gstSummary as any).byPaymentMethod.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(24,24,24,0.1)' }}>
                    {['Payment Method', 'Revenue', 'GST', 'Net Ex-GST'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(gstSummary as any).byPaymentMethod.map((row: any) => (
                    <tr key={row.method} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '8px 10px', textTransform: 'capitalize', color: '#181818' }}>{row.method || 'Other'}</td>
                      <td style={{ padding: '8px 10px' }}>${Number(row.revenue).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', color: '#C4953A' }}>${Number(row.gst).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', color: '#5E8B5E' }}>${Number(row.net).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              onClick={downloadGSTCsv}
              className="px-4 py-2 font-button flex items-center gap-2"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
            >
              <Download size={14} /> Download GST Report
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Delivery Tab ─────────────────────────────────────────────────────────────
type DeliveryPlatform = 'all' | 'uber_eats' | 'doordash' | 'menulog' | 'manual';

function DeliveryTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [platformFilter, setPlatformFilter] = useState<DeliveryPlatform>('all');
  const [days, setDays] = useState(30);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', platformFee: '', notes: '' });
  const [logMsg, setLogMsg] = useState('');

  const { data: deliveryOrders, refetch: refetchDelivery } = trpc.delivery.list.useQuery(
    { token, platform: platformFilter === 'all' ? undefined : platformFilter, days },
    { enabled: !!token }
  );
  const { data: deliverySummary } = trpc.delivery.getSummary.useQuery(
    { token, days },
    { enabled: !!token }
  );
  const logManual = trpc.delivery.logManualOrder.useMutation({
    onSuccess: () => {
      setLogMsg('Order logged!');
      setLogForm({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', platformFee: '', notes: '' });
      refetchDelivery();
    },
    onError: (e) => setLogMsg(e.message),
  });

  const platformBadgeColor = (p: string) => {
    if (p === 'uber_eats') return { bg: 'rgba(255,102,0,0.12)', color: '#FF6600' };
    if (p === 'doordash') return { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30' };
    if (p === 'menulog') return { bg: 'rgba(94,139,94,0.12)', color: '#5E8B5E' };
    return { bg: 'rgba(24,24,24,0.08)', color: '#5E5E5E' };
  };
  const platformLabel = (p: string) => ({ uber_eats: 'Uber Eats', doordash: 'DoorDash', menulog: 'Menulog', manual: 'Manual' } as Record<string, string>)[p] ?? p;

  const orders = (deliveryOrders as any[] | undefined) ?? [];
  const summary = deliverySummary as any;
  const totalOrders = summary?.totalOrders ?? orders.length;
  const totalNet = summary?.totalNet ?? orders.reduce((s: number, o: any) => s + Number(o.net ?? 0), 0);
  const totalFees = summary?.totalFees ?? orders.reduce((s: number, o: any) => s + Number(o.platformFee ?? 0), 0);

  const inputCls = "w-full bg-transparent border px-3 py-2 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.375rem' };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>PLATFORM:</span>
          {(['all', 'uber_eats', 'doordash', 'menulog', 'manual'] as DeliveryPlatform[]).map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: platformFilter === p ? '#181818' : 'transparent', color: platformFilter === p ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {platformLabel(p)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>DAYS:</span>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: days === d ? '#181818' : 'transparent', color: days === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {d}D
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={() => { setShowLogForm(!showLogForm); setLogMsg(''); }}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
            <Plus size={14} /> Log Manual Order
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: String(totalOrders) },
          { label: 'Net Revenue', value: `$${Number(totalNet).toFixed(2)}` },
          { label: 'Platform Fees', value: `$${Number(totalFees).toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>{s.label}</span>
            <span style={{ fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Log Manual Order form */}
      {showLogForm && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Log Manual Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={labelStyle}>Platform</label>
              <select value={logForm.platform} onChange={e => setLogForm({ ...logForm, platform: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="uber_eats">Uber Eats</option>
                <option value="doordash">DoorDash</option>
                <option value="menulog">Menulog</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input type="text" value={logForm.customerName} onChange={e => setLogForm({ ...logForm, customerName: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="Customer name" />
            </div>
            <div className="md:col-span-2">
              <label style={labelStyle}>Items</label>
              <textarea value={logForm.items} onChange={e => setLogForm({ ...logForm, items: e.target.value })}
                rows={2} className={inputCls} style={inputStyle} placeholder="e.g. 2x Flat White, 1x Croissant" />
            </div>
            <div>
              <label style={labelStyle}>Subtotal ($)</label>
              <input type="number" step="0.01" value={logForm.subtotal} onChange={e => setLogForm({ ...logForm, subtotal: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Platform Fee ($)</label>
              <input type="number" step="0.01" value={logForm.platformFee} onChange={e => setLogForm({ ...logForm, platformFee: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <label style={labelStyle}>Notes</label>
              <input type="text" value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                className={inputCls} style={inputStyle} placeholder="Optional notes" />
            </div>
          </div>
          {logMsg && <p className="font-data mb-3" style={{ fontSize: '0.625rem', color: logMsg === 'Order logged!' ? '#5E8B5E' : '#B85450' }}>{logMsg}</p>}
          <div className="flex items-center gap-3">
            <button
              disabled={logManual.isPending}
              onClick={() => {
                setLogMsg('');
                logManual.mutate({
                  token,
                  platform: logForm.platform,
                  customerName: logForm.customerName,
                  items: logForm.items,
                  subtotal: Number(logForm.subtotal) || 0,
                  platformFee: Number(logForm.platformFee) || 0,
                  notes: logForm.notes,
                });
              }}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {logManual.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Order
            </button>
            <button onClick={() => setShowLogForm(false)}
              className="px-4 py-2 font-data border"
              style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Orders</h2>
        {orders.length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No delivery orders for this period.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Platform', 'Customer', 'Items', 'Subtotal', 'Fee', 'Net', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const badge = platformBadgeColor(order.platform);
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {platformLabel(order.platform)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#181818' }}>{order.customerName || '—'}</td>
                      <td style={{ padding: '10px 10px', color: '#5E5E5E', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.items}>
                        {order.items ? (order.items.length > 40 ? order.items.slice(0, 40) + '…' : order.items) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>${Number(order.subtotal ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#B85450' }}>${Number(order.platformFee ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${Number(order.net ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: 'rgba(94,139,94,0.1)', color: '#5E8B5E', textTransform: 'uppercase' }}>
                          {order.status || 'delivered'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#5E5E5E', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
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
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────
function AuditTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [days, setDays] = useState(30);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [triggerOrderExport, setTriggerOrderExport] = useState(false);
  const [triggerCustomerExport, setTriggerCustomerExport] = useState(false);

  const { data: auditRows, isLoading: auditLoading } = trpc.audit.list.useQuery(
    { token, days, entityType: entityFilter === 'all' ? undefined : entityFilter },
    { enabled: !!token }
  );
  const { data: ordersExport } = trpc.audit.exportOrders.useQuery(
    { token, fromDate: exportFromDate, toDate: exportToDate },
    { enabled: triggerOrderExport && !!exportFromDate && !!exportToDate }
  );
  const { data: customersExport } = trpc.audit.exportCustomers.useQuery(
    { token },
    { enabled: triggerCustomerExport }
  );

  useEffect(() => {
    if (ordersExport && (ordersExport as any).csv) {
      setTriggerOrderExport(false);
      const blob = new Blob([(ordersExport as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [ordersExport]);

  useEffect(() => {
    if (customersExport && (customersExport as any).csv) {
      setTriggerCustomerExport(false);
      const blob = new Blob([(customersExport as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'customers.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }, [customersExport]);

  const rows = (auditRows as any[] | undefined) ?? [];
  const entityTypes = ['all', 'orders', 'menu', 'staff', 'settings'];

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Exports</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Orders From</label>
            <input type="date" value={exportFromDate} onChange={e => { setExportFromDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>To</label>
            <input type="date" value={exportToDate} onChange={e => { setExportToDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <button
            disabled={!exportFromDate || !exportToDate}
            onClick={() => setTriggerOrderExport(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!exportFromDate || !exportToDate) ? 0.5 : 1 }}
          >
            <Download size={14} /> Export Orders CSV
          </button>
          <button
            onClick={() => setTriggerCustomerExport(true)}
            className="px-4 py-2 font-button flex items-center gap-2"
            style={{ background: '#5E8B8B', color: '#fff', fontSize: '0.75rem' }}
          >
            <Download size={14} /> Export Customers CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>ENTITY:</span>
          {entityTypes.map((e) => (
            <button key={e} onClick={() => setEntityFilter(e)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: entityFilter === e ? '#181818' : 'transparent', color: entityFilter === e ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>DAYS:</span>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: days === d ? '#181818' : 'transparent', color: days === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Audit log table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Audit Log</h2>
        {auditLoading && (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
        )}
        {!auditLoading && rows.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No audit entries for this period.</p>
        )}
        {!auditLoading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => {
                  let detailStr = '';
                  try { detailStr = typeof row.details === 'string' ? row.details : JSON.stringify(row.details); } catch { detailStr = ''; }
                  return (
                    <tr key={row.id ?? idx} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', fontFamily: 'Geist Mono', fontSize: 11, color: '#5E5E5E' }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#181818' }}>{row.actor || row.actorEmail || '—'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: 'rgba(94,139,139,0.1)', color: '#5E8B8B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {row.action || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#5E5E5E', textTransform: 'capitalize' }}>{row.entityType || '—'}{row.entityId ? ` #${row.entityId}` : ''}</td>
                      <td style={{ padding: '10px 10px', color: '#5E5E5E', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailStr}>
                        {detailStr.length > 60 ? detailStr.slice(0, 60) + '…' : detailStr}
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
  );
}


// ─── All Venues Tab ───────────────────────────────────────────────────────────
function AllVenuesTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const { data: allVenues, isLoading: venuesLoading, error: venuesError } = trpc.multiVenue.getAllVenues.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: consolidated, isLoading: consolidatedLoading } = trpc.multiVenue.getConsolidatedRevenue.useQuery(
    { token, days: period }, { enabled: !!token }
  );
  const { data: comparison, isLoading: comparisonLoading } = trpc.multiVenue.getVenueComparison.useQuery(
    { token, days: period }, { enabled: !!token }
  );

  const venues = (allVenues as any[]) ?? [];
  const consolidatedData = consolidated as any;
  const comparisonData = (comparison as any[]) ?? [];

  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' };

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={20} style={{ color: '#5E5E5E' }} />
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>
            All Venues
            {venues.length > 0 && (
              <span className="font-data ml-2" style={{ fontSize: '0.625rem', color: '#5E5E5E', letterSpacing: '0.08em' }}>({venues.length})</span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: '#5E5E5E' }}>PERIOD:</span>
          {([7, 30, 90] as const).map((d) => (
            <button key={d} onClick={() => setPeriod(d)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: period === d ? '#181818' : 'transparent', color: period === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Consolidated revenue card */}
      {(consolidatedLoading) && (
        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
      )}
      {!consolidatedLoading && consolidatedData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Revenue (All Venues)</span>
            <span style={bigNum}>${Number(consolidatedData.totalRevenue ?? 0).toFixed(2)}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Total Orders</span>
            <span style={bigNum}>{consolidatedData.totalOrders ?? 0}</span>
          </div>
          <div className="border p-5" style={statCardStyle}>
            <span style={monoLabel}>Active Venues</span>
            <span style={bigNum}>{consolidatedData.activeVenues ?? venues.length}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {venuesError && (
        <div className="border p-4 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450' }} />
          <span style={{ fontSize: '0.875rem', color: '#B85450' }}>{venuesError.message}</span>
        </div>
      )}

      {/* Loading */}
      {venuesLoading && (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
      )}

      {/* Per-venue cards */}
      {!venuesLoading && venues.length === 0 && !venuesError && (
        <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No venues found.</p>
      )}

      {!venuesLoading && venues.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Venue Breakdown</h3>
          {(comparisonLoading) && (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((v: any) => {
              const stats = comparisonData.find((c: any) => c.venueId === v.id) as any | undefined;
              const change = stats?.revenueChange ?? null;
              const isPositive = change !== null && change >= 0;
              return (
                <div key={v.id} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.1)', background: '#E8E4DD' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '1rem', color: '#181818', display: 'block' }}>{v.name}</span>
                      {v.address && (
                        <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em' }}>{v.address}</span>
                      )}
                    </div>
                    <a
                      href={`/dashboard?v=${v.id}`}
                      className="px-3 py-1.5 font-data"
                      style={{ fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.2)', color: '#181818', textDecoration: 'none', background: 'transparent', whiteSpace: 'nowrap' as const }}>
                      Open Dashboard
                    </a>
                  </div>
                  {stats ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span style={monoLabel}>Revenue</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#181818' }}>${Number(stats.revenue ?? 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Orders</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#181818' }}>{stats.orderCount ?? 0}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Change</span>
                        {change !== null ? (
                          <span className="flex items-center gap-1" style={{ fontWeight: 500, fontSize: '0.9375rem', color: isPositive ? '#5E8B5E' : '#B85450' }}>
                            {isPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {Math.abs(Number(change)).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: '#5E5E5E' }}>—</span>
                        )}
                      </div>
                    </div>
                  ) : !comparisonLoading ? (
                    <p className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>No data for this period.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SMS Marketing Tab ────────────────────────────────────────────────────────
const SMS_SEGMENTS = [
  { id: 'all', label: 'All Customers', description: 'Every customer in your database' },
  { id: 'lapsed_30d', label: 'Lapsed 30 Days', description: 'No order in last 30 days' },
  { id: 'lapsed_60d', label: 'Lapsed 60 Days', description: 'No order in last 60 days' },
  { id: 'birthday_month', label: 'Birthday This Month', description: 'Customers with birthday this month' },
  { id: 'top_spenders', label: 'Top Spenders', description: 'Top 20% by lifetime value' },
] as const;

type SmsSegmentId = typeof SMS_SEGMENTS[number]['id'];

function SmsMarketingTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [selectedSegment, setSelectedSegment] = useState<SmsSegmentId>('all');
  const [message, setMessage] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const { data: segmentsData, isLoading: segmentsLoading } = trpc.smsMarketing.getSegments.useQuery(
    { token }, { enabled: !!token }
  );
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.smsMarketing.getCampaignHistory.useQuery(
    { token }, { enabled: !!token }
  );

  const sendBulk = trpc.smsMarketing.sendBulkSms.useMutation({
    onSuccess: (data: any) => {
      setSendResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setConfirmVisible(false);
      setMessage('');
      refetchHistory();
    },
    onError: () => {
      setConfirmVisible(false);
    },
  });

  const segments = (segmentsData as any[]) ?? [];
  const history = (historyData as any[]) ?? [];

  const currentSegment = segments.find((s: any) => s.id === selectedSegment) as any | undefined;
  const customerCount = currentSegment?.count ?? 0;
  const charCount = message.length;
  const maxChars = 160;

  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare size={20} style={{ color: '#5E5E5E' }} />
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>SMS Marketing</h2>
      </div>

      {/* Segment selector */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Select Audience</h3>
        {segmentsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SMS_SEGMENTS.map((seg) => {
            const segStats = segments.find((s: any) => s.id === seg.id) as any | undefined;
            const count = segStats?.count ?? '—';
            const isSelected = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => { setSelectedSegment(seg.id); setSendResult(null); }}
                style={{
                  background: isSelected ? '#181818' : '#E8E4DD',
                  border: `1px solid ${isSelected ? '#181818' : 'rgba(24,24,24,0.12)'}`,
                  color: isSelected ? '#F3F2EE' : '#181818',
                  padding: '12px 16px',
                  textAlign: 'left' as const,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', display: 'block' }}>{seg.label}</span>
                  <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.06em', opacity: 0.7 }}>{seg.description}</span>
                </div>
                <span style={{ fontFamily: 'Geist Mono', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                  {count} customers
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message composer */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Compose Message</h3>
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            rows={4}
            placeholder="Type your SMS message here…"
            style={{
              width: '100%',
              fontFamily: 'Inter',
              fontSize: '0.9375rem',
              color: '#181818',
              background: 'transparent',
              border: '1px solid rgba(24,24,24,0.15)',
              padding: '12px 14px',
              resize: 'vertical' as const,
              boxSizing: 'border-box' as const,
            }}
          />
          <span className="font-data" style={{
            fontSize: '0.5625rem',
            letterSpacing: '0.08em',
            position: 'absolute',
            bottom: 10,
            right: 12,
            color: charCount >= maxChars ? '#B85450' : '#5E5E5E',
          }}>
            {charCount}/{maxChars}
          </span>
        </div>

        {sendResult && (
          <div className="mt-3 border p-3 flex items-center gap-2" style={{ borderColor: '#5E8B5E', background: 'rgba(94,139,94,0.08)' }}>
            <Check size={14} style={{ color: '#5E8B5E' }} />
            <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E', letterSpacing: '0.08em' }}>
              Sent {sendResult.sent} messages{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}.
            </span>
          </div>
        )}

        {sendBulk.isError && (
          <div className="mt-3 border p-3 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
            <AlertCircle size={14} style={{ color: '#B85450' }} />
            <span className="font-data" style={{ fontSize: '0.625rem', color: '#B85450', letterSpacing: '0.08em' }}>
              {sendBulk.error?.message ?? 'Send failed.'}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          {!confirmVisible ? (
            <button
              disabled={!message.trim() || customerCount === 0}
              onClick={() => setConfirmVisible(true)}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{
                background: '#181818',
                color: '#F3F2EE',
                fontSize: '0.75rem',
                opacity: (!message.trim() || customerCount === 0) ? 0.5 : 1,
                cursor: (!message.trim() || customerCount === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} /> Send SMS
            </button>
          ) : (
            <div className="flex items-center gap-3 border p-3" style={{ borderColor: '#C4953A', background: 'rgba(196,149,58,0.08)' }}>
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#C4953A', letterSpacing: '0.06em' }}>
                Send to {customerCount} customers?
              </span>
              <button
                onClick={() => sendBulk.mutate({ token, segment: selectedSegment, message })}
                disabled={sendBulk.isPending}
                className="px-4 py-2 font-button flex items-center gap-2"
                style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', opacity: sendBulk.isPending ? 0.6 : 1 }}
              >
                {sendBulk.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmVisible(false)}
                disabled={sendBulk.isPending}
                className="px-4 py-2 font-data border"
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campaign history */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Campaign History</h3>
        {historyLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
        {!historyLoading && history.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No campaigns sent yet.</p>
        )}
        {!historyLoading && history.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Date', 'Segment', 'Message', 'Sent'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row: any, i: number) => (
                  <tr key={row.id ?? i} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E', whiteSpace: 'nowrap' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {new Date(row.sentAt ?? row.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#181818', textTransform: 'capitalize' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {SMS_SEGMENTS.find((s) => s.id === row.segment)?.label ?? row.segment}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#5E5E5E', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {row.message}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#5E8B5E', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {row.sentCount ?? row.sent ?? 0}
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

// ─── Franchisee Tab ───────────────────────────────────────────────────────────
function FranchiseeTab() {
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

  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: '#181818', fontFamily: 'Inter' };
  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Percent size={20} style={{ color: '#5E5E5E' }} />
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Franchisee</h2>
      </div>

      {/* Config error */}
      {configError && (
        <div className="border p-4 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450' }} />
          <span style={{ fontSize: '0.875rem', color: '#B85450' }}>{configError.message}</span>
        </div>
      )}

      {/* Config section */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Platform Configuration</h3>
        {configLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
        {!configLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E' }}>Platform Fee %</label>
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
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5E5E5E' }}>Payout Schedule</label>
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
              setupMutation.mutate({ token, platformFeePercent: Number(feeInput), payoutSchedule: scheduleInput });
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
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>
          Current Month Revenue Split
          <span className="font-data ml-2" style={{ fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em' }}>
            {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
        </h3>
        {splitLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
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
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No revenue data for the current month.</p>
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
                onClick={() => { setPayoutMsg(''); payoutMutation.mutate({ token, periodStart, periodEnd }); setConfirmPayout(false); }}
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
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
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
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>Payout History</h3>
        {payoutsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>}
        {!payoutsLoading && payouts.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No payouts processed yet.</p>
        )}
        {!payoutsLoading && payouts.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Period', 'Gross', 'Fee', 'Net', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5E5E5E', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map((row: any, i: number) => {
                  const statusColor = row.status === 'paid' ? '#5E8B5E' : '#C4953A';
                  return (
                    <tr key={row.id ?? i} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', color: '#181818', fontFamily: 'Geist Mono', fontSize: '0.625rem', whiteSpace: 'nowrap' as const }}>
                        {row.periodStart ? new Date(row.periodStart).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#181818' }}>${Number(row.grossRevenue ?? 0).toFixed(2)}</td>
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
  );
}

// ─── QR Codes Tab ─────────────────────────────────────────────────────────────
function QRCodesTab({ venue }: { venue: any }) {
  const slug = venue?.slug ?? '';
  const origin = window.location.origin;

  // Table QR state
  const [tableCount, setTableCount] = useState(10);
  const [tableQRs, setTableQRs] = useState<{ table: number; url: string; dataUrl: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  // Single QR states (generated on mount)
  const [menuQR, setMenuQR] = useState('');
  const [kioskQR, setKioskQR] = useState('');

  const qrLabelStyle = {
    fontFamily: 'Geist Mono, monospace',
    fontSize: '0.625rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#5E5E5E',
    display: 'block',
    marginBottom: '0.375rem',
  };

  // Generate single QRs on mount
  useEffect(() => {
    if (!slug) return;
    QRCode.toDataURL(`${origin}/v/${slug}`, { width: 250, margin: 1 }).then(setMenuQR).catch(() => {});
    QRCode.toDataURL(`${origin}/kiosk/${slug}`, { width: 250, margin: 1 }).then(setKioskQR).catch(() => {});
  }, [slug, origin]);

  const generateTableQRs = async () => {
    if (!tableCount || tableCount < 1) return;
    setGenerating(true);
    const codes = await Promise.all(
      Array.from({ length: tableCount }, async (_, i) => {
        const tableNum = i + 1;
        const url = `${origin}/v/${slug}?table=${tableNum}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        return { table: tableNum, url, dataUrl };
      }),
    );
    setTableQRs(codes);
    setGenerating(false);
  };

  const printTableQRs = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>Table QR Codes — ${slug}</title><style>
      body { font-family: sans-serif; }
      .grid { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
      .card { text-align: center; border: 1px solid #ccc; padding: 12px; break-inside: avoid; }
      img { display: block; margin: 0 auto; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h2 style="text-align:center;padding:20px">${slug} — Table QR Codes</h2>
    <div class="grid">${tableQRs.map((q) => `<div class="card"><img src="${q.dataUrl}" width="150"/><p>Table ${q.table}</p></div>`).join('')}</div>
    <button class="no-print" onclick="window.print()">Print</button>
    <script>window.onload = () => window.print();<\/script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printSingle = (dataUrl: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
      body { font-family: sans-serif; text-align: center; padding: 40px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h2>${title}</h2>
    <img src="${dataUrl}" width="250" style="display:block;margin:20px auto"/>
    <button class="no-print" onclick="window.print()">Print</button>
    <script>window.onload = () => window.print();<\/script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadQR = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const qrSectionStyle = { borderColor: 'rgba(24,24,24,0.08)' };
  const qrBtnPrimary = { background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' };
  const qrBtnSecondary = { borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.75rem' };

  return (
    <div className="space-y-6">
      {/* Table QR Codes */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>
          Table QR Codes
        </h2>
        <div className="flex items-end gap-3 mb-5">
          <div className="flex-1">
            <label style={qrLabelStyle}>Number of Tables</label>
            <input
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={(e) => setTableCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-transparent border px-4 py-3 focus:outline-none"
              style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }}
            />
          </div>
          <button
            onClick={generateTableQRs}
            disabled={generating}
            className="py-3 px-6 font-button flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-40"
            style={qrBtnPrimary}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
            Generate
          </button>
        </div>

        {tableQRs.length > 0 && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-4 max-h-96 overflow-y-auto">
              {tableQRs.map((q) => (
                <div key={q.table} className="text-center border p-2 group relative" style={{ borderColor: 'rgba(24,24,24,0.1)' }}>
                  <img src={q.dataUrl} alt={`Table ${q.table}`} className="w-full" />
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: '#5E5E5E', marginTop: '4px' }}>
                    T{q.table}
                  </p>
                  <button
                    onClick={() => downloadQR(q.dataUrl, `table-${q.table}-qr.png`)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    style={{ background: '#181818', color: '#F3F2EE' }}
                    title="Download"
                  >
                    <Download size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={printTableQRs}
                className="px-5 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print All
              </button>
            </div>
          </>
        )}
      </div>

      {/* Menu QR */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>
          Menu QR Code
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          {origin}/v/{slug}
        </p>
        {menuQR ? (
          <div className="flex items-start gap-6">
            <img src={menuQR} alt="Menu QR" width={150} height={150} />
            <div className="flex flex-col gap-2 justify-start pt-2">
              <button
                onClick={() => downloadQR(menuQR, `${slug}-menu-qr.png`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 hover:opacity-85 transition-opacity"
                style={qrBtnPrimary}
              >
                <Download size={14} /> Download
              </button>
              <button
                onClick={() => printSingle(menuQR, `${slug} — Menu QR Code`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
        )}
      </div>

      {/* Kiosk Mode QR */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>
          Kiosk Mode QR
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          {origin}/kiosk/{slug}
        </p>
        {kioskQR ? (
          <div className="flex items-start gap-6">
            <img src={kioskQR} alt="Kiosk QR" width={150} height={150} />
            <div className="flex flex-col gap-2 justify-start pt-2">
              <button
                onClick={() => downloadQR(kioskQR, `${slug}-kiosk-qr.png`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 hover:opacity-85 transition-opacity"
                style={qrBtnPrimary}
              >
                <Download size={14} /> Download
              </button>
              <button
                onClick={() => printSingle(kioskQR, `${slug} — Kiosk Mode QR Code`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: '#5E5E5E' }} /></div>
        )}
      </div>
    </div>
  );
}
