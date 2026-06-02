/**
 * OwnerDashboard — AppShell + nav + tab switching.
 * Tab components are split into individual files in ./tabs/.
 * Shared helpers and DS constants are in ./shared.ts.
 */
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { useVenueSSE } from '@/hooks/useVenueSSE';
import { trpc } from '@/providers/trpc';
import {
  ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap,
  Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X,
  AlertCircle, Star, Gift, Ticket, MapPin, Briefcase, QrCode, Download,
  Send, TrendingUp, ChevronDown, ChevronUp, Tag, DollarSign,
  PieChart as PieChartIcon, Building2, MessageSquare, Percent, GripVertical,
  Bell, CalendarDays, Clock, Package, RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/layout/ThemeContext';
import type { SidebarNavGroup } from '@/components/layout/SidebarNav';

import { OverviewTab } from './tabs/OverviewTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { PLTab } from './tabs/PLTab';
import { WebsiteTab } from './tabs/WebsiteTab';
import { SettingsTab } from './tabs/SettingsTab';
import { BillingTab } from './tabs/BillingTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { ReviewsTab } from './tabs/ReviewsTab';
import { MenuTab } from './tabs/MenuTab';
import { InventoryTab } from './tabs/InventoryTab';
import { GiftCardsTab } from './tabs/GiftCardsTab';
import { PassesTab } from './tabs/PassesTab';
import { LocationsTab } from './tabs/LocationsTab';
import { CateringTab } from './tabs/CateringTab';
import { BundlesTab } from './tabs/BundlesTab';
import { CampaignsTab } from './tabs/CampaignsTab';
import { LoyaltyTab } from './tabs/LoyaltyTab';
import { PromoTab } from './tabs/PromoTab';
import { DeliveryTab } from './tabs/DeliveryTab';
import { AuditTab } from './tabs/AuditTab';
import { AllVenuesTab } from './tabs/AllVenuesTab';
import { SmsMarketingTab } from './tabs/SmsMarketingTab';
import { FranchiseeTab } from './tabs/FranchiseeTab';
import { QRCodesTab } from './tabs/QRCodesTab';
import { SchedulingTab } from './tabs/SchedulingTab';
import { TimesheetTab } from './tabs/TimesheetTab';
import { WaitlistTab } from './tabs/WaitlistTab';
import { RefundsTab } from './tabs/RefundsTab';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { owner, venue, loading, logout } = useVenueAuth();
  const token = localStorage.getItem('b1-owner-token') || '';
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'pl' | 'settings' | 'billing' | 'integrations' | 'menu' | 'inventory' | 'reviews' | 'giftcards' | 'passes' | 'locations' | 'catering' | 'promo' | 'bundles' | 'campaigns' | 'loyalty' | 'delivery' | 'audit' | 'allvenues' | 'smsmarketing' | 'franchisee' | 'qrcodes' | 'website' | 'scheduling' | 'timesheets' | 'waitlist' | 'refunds'>('overview');

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

  // ── Sidebar nav groups — streamlined to ~10 primary items ─────────────────
  // Rarely-used features are accessible but deprioritised (grouped at bottom).
  const NAV_GROUPS: SidebarNavGroup[] = [
    { group: 'Main', items: [
      { id: 'overview',     label: 'Dashboard',      icon: BarChart3 },
      { id: 'analytics',    label: 'Analytics',      icon: TrendingUp },
      { id: 'menu',         label: 'Menu',           icon: Coffee },
      { id: 'inventory',    label: 'Inventory',      icon: Package },
      { id: 'reviews',      label: 'Reviews',        icon: Star },
      { id: 'website',      label: 'Website',        icon: Globe },
    ]},
    { group: 'Staff', items: [
      { id: 'scheduling',   label: 'Scheduling',     icon: CalendarDays },
      { id: 'timesheets',   label: 'Timesheets',     icon: Clock },
    ]},
    { group: 'Revenue', items: [
      { id: 'loyalty',      label: 'Loyalty',        icon: Star },
      { id: 'giftcards',    label: 'Gift Cards',     icon: Gift },
      { id: 'passes',       label: 'Passes',         icon: Ticket },
      { id: 'promo',        label: 'Promotions',     icon: Tag },
    ]},
    { group: 'Marketing', items: [
      { id: 'campaigns',    label: 'Campaigns',      icon: Send },
      { id: 'smsmarketing', label: 'SMS',            icon: MessageSquare },
    ]},
    { group: 'Venue', items: [
      { id: 'locations',    label: 'Locations',      icon: MapPin },
      { id: 'waitlist',     label: 'Waitlist',       icon: Users },
      { id: 'catering',     label: 'Catering',       icon: Briefcase },
      { id: 'integrations', label: 'Integrations',   icon: Link2 },
      { id: 'settings',     label: 'Settings',       icon: Settings },
    ]},
    { group: 'Finance', items: [
      { id: 'refunds',      label: 'Refunds',        icon: RotateCcw },
    ]},
    { group: 'More', items: [
      { id: 'pl',           label: 'P&L Report',     icon: DollarSign },
      { id: 'bundles',      label: 'Bundles',        icon: Gift },
      { id: 'delivery',     label: 'Delivery',       icon: Globe },
      { id: 'qrcodes',      label: 'QR Codes',       icon: QrCode },
      { id: 'billing',      label: 'Billing',        icon: CreditCard },
      { id: 'audit',        label: 'Audit Log',      icon: Shield },
      { id: 'allvenues',    label: 'All Venues',     icon: Building2 },
      { id: 'franchisee',   label: 'Franchisee',     icon: Percent },
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
          {activeTab === 'inventory' && <InventoryTab />}
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
          {activeTab === 'waitlist' && venue && <WaitlistTab venueId={venue.id} />}
          {activeTab === 'refunds' && <RefundsTab />}
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
