import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { useVenueSSE } from '@/hooks/useVenueSSE';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap, Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X, AlertCircle, Star, Gift, Ticket, MapPin, Briefcase, QrCode, Download, Send, TrendingUp, ChevronDown, ChevronUp, Tag, DollarSign, PieChart as PieChartIcon, Building2, MessageSquare, Percent, GripVertical, Bell, CalendarDays, Clock, Eye, EyeOff, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/layout/ThemeContext';
import type { SidebarNavGroup } from '@/components/layout/SidebarNav';
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

// ─── Shared dashboard design system ──────────────────────────────────────────
const DS = {
  card: {
    background: 'var(--op-card-bg)',
    borderRadius: 'var(--op-radius-card)',
    border: '1px solid var(--op-card-border)',
    padding: '20px 24px',
    boxShadow: 'var(--op-shadow)',
  } as React.CSSProperties,
  cardFlush: {
    background: 'var(--op-card-bg)',
    borderRadius: 'var(--op-radius-card)',
    border: '1px solid var(--op-card-border)',
    boxShadow: 'var(--op-shadow)',
    overflow: 'hidden',
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--op-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: 6,
    display: 'block',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--op-text)',
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--op-card-border)',
    borderRadius: 'var(--op-radius-input)',
    fontSize: 14,
    color: 'var(--op-text)',
    background: 'var(--op-bg)',
    outline: 'none',
    fontFamily: 'var(--op-font-sans)',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btnPrimary: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: 'none',
    background: 'var(--op-accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: '1px solid var(--op-card-border)',
    background: 'var(--op-card-bg)',
    color: 'var(--op-text)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.15s',
  } as React.CSSProperties,
  btnDanger: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: '1px solid #FECACA',
    background: '#FEF2F2',
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,
  tableHeader: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--op-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--op-card-border)',
    background: 'var(--op-bg)',
  } as React.CSSProperties,
  tableCell: {
    padding: '11px 14px',
    fontSize: 13,
    color: 'var(--op-text)',
    borderBottom: '1px solid var(--op-card-border)',
    verticalAlign: 'middle' as const,
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: 'var(--op-text-muted)',
    fontSize: 13,
  } as React.CSSProperties,
  badge: (color: string, bg: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 9px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color,
  } as React.CSSProperties),
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const token = localStorage.getItem('b1-owner-token') || '';
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'pl' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering' | 'promo' | 'bundles' | 'campaigns' | 'loyalty' | 'delivery' | 'audit' | 'allvenues' | 'smsmarketing' | 'franchisee' | 'qrcodes' | 'website' | 'scheduling' | 'timesheets'>('overview');

  const { data: myVenues } = trpc.venue.listMyVenues.useQuery({ token }, { enabled: !!token });
  const switchVenue = trpc.venue.getVenueToken.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('b1-token', data.token);
      window.location.reload();
    },
  });

  // ── Activity feed ──────────────────────────────────────────────────────────
  const [activityOpen, setActivityOpen] = useState(false);
  const { data: activityFeed } = trpc.venue.getActivityFeed.useQuery(
    { token },
    { enabled: !!token, refetchInterval: false }
  );
  const feedUtils = trpc.useUtils();
  useVenueSSE({
    venueId: venue?.id ?? null,
    token: token || null,
    events: ['order_new', 'order_update'],
    onEvent: () => {
      feedUtils.venue.getActivityFeed.invalidate();
    },
  });

  // ── Sidebar nav groups ─────────────────────────────────────────────────────
  const NAV_GROUPS: SidebarNavGroup[] = [
    { group: 'Overview', items: [
      { id: 'overview', label: 'Dashboard', icon: BarChart3 },
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'pl', label: 'P&L Report', icon: DollarSign },
    ]},
    { group: 'Venue', items: [
      { id: 'menu', label: 'Menu', icon: Coffee },
      { id: 'locations', label: 'Locations', icon: MapPin },
      { id: 'bundles', label: 'Bundles', icon: Gift },
      { id: 'catering', label: 'Catering', icon: Briefcase },
      { id: 'delivery', label: 'Delivery', icon: Globe },
    ]},
    { group: 'Customers', items: [
      { id: 'loyalty', label: 'Loyalty Program', icon: Star },
      { id: 'reviews', label: 'Reviews', icon: Star },
      { id: 'giftcards', label: 'Gift Cards', icon: Gift },
      { id: 'passes', label: 'Passes', icon: Ticket },
    ]},
    { group: 'Marketing', items: [
      { id: 'campaigns', label: 'Campaigns', icon: Send },
      { id: 'smsmarketing', label: 'SMS Marketing', icon: MessageSquare },
      { id: 'promo', label: 'Promotions', icon: Tag },
    ]},
    { group: 'Staff & Operations', items: [
      { id: 'scheduling', label: 'Scheduling', icon: CalendarDays },
      { id: 'timesheets', label: 'Timesheets', icon: Clock },
      { id: 'audit', label: 'Audit Log', icon: Shield },
      { id: 'allvenues', label: 'All Venues', icon: Building2 },
      { id: 'franchisee', label: 'Franchisee', icon: Percent },
    ]},
    { group: 'Finance', items: [
      { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
    ]},
    { group: 'Settings', items: [
      { id: 'website', label: 'Website Builder', icon: Globe },
      { id: 'settings', label: 'Venue Settings', icon: Settings },
      { id: 'integrations', label: 'Integrations', icon: Link2 },
      { id: 'qrcodes', label: 'QR Codes', icon: QrCode },
    ]},
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--op-text)' }} />
      </div>
    );
  }

  if (!owner || !venue) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center">
          <Shield size={40} style={{ color: '#B85450' }} className="mx-auto mb-4" />
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.5rem' }}>Login Required</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)', marginBottom: '1.5rem' }}>Please log in to access your dashboard.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-3 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>GO TO LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AppShell
        groups={NAV_GROUPS}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as typeof activeTab)}
        topBarLeft={
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--op-sidebar,#18181B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Coffee size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--op-text,#09090B)', letterSpacing: '-0.02em' }}>B1 Platform</span>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--op-card-border,#E4E4E7)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--op-text,#09090B)' }}>{venue.name}</span>
            </div>
            {myVenues && myVenues.length > 1 && (
              <select
                defaultValue={venue.id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId && Number(selectedId) !== venue.id) switchVenue.mutate({ token, venueId: Number(selectedId) });
                }}
                style={{ background: 'var(--op-bg,#FAFAFA)', color: 'var(--op-text,#09090B)', border: '1px solid var(--op-card-border,#E4E4E7)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
              >
                {myVenues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: venue.subscriptionStatus === 'trial' ? '#FEF3C7' : '#D1FAE5', color: venue.subscriptionStatus === 'trial' ? '#92400E' : '#065F46' }}>
              {venue.subscriptionStatus === 'trial' ? 'Trial' : (venue.subscriptionTier || 'Active')}
            </span>
          </>
        }
        topBarRight={
          <>
            {/* Activity bell with unread-reviews badge */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setActivityOpen(o => !o)}
                title="Recent activity"
                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--op-card-border,#E4E4E7)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--op-text-secondary,#71717A)', position: 'relative' }}
              >
                <Bell size={15} />
                {activityFeed && activityFeed.unreadReviews > 0 && (
                  <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#5E8B8B', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }}>
                    {activityFeed.unreadReviews}
                  </span>
                )}
              </button>
              {activityOpen && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 300, background: 'var(--op-card-bg,#FFFFFF)', border: '1px solid var(--op-card-border,#E4E4E7)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text,#09090B)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Recent Activity
                    {activityFeed && activityFeed.unreadReviews > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: 99, background: '#5E8B8B', color: '#fff', fontSize: 10 }}>
                        {activityFeed.unreadReviews} new {activityFeed.unreadReviews === 1 ? 'review' : 'reviews'}
                      </span>
                    )}
                  </div>
                  {activityFeed && activityFeed.recentOrders.length > 0 ? activityFeed.recentOrders.map((order) => (
                    <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--op-card-border,#E4E4E7)' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--op-text,#09090B)' }}>#{order.orderNumber}</span>
                        <span style={{ fontSize: 11, color: 'var(--op-text-secondary,#71717A)', marginLeft: 8 }}>{order.status}</span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--op-text,#09090B)' }}>${order.totalAmount}</span>
                    </div>
                  )) : (
                    <p style={{ fontSize: 12, color: 'var(--op-text-secondary,#71717A)', textAlign: 'center', padding: '8px 0' }}>No recent orders</p>
                  )}
                </div>
              )}
            </div>
            <a href={`/v/${venue.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--op-card-border,#E4E4E7)', background: 'transparent', fontSize: 12, fontWeight: 500, color: 'var(--op-text-secondary,#71717A)', textDecoration: 'none' }}>
              <Globe size={13} /> View Site
            </a>
            <a href={`/book/${venue.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--op-card-border,#E4E4E7)', background: 'transparent', fontSize: 12, fontWeight: 500, color: 'var(--op-text-secondary,#71717A)', textDecoration: 'none' }}>
              <MapPin size={13} /> Bookings
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 8, border: '1px solid var(--op-card-border,#E4E4E7)', background: 'transparent', cursor: 'default' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--op-sidebar,#18181B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{(owner.name || owner.email || 'U').charAt(0).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--op-text,#09090B)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name || owner.email}</span>
            </div>
            <button onClick={logout} title="Sign out" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--op-card-border,#E4E4E7)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--op-text-secondary,#71717A)', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--op-card-border,#E4E4E7)'; e.currentTarget.style.color = 'var(--op-text-secondary,#71717A)'; }}
            >
              <LogOut size={15} />
            </button>
          </>
        }
      >
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
          {activeTab === 'scheduling' && venue && <SchedulingTab token={token} venueId={venue.id} />}
          {activeTab === 'timesheets' && venue && <TimesheetTab token={token} />}
        </div>
      </AppShell>
    </ThemeProvider>
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

  // Shared card style using CSS variables so dark mode works correctly
  const card: CSSProperties = {
    background: 'var(--op-card-bg, #FFFFFF)',
    borderRadius: 'var(--op-radius-card, 12px)',
    border: '1px solid var(--op-card-border, #E6E4E0)',
    padding: '20px 24px',
    boxShadow: 'var(--op-shadow)',
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Welcome back{owner?.name ? `, ${owner.name}` : ''}. Here's what's happening today.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Your Site',  value: `/${venue.slug}`,                          icon: Globe,       color: '#5E8B8B', iconBg: 'rgba(94,139,139,0.10)' },
          { label: 'Plan',       value: venue.subscriptionTier || 'Trial',          icon: CreditCard,  color: '#7C5CBF', iconBg: 'rgba(124,92,191,0.10)' },
          { label: 'Status',     value: venue.subscriptionStatus || 'trial',        icon: Shield,      color: '#3D9A6E', iconBg: 'rgba(61,154,110,0.10)' },
          { label: 'POS',        value: venue.squareEnabled ? 'Square ✓' : 'Not connected', icon: Zap, color: '#C4953A', iconBg: 'rgba(196,149,58,0.10)'  },
        ].map((s) => (
          <div key={s.label} style={card}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--op-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--op-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)', margin: '0 0 14px', letterSpacing: '-0.01em' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { label: 'View Live Site',   icon: Globe,    href: `/v/${venue.slug}` },
            { label: 'Edit Menu',        icon: Coffee,   tab: 'menu' as const },
            { label: 'Analytics',        icon: BarChart3,tab: 'analytics' as const },
            { label: 'Website Builder',  icon: Settings, tab: 'website' as const },
          ].map((action) => {
            const sharedStyle: CSSProperties = {
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '10px 14px',
              borderRadius: 'var(--op-radius, 8px)',
              border: '1px solid var(--op-card-border)',
              background: 'var(--op-bg)',
              color: 'var(--op-text)',
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.12s', cursor: 'pointer',
            };
            return action.href ? (
              <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer"
                style={{ ...sharedStyle, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--op-card-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--op-bg)'; }}
              >
                <action.icon size={14} style={{ color: '#5E8B8B', flexShrink: 0 }} /> {action.label}
              </a>
            ) : (
              <button key={action.label} onClick={() => setActiveTab(action.tab!)}
                style={sharedStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--op-card-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--op-bg)'; }}
              >
                <action.icon size={14} style={{ color: '#5E8B8B', flexShrink: 0 }} /> {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today at a Glance */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.01em' }}>Today at a Glance</h2>
            {summary?.date && (
              <p style={{ fontSize: 12, color: 'var(--op-text-muted)', margin: '4px 0 0' }}>
                {new Date(summary.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {emailStatus === 'sent' && (
              <span style={{ fontSize: 12, color: '#3D9A6E', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Sent
              </span>
            )}
            {emailStatus === 'error' && (
              <span style={{ fontSize: 12, color: '#B85450', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Failed
              </span>
            )}
            <button
              onClick={handleSendEmail}
              disabled={sendEmail.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--op-radius, 8px)', border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', fontSize: 12, fontWeight: 500, color: 'var(--op-text)', cursor: sendEmail.isPending ? 'not-allowed' : 'pointer', opacity: sendEmail.isPending ? 0.6 : 1, transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--op-accent)'; e.currentTarget.style.color = 'var(--op-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--op-card-border)'; e.currentTarget.style.color = 'var(--op-text)'; }}
            >
              {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Email Summary
            </button>
          </div>
        </div>

        {summaryLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--op-text-muted)' }} />
          </div>
        )}

        {!summaryLoading && summary && (
          <div>
            {/* Stat pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Total Orders', value: summary.orderCount ?? 0,                          prefix: '',  color: '#5E8B8B' },
                { label: 'Completed',    value: summary.completedCount ?? 0,                       prefix: '',  color: '#3D9A6E' },
                { label: 'Pending',      value: summary.pendingCount ?? 0,                         prefix: '',  color: '#C4953A' },
                { label: 'Revenue',      value: Number(summary.totalRevenue ?? 0).toFixed(2),      prefix: '$', color: '#7C5CBF' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 'var(--op-radius)', background: 'var(--op-bg)', border: '1px solid var(--op-card-border)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>
                    {stat.prefix}{stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--op-text-muted)', marginTop: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Top items */}
            {summary.topItems && summary.topItems.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--op-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Top Items Today
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {summary.topItems.slice(0, 5).map((item: { name: string; qty: number }, idx: number) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--op-radius)', background: idx === 0 ? 'rgba(94,139,139,0.07)' : 'transparent' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: idx === 0 ? '#5E8B8B' : 'var(--op-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: idx === 0 ? '#fff' : 'var(--op-text-muted)', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--op-text)', fontWeight: idx === 0 ? 600 : 400 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: idx === 0 ? '#5E8B8B' : 'var(--op-text-muted)' }}>
                        {item.qty} sold
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!summary.topItems || summary.topItems.length === 0) && summary.orderCount === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--op-text-muted)', fontSize: 13 }}>
                No orders yet today — share your site link to start taking orders!
              </div>
            )}
          </div>
        )}

        {!summaryLoading && !summary && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--op-text-muted)', fontSize: 13 }}>
            Could not load today's summary.
          </div>
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
    { token, days: selectedDays, limit: 5 }, { enabled: !!token }
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
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Revenue trends, top items, and hourly insights.
        </p>
      </div>
      <div className="space-y-6">
      {/* Days selector + Export */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
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
      {overviewLoading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
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
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Daily Revenue</h2>
        {dailyLoading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
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
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No data for this period.</p>
        )}
      </div>

      {/* Top items */}
      {topItems && topItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Top Selling Items</h2>
          <div className="space-y-2">
            {(topItems as { name: string; quantity: number; revenue: string }[]).map((item, idx) => {
              const maxQty = Math.max(...(topItems as { name: string; quantity: number }[]).map(i => i.quantity));
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', width: '1.25rem', textAlign: 'right' }}>{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{item.quantity} sold</span>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Orders by Hour</h2>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Order Type Breakdown</h2>
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
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{entry.name || 'Unknown'}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Item-by-hour heatmap */}
      {heatmapTopItems.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Item Popularity by Hour</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', fontFamily: 'Geist Mono', fontSize: 9, textAlign: 'left', color: 'var(--op-text-secondary)', minWidth: 120 }}>Item</th>
                  {heatmapHours.map(h => (
                    <th key={h} style={{ padding: '4px 6px', fontFamily: 'Geist Mono', fontSize: 9, color: 'var(--op-text-secondary)', textAlign: 'center', minWidth: 36 }}>{hourLabel(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapTopItems.map(itemName => (
                  <tr key={itemName}>
                    <td style={{ padding: '3px 8px', fontSize: 12, color: 'var(--op-text)', fontWeight: 500 }}>{itemName}</td>
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
          <p className="font-data mt-3" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>Darker cells = more orders at that hour. Based on last {selectedDays} days.</p>
        </div>
      )}

      {/* Sellout events */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Sellout Events (Last 30 Days)</h2>
        {!selloutEvents || (selloutEvents as any[]).length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No sellout events recorded in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            {(selloutEvents as { itemName: string; soldOutAt: Date | string; hour: number }[]).map((ev, i) => {
              const d = new Date(ev.soldOutAt);
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                  <AlertCircle size={12} style={{ color: '#B85450', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{ev.itemName}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
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
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          P&amp;L Report
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Profit and loss summary across your venues.
        </p>
      </div>
      <div className="space-y-6">
      {/* Days selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Revenue by Category</h2>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Revenue by Order Type</h2>
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
                  <span style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{entry.name}</span>
                  <span className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>{entry.value} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estimated margins table */}
      {catData.length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.5rem' }}>Estimated Margins</h2>
          <p className="font-data mb-4" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
            Cost estimates are based on typical cafe margins. Set actual costs per item in Menu settings.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Category', 'Revenue', 'Est. Cost (40%)', 'Est. Profit', 'Margin %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
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
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--op-text)', textTransform: 'capitalize' }}>{row.category}</td>
                      <td style={{ padding: '10px 10px' }}>${row.revenue.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>${estCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px', color: '#5E8B5E', fontWeight: 500 }}>${estProfit.toFixed(2)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '2px 8px', background: `${marginColor}18`, color: marginColor }}>{margin}%</span>
                      </td>
                    </tr>
                  );
                })}
                {totalRevenue > 0 && (
                  <tr style={{ borderTop: '2px solid rgba(24,24,24,0.1)', background: '#E8E4DD' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--op-text)' }}>Total</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>${totalRevenue.toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>${(totalRevenue * 0.4).toFixed(2)}</td>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Repeat Customers</h2>
          <div className="flex items-center gap-6">
            <div className="border p-5" style={{ ...statCardStyle, minWidth: 120 }}>
              <span style={monoLabel}>Repeat Rate</span>
              <span style={{ ...bigNum, fontSize: '2rem', color: '#5E8B8B' }}>{repeatRate.rate}%</span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--op-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--op-text)' }}>{repeatRate.repeat}</strong> of <strong style={{ color: 'var(--op-text)' }}>{repeatRate.total}</strong> customers ordered more than once in the last {selectedDays} days.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Image upload component used inside the website block editor ─────────────
const IMG_UPLOAD_INPUT: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid var(--op-card-border)',
  borderRadius: 6, fontSize: 11, color: 'var(--op-text-muted)', background: 'var(--op-card-bg)',
  boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--op-font-sans)',
};
const IMG_UPLOAD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--op-text-secondary)',
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
          border: `2px dashed ${dragOver ? '#5E8B8B' : 'var(--op-card-border)'}`,
          background: value ? 'transparent' : (dragOver ? 'rgba(94,139,139,0.06)' : 'var(--op-bg)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}
      >
        {value && !uploading
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : uploading
            ? <div style={{ fontSize: 18 }}>⏳</div>
            : <div style={{ fontSize: 22, color: 'var(--op-text-muted)' }}>📷</div>
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
          border: `2px dashed ${dragOver ? '#5E8B8B' : 'var(--op-card-border)'}`,
          background: value ? 'transparent' : (dragOver ? 'rgba(94,139,139,0.06)' : 'var(--op-bg)'),
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
            <div style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Uploading…</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)' }}>Upload photo</div>
            <div style={{ fontSize: 10, color: 'var(--op-text-muted)', marginTop: 2 }}>Drag & drop or click · JPG PNG WebP · max 5 MB</div>
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

// ─── Template Preview Card ────────────────────────────────────────────────────
// Renders a rich visual representation of each template's design identity.
// Uses inline SVG-like HTML elements at a fixed scale to simulate the real page.
function TemplatePreviewCard({ template: t }: { template: { id: string; preview: { bg: string; accent: string; headline: string }; palette: { primary: string; accent: string; bg: string } } }) {
  const { bg, accent, headline } = t.preview;
  const isDark = t.id === 'noir';

  // Each template gets a unique layout thumbnail
  const thumbnails: Record<string, React.ReactNode> = {
    fresh: (
      <div style={{ background: bg, height: 160, padding: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Hero */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.52))`, backgroundImage: `url(https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 80, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.9)', marginBottom: 4 }} />
            <div style={{ width: 50, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.6)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 3, padding: '3px 8px' }}>
              <div style={{ width: 30, height: 4, borderRadius: 1, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* Menu section */}
        <div style={{ background: '#fff', padding: '8px 14px', borderBottom: `1px solid ${headline}12` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.7, marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: `${headline}10`, border: `1px solid ${headline}15` }} />)}
          </div>
        </div>
        {/* About + CTA */}
        <div style={{ background: '#FAFAF8', padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 45, height: 4, borderRadius: 2, background: headline, opacity: 0.8, marginBottom: 4 }} />
            <div style={{ width: 80, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
          </div>
          <div style={{ background: headline, borderRadius: 3, padding: '4px 8px' }}>
            <div style={{ width: 28, height: 3, borderRadius: 1, background: '#fff' }} />
          </div>
        </div>
      </div>
    ),

    warmth: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — warm overlay */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(68,28,12,0.3), rgba(68,28,12,0.65))`, backgroundImage: `url(https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 75, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.92)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.65)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 3, padding: '3px 8px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 1, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* About — warm cream */}
        <div style={{ background: '#FDF6EE', padding: '8px 14px', borderBottom: `1px solid #FDE68A` }}>
          <div style={{ width: 55, height: 5, borderRadius: 2, background: headline, opacity: 0.8, marginBottom: 5 }} />
          <div style={{ width: 110, height: 3, borderRadius: 2, background: headline, opacity: 0.4, marginBottom: 3 }} />
          <div style={{ width: 90, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
        </div>
        {/* Hours */}
        <div style={{ background: '#FEF3C7', padding: '7px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ width: 55, height: 3, borderRadius: 2, background: headline, opacity: 0.6 }} />
            <div style={{ width: 35, height: 3, borderRadius: 2, background: accent, opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: headline, opacity: 0.4 }} />
            <div style={{ width: 30, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    ),

    noir: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — deep dark */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.88))`, backgroundImage: `url(https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 80, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.95)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.6)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 2, padding: '3px 8px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 1, background: '#0D0D0F' }} />
            </div>
          </div>
        </div>
        {/* Gold banner */}
        <div style={{ background: accent, padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: '#0D0D0F', opacity: 0.7 }} />
          <div style={{ background: '#0D0D0F', borderRadius: 3, padding: '3px 7px' }}>
            <div style={{ width: 24, height: 3, borderRadius: 1, background: accent }} />
          </div>
        </div>
        {/* Dark about */}
        <div style={{ background: '#181818', padding: '8px 14px', borderBottom: `1px solid #27272A` }}>
          <div style={{ width: 55, height: 5, borderRadius: 2, background: '#FAFAFA', opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 100, height: 3, borderRadius: 2, background: '#A1A1AA', opacity: 0.6, marginBottom: 3 }} />
          <div style={{ width: 80, height: 3, borderRadius: 2, background: '#A1A1AA', opacity: 0.4 }} />
        </div>
      </div>
    ),

    garden: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(26,51,39,0.15), rgba(26,51,39,0.62))`, backgroundImage: `url(https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 85, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.95)', marginBottom: 4 }} />
            <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.7)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: headline, borderRadius: 16, padding: '3px 9px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, background: '#D4F0DC' }} />
            </div>
          </div>
        </div>
        {/* About — sage */}
        <div style={{ background: '#F0F7F1', padding: '8px 14px', borderBottom: `1px solid #C5E0CA` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 105, height: 3, borderRadius: 2, background: headline, opacity: 0.4, marginBottom: 3 }} />
          <div style={{ width: 85, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
        </div>
        {/* Dark green CTA */}
        <div style={{ background: headline, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 65, height: 4, borderRadius: 2, background: '#D4F0DC', opacity: 0.8 }} />
          <div style={{ background: accent, borderRadius: 16, padding: '3px 9px' }}>
            <div style={{ width: 28, height: 4, borderRadius: 2, background: '#fff' }} />
          </div>
        </div>
      </div>
    ),

    bold: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — purple/coral gradient */}
        <div style={{ height: 72, background: `linear-gradient(135deg, rgba(45,27,105,0.88), rgba(255,77,77,0.65))`, backgroundImage: `url(https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 88, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.97)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.65)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* Coral CTA strip */}
        <div style={{ background: accent, padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 70, height: 4, borderRadius: 2, background: '#fff', opacity: 0.9 }} />
          <div style={{ background: '#fff', borderRadius: 20, padding: '3px 8px' }}>
            <div style={{ width: 26, height: 3, borderRadius: 2, background: accent }} />
          </div>
        </div>
        {/* White content */}
        <div style={{ background: '#fff', padding: '8px 14px', borderBottom: `1px solid #E0DCFF` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 100, height: 3, borderRadius: 2, background: '#6B6B8E', opacity: 0.5, marginBottom: 3 }} />
          <div style={{ width: 80, height: 3, borderRadius: 2, background: '#6B6B8E', opacity: 0.35 }} />
        </div>
      </div>
    ),
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {thumbnails[t.id] ?? (
        <div style={{ height: 160, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, opacity: 0.3 }}>☕</span>
        </div>
      )}
      {/* Colour palette strip at bottom of preview */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', borderRadius: '6px 0 0 0', overflow: 'hidden' }}>
        {[t.preview.bg, t.preview.headline, t.preview.accent].map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  );
}

function WebsiteTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  type BlockType = 'hero' | 'about' | 'gallery' | 'booking_cta' | 'hours' | 'social' | 'divider' | 'menu_preview' | 'reviews' | 'cta_banner';
  type Block = { id: string; type: BlockType; data: Record<string, any>; hidden?: boolean };

  const genId = () => Math.random().toString(36).slice(2, 9);

  // ── Theme state (stored in settingsJson.theme) ───────────────────────────────
  const savedTheme = (venue?.settingsJson as any)?.theme || {};
  const [themePrimary, setThemePrimary] = useState<string>(savedTheme.primaryColor || venue.primaryColor || '#09090B');
  const [themeAccent, setThemeAccent] = useState<string>(savedTheme.accentColor || venue.accentColor || '#5E8B8B');
  const [themeBg, setThemeBg] = useState<string>(savedTheme.bgColor || '#F8F6F2');
  const [themeFont, setThemeFont] = useState<string>(savedTheme.font || 'Inter');
  const [showDesign, setShowDesign] = useState(false);

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const saved = (venue as any).websiteBlocks;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(() => {
    const saved = (venue as any).websiteBlocks;
    return !Array.isArray(saved) || saved.length === 0;
  });
  const [saveMsg, setSaveMsg] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>((savedTheme as any)?.templateId || (savedTheme as any)?.template || null);

  // ── Live preview state ────────────────────────────────────────────────────────
  const [previewWidth, setPreviewWidth] = useState<'100%' | '390px'>('100%');
  const [previewKey, setPreviewKey] = useState(1);

  const updateMutation = trpc.venue.update.useMutation({
    onSuccess: () => {
      setSaveMsg('✓ Published');
      setPreviewKey(k => k + 1);
    }
  });

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/v/${venue.slug}` : `/v/${venue.slug}`;
  const bookUrl = typeof window !== 'undefined' ? `${window.location.origin}/book/${venue.slug}` : `/book/${venue.slug}`;
  const previewSrc = typeof window !== 'undefined' ? `${window.location.origin}/v/${venue.slug}?preview=1&t=${previewKey}` : '';

  const handleSave = () => {
    setSaveMsg('');
    const theme = { primaryColor: themePrimary, accentColor: themeAccent, bgColor: themeBg, font: themeFont, templateId: activeTemplateId || 'fresh', template: activeTemplateId || 'fresh' };
    const existingSettings = (venue?.settingsJson as any) || {};
    updateMutation.mutate({ token, data: { websiteBlocks: blocks, settingsJson: { ...existingSettings, theme } } as any });
  };

  // ── Block type helpers ────────────────────────────────────────────────────────
  const DEFAULTS: Record<BlockType, Record<string, any>> = {
    hero: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80', title: venue.name || 'Welcome', tagline: 'Specialty coffee & fresh food', ctaText: 'Order Now' },
    about: { title: 'Our Story', body: 'Tell customers what makes your cafe special...' },
    gallery: { images: [] },
    booking_cta: { title: 'Reserve a Table', subtitle: 'Book online in seconds — no phone call needed.', buttonText: 'Book Now' },
    hours: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' },
    social: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' },
    divider: { style: 'space' },
    menu_preview: {},
    reviews: {},
    cta_banner: { title: 'Order Online Today', subtitle: 'Fresh food & great coffee, ready when you are.', buttonText: 'Order Now', bgColor: '#5E8B8B' },
  };

  const BLOCK_COLORS: Record<BlockType, string> = {
    hero: '#5E8B8B', about: '#D97706', gallery: '#7C3AED', booking_cta: '#2563EB',
    hours: '#059669', social: '#DB2777', divider: '#9CA3AF',
    menu_preview: '#EA580C', reviews: '#DC2626', cta_banner: '#0891B2',
  };

  const addBlock = (type: BlockType) => {
    const nb: Block = { id: genId(), type, data: { ...DEFAULTS[type] } };
    setBlocks(b => [...b, nb]);
    setEditingId(nb.id);
    setShowCatalog(false);
  };
  const updateBlock = (id: string, data: Record<string, any>) => setBlocks(b => b.map(bl => bl.id === id ? { ...bl, data } : bl));
  const removeBlock = (id: string) => { setBlocks(b => b.filter(bl => bl.id !== id)); if (editingId === id) setEditingId(null); };
  const toggleHidden = (id: string) => setBlocks(b => b.map(bl => bl.id === id ? { ...bl, hidden: !bl.hidden } : bl));

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

  const TEMPLATES: { id: string; name: string; tagline: string; preview: { bg: string; accent: string; headline: string }; palette: { primary: string; accent: string; bg: string }; blocks: () => Block[] }[] = [
    {
      id: 'fresh',
      name: 'Fresh',
      tagline: 'Clean & minimal',
      preview: { bg: '#FAFAF8', accent: '#16A34A', headline: '#09090B' },
      palette: { primary: '#09090B', accent: '#16A34A', bg: '#FAFAF8' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80', title: venue.name, tagline: 'Specialty coffee, served with care', ctaText: 'Order Now' } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Our Story', body: 'We started with one idea: great coffee should be simple, accessible, and a little bit joyful. Every cup we make is a small act of care.' } },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-4pm', saturday: venue.hoursSaturday || 'Sat: 8am-3pm', sunday: venue.hoursSunday || 'Sun: 9am-2pm' } },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'booking_cta' as BlockType, data: { title: 'Reserve a Table', subtitle: 'Skip the queue - book online in seconds.', buttonText: 'Book Now' } },
      ],
    },
    {
      id: 'warmth',
      name: 'Warmth',
      tagline: 'Cozy & artisan',
      preview: { bg: '#FDF6EE', accent: '#D97706', headline: '#7C3018' },
      palette: { primary: '#7C3018', accent: '#D97706', bg: '#FDF6EE' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&q=80', title: venue.name, tagline: 'Handcrafted coffee · Fresh baked daily', ctaText: 'View Our Menu' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Baked with Heart', body: 'Every pastry is baked on-site each morning. We use local produce, heritage grains, and recipes passed down through the team. Come in, slow down, and taste the difference.' } },
        { id: genId(), type: 'gallery' as BlockType, data: { images: [] } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-5pm', saturday: venue.hoursSaturday || 'Sat: 8am-4pm', sunday: venue.hoursSunday || 'Sun: 9am-3pm' } },
        { id: genId(), type: 'social' as BlockType, data: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' } },
      ],
    },
    {
      id: 'noir',
      name: 'Noir',
      tagline: 'Dark & premium',
      preview: { bg: '#0D0D0F', accent: '#D4AF37', headline: '#FAFAFA' },
      palette: { primary: '#FAFAFA', accent: '#D4AF37', bg: '#0D0D0F' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=1200&q=80', title: venue.name, tagline: 'An exceptional coffee experience', ctaText: 'Reserve a Table' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Online Ordering Now Available', subtitle: 'Skip the queue. Order ahead and collect when you arrive.', buttonText: 'Order Now', bgColor: '#D4AF37' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'The Art of Coffee', body: "We've spent years refining every detail — from single-origin bean selection to the final pour. This is coffee taken seriously." } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-5pm', saturday: venue.hoursSaturday || 'Sat: 8am-4pm', sunday: venue.hoursSunday || 'Closed' } },
      ],
    },
    {
      id: 'garden',
      name: 'Garden',
      tagline: 'Fresh & sustainable',
      preview: { bg: '#F0F7F1', accent: '#5E8B8B', headline: '#1A3327' },
      palette: { primary: '#1A3327', accent: '#5E8B8B', bg: '#F0F7F1' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80', title: venue.name, tagline: 'Fresh food · Good coffee · Sustainable sourcing', ctaText: 'See the Menu' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Grown with Care', body: "We source from local farms within 100km and compost everything we can. Good food is good for the people who eat it and the planet that grows it." } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'gallery' as BlockType, data: { images: [] } },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-4pm', saturday: venue.hoursSaturday || 'Sat: 8am-3pm', sunday: venue.hoursSunday || 'Sun: 9am-2pm' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Order Fresh Online', subtitle: 'Pick up your order — no waiting, no waste.', buttonText: 'Order Now', bgColor: '#1A3327' } },
      ],
    },
    {
      id: 'bold',
      name: 'Bold',
      tagline: 'Energetic & urban',
      preview: { bg: '#FFFFFF', accent: '#FF4D4D', headline: '#2D1B69' },
      palette: { primary: '#2D1B69', accent: '#FF4D4D', bg: '#FFFFFF' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=80', title: `${venue.name}.`, tagline: 'Bold coffee for bold mornings', ctaText: 'Order Now' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Skip the Queue', subtitle: 'Order ahead on your phone. Ready when you are.', buttonText: 'Start Your Order', bgColor: '#FF4D4D' } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'about' as BlockType, data: { title: 'No Nonsense Coffee', body: 'We cut the fluff and focus on what matters: excellent espresso, fast service, and a vibe that gets you going. This is your third place.' } },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'booking_cta' as BlockType, data: { title: 'Book Your Spot', subtitle: 'Tables go fast. Lock in your time.', buttonText: 'Reserve Now' } },
      ],
    },
  ];

  const CATALOG: { type: BlockType; label: string; icon: string; desc: string }[] = [
    { type: 'hero', label: 'Hero Banner', icon: '🖼️', desc: 'Full-width image with title & CTA' },
    { type: 'about', label: 'About Us', icon: '📖', desc: 'Your story in text' },
    { type: 'gallery', label: 'Photo Gallery', icon: '📷', desc: 'Grid of up to 9 photos' },
    { type: 'booking_cta', label: 'Book a Table', icon: '📅', desc: 'Reservation call-to-action' },
    { type: 'hours', label: 'Opening Hours', icon: '🕐', desc: 'Mon-Fri, Sat, Sun hours' },
    { type: 'social', label: 'Social Links', icon: '📱', desc: 'Instagram & Facebook' },
    { type: 'menu_preview', label: 'Menu Highlights', icon: '🍽️', desc: 'Auto-shows top menu items' },
    { type: 'reviews', label: 'Customer Reviews', icon: '⭐', desc: 'Shows recent 3★+ reviews' },
    { type: 'cta_banner', label: 'Call to Action', icon: '📣', desc: 'Full-width accent banner' },
    { type: 'divider', label: 'Spacer', icon: '➖', desc: 'Add space between sections' },
  ];

  const LABELS: Record<BlockType, string> = {
    hero: 'Hero Banner', about: 'About Us', gallery: 'Photo Gallery', booking_cta: 'Book a Table',
    hours: 'Opening Hours', social: 'Social Links', divider: 'Spacer',
    menu_preview: 'Menu Highlights', reviews: 'Customer Reviews', cta_banner: 'Call to Action',
  };
  const ICONS: Record<BlockType, string> = {
    hero: '🖼️', about: '📖', gallery: '📷', booking_cta: '📅',
    hours: '🕐', social: '📱', divider: '➖',
    menu_preview: '🍽️', reviews: '⭐', cta_banner: '📣',
  };

  const editingBlock = blocks.find(b => b.id === editingId) ?? null;

  const iStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--op-card-border)', borderRadius: 7, fontSize: 13, color: 'var(--op-text)', background: 'var(--op-card-bg)', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' };
  const lStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--op-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };

  // ── Colour palettes ──────────────────────────────────────────────────────────
  const PALETTES = [
    { name: 'Warm Cream', primary: '#09090B', accent: '#5E8B8B', bg: '#F8F6F2' },
    { name: 'Forest', primary: '#1A2E1A', accent: '#4A7C59', bg: '#F4F8F4' },
    { name: 'Ocean', primary: '#0D2137', accent: '#2B7FBB', bg: '#F0F6FC' },
    { name: 'Burnt', primary: '#2D1810', accent: '#D4622A', bg: '#FDF6F0' },
    { name: 'Rose', primary: '#2D1018', accent: '#C4697A', bg: '#FDF0F3' },
    { name: 'Midnight', primary: '#FAFAFA', accent: '#7B8CDE', bg: '#0D0D0F' },
  ];

  // ── Font options ─────────────────────────────────────────────────────────────
  const FONTS = [
    { value: 'Inter', label: 'Inter', sample: 'The quick brown fox' },
    { value: 'Playfair Display', label: 'Playfair Display', sample: 'The quick brown fox' },
    { value: 'DM Mono', label: 'DM Mono', sample: 'The quick brown fox' },
    { value: 'Space Grotesk', label: 'Space Grotesk', sample: 'The quick brown fox' },
  ];

  // Load Google Font when themeFont changes
  useEffect(() => {
    if (themeFont === 'Inter') return;
    const id = `gfont-${themeFont.replace(/\s/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(themeFont)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [themeFont]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Website Builder
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Design your public page. Drag blocks, pick a template, publish.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Viewport toggle */}
          <div style={{ display: 'flex', borderRadius: 7, border: '1px solid var(--op-card-border)', overflow: 'hidden' }}>
            <button onClick={() => setPreviewWidth('100%')} title="Desktop" style={{ padding: '7px 12px', border: 'none', background: previewWidth === '100%' ? '#111827' : 'var(--op-card-bg)', color: previewWidth === '100%' ? '#fff' : 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Monitor size={14} /> Desktop
            </button>
            <button onClick={() => setPreviewWidth('390px')} title="Mobile" style={{ padding: '7px 12px', border: 'none', borderLeft: '1px solid var(--op-card-border)', background: previewWidth === '390px' ? '#111827' : 'var(--op-card-bg)', color: previewWidth === '390px' ? '#fff' : 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Smartphone size={14} /> Mobile
            </button>
          </div>
          <button onClick={() => setPreviewKey(k => k + 1)} title="Refresh preview" style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', fontSize: 12, fontWeight: 500, color: 'var(--op-text)', textDecoration: 'none' }}>
            🔗 Open Live
          </a>
          {saveMsg && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{saveMsg}</span>}
          <button onClick={handleSave} disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: '#181818', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: updateMutation.isPending ? 'not-allowed' : 'pointer', opacity: updateMutation.isPending ? 0.7 : 1 }}>
            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish
          </button>
        </div>
      </div>

      {/* Shopify two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 0 }}>

        {/* Left panel: 380px sticky */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 76, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 16 }}>

          {/* Design panel (colour + font) */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDesign ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>Design</div>
                <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>Colours, fonts & palette</div>
              </div>
              <button onClick={() => setShowDesign(v => !v)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--op-text)' }}>
                {showDesign ? 'Hide' : 'Edit Design'}
              </button>
            </div>
            {showDesign && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Palette presets */}
                <div>
                  <label style={lStyle}>Colour Palettes</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {PALETTES.map(p => (
                      <button key={p.name} onClick={() => { setThemePrimary(p.primary); setThemeAccent(p.accent); setThemeBg(p.bg); }}
                        title={p.name}
                        style={{ borderRadius: 7, overflow: 'hidden', border: `2px solid ${themePrimary === p.primary && themeAccent === p.accent ? '#5E8B8B' : 'transparent'}`, cursor: 'pointer', padding: 0 }}>
                        <div style={{ height: 20, background: p.bg, display: 'flex' }}>
                          <div style={{ flex: 1, background: p.primary }} />
                          <div style={{ flex: 1, background: p.accent }} />
                          <div style={{ flex: 2, background: p.bg }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--op-text-muted)', background: 'var(--op-card-bg)', padding: '2px 4px', textAlign: 'center' }}>{p.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Colour pickers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lStyle}>Primary</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themePrimary} onChange={e => setThemePrimary(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themePrimary}</span>
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Accent</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themeAccent} onChange={e => setThemeAccent(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themeAccent}</span>
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Background</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themeBg} onChange={e => setThemeBg(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themeBg}</span>
                    </div>
                  </div>
                </div>
                {/* Font picker */}
                <div>
                  <label style={lStyle}>Font Family</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {FONTS.map(f => (
                      <button key={f.value} onClick={() => setThemeFont(f.value)}
                        style={{ padding: '8px 12px', borderRadius: 7, border: `2px solid ${themeFont === f.value ? '#5E8B8B' : 'var(--op-card-border)'}`, background: themeFont === f.value ? 'rgba(94,139,139,0.08)' : 'var(--op-card-bg)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontFamily: f.value + ', sans-serif', color: 'var(--op-text)' }}>{f.sample}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: themeFont === f.value ? '#5E8B8B' : 'var(--op-text-muted)', marginLeft: 8, flexShrink: 0 }}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTemplates ? 16 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>Templates</div>
                <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>Choose a style for your venue page</div>
              </div>
              <button onClick={() => setShowTemplates(v => !v)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--op-text)' }}>
                {showTemplates ? 'Hide' : '✦ Browse Templates'}
              </button>
            </div>
            {showTemplates && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TEMPLATES.map(t => {
                  const isActive = activeTemplateId === t.id;
                  return (
                    <div key={t.id} style={{ borderRadius: 12, overflow: 'hidden', border: `2px solid ${isActive ? '#5E8B8B' : 'var(--op-card-border)'}`, background: 'var(--op-bg)', transition: 'border-color 0.15s' }}>
                      {/* ── Rich visual preview ── */}
                      <TemplatePreviewCard template={t} />
                      {/* ── Info + action ── */}
                      <div style={{ padding: '10px 14px 12px', background: 'var(--op-card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--op-text)' }}>{t.name}</span>
                            {isActive && <span style={{ fontSize: 9, fontWeight: 700, background: '#5E8B8B', color: '#fff', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.04em' }}>ACTIVE</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>{t.tagline}</div>
                        </div>
                        <button
                          onClick={() => {
                            setBlocks(t.blocks());
                            setThemePrimary(t.palette.primary);
                            setThemeAccent(t.palette.accent);
                            setThemeBg(t.palette.bg);
                            setActiveTemplateId(t.id);
                            setShowTemplates(false);
                            setEditingId(null);
                            setSaveMsg('Template applied — click Publish to go live');
                          }}
                          style={{ flexShrink: 0, padding: '7px 16px', background: isActive ? '#5E8B8B' : 'var(--op-text)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
                        >
                          {isActive ? '✓ Active' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blocks list */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>
                Page Blocks
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--op-text-muted)', marginLeft: 5 }}>({blocks.length})</span>
              </div>
              <button onClick={() => setShowCatalog(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: showCatalog ? '#374151' : '#111827', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={12} /> Add Block
              </button>
            </div>

            {showCatalog && (
              <div style={{ background: 'var(--op-bg)', border: '1px solid var(--op-card-border)', borderRadius: 8, padding: 10, marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                {CATALOG.map(c => (
                  <button key={c.type} onClick={() => addBlock(c.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--op-accent)'; e.currentTarget.style.background = 'var(--op-card-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--op-card-border)'; e.currentTarget.style.background = 'var(--op-card-bg)'; }}
                  >
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--op-text)' }}>{c.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--op-text-muted)' }}>{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {blocks.length === 0 && !showCatalog && (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--op-text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>No blocks yet</div>
                <div style={{ fontSize: 11 }}>Apply a template or click "Add Block" to start building</div>
              </div>
            )}

            <div>
              {blocks.map((block, i) => {
                const accentLeft = BLOCK_COLORS[block.type] || '#9CA3AF';
                const isEditing = editingId === block.id;
                const isDragTarget = dragOver === i && dragging !== i;
                return (
                  <div key={block.id}
                    draggable
                    onDragStart={e => handleDragStart(e, i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={e => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                      borderRadius: 8, marginBottom: 6, cursor: 'grab',
                      border: `2px solid ${isDragTarget ? '#5E8B8B' : isEditing ? 'var(--op-accent)' : 'var(--op-card-border)'}`,
                      background: isEditing ? 'var(--op-bg)' : 'var(--op-card-bg)',
                      opacity: dragging === i ? 0.45 : block.hidden ? 0.4 : 1,
                      borderLeft: `4px solid ${isDragTarget ? '#5E8B8B' : isEditing ? 'var(--op-accent)' : accentLeft}`,
                      boxShadow: isEditing ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      minHeight: 56,
                      transition: 'border-color 0.1s, box-shadow 0.1s',
                    }}
                  >
                    <span style={{ color: 'var(--op-card-border)', fontSize: 14, userSelect: 'none', flexShrink: 0 }}>⠿</span>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{ICONS[block.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)', textDecoration: block.hidden ? 'line-through' : 'none' }}>{LABELS[block.type]}</div>
                      <div style={{ fontSize: 10, color: 'var(--op-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {block.type === 'hero' && (block.data.tagline || block.data.title || '')}
                        {block.type === 'about' && (block.data.title || '')}
                        {block.type === 'gallery' && `${(block.data.images || []).filter((x: any) => x.url).length} photos`}
                        {block.type === 'booking_cta' && (block.data.title || '')}
                        {block.type === 'hours' && 'Hours display'}
                        {block.type === 'social' && 'Social links'}
                        {block.type === 'divider' && 'Section spacer'}
                        {block.type === 'menu_preview' && 'Auto-pulls menu items'}
                        {block.type === 'reviews' && 'Auto-pulls reviews'}
                        {block.type === 'cta_banner' && (block.data.title || 'Call to action')}
                      </div>
                    </div>
                    {/* Eye toggle */}
                    <button onClick={() => toggleHidden(block.id)} title={block.hidden ? 'Show block' : 'Hide block'}
                      style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: block.hidden ? '#D97706' : 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {block.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => setEditingId(isEditing ? null : block.id)}
                      style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--op-card-border)', background: isEditing ? 'var(--op-accent)' : 'var(--op-bg)', color: isEditing ? '#fff' : 'var(--op-text)', fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={() => removeBlock(block.id)}
                      style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--op-card-bg)'; e.currentTarget.style.borderColor = 'var(--op-card-border)'; e.currentTarget.style.color = 'var(--op-text-muted)'; }}
                    ><X size={12} /></button>
                  </div>
                );
              })}
            </div>

            {/* Reset to default */}
            {blocks.length > 0 && (
              <button onClick={() => { if (window.confirm('Reset all blocks? This cannot be undone.')) { setBlocks([]); setEditingId(null); setActiveTemplateId(null); setSaveMsg(''); } }}
                style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Reset to empty
              </button>
            )}
          </div>

          {/* Block editor */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            {editingBlock ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--op-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 17 }}>{ICONS[editingBlock.type]}</span> {LABELS[editingBlock.type]}
                </div>

                {editingBlock.type === 'hero' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <ImageUpload label="Hero Image" value={editingBlock.data.imageUrl || ''} onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })} />
                    <div><label style={lStyle}>Headline</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Your cafe name" /></div>
                    <div><label style={lStyle}>Tagline</label><input style={iStyle} value={editingBlock.data.tagline || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, tagline: e.target.value })} placeholder="Specialty coffee, served with care." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.ctaText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, ctaText: e.target.value })} placeholder="Order Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'about' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Section Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Our Story" /></div>
                    <div><label style={lStyle}>Body Text</label><textarea style={{ ...iStyle, minHeight: 90, resize: 'vertical' }} value={editingBlock.data.body || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, body: e.target.value })} placeholder="Tell your story..." /></div>
                    <ImageUpload label="Side Image (optional)" value={editingBlock.data.imageUrl || ''} onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })} />
                  </div>
                )}
                {editingBlock.type === 'gallery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Up to 9 photos — drag & drop or tap to upload</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                      {((editingBlock.data.images || []) as { url: string; caption: string }[]).map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <ImageUpload compact value={img.url} onChange={url => { const imgs = [...(editingBlock.data.images || [])]; imgs[i] = { ...img, url }; updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }} />
                          <button onClick={() => { const imgs = (editingBlock.data.images || []).filter((_: any, idx: number) => idx !== i); updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>×</button>
                        </div>
                      ))}
                      {(editingBlock.data.images || []).length < 9 && (
                        <button onClick={() => { const imgs = [...(editingBlock.data.images || []), { url: '', caption: '' }]; updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                          style={{ aspectRatio: '1', borderRadius: 7, border: '2px dashed var(--op-card-border)', background: 'var(--op-bg)', fontSize: 20, color: 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      )}
                    </div>
                  </div>
                )}
                {editingBlock.type === 'booking_cta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Reserve a Table" /></div>
                    <div><label style={lStyle}>Subtitle</label><input style={iStyle} value={editingBlock.data.subtitle || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, subtitle: e.target.value })} placeholder="Book online in seconds." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.buttonText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, buttonText: e.target.value })} placeholder="Book Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'hours' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Monday – Friday</label><input style={iStyle} value={editingBlock.data.weekday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, weekday: e.target.value })} placeholder="7:00am – 4:00pm" /></div>
                    <div><label style={lStyle}>Saturday</label><input style={iStyle} value={editingBlock.data.saturday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, saturday: e.target.value })} placeholder="8:00am – 3:00pm" /></div>
                    <div><label style={lStyle}>Sunday</label><input style={iStyle} value={editingBlock.data.sunday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, sunday: e.target.value })} placeholder="9:00am – 2:00pm" /></div>
                  </div>
                )}
                {editingBlock.type === 'social' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
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
                {editingBlock.type === 'cta_banner' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Order Online Today" /></div>
                    <div><label style={lStyle}>Subtitle</label><input style={iStyle} value={editingBlock.data.subtitle || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, subtitle: e.target.value })} placeholder="Fresh food, ready when you are." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.buttonText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, buttonText: e.target.value })} placeholder="Order Now" /></div>
                    <div>
                      <label style={lStyle}>Banner Colour</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                        <input type="color" value={editingBlock.data.bgColor || '#5E8B8B'} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, bgColor: e.target.value })} style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                        <span style={{ fontSize: 11, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{editingBlock.data.bgColor || '#5E8B8B'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {editingBlock.type === 'menu_preview' && (
                  <div style={{ padding: '14px', background: 'var(--op-bg)', borderRadius: 7, border: '1px solid var(--op-card-border)', fontSize: 12, color: 'var(--op-text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                    🍽️ Automatically shows your top menu items — no editing needed.
                  </div>
                )}
                {editingBlock.type === 'reviews' && (
                  <div style={{ padding: '14px', background: 'var(--op-bg)', borderRadius: 7, border: '1px solid var(--op-card-border)', fontSize: 12, color: 'var(--op-text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                    ⭐ Automatically shows your recent reviews — no editing needed.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--op-text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 7 }}>✏️</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)' }}>Select a block to edit</div>
                <div style={{ fontSize: 11, marginTop: 3 }}>Click Edit on any block above</div>
              </div>
            )}
          </div>

          {/* Live links */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--op-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Live Links</div>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', color: 'var(--op-text)', textDecoration: 'none', fontSize: 11, marginBottom: 6 }}>
              🌐 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            </a>
            <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', color: 'var(--op-text)', textDecoration: 'none', fontSize: 11 }}>
              📅 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookUrl}</span>
            </a>
          </div>
        </div>

        {/* Right panel: live preview iframe */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: '#1C1C1E', borderRadius: 12, overflow: 'hidden', border: '1px solid #333', minHeight: 600 }}>
            {/* Browser chrome */}
            <div style={{ background: '#2C2C2E', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA41' }} />
              </div>
              <div style={{ flex: 1, background: '#3A3A3C', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#8E8E93', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {publicUrl}
              </div>
            </div>
            {/* iframe area */}
            <div style={{ background: '#F5F5F5', display: 'flex', justifyContent: 'center', minHeight: 560, padding: previewWidth === '390px' ? '16px' : '0' }}>
              {previewWidth === '390px' ? (
                <div style={{ width: 390, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderRadius: '20px', overflow: 'hidden', border: '8px solid #1C1C1E' }}>
                  <iframe
                    key={previewKey}
                    src={previewSrc}
                    style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
                    title="Site preview"
                  />
                </div>
              ) : (
                <iframe
                  key={previewKey}
                  src={previewSrc}
                  style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
                  title="Site preview"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabletPinSection({ venue, token, inputCls, inputStyle }: { venue: any; token: string; inputCls: string; inputStyle: React.CSSProperties }) {
  const [tabletPin, setTabletPin] = useState(venue.tabletPin || '');
  const [msg, setMsg] = useState('');
  const mutation = trpc.venue.update.useMutation({
    onSuccess: () => { setMsg('Saved!'); setTimeout(() => setMsg(''), 2000); },
  });
  const tabletUrl = `${window.location.origin}/tablet/${venue.slug}`;
  return (
    <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.5rem' }}>Tablet / iPad POS</h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Open <span style={{ fontFamily: 'Geist Mono', fontSize: 12, background: 'rgba(24,24,24,0.06)', padding: '2px 6px', borderRadius: 3 }}>{tabletUrl}</span> on any iPad or tablet. Staff enter this PIN to access the counter view — live orders, quick order entry, and nothing else.
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>PIN (4–6 digits)</label>
          <input
            type="text" inputMode="numeric" maxLength={6}
            value={tabletPin}
            onChange={e => setTabletPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g. 1234"
            className={inputCls}
            style={{ ...inputStyle, width: 140 }}
          />
        </div>
        <button
          onClick={() => { setMsg(''); mutation.mutate({ token, data: { tabletPin: tabletPin || null } }); }}
          disabled={mutation.isPending}
          className="px-6 py-3 font-button flex items-center gap-2"
          style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save PIN
        </button>
        {msg && <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>{msg}</span>}
      </div>
      {tabletPin.length >= 4 && (
        <a href={tabletUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14, fontSize: '0.8125rem', color: '#5E8B8B', textDecoration: 'underline' }}>
          Open tablet view ↗
        </a>
      )}
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
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Venue Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Update your venue details, hours, and configuration.
        </p>
      </div>
      <div className="space-y-6">
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Venue Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Cafe Name', key: 'name', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'Mon-Fri Hours', key: 'hoursWeekday', type: 'text' },
            { label: 'Saturday Hours', key: 'hoursSaturday', type: 'text' },
            { label: 'Sunday Hours', key: 'hoursSunday', type: 'text' },
          ].map((f) => (
            <div key={f.key}>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} style={inputStyle} />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Description</label>
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

      {/* Tablet POS PIN */}
      <TabletPinSection venue={venue} token={token} inputCls={inputCls} inputStyle={inputStyle} />

      {/* Happy Hour */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Happy Hour</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="hh-enabled" checked={hhForm.enabled} onChange={e => setHhForm({ ...hhForm, enabled: e.target.checked })} style={{ accentColor: '#181818', width: 16, height: 16 }} />
            <label htmlFor="hh-enabled" className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text)', cursor: 'pointer' }}>Enable Happy Hour</label>
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Start Time (HH:MM)</label>
            <input type="time" value={hhForm.startTime} onChange={e => setHhForm({ ...hhForm, startTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>End Time (HH:MM)</label>
            <input type="time" value={hhForm.endTime} onChange={e => setHhForm({ ...hhForm, endTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Discount Percent (0–100)</label>
            <input type="number" min={0} max={100} value={hhForm.discountPercent} onChange={e => setHhForm({ ...hhForm, discountPercent: e.target.value })} className={inputCls} style={inputStyle} placeholder="e.g. 20" />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Label</label>
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
            <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.25rem' }}>Xero Accounting</h3>
            <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              Connect your Xero account to automatically sync daily revenue.
            </p>
            {(xeroConn as any)?.connected ? (
              <div>
                <p className="font-data mb-2" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>
                  <Check size={10} className="inline mr-1" /> Connected
                  {(xeroConn as any).lastSyncAt && <span style={{ color: 'var(--op-text-secondary)', marginLeft: 8 }}>Last sync: {new Date((xeroConn as any).lastSyncAt).toLocaleDateString()}</span>}
                </p>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <input type="date" value={xeroSyncFrom} onChange={e => setXeroSyncFrom(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>to</span>
                  <input type="date" value={xeroSyncTo} onChange={e => setXeroSyncTo(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Billing &amp; Plans
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Manage your subscription and payment method.
        </p>
      </div>
      <div className="border p-6 mb-6" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-data block mb-1" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Current Plan</span>
            <h2 style={{ fontWeight: 500, fontSize: '1.5rem', color: 'var(--op-text)' }}>{status?.tierDetails?.name || 'Trial'}</h2>
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
                style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: 'transparent', border: '1px solid rgba(24,24,24,0.3)', color: 'var(--op-text)', cursor: 'pointer' }}
              >
                {portalQuery.isFetching ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>
        {status?.isTrial && status.trialEndsAt && (
          <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
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
            <h3 className="font-data mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{tier.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span style={{ fontWeight: 500, fontSize: '1.5rem', color: 'var(--op-text)' }}>${tier.monthlyPrice}</span>
              <span className="font-data" style={{ color: 'var(--op-text-secondary)', fontSize: '0.625rem' }}>/mo AUD</span>
            </div>
            <ul className="space-y-1.5 mb-6 flex-1">
              {tier.features.map((f: string) => (
                <li key={f} className="flex items-start gap-2" style={{ fontSize: '0.8125rem', color: 'var(--op-text)' }}>
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
        style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--op-text-secondary)', background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
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
        style={{ width: '100%', fontSize: 13, color: 'var(--op-text)', background: 'transparent', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 10px', resize: 'vertical', fontFamily: 'Inter', boxSizing: 'border-box' as const }}
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
          style={{ fontSize: '0.625rem', background: 'none', color: 'var(--op-text-secondary)', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
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

  const pageHeader = (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
        Reviews
      </h1>
      <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
        Customer ratings and feedback.
      </p>
    </div>
  );

  if (isLoading) return <div>{pageHeader}<p style={DS.emptyState}>Loading reviews…</p></div>;
  if (!reviewsList || reviewsList.length === 0) {
    return <div>{pageHeader}<p style={DS.emptyState}>No reviews yet.</p></div>;
  }

  const avg = reviewsList.reduce((s, r) => s + r.rating, 0) / reviewsList.length;

  return (
    <div>
      {pageHeader}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Star size={20} fill="#F5B400" color="#F5B400" />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--op-text)' }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: 14, color: 'var(--op-text-secondary)' }}>across {reviewsList.length} reviews</span>
      </div>
      {reviewsList.map((r) => (
        <div key={r.id} style={{
          background: 'var(--op-card-bg)',
          borderRadius: 'var(--op-radius-card)',
          padding: 16,
          border: '1px solid var(--op-card-border)',
          boxShadow: 'var(--op-shadow)',
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
            <span style={{ fontSize: 12, color: 'var(--op-text-secondary)', marginLeft: 'auto' }}>
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, color: 'var(--op-text-secondary)', margin: 0 }}>{r.comment}</p>
          )}
          {(r as any).ownerReply ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(24,24,24,0.04)', border: '1px solid rgba(24,24,24,0.08)', borderRadius: 6 }}>
              <span style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: 4 }}>Owner reply:</span>
              <p style={{ fontSize: 13, color: 'var(--op-text)', margin: 0 }}>{(r as any).ownerReply}</p>
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
  const panelInputStyle = { fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };
  const panelLabelStyle = { fontSize: '0.5625rem', letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' };

  return (
    <div style={{ background: 'var(--op-card-hover)', borderTop: '1px solid rgba(24,24,24,0.08)', padding: '1rem 1.25rem' }}>
      <span className="font-data block mb-3" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Modifier Groups</span>

      {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}

      {!isLoading && modifiers.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: '0.75rem' }}>No modifier groups yet.</p>
      )}

      {/* Existing modifier groups */}
      <div className="space-y-2 mb-4">
        {modifiers.map((mod: any) => (
          <div key={mod.id} className="border p-3 flex items-start justify-between gap-3" style={{ borderColor: 'rgba(24,24,24,0.10)', background: '#F3F2EE' }}>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--op-text)' }}>{mod.name}</span>
                {mod.required && (
                  <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 5px', background: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' }}>Required</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {mod.options?.map((opt: { name: string; priceAdj: number }, i: number) => (
                  <span key={i} className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.06em', padding: '2px 6px', background: 'rgba(24,24,24,0.06)', color: 'var(--op-text-secondary)' }}>
                    {opt.name}{opt.priceAdj !== 0 ? ` (${opt.priceAdj > 0 ? '+' : ''}${opt.priceAdj.toFixed(2)})` : ''}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate({ token, modifierId: mod.id })}
              disabled={deleteMutation.isPending}
              className="p-1.5 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
              style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent', flexShrink: 0 }}
              aria-label="Delete modifier group"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add modifier group form */}
      <div className="border p-3" style={{ borderColor: 'rgba(24,24,24,0.10)', background: '#F3F2EE' }}>
        <span className="font-data block mb-2" style={{ fontSize: '0.5625rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Add Modifier Group</span>
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
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.8125rem', color: 'var(--op-text)' }}>
            <input
              type="checkbox"
              checked={addForm.required}
              onChange={(e) => setAddForm({ ...addForm, required: e.target.checked })}
              style={{ accentColor: '#181818' }}
            />
            <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Required</span>
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
      <div className="flex items-center justify-between gap-3 p-4" style={{ background: 'var(--op-card-bg)', border: '1px solid var(--op-card-border)' }}>
        {/* Drag handle */}
        <div
          {...attributes} {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'var(--op-card-border)', flexShrink: 0, touchAction: 'none', padding: '2px 0' }}
          title="Drag to reorder"
        >
          <GripVertical size={15} />
        </div>

        {/* Thumbnail */}
        {item.image ? (
          <img src={item.image} alt={item.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,24,24,0.04)', borderRadius: 6, border: '1px dashed rgba(24,24,24,0.12)' }}>
            <Coffee size={18} style={{ color: 'var(--op-text-muted)' }} />
          </div>
        )}

        {/* Name / price / badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)', display: 'block', marginBottom: 3 }}>{item.name}</span>
          <span style={{ fontFamily: 'Geist Mono', fontSize: 13, color: 'var(--op-text)', fontWeight: 700 }}>${Number(item.price).toFixed(2)}</span>
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
              <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>—</span>
            )}
            {isLow && <span className="font-data" style={{ fontSize: '0.5rem', background: 'rgba(184,84,80,0.12)', color: '#B85450', padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Low</span>}
          </div>
          {stockFormOpen === item.id ? (
            <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
              <input type="number" min={0} placeholder="Qty" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} style={{ border: '1px solid var(--op-card-border)', padding: '3px 6px', fontSize: 12, background: 'var(--op-card-bg)', color: 'var(--op-text)', width: '100%' }} />
              <input type="number" min={0} placeholder="Alert at" value={stockForm.quantityAlert} onChange={e => setStockForm({ ...stockForm, quantityAlert: e.target.value })} style={{ border: '1px solid var(--op-card-border)', padding: '3px 6px', fontSize: 12, background: 'var(--op-card-bg)', color: 'var(--op-text)', width: '100%' }} />
              <div className="flex gap-1">
                <button onClick={() => { setInventoryQty.mutate({ menuItemId: item.id, quantity: Number(stockForm.quantity), quantityAlert: stockForm.quantityAlert ? Number(stockForm.quantityAlert) : undefined }, { onSuccess: () => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); } }); }} style={{ flex: 1, background: '#181818', color: '#F3F2EE', border: 'none', fontSize: 11, padding: '3px 6px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', fontSize: 11, padding: '3px 6px', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setStockFormOpen(item.id); setStockForm({ quantity: qty !== null ? String(qty) : '', quantityAlert: alert !== null ? String(alert) : '' }); }} style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '2px 7px', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>Set Stock</button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setOpenModifiers(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} title="Manage Modifiers" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            {openModifiers.has(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => startEdit(item)} title="Edit" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => setDeleteConfirm(item.id)} title="Delete" className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {openModifiers.has(item.id) && <ModifiersPanel menuItemId={item.id} venueId={venue.id} />}

      {deleteConfirm === item.id && (
        <div className="p-4 border-x border-b" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#F3F2EE' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--op-text)', marginBottom: 12 }}>Delete this item? Orders referencing it will be preserved.</p>
          <div className="flex items-center gap-3">
            <button onClick={() => deleteMutation.mutate({ token, menuItemId: item.id })} disabled={deleteMutation.isPending} className="px-4 py-2 font-button flex items-center gap-2" style={{ background: '#B85450', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 font-button" style={{ background: 'transparent', color: 'var(--op-text)', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}>
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
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' };

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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Menu
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Create and manage your menu items.
        </p>
      </div>
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <h2 style={DS.sectionTitle}>Menu Management</h2>
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
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items?.length === 0 && !isFormMode && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Coffee size={40} style={{ color: 'var(--op-text-secondary)', marginBottom: 16 }} />
          <h3 style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--op-text)', marginBottom: 8 }}>No menu items yet</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)', marginBottom: 24 }}>Add your first item to start building your menu.</p>
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
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--op-text-secondary)' }}>
                      {categoryLabel(cat)}
                    </span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', color: 'var(--op-text-muted)' }}>({catItems.length})</span>
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
        <div className="border p-6 mt-2" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1.25rem' }}>
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
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--op-text)' }}>
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
                      <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{label}</span>
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
              <p className="font-data mt-1" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
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
              style={{ background: 'transparent', color: 'var(--op-text)', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}
            >
              <X size={14} /> Discard Changes
            </button>
          </div>
        </div>
      )}
      </div>
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
          Gift Cards
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Active gift cards and balances.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Create Card Form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>
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
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', letterSpacing: 4, fontFamily: 'Geist Mono' }}>
              {newCode}
            </p>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 16 }}>
          All Gift Cards
        </h2>
        {!cards || cards.length === 0 ? (
          <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No gift cards yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Code', 'Amount', 'Balance', 'Recipient', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
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
                    <td style={{ padding: '10px 12px', color: 'var(--op-text-secondary)' }}>{card.recipientName || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
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
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
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
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: upsertConfig.isPending ? 0.7 : 1 }}>
          {upsertConfig.isPending ? 'Saving...' : passConfig ? 'Update Pass Config' : 'Save Pass Config'}
        </button>
      </div>

      {/* Issue Pass to Customer */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
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
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: purchasePass.isPending || !passConfig ? 0.6 : 1 }}>
          {purchasePass.isPending ? 'Issuing...' : 'Issue Pass'}
        </button>
      </div>

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
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

  if (mode === 'create' || (typeof mode === 'object' && mode.type === 'edit')) {
    const isEdit = typeof mode === 'object';
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Locations</h1>
          <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Manage your physical locations and hours.</p>
        </div>
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={DS.sectionTitle}>
            {isEdit ? 'Edit Location' : 'Add Location'}
          </h2>
          <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Name *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. City Centre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Address *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 123 Main St" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Phone</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 03 9999 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Weekday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 7am — 4pm" value={form.hoursWeekday} onChange={e => setForm(f => ({ ...f, hoursWeekday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Saturday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 8am — 2pm" value={form.hoursSaturday} onChange={e => setForm(f => ({ ...f, hoursSaturday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Sunday Hours</label>
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
          <button onClick={() => setMode('list')} className="px-6 py-3 font-button border" style={{ background: 'none', color: 'var(--op-text)', fontSize: '0.75rem', borderColor: 'rgba(24,24,24,0.15)' }}>
            CANCEL
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Locations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Manage your physical locations and hours.
        </p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={DS.sectionTitle}>Locations</h2>
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
        <div className="border p-8 text-center" style={{ borderColor: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' }}>
          <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No locations added yet. Add your first location to enable location-based ordering.</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {locationsList?.map((loc) => (
          <div key={loc.id} className="border p-5 flex items-start justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)', marginBottom: 4 }}>{loc.name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: 2 }}>{loc.address}</div>
              {loc.phone && <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: 2 }}>{loc.phone}</div>}
              {loc.hoursWeekday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', marginTop: 6 }}>Mon–Fri: {loc.hoursWeekday}</div>}
              {loc.hoursSaturday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>Sat: {loc.hoursSaturday}</div>}
              {loc.hoursSunday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>Sun: {loc.hoursSunday}</div>}
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button onClick={() => handleEdit(loc)} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)' }}>
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => { setDeleteError(''); deleteMutation.mutate({ token, locationId: loc.id }); }}
                disabled={deleteMutation.isPending}
                className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)' }}
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Catering Requests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Enquiries and quotes for catering events.
        </p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={DS.sectionTitle}>Catering Requests</h2>
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
        <div className="border p-8 text-center" style={{ borderColor: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' }}>
          <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No catering requests yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {requestsList?.map((req) => (
          <div key={req.id} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: editingId === req.id ? '#E8E4DD' : '#fff' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)', marginBottom: 2 }}>{req.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>{req.phone}{req.email ? ` · ${req.email}` : ''}</div>
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
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Event Date</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{req.eventDate}</div>
              </div>
              <div>
                <span className="font-data" style={{ fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Guest Count</span>
                <div style={{ fontSize: '0.875rem', color: 'var(--op-text)' }}>{req.guestCount}</div>
              </div>
            </div>
            {req.details && (
              <p style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>{req.details}</p>
            )}

            {/* Confirm-gate: select picks next status, confirm button fires mutation */}
            {CATERING_STATUS_NEXT[req.status]?.length > 0 && (
              <div>
                {editingId === req.id ? (
                  <div className="flex gap-2 items-center">
                    <span style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>Move to <strong>{CATERING_STATUS_LABELS[pendingStatus]}</strong>?</span>
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
                      style={{ background: 'none', color: 'var(--op-text)', fontSize: '0.625rem', borderColor: 'rgba(24,24,24,0.15)', cursor: 'pointer' }}
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) { setEditingId(req.id); setPendingStatus(e.target.value); } }}
                    style={{ padding: '6px 10px', border: '1px solid rgba(24,24,24,0.15)', background: '#F3F2EE', fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}
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

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%' };
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Bundles
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Combo deals and bundle pricing.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex justify-between items-center">
        <h2 style={DS.sectionTitle}>Bundles</h2>
        <button onClick={() => { setShowForm(true); resetForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <Plus size={14} /> New Bundle
        </button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

      {showForm && (
        <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 12 }}>New Bundle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Breakfast Combo" /></div>
            <div><label style={labelStyle}>Bundle Price ($) *</label><input type="number" min="0" step="0.01" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} style={inputStyle} placeholder="e.g. 12.00" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Item Slugs (comma-separated)</label><input value={form.itemSlugs} onChange={e => setForm({ ...form, itemSlugs: e.target.value })} style={inputStyle} placeholder="flat-white,croissant" /><p style={{ fontSize: 11, color: 'var(--op-text-secondary)', marginTop: 3, fontFamily: 'Geist Mono' }}>Enter the slugs of menu items to include, separated by commas.</p></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="bundle-active-new" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ accentColor: '#181818' }} />
            <label htmlFor="bundle-active-new" style={{ fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}>Active</label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { if (!form.name || !form.bundlePrice) { setMsg('Error: Name and price required'); return; } setMsg(''); createBundle.mutate({ venueId, name: form.name, description: form.description || undefined, itemSlugs: form.itemSlugs.split(',').map(s => s.trim()).filter(Boolean), bundlePrice: form.bundlePrice, isActive: form.isActive }); }} disabled={createBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
              {createBundle.isPending ? 'Saving…' : 'Create Bundle'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
      {!isLoading && (!bundles || (bundles as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No bundles yet.</p>}

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
                  <label htmlFor={`bundle-active-${b.id}`} style={{ fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}>Active</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { updateBundle.mutate({ bundleId: b.id, name: editForm.name, description: editForm.description || undefined, itemSlugs: editForm.itemSlugs.split(',').map((s: string) => s.trim()).filter(Boolean), bundlePrice: editForm.bundlePrice, isActive: editForm.isActive }); }} disabled={updateBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>{b.name}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '1px 6px', background: b.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: b.isActive ? '#5E8B5E' : '#B85450' }}>{b.isActive ? 'ACTIVE' : 'OFF'}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>${Number(b.bundlePrice).toFixed(2)}</span>
                  </div>
                  {b.description && <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 4 }}>{b.description}</p>}
                  <p style={{ fontSize: 11, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Items: {Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || '').slice(0, 60)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(b.id); setEditForm({ name: b.name, description: b.description || '', itemSlugs: Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || ''), bundlePrice: String(b.bundlePrice), isActive: !!b.isActive }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Edit2 size={14} /></button>
                  {deleteConfirm === b.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { deleteBundle.mutate({ bundleId: b.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(b.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Trash2 size={14} /></button>
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

// ─── Campaigns Tab ────────────────────────────────────────────────────────────
function CampaignsTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery({ token }, { enabled: !!token });
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

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%' };
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  const rewardTypeOpts = [
    { value: 'free_item', label: 'Free Item' },
    { value: 'discount_percent', label: 'Discount %' },
    { value: 'discount_fixed', label: 'Discount Fixed ($)' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Loyalty Program
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Points configuration and customer balances.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Loyalty Accounts */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Loyalty Accounts</h2>
        {/* Tier thresholds info box */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '10px 14px', background: 'var(--op-bg)', border: '1px solid var(--op-card-border)', borderRadius: 7, fontSize: 12, color: 'var(--op-text)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--op-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Tier Thresholds:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: '#FEF9C3', color: '#713F12', fontSize: 11, fontWeight: 600 }}>Bronze</span> 0 pts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--op-bg)', color: 'var(--op-text)', fontSize: 11, fontWeight: 600 }}>Silver</span> 500 pts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>Gold</span> 2,000 pts</span>
        </div>
        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search by phone..."
            value={loyaltySearch}
            onChange={e => setLoyaltySearch(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%', maxWidth: 280 }}
          />
        </div>
        {accsLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!accsLoading && (!accounts || (accounts as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No loyalty accounts yet.</p>}
        {(accounts as any[] | undefined) && (accounts as any[]).length > 0 && (() => {
          const getTier = (pts: number) => pts >= 2000 ? { label: 'Gold', bg: '#FEF3C7', color: '#92400E' }
            : pts >= 500 ? { label: 'Silver', bg: '#F3F4F6', color: 'var(--op-text)' }
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
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a: any) => {
                    const tier = getTier(a.totalLifetimePoints ?? 0);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                        <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: 12, color: 'var(--op-text)' }}>{a.phone || '—'}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--op-text)' }}>{a.pointsBalance ?? 0}</td>
                        <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>{a.totalLifetimePoints ?? 0}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: tier.bg, color: tier.color, fontSize: 11, fontWeight: 600 }}>{tier.label}</span>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: 11 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)' }}>Rewards Catalogue</h2>
          <button onClick={() => { setShowRewardForm(true); resetRewardForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
            <Plus size={14} /> New Reward
          </button>
        </div>

        {msg && <p style={{ fontSize: 13, marginBottom: 8, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

        {showRewardForm && (
          <div className="border p-4 mb-4" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
            <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 12 }}>New Reward</h3>
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
              <button onClick={() => { setShowRewardForm(false); resetRewardForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
            </div>
          </div>
        )}

        {rewardsLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!rewardsLoading && (!rewards || (rewards as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No rewards yet.</p>}

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
                    <button onClick={() => setEditRewardId(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>{r.name}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'rgba(94,139,139,0.12)', color: '#5E8B8B' }}>{r.pointsCost} PTS</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'rgba(24,24,24,0.06)', color: 'var(--op-text-secondary)', textTransform: 'uppercase' as const }}>{r.rewardType?.replace('_', ' ')}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: r.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: r.isActive ? '#5E8B5E' : '#B85450' }}>{r.isActive ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                    {r.description && <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 2 }}>{r.description}</p>}
                    {r.rewardValue && <p style={{ fontSize: 12, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Value: {r.rewardValue}</p>}
                    {r.menuItemSlug && <p style={{ fontSize: 12, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Item: {r.menuItemSlug}</p>}
                    {r.sortOrder != null && <p style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Sort: {r.sortOrder}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditRewardId(r.id); setEditRewardForm({ name: r.name, description: r.description || '', pointsCost: String(r.pointsCost), rewardType: r.rewardType || 'free_item', rewardValue: r.rewardValue || '', menuItemSlug: r.menuItemSlug || '', sortOrder: r.sortOrder != null ? String(r.sortOrder) : '' }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Edit2 size={14} /></button>
                    {deleteConfirm === r.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => { deleteReward.mutate({ rewardId: r.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F85450] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
    padding: '8px 12px', borderRadius: 'var(--op-radius-input)', border: '1px solid var(--op-card-border)',
    fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%', boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: 'var(--op-text-muted)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Promotions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Discount codes and promotional offers.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>
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
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 16 }}>
          All Codes ({codes.length})
        </h2>
        {codes.length === 0 ? (
          <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No discount codes yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
                  <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--op-text-secondary)' }}>{c.maxUses ?? '∞'}</td>
                  <td style={{ padding: '10px 4px', color: 'var(--op-text-secondary)', fontSize: 12 }}>
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
                      style={{ fontSize: 12, background: 'none', border: '1px solid rgba(24,24,24,0.15)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: 'var(--op-text)' }}>
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
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Period Comparison</h2>
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
                      <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>
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
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Predicted Revenue — Next 7 Days</h2>
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
            <p className="font-data mt-3" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
              Predicted total: <span style={{ color: 'var(--op-text)', fontWeight: 600 }}>${Number((revenueForecast as any).total).toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Menu Scorecard */}
      {menuScorecard && (menuScorecard as any[]).length > 0 && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Menu Scorecard</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Rank', 'Item', 'Units Sold', 'Revenue', 'Rev Share %', 'Trend'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(menuScorecard as { name: string; unitsSold: number; revenue: number; revenueShare: number; trendPct: number }[]).map((row, idx) => {
                  const trendColor = row.trendPct > 5 ? '#5E8B5E' : row.trendPct < -5 ? '#B85450' : '#5E5E5E';
                  const trendArrow = row.trendPct > 5 ? '↑' : row.trendPct < -5 ? '↓' : '→';
                  return (
                    <tr key={row.name} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--op-text)' }}>{row.name}</td>
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
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>GST Summary</h2>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>From</label>
            <input type="date" value={gstFromDate} onChange={e => { setGstFromDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>To</label>
            <input type="date" value={gstToDate} onChange={e => { setGstToDate(e.target.value); setShowGST(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
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
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(gstSummary as any).byPaymentMethod.map((row: any) => (
                    <tr key={row.method} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '8px 10px', textTransform: 'capitalize', color: 'var(--op-text)' }}>{row.method || 'Other'}</td>
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
    return { bg: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' };
  };
  const platformLabel = (p: string) => ({ uber_eats: 'Uber Eats', doordash: 'DoorDash', menulog: 'Menulog', manual: 'Manual' } as Record<string, string>)[p] ?? p;

  const orders = (deliveryOrders as any[] | undefined) ?? [];
  const summary = deliverySummary as any;
  const totalOrders = summary?.totalOrders ?? orders.length;
  const totalNet = summary?.totalNet ?? orders.reduce((s: number, o: any) => s + Number(o.net ?? 0), 0);
  const totalFees = summary?.totalFees ?? orders.reduce((s: number, o: any) => s + Number(o.platformFee ?? 0), 0);

  const inputCls = "w-full bg-transparent border px-3 py-2 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.375rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Delivery
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Delivery zone and fee configuration.
        </p>
      </div>
      <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PLATFORM:</span>
          {(['all', 'uber_eats', 'doordash', 'menulog', 'manual'] as DeliveryPlatform[]).map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: platformFilter === p ? '#181818' : 'transparent', color: platformFilter === p ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {platformLabel(p)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>DAYS:</span>
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
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>{s.label}</span>
            <span style={{ fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Log Manual Order form */}
      {showLogForm && (
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Log Manual Order</h2>
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
              style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Orders</h2>
        {orders.length === 0 ? (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No delivery orders for this period.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Platform', 'Customer', 'Items', 'Subtotal', 'Fee', 'Net', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
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
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>{order.customerName || '—'}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.items}>
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
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Audit Log
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Activity history across your account.
        </p>
      </div>
      <div className="space-y-6">
      {/* Export buttons */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Exports</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Orders From</label>
            <input type="date" value={exportFromDate} onChange={e => { setExportFromDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>To</label>
            <input type="date" value={exportToDate} onChange={e => { setExportToDate(e.target.value); setTriggerOrderExport(false); }}
              className="border px-3 py-2 focus:outline-none bg-transparent"
              style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' }} />
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
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>ENTITY:</span>
          {entityTypes.map((e) => (
            <button key={e} onClick={() => setEntityFilter(e)}
              className="px-3 py-1 font-data"
              style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: entityFilter === e ? '#181818' : 'transparent', color: entityFilter === e ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>DAYS:</span>
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
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Audit Log</h2>
        {auditLoading && (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
        {!auditLoading && rows.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No audit entries for this period.</p>
        )}
        {!auditLoading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => {
                  let detailStr = '';
                  try { detailStr = typeof row.details === 'string' ? row.details : JSON.stringify(row.details); } catch { detailStr = ''; }
                  return (
                    <tr key={row.id ?? idx} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', fontFamily: 'Geist Mono', fontSize: 11, color: 'var(--op-text-secondary)' }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>{row.actor || row.actorEmail || '—'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', background: 'rgba(94,139,139,0.1)', color: '#5E8B8B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {row.action || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', textTransform: 'capitalize' }}>{row.entityType || '—'}{row.entityId ? ` #${row.entityId}` : ''}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailStr}>
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
  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          All Venues
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Multi-venue overview and management.
        </p>
      </div>
      <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--op-text-secondary)' }}>PERIOD:</span>
        {([7, 30, 90] as const).map((d) => (
          <button key={d} onClick={() => setPeriod(d)}
            className="px-3 py-1 font-data"
            style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.15)', background: period === d ? '#181818' : 'transparent', color: period === d ? '#F3F2EE' : '#5E5E5E', cursor: 'pointer' }}>
            {d}D
          </button>
        ))}
      </div>

      {/* Consolidated revenue card */}
      {(consolidatedLoading) && (
        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
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
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
      )}

      {/* Per-venue cards */}
      {!venuesLoading && venues.length === 0 && !venuesError && (
        <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No venues found.</p>
      )}

      {!venuesLoading && venues.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Venue Breakdown</h3>
          {(comparisonLoading) && (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
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
                      <span style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--op-text)', display: 'block' }}>{v.name}</span>
                      {v.address && (
                        <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>{v.address}</span>
                      )}
                    </div>
                    <a
                      href={`/dashboard?v=${v.id}`}
                      className="px-3 py-1.5 font-data"
                      style={{ fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(24,24,24,0.2)', color: 'var(--op-text)', textDecoration: 'none', background: 'transparent', whiteSpace: 'nowrap' as const }}>
                      Open Dashboard
                    </a>
                  </div>
                  {stats ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span style={monoLabel}>Revenue</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)' }}>${Number(stats.revenue ?? 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Orders</span>
                        <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)' }}>{stats.orderCount ?? 0}</span>
                      </div>
                      <div>
                        <span style={monoLabel}>Change</span>
                        {change !== null ? (
                          <span className="flex items-center gap-1" style={{ fontWeight: 500, fontSize: '0.9375rem', color: isPositive ? '#5E8B5E' : '#B85450' }}>
                            {isPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {Math.abs(Number(change)).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)' }}>—</span>
                        )}
                      </div>
                    </div>
                  ) : !comparisonLoading ? (
                    <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>No data for this period.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
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

  const segments: any[] = (segmentsData as any)?.segments ?? [];
  const history: any[] = (historyData as any[]) ?? [];

  const currentSegment = segments.find((s: any) => s.key === selectedSegment || s.id === selectedSegment) as any | undefined;
  const customerCount = currentSegment?.count ?? 0;
  const charCount = message.length;
  const maxChars = 160;

  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          SMS Marketing
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Send targeted SMS campaigns to your customers.
        </p>
      </div>
      <div className="space-y-6">

      {/* Segment selector */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Select Audience</h3>
        {segmentsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SMS_SEGMENTS.map((seg) => {
            const segStats = segments.find((s: any) => (s.key ?? s.id) === seg.id) as any | undefined;
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
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Compose Message</h3>
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
              color: 'var(--op-text)',
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
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campaign history */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Campaign History</h3>
        {historyLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!historyLoading && history.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No campaigns sent yet.</p>
        )}
        {!historyLoading && history.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Date', 'Segment', 'Message', 'Sent'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row: any, i: number) => (
                  <tr key={row.id ?? i} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', whiteSpace: 'nowrap' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {new Date(row.sentAt ?? row.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text)', textTransform: 'capitalize' as const, fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {SMS_SEGMENTS.find((s) => s.id === row.segment)?.label ?? row.segment}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {row.body ?? row.message}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#5E8B5E', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {row.recipientCount ?? row.sentCount ?? row.sent ?? 0}
                    </td>
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

  const monoLabel = { fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' };
  const bigNum = { fontWeight: 500, fontSize: '1.25rem', color: 'var(--op-text)', fontFamily: 'Inter' };
  const statCardStyle = { borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' };

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Franchisee
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Franchisee account management.
        </p>
      </div>
      <div className="space-y-6">

      {/* Config error */}
      {configError && (
        <div className="border p-4 flex items-center gap-2" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450' }} />
          <span style={{ fontSize: '0.875rem', color: '#B85450' }}>{configError.message}</span>
        </div>
      )}

      {/* Config section */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Platform Configuration</h3>
        {configLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!configLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' }}>Platform Fee %</label>
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
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' }}>Payout Schedule</label>
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
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Current Month Revenue Split
          <span className="font-data ml-2" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
            {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
        </h3>
        {splitLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
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
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No revenue data for the current month.</p>
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
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text-secondary)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', cursor: 'pointer' }}
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
        <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Payout History</h3>
        {payoutsLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>}
        {!payoutsLoading && payouts.length === 0 && (
          <p className="font-data" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)' }}>No payouts processed yet.</p>
        )}
        {!payoutsLoading && payouts.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Period', 'Gross', 'Fee', 'Net', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map((row: any, i: number) => {
                  const statusColor = row.status === 'paid' ? '#5E8B5E' : '#C4953A';
                  return (
                    <tr key={row.id ?? i} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)', fontFamily: 'Geist Mono', fontSize: '0.625rem', whiteSpace: 'nowrap' as const }}>
                        {row.periodStart ? new Date(row.periodStart).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--op-text)' }}>${Number(row.grossRevenue ?? 0).toFixed(2)}</td>
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
    color: 'var(--op-text-secondary)',
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
  const qrBtnSecondary = { borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', fontSize: '0.75rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          QR Codes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Generate and download QR codes for your venue.
        </p>
      </div>
      <div className="space-y-6">
      {/* Table QR Codes */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
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
              style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: 'var(--op-text)' }}
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
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: 'var(--op-text-secondary)', marginTop: '4px' }}>
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
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Menu QR Code
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em', marginBottom: '1rem' }}>
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
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
      </div>

      {/* Kiosk Mode QR */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Kiosk Mode QR
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em', marginBottom: '1rem' }}>
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
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Scheduling Helpers ───────────────────────────────────────────────────────
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
function addWeekDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── SchedulingTab ────────────────────────────────────────────────────────────
function SchedulingTab({ token, venueId: _venueId }: { token: string; venueId: number }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ staffId: '' as number | '', shiftDate: '', startTime: '09:00', endTime: '17:00', role: '', notes: '' });
  const [requestsView, setRequestsView] = useState<'timeoff' | 'swaps'>('timeoff');

  const staff = trpc.scheduling.listStaff.useQuery({ token }, { enabled: !!token });
  const shifts = trpc.scheduling.listShifts.useQuery({ token, weekStart }, { enabled: !!token });
  const timeOffReqs = trpc.shiftManagement.listTimeOffRequests.useQuery({ token, status: 'pending' as const }, { enabled: !!token });
  const swapReqs = trpc.shiftManagement.listShiftSwapRequests.useQuery({ token, status: 'pending' as const }, { enabled: !!token });

  const addShift = trpc.scheduling.addShift.useMutation({ onSuccess: () => { shifts.refetch(); setShowAddForm(false); setAddForm({ staffId: '', shiftDate: '', startTime: '09:00', endTime: '17:00', role: '', notes: '' }); } });
  const deleteShift = trpc.scheduling.deleteShift.useMutation({ onSuccess: () => shifts.refetch() });
  const reviewTimeOff = trpc.shiftManagement.reviewTimeOff.useMutation({ onSuccess: () => timeOffReqs.refetch() });
  const respondSwap = trpc.shiftManagement.respondShiftSwap.useMutation({ onSuccess: () => swapReqs.refetch() });

  const weekDays = WEEK_DAYS.map((_, i) => addWeekDays(weekStart, i));
  const weekDisplay = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const shiftsData = (shifts.data ?? []) as any[];
  const staffData = (staff.data ?? []) as any[];
  const toReqs = (timeOffReqs.data ?? []) as any[];
  const swData = (swapReqs.data ?? []) as any[];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Scheduling</h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Build rosters and approve staff requests.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setWeekStart(addWeekDays(weekStart, -7))} style={{ ...DS.btnSecondary }}>← Prev</button>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>Week of {weekDisplay}</span>
        <button onClick={() => setWeekStart(addWeekDays(weekStart, 7))} style={{ ...DS.btnSecondary }}>Next →</button>
        <button onClick={() => setWeekStart(getMonday(new Date()))} style={{ ...DS.btnSecondary, marginLeft: 'auto' }}>Today</button>
      </div>
      <div style={{ ...DS.card, marginBottom: 20, overflowX: 'auto' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={DS.sectionTitle}>Shifts</h2>
          <button onClick={() => setShowAddForm(v => !v)} style={{ ...DS.btnPrimary }}><Plus size={14} /> Add Shift</button>
        </div>
        {shifts.isLoading ? <div style={DS.emptyState}><Loader2 size={18} className="animate-spin" /></div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12, minWidth: 700 }}>
            <thead><tr><th style={{ ...DS.tableHeader, minWidth: 100 }}>Staff</th>{WEEK_DAYS.map((d, i) => <th key={d} style={{ ...DS.tableHeader, minWidth: 80 }}>{d} {new Date(weekDays[i] + 'T00:00:00').getDate()}</th>)}</tr></thead>
            <tbody>
              {staffData.length === 0 ? <tr><td colSpan={8} style={DS.emptyState}>No staff members found.</td></tr> : staffData.map((s: any) => (
                <tr key={s.id}><td style={{ ...DS.tableCell, fontWeight: 600 }}>{s.name}</td>
                  {weekDays.map(day => {
                    const dayShifts = shiftsData.filter((sh: any) => sh.staffId === s.id && sh.shiftDate?.slice(0, 10) === day);
                    return (
                      <td key={day} style={{ ...DS.tableCell, verticalAlign: 'top' as const }}>
                        {dayShifts.map((sh: any) => (
                          <div key={sh.id} style={{ background: 'rgba(94,139,139,0.12)', borderRadius: 6, padding: '3px 6px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <span>{sh.startTime?.slice(0, 5)}–{sh.endTime?.slice(0, 5)}</span>
                            <button onClick={() => deleteShift.mutate({ token, shiftId: sh.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-muted)', padding: 0, lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {showAddForm && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--op-bg)', borderRadius: 8, border: '1px solid var(--op-card-border)' }}>
            <h3 style={{ ...DS.sectionTitle, marginBottom: 12 }}>Add Shift</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              <div><label style={DS.label}>Staff</label>
                <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: Number(e.target.value) || '' }))} style={{ ...DS.input }}>
                  <option value="">Select…</option>
                  {staffData.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label style={DS.label}>Date</label><input type="date" value={addForm.shiftDate} onChange={e => setAddForm(f => ({ ...f, shiftDate: e.target.value }))} style={{ ...DS.input }} /></div>
              <div><label style={DS.label}>Start</label><input type="time" value={addForm.startTime} onChange={e => setAddForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...DS.input }} /></div>
              <div><label style={DS.label}>End</label><input type="time" value={addForm.endTime} onChange={e => setAddForm(f => ({ ...f, endTime: e.target.value }))} style={{ ...DS.input }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => addShift.mutate({ token, staffId: addForm.staffId as number, shiftDate: addForm.shiftDate, startTime: addForm.startTime, endTime: addForm.endTime, role: addForm.role || undefined, notes: addForm.notes || undefined })} disabled={!addForm.staffId || !addForm.shiftDate || addShift.isPending} style={{ ...DS.btnPrimary, opacity: (!addForm.staffId || !addForm.shiftDate) ? 0.5 : 1 }}>
                {addShift.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Add
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ ...DS.btnSecondary }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div style={DS.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ ...DS.sectionTitle, margin: 0 }}>Pending Requests</h2>
          {(toReqs.length + swData.length) > 0 && <span style={{ background: '#5E8B8B', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{toReqs.length + swData.length}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['timeoff', 'swaps'] as const).map(v => (
              <button key={v} onClick={() => setRequestsView(v)} style={{ ...DS.btnSecondary, background: requestsView === v ? 'var(--op-accent)' : undefined, color: requestsView === v ? '#fff' : undefined, fontSize: 12 }}>
                {v === 'timeoff' ? `Time-Off (${toReqs.length})` : `Swaps (${swData.length})`}
              </button>
            ))}
          </div>
        </div>
        {requestsView === 'timeoff' && (toReqs.length === 0 ? <p style={DS.emptyState}>No pending time-off requests.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead><tr>{['Staff','Period','Type','Reason',''].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
            <tbody>{toReqs.map((r: any) => (<tr key={r.id}><td style={DS.tableCell}>{r.staffName}</td><td style={DS.tableCell}>{r.startDate} – {r.endDate}</td><td style={DS.tableCell}>{r.leaveType}</td><td style={{ ...DS.tableCell, maxWidth: 180 }}>{r.reason || '—'}</td><td style={{ ...DS.tableCell, whiteSpace: 'nowrap' as const }}><button onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'approved' })} style={{ ...DS.btnPrimary, fontSize: 11, padding: '4px 10px', marginRight: 4 }}>Approve</button><button onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, status: 'denied' })} style={{ ...DS.btnDanger, fontSize: 11, padding: '4px 10px' }}>Deny</button></td></tr>))}</tbody>
          </table>
        ))}
        {requestsView === 'swaps' && (swData.length === 0 ? <p style={DS.emptyState}>No pending swap requests.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead><tr>{['Requesting','Shift','Target','Reason',''].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
            <tbody>{swData.map((r: any) => (<tr key={r.id}><td style={DS.tableCell}>{r.requestingStaffName ?? r.requestingStaffId}</td><td style={DS.tableCell}>#{r.fromShiftId}</td><td style={DS.tableCell}>{r.targetStaffName ?? r.targetStaffId ?? '—'}</td><td style={DS.tableCell}>{r.reason || '—'}</td><td style={{ ...DS.tableCell, whiteSpace: 'nowrap' as const }}><button onClick={() => respondSwap.mutate({ token, requestId: r.id, status: 'approved' })} style={{ ...DS.btnPrimary, fontSize: 11, padding: '4px 10px', marginRight: 4 }}>Approve</button><button onClick={() => respondSwap.mutate({ token, requestId: r.id, status: 'denied' })} style={{ ...DS.btnDanger, fontSize: 11, padding: '4px 10px' }}>Deny</button></td></tr>))}</tbody>
          </table>
        ))}
      </div>
    </div>
  );
}

// ─── TimesheetTab ──────────────────────────────────────────────────────────────
function TimesheetTab({ token }: { token: string }) {
  const [days, setDays] = useState<7 | 14 | 28>(14);
  const summary = trpc.clock.getHoursSummary.useQuery({ token, days }, { enabled: !!token });
  const summaryData = (summary.data ?? []) as any[];

  const handleExport = () => {
    const rows = [['Staff Name', 'Total Hours', 'Shifts', 'Penalty Flags']];
    for (const s of summaryData) {
      const hours = s.totalHours ?? (s.totalMinutes != null ? (s.totalMinutes / 60).toFixed(1) : '0.0');
      rows.push([s.name ?? '', String(hours), String(s.shifts ?? 0), (s.penaltyFlags ?? []).join('; ')]);
    }
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `timesheet-${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Timesheets</h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Staff hours with AEST penalty flags. CSV export for Xero.</p>
      </div>
      <div style={DS.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([7, 14, 28] as const).map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ ...DS.btnSecondary, background: days === d ? 'var(--op-accent)' : undefined, color: days === d ? '#fff' : undefined, fontSize: 12 }}>{d} days</button>
            ))}
          </div>
          <button onClick={handleExport} disabled={summaryData.length === 0} style={{ ...DS.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: summaryData.length === 0 ? 0.5 : 1 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
        {summary.isLoading
          ? <div style={{ ...DS.emptyState, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={22} className="animate-spin" /></div>
          : summaryData.length === 0
            ? <p style={DS.emptyState}>No clock events in the selected period.</p>
            : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                  <thead><tr>{['Staff','Shifts','Total Hours','Penalty Flags'].map(h => <th key={h} style={DS.tableHeader}>{h}</th>)}</tr></thead>
                  <tbody>{summaryData.map((s: any, i: number) => {
                    const hours = s.totalHours ?? (s.totalMinutes != null ? (s.totalMinutes / 60).toFixed(1) : '0.0');
                    const flags: string[] = s.penaltyFlags ?? [];
                    return (
                      <tr key={s.staffId ?? i} style={{ borderBottom: '1px solid var(--op-card-border)' }}>
                        <td style={{ ...DS.tableCell, fontWeight: 600 }}>{s.name}</td>
                        <td style={DS.tableCell}>{s.shifts ?? 0}</td>
                        <td style={{ ...DS.tableCell, fontFamily: 'monospace', fontWeight: 700 }}>{hours} h</td>
                        <td style={DS.tableCell}>{flags.length === 0 ? <span style={{ color: 'var(--op-text-muted)' }}>—</span> : flags.map((f: string, fi: number) => <span key={fi} style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 }}>{f}</span>)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--op-bg)', borderRadius: 8, fontSize: 12, color: 'var(--op-text-muted)', lineHeight: 1.5 }}>
          Penalty rates flagged based on AEST clock-in time: Sat 125%, Sun 200%, late night/early morning (21:00–06:00) 125%. Export CSV to Xero for payroll calculation.
        </div>
      </div>
    </div>
  );
}
