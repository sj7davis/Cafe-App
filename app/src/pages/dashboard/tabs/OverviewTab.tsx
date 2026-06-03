import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send, Tag,
  DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp, CalendarDays,
  Clock, Shield, Building2, Percent, MessageSquare, QrCode, Link2, CreditCard,
  MapPin, Briefcase, Edit2, Trash2, GripVertical, Download, ChevronDown,
  ChevronUp, Monitor, Smartphone, RefreshCw, Bell, Eye, EyeOff, CheckCircle,
  Users, PieChart as PieChartIcon, Circle,
  Zap,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import QRCode from 'qrcode';
import { SetupChecklist } from '@/components/SetupChecklist';
import { DS, getMonday, addWeekDays, WEEK_DAYS, TemplatePreviewCard, ImageUpload, SortableMenuRow, TabletPinSection } from '../shared';


export function OverviewTab({ venue, owner, setActiveTab }: { venue: any; owner: any; setActiveTab: (tab: any) => void }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: summary, isLoading: summaryLoading } = trpc.venue.getDailySummary.useQuery(
    { token },
    { enabled: !!token, staleTime: 2 * 60 * 1000 }
  );
  const sendEmail = trpc.venue.sendDailySummaryEmail.useMutation();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  // ── Setup checklist ──────────────────────────────────────────────────────
  const { data: menuData } = trpc.venue.listMenu.useQuery({ venueId: venue?.id || 0 }, { enabled: !!venue?.id, staleTime: 10 * 60 * 1000 });
  const setupDismissKey = `b1-setup-dismissed-${venue?.id}`;
  const [setupDismissed, setSetupDismissed] = useState(() => !!localStorage.getItem(setupDismissKey));

  const hasMenuItems = (menuData?.length ?? 0) > 0;
  const hasHours = !!(venue?.hoursWeekday || venue?.hoursSaturday);
  const hasDescription = !!(venue?.description && venue.description.length > 10);
  const hasWebsite = Array.isArray((venue as any)?.websiteBlocks) && (venue as any).websiteBlocks.length > 0;
  const hasAccentColor = !!(venue?.accentColor && venue.accentColor !== '#09090B');

  const setupSteps = [
    {
      id: 'menu',
      title: 'Add your first menu items',
      description: 'Customers can\'t order until your menu is set up. Add at least 3 items to get started.',
      done: hasMenuItems,
      action: { label: 'Add items →', onClick: () => setActiveTab('menu') },
    },
    {
      id: 'hours',
      title: 'Set your opening hours',
      description: 'Let customers know when you\'re open. This appears on your public venue page.',
      done: hasHours,
      action: { label: 'Set hours →', onClick: () => setActiveTab('settings') },
    },
    {
      id: 'description',
      title: 'Write a short description',
      description: 'A sentence or two about your cafe helps customers decide to order from you.',
      done: hasDescription,
      action: { label: 'Write description →', onClick: () => setActiveTab('settings') },
    },
    {
      id: 'website',
      title: 'Customise your website',
      description: 'Pick a template and set your brand colours so your page looks professional.',
      done: hasWebsite || hasAccentColor,
      action: { label: 'Open builder →', onClick: () => setActiveTab('website') },
    },
    {
      id: 'share',
      title: 'Share your ordering link',
      description: 'Send your venue link to customers so they can start placing orders.',
      done: (summary?.orderCount ?? 0) > 0,
      action: {
        label: 'Copy link →',
        onClick: () => {
          const url = `${window.location.origin}/v/${venue?.slug}`;
          navigator.clipboard?.writeText(url).catch(() => {});
          setActiveTab('qrcodes');
        },
      },
    },
  ];

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Welcome back{owner?.name ? `, ${owner.name}` : ''}. Here's what's happening today.
        </p>
      </div>

      {/* Setup checklist — shown to new venues until dismissed */}
      {!setupDismissed && (
        <SetupChecklist
          steps={setupSteps}
          onDismiss={() => {
            setSetupDismissed(true);
            localStorage.setItem(setupDismissKey, '1');
          }}
        />
      )}

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
