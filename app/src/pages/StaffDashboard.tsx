import React, { useState, useEffect, useRef } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { trpc } from '@/providers/trpc';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Coffee,
  Users,
  ShoppingBag,
  Package,
  Star,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Utensils,
  Gift,
  CreditCard,
  Bell,
  BarChart3,
  Truck,
  Briefcase,
  UserPlus,
  KeyRound,
  Calendar,
  Trash2,
  ListOrdered,
  MessageSquare,
} from 'lucide-react';

export default function StaffDashboard() {
  const { staff, venue, token, venueId: _venueId, isAdmin, isManager, logout, loading } = useStaffAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const { data: pendingOrdersData } = trpc.venue.listOrders.useQuery(
    { venueId: venue?.id ?? 0, status: 'pending', limit: 99 },
    { enabled: !!venue, refetchInterval: 15_000 }
  );
  const pendingCount = pendingOrdersData?.length ?? 0;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f4',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#78716c' }}>
          <Coffee size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!staff || !venue) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f4',
        fontFamily: "'Inter', sans-serif",
        flexDirection: 'column',
        gap: '16px',
      }}>
        <AlertTriangle size={48} color="#d6d3d1" />
        <p style={{ color: '#78716c', fontSize: '15px' }}>Not authenticated</p>
        <a
          href="/staff-login"
          style={{
            padding: '10px 20px',
            background: '#1c1917',
            color: '#fafaf9',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f4',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Top Bar */}
      <header style={{
        background: '#1c1917',
        color: '#fafaf9',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#44403c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Coffee size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{venue.name}</div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>Staff Portal</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#292524',
            borderRadius: '20px',
            fontSize: '12px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
            }} />
            {staff.name}
            <span style={{
              padding: '2px 8px',
              background: staff.role === 'admin' ? '#dc2626' : staff.role === 'manager' ? '#ea580c' : '#57534e',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              {staff.role}
            </span>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              color: '#a8a29e',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'color 0.2s',
            }}
            title="Logout"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fafaf9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a8a29e'; }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <aside style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e7e5e4',
          padding: '16px 12px',
          flexShrink: 0,
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <SidebarItem icon={<ShoppingBag size={18} />} label="Orders" tab="orders" activeTab={activeTab} setActiveTab={setActiveTab} badge={pendingCount} />
            <SidebarItem icon={<Package size={18} />} label="Inventory" tab="inventory" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Star size={18} />} label="Loyalty" tab="loyalty" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Gift size={18} />} label="Gift Cards" tab="giftcards" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<CreditCard size={18} />} label="Subscriptions" tab="subscriptions" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Bell size={18} />} label="Push Notifications" tab="push" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Utensils size={18} />} label="Catering" tab="catering" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Briefcase size={18} />} label="Corporate" tab="corporate" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<BarChart3 size={18} />} label="Analytics" tab="analytics" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Calendar size={18} />} label="Schedule" tab="schedule" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Trash2 size={18} />} label="Waste Log" tab="waste" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<ListOrdered size={18} />} label="Waitlist" tab="waitlist" activeTab={activeTab} setActiveTab={setActiveTab} />

            {(isAdmin || isManager) && (
              <>
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e7e5e4',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#a8a29e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '12px 12px 8px',
                }}>
                  Management
                </div>
                <SidebarItem icon={<Users size={18} />} label="Staff" tab="staff" activeTab={activeTab} setActiveTab={setActiveTab} />
                <SidebarItem icon={<Settings size={18} />} label="Settings" tab="settings" activeTab={activeTab} setActiveTab={setActiveTab} />
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '28px', overflow: 'auto' }}>
          {activeTab === 'orders' && <OrdersTab venueId={venue.id} token={token} />}
          {activeTab === 'inventory' && <InventoryTab venueId={venue.id} isManager={isManager} />}
          {activeTab === 'loyalty' && <LoyaltyTab venueId={venue.id} token={token} />}
          {activeTab === 'giftcards' && <GiftCardsTab venueId={venue.id} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab venueId={venue.id} />}
          {activeTab === 'push' && <PushNotificationsTab venueId={venue.id} />}
          {activeTab === 'catering' && <CateringTab venueId={venue.id} />}
          {activeTab === 'corporate' && <CorporateTab venueId={venue.id} />}
          {activeTab === 'analytics' && <AnalyticsTab venueId={venue.id} token={token} />}
          {activeTab === 'schedule' && <ScheduleTab venueId={venue.id} token={token} />}
          {activeTab === 'waste' && <WasteLogTab venueId={venue.id} />}
          {activeTab === 'waitlist' && <WaitlistTab venueId={venue.id} />}
          {activeTab === 'staff' && (isAdmin || isManager) && <StaffManagementTab venueId={venue.id} isAdmin={isAdmin} />}
          {activeTab === 'settings' && (isAdmin || isManager) && <SettingsTab venueId={venue.id} />}
        </main>
      </div>
    </div>
  );
}

// ─── Audio Chime ───
function playNewOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ─── Sidebar Item ───
function SidebarItem({ icon, label, tab, activeTab, setActiveTab, badge }: {
  icon: React.ReactNode; label: string; tab: string; activeTab: string; setActiveTab: (t: string) => void; badge?: number;
}) {
  const isActive = activeTab === tab;
  return (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: 'none',
        background: isActive ? '#1c1917' : 'transparent',
        color: isActive ? '#fafaf9' : '#57534e',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) { e.currentTarget.style.background = '#f5f5f4'; e.currentTarget.style.color = '#44403c'; }
      }}
      onMouseLeave={(e) => {
        if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#57534e'; }
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          background: '#dc2626',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── Tab Components ───
function OrdersTab({ venueId, token }: { venueId: number; token: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [waitInput, setWaitInput] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const utils = trpc.useUtils();
  const { data: ordersList } = trpc.venue.listOrders.useQuery(
    { venueId, status: statusFilter === 'all' ? undefined : statusFilter, locationId: locationFilter ?? undefined, limit: 50 },
    { refetchInterval: 20_000 }
  );
  const { data: locationsList } = trpc.venue.listLocations.useQuery({ venueId });

  const updateStatus = trpc.venue.updateOrderStatus.useMutation({
    onSuccess: () => utils.venue.listOrders.invalidate(),
  });

  const setWaitTime = trpc.venue.setWaitTime.useMutation({
    onSuccess: () => {
      setWaitMsg('✓ Updated');
      setTimeout(() => setWaitMsg(''), 3000);
    },
  });

  const knownIds = useRef<Set<number>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [staffNoteDraft, setStaffNoteDraft] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: selectedOrderItems } = trpc.venue.getOrderItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  const filteredOrders = (ordersList ?? []).filter(o =>
    !orderSearch ||
    (o.customerName ?? '').toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.customerPhone ?? '').includes(orderSearch) ||
    (o.orderNumber ?? '').includes(orderSearch.toUpperCase())
  );

  function handleExportCSV() {
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Order Number', 'Customer Name', 'Phone', 'Status', 'Total', 'Pickup Time', 'Date', 'Payment Method'];
    const rows = filteredOrders.map(o => [
      escape(o.orderNumber ?? ''),
      escape(o.customerName ?? ''),
      escape(o.customerPhone ?? ''),
      escape(o.status ?? ''),
      escape(Number(o.totalAmount).toFixed(2)),
      escape(o.pickupTime ? new Date(o.pickupTime).toLocaleTimeString() : ''),
      escape(o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : ''),
      escape(o.paymentMethod ?? ''),
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!ordersList) return;
    const incoming = new Set(ordersList.map(o => o.id));
    const isFirstLoad = knownIds.current.size === 0;
    if (!isFirstLoad) {
      const fresh = new Set([...incoming].filter(id => !knownIds.current.has(id)));
      if (fresh.size > 0) {
        playNewOrderChime();
        setNewOrderIds(prev => {
          const merged = new Set(prev);
          fresh.forEach(id => merged.add(id));
          return merged;
        });
        // Auto-clear highlight after 8 seconds
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            fresh.forEach(id => next.delete(id));
            return next;
          });
        }, 8_000);
      }
    }
    knownIds.current = incoming;
  }, [ordersList]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Orders</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Wait time setter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#57534e' }}>
            <span>Current wait:</span>
            <input
              type="number"
              value={waitInput}
              onChange={e => setWaitInput(e.target.value)}
              placeholder="10"
              style={{
                width: '52px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            />
            <span>min</span>
            <button
              onClick={() => {
                const mins = Number(waitInput);
                if (!mins || mins < 1) return;
                setWaitTime.mutate({ token, venueId, minutes: mins });
              }}
              disabled={setWaitTime.isPending}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: '#1c1917',
                color: '#fafaf9',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {setWaitTime.isPending ? '…' : 'Set'}
            </button>
            {waitMsg && <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>{waitMsg}</span>}
          </div>

          {/* CSV export */}
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #e7e5e4',
              background: '#fff',
              color: '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Status filter row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'pending', 'confirmed', 'ready', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: statusFilter === status ? '#1c1917' : '#e7e5e4',
              color: statusFilter === status ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          placeholder="Search by name, phone, or order number…"
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            borderRadius: '8px',
            border: '1px solid #e7e5e4',
            fontSize: '13px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {orderSearch && (
          <button
            onClick={() => setOrderSearch('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#a8a29e',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 2px',
            }}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Location filter — only renders when venue has 2+ locations */}
      {locationsList && locationsList.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setLocationFilter(null)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: locationFilter === null ? '#1c1917' : '#e7e5e4',
              color: locationFilter === null ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All Locations
          </button>
          {locationsList.map(loc => (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: locationFilter === loc.id ? '#1c1917' : '#e7e5e4',
                color: locationFilter === loc.id ? '#fafaf9' : '#57534e',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats Cards — real data from ordersList */}
      {(() => {
        const todayStr = new Date().toDateString();
        const todayOrders = (ordersList ?? []).filter(o => new Date(o.createdAt).toDateString() === todayStr);
        const todayPending = todayOrders.filter(o => o.status === 'pending').length;
        const todayCompleted = todayOrders.filter(o => o.status === 'completed').length;
        const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <StatCard icon={<ShoppingBag size={20} />} label="Today's Orders" value={String(todayOrders.length)} color="#1c1917" />
            <StatCard icon={<Clock size={20} />} label="Pending" value={String(todayPending)} color="#d97706" />
            <StatCard icon={<CheckCircle size={20} />} label="Completed" value={String(todayCompleted)} color="#16a34a" />
            <StatCard icon={<TrendingUp size={20} />} label="Revenue" value={`$${todayRevenue.toFixed(2)}`} color="#2563eb" />
          </div>
        );
      })()}

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => {
              const isExpanded = selectedOrderId === order.id;
              const isNew = newOrderIds.has(order.id);
              return (
                <React.Fragment key={order.id}>
                  <tr
                    data-order-id={order.id}
                    data-testid={`order-row-${order.id}`}
                    data-new-order={isNew ? 'true' : undefined}
                    onClick={() => setSelectedOrderId(isExpanded ? null : order.id)}
                    style={{
                      borderBottom: isExpanded ? 'none' : '1px solid #f5f5f4',
                      transition: 'background 0.15s',
                      background: isNew ? '#fffbeb' : isExpanded ? '#f0fdf4' : '#fff',
                      borderLeft: isNew ? '3px solid #d97706' : isExpanded ? '3px solid #059669' : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!isNew && !isExpanded) e.currentTarget.style.background = '#fafaf9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? '#fffbeb' : isExpanded ? '#f0fdf4' : '#fff'; }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>
                      <span style={{ marginRight: 6, fontSize: 10, color: '#a8a29e' }}>{isExpanded ? '▼' : '▶'}</span>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#44403c' }}>{order.customerName}</td>
                    <td style={{ padding: '14px 16px', color: '#78716c' }}>${Number(order.totalAmount).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      {editingOrderId === order.id ? (
                        <div data-testid={`confirm-panel-${order.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                          <div style={{ fontSize: 11, color: '#57534e' }}>
                            New status: <strong style={{ textTransform: 'capitalize' }}>{pendingStatus}</strong>
                          </div>
                          <textarea
                            data-testid={`staff-note-input-${order.id}`}
                            value={staffNoteDraft}
                            onChange={(e) => setStaffNoteDraft(e.target.value)}
                            placeholder="Internal note (optional)"
                            rows={2}
                            style={{
                              padding: '6px 8px', borderRadius: 6, border: '1px solid #e7e5e4',
                              fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              data-testid={`confirm-status-${order.id}`}
                              onClick={() => {
                                updateStatus.mutate({
                                  token,
                                  orderId: order.id,
                                  status: pendingStatus as any,
                                  staffNote: staffNoteDraft.trim() ? staffNoteDraft.trim() : undefined,
                                });
                                setEditingOrderId(null);
                                setPendingStatus('');
                                setStaffNoteDraft('');
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: 'none',
                                background: '#181818', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrderId(null);
                                setPendingStatus('');
                                setStaffNoteDraft('');
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid #e7e5e4',
                                background: '#fafaf9', color: '#57534e', fontSize: 12, cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === order.status) return;
                            setEditingOrderId(order.id);
                            setPendingStatus(next);
                            setStaffNoteDraft('');
                          }}
                          style={{
                            padding: '4px 8px', borderRadius: 6, border: '1px solid #e7e5e4',
                            fontSize: 12, background: '#fafaf9', cursor: 'pointer',
                          }}
                        >
                          {['pending', 'confirmed', 'ready', 'completed', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#78716c', fontSize: '12px' }}>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid #f5f5f4', background: '#f8fffe' }}>
                      <td colSpan={6} style={{ padding: '0 16px 14px 36px' }}>
                        {!selectedOrderItems ? (
                          <div style={{ fontSize: 12, color: '#a8a29e', paddingTop: 8 }}>Loading items...</div>
                        ) : selectedOrderItems.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#a8a29e', paddingTop: 8 }}>No items found.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {selectedOrderItems.map((item: any) => (
                              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#44403c' }}>
                                <span style={{ fontWeight: 500 }}>{item.quantity}× {item.itemName ?? item.name}</span>
                                <span style={{ color: '#78716c' }}>${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  {orderSearch ? 'No orders match your search' : 'No orders found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTab({ venueId, isManager }: { venueId: number; isManager: boolean }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<number, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  // Quantity editing state
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});
  const [alertValues, setAlertValues] = useState<Record<number, string>>({});
  const [savingQtyIds, setSavingQtyIds] = useState<Set<number>>(new Set());
  const [qtySavedIds, setQtySavedIds] = useState<Set<number>>(new Set());

  const { data: menuItems } = trpc.venue.listMenuItems.useQuery({ venueId });
  const { data: inventoryRows } = trpc.venue.getInventory.useQuery({ venueId });
  const { data: invLevels } = trpc.venue.getInventoryLevels.useQuery();

  const toggleItem = trpc.venue.toggleInventoryItem.useMutation({
    onSuccess: () => utils.venue.getInventory.invalidate(),
  });

  const setInventoryQty = trpc.venue.setInventoryQuantity.useMutation({
    onSuccess: (_data, vars) => {
      utils.venue.getInventoryLevels.invalidate();
      setSavingQtyIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; });
      setQtySavedIds(prev => { const s = new Set(prev); s.add(vars.menuItemId); return s; });
      setTimeout(() => setQtySavedIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; }), 2000);
    },
    onError: (_err, vars) => {
      setSavingQtyIds(prev => { const s = new Set(prev); s.delete(vars.menuItemId); return s; });
    },
  });

  // Build a map from menuItemId -> inventory row
  const invMap: Record<number, { isAvailable: boolean; staffNote: string | null; soldOutAt: string | Date | null }> = {};
  if (inventoryRows) {
    for (const row of inventoryRows) {
      invMap[row.menuItemId] = {
        isAvailable: row.isAvailable,
        staffNote: row.staffNote ?? null,
        soldOutAt: row.soldOutAt ?? null,
      };
    }
  }

  // Build a map from menuItemId -> inventory levels
  const levelMap: Record<number, { quantity: number | null; quantityAlert: number | null }> = {};
  if (invLevels) {
    for (const row of invLevels) {
      levelMap[row.menuItemId] = { quantity: row.quantity ?? null, quantityAlert: row.quantityAlert ?? null };
    }
  }

  // Merge menu items with inventory state
  const items = (menuItems ?? []).map((item) => {
    const inv = invMap[item.id];
    const lv = levelMap[item.id];
    return {
      ...item,
      isAvailable: inv ? inv.isAvailable : true,
      staffNote: inv ? (inv.staffNote ?? '') : '',
      soldOutAt: inv ? inv.soldOutAt : null,
      quantity: lv?.quantity ?? null,
      quantityAlert: lv?.quantityAlert ?? null,
    };
  });

  const filteredItems = categoryFilter === 'all'
    ? items
    : items.filter((i) => (i.category ?? '').toLowerCase() === categoryFilter.toLowerCase());

  const totalCount = items.length;
  const availableCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = items.filter((i) => !i.isAvailable).length;
  const lowStockCount = items.filter((i) => i.quantity != null && i.quantityAlert != null && i.quantity <= i.quantityAlert).length;

  const categories = ['all', ...Array.from(new Set((menuItems ?? []).map((i) => (i.category ?? '').toLowerCase()).filter(Boolean)))];

  const categoryColors: Record<string, string> = {
    coffee: '#5E8B8B',
    pastries: '#d97706',
    bread: '#92400e',
  };

  async function handleToggle(menuItemId: number, currentAvailable: boolean) {
    const note = noteValues[menuItemId] ?? invMap[menuItemId]?.staffNote ?? '';
    setTogglingIds((prev) => new Set(prev).add(menuItemId));
    try {
      await toggleItem.mutateAsync({
        token,
        venueId,
        menuItemId,
        isAvailable: !currentAvailable,
        staffNote: note || undefined,
      });
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(menuItemId); return s; });
    }
  }

  async function handleSaveNote(menuItemId: number, isAvailable: boolean) {
    const note = noteValues[menuItemId] ?? '';
    await toggleItem.mutateAsync({
      token,
      venueId,
      menuItemId,
      isAvailable,
      staffNote: note || undefined,
    });
    utils.venue.getInventory.invalidate();
    setEditingNoteId(null);
  }

  function handleSaveQty(menuItemId: number) {
    const qtyStr = qtyValues[menuItemId];
    const alertStr = alertValues[menuItemId];
    const qty = qtyStr !== undefined && qtyStr !== '' ? Number(qtyStr) : undefined;
    const alert = alertStr !== undefined && alertStr !== '' ? Number(alertStr) : undefined;
    if (qty === undefined) return;
    setSavingQtyIds(prev => new Set(prev).add(menuItemId));
    setInventoryQty.mutate({ menuItemId, quantity: qty, quantityAlert: alert });
  }

  function getStockStatus(item: { quantity: number | null; quantityAlert: number | null; isAvailable: boolean }) {
    if (!item.isAvailable) return { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2' };
    if (item.quantity == null) return { label: 'In Stock', color: '#16a34a', bg: '#f0fdf4' };
    if (item.quantityAlert != null && item.quantity <= item.quantityAlert) return { label: 'Low Stock', color: '#d97706', bg: '#fffbeb' };
    return { label: 'In Stock', color: '#16a34a', bg: '#f0fdf4' };
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Inventory</h2>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Package size={20} />} label="Total Items" value={String(totalCount)} color="#1c1917" />
        <StatCard icon={<CheckCircle size={20} />} label="Available" value={String(availableCount)} color="#16a34a" />
        <StatCard icon={<XCircle size={20} />} label="Sold Out" value={String(soldOutCount)} color="#dc2626" />
        <StatCard icon={<AlertTriangle size={20} />} label="Low Stock" value={String(lowStockCount)} color="#d97706" />
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: categoryFilter === cat ? '#1c1917' : '#e7e5e4',
              color: categoryFilter === cat ? '#fafaf9' : '#57534e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert At</th>
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Note</th>}
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 8 : 6} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  {menuItems === undefined ? 'Loading...' : 'No items found'}
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const isToggling = togglingIds.has(item.id);
              const isSavingQty = savingQtyIds.has(item.id);
              const isQtySaved = qtySavedIds.has(item.id);
              const catColor = categoryColors[(item.category ?? '').toLowerCase()] ?? '#78716c';
              const noteVal = noteValues[item.id] !== undefined ? noteValues[item.id] : (item.staffNote ?? '');
              const qtyDisplay = qtyValues[item.id] !== undefined ? qtyValues[item.id] : (item.quantity != null ? String(item.quantity) : '');
              const alertDisplay = alertValues[item.id] !== undefined ? alertValues[item.id] : (item.quantityAlert != null ? String(item.quantityAlert) : '');
              const stockStatus = getStockStatus(item);
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #f5f5f4',
                    background: item.isAvailable ? '#fff' : '#fef2f2',
                    opacity: isToggling ? 0.6 : 1,
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                >
                  {/* Name */}
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>
                    {item.name}
                    {!item.isAvailable && item.soldOutAt && (
                      <div style={{ fontSize: '11px', color: '#a8a29e', marginTop: '2px' }}>
                        Sold out {new Date(item.soldOutAt).toLocaleString()}
                      </div>
                    )}
                  </td>

                  {/* Category badge */}
                  <td style={{ padding: '14px 16px' }}>
                    {item.category ? (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: catColor + '1a',
                        color: catColor,
                      }}>
                        {item.category}
                      </span>
                    ) : (
                      <span style={{ color: '#d6d3d1', fontSize: '12px' }}>—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 16px', color: '#44403c' }}>
                    ${Number(item.price).toFixed(2)}
                  </td>

                  {/* Stock Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: stockStatus.bg,
                      color: stockStatus.color,
                    }}>
                      {stockStatus.label}
                    </span>
                  </td>

                  {/* Qty input */}
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      min="0"
                      value={qtyDisplay}
                      onChange={e => setQtyValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="—"
                      style={{
                        width: '64px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e7e5e4',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  {/* Alert at input */}
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      min="0"
                      value={alertDisplay}
                      onChange={e => setAlertValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="—"
                      style={{
                        width: '64px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e7e5e4',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  {/* Staff Note */}
                  {isManager && (
                    <td style={{ padding: '10px 16px', minWidth: '180px' }}>
                      {editingNoteId === item.id ? (
                        <input
                          autoFocus
                          value={noteVal}
                          onChange={(e) => setNoteValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={() => handleSaveNote(item.id, item.isAvailable)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(item.id, item.isAvailable);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                          placeholder="Add staff note…"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e7e5e4',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            width: '100%',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingNoteId(item.id);
                            if (noteValues[item.id] === undefined) {
                              setNoteValues((prev) => ({ ...prev, [item.id]: item.staffNote ?? '' }));
                            }
                          }}
                          style={{
                            color: noteVal ? '#44403c' : '#d6d3d1',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'block',
                            minWidth: '80px',
                          }}
                          title="Click to edit note"
                        >
                          {noteVal || 'Add note…'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Actions: Save qty + Toggle */}
                  {isManager && (
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          disabled={isSavingQty || (qtyValues[item.id] === undefined && alertValues[item.id] === undefined)}
                          onClick={() => handleSaveQty(item.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isQtySaved ? '#f0fdf4' : '#1c1917',
                            color: isQtySaved ? '#16a34a' : '#fafaf9',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: (isSavingQty || (qtyValues[item.id] === undefined && alertValues[item.id] === undefined)) ? 'not-allowed' : 'pointer',
                            opacity: (qtyValues[item.id] === undefined && alertValues[item.id] === undefined) ? 0.4 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSavingQty ? '…' : isQtySaved ? 'Saved' : 'Save'}
                        </button>
                        <button
                          disabled={isToggling}
                          onClick={() => handleToggle(item.id, item.isAvailable)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: item.isAvailable ? '#fef2f2' : '#f0fdf4',
                            color: item.isAvailable ? '#dc2626' : '#16a34a',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isToggling ? 'not-allowed' : 'pointer',
                            opacity: isToggling ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isToggling ? '…' : item.isAvailable ? 'Sold Out' : 'Available'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoyaltyTab({ venueId, token }: { venueId: number; token: string }) {
  const [search, setSearch] = useState('');
  const [adjustPhone, setAdjustPhone] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMsg, setAdjustMsg] = useState('');

  const accountsQuery = trpc.loyalty.listAccounts.useQuery(
    { token },
    { enabled: !!token }
  );
  const adjustMut = trpc.loyalty.adjustPoints.useMutation();
  const utils = trpc.useUtils();

  const accounts = accountsQuery.data ?? [];
  const filtered = accounts.filter((a: any) =>
    !search || a.phone.includes(search) || (a.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = accounts.length;
  const totalPoints = accounts.reduce((s: number, a: any) => s + (a.pointsBalance ?? 0), 0);
  const totalLifetime = accounts.reduce((s: number, a: any) => s + (a.totalLifetimePoints ?? 0), 0);

  async function handleAdjust() {
    setAdjustMsg('');
    try {
      const pts = Number(adjustPoints);
      if (!adjustPhone || !pts || !adjustReason) { setAdjustMsg('Fill all fields'); return; }
      const result = await adjustMut.mutateAsync({ token, phone: adjustPhone, points: pts, reason: adjustReason });
      setAdjustMsg(`✅ Done — new balance: ${result.newBalance} pts`);
      setAdjustPhone(''); setAdjustPoints(''); setAdjustReason('');
      utils.loyalty.listAccounts.invalidate();
    } catch (e: any) {
      setAdjustMsg(`❌ ${e.message}`);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Loyalty Program</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Members" value={String(totalMembers)} color="#1c1917" />
        <StatCard icon={<Star size={20} />} label="Points Active" value={totalPoints >= 1000 ? `${(totalPoints/1000).toFixed(1)}k` : String(totalPoints)} color="#d97706" />
        <StatCard icon={<TrendingUp size={20} />} label="Lifetime Points" value={totalLifetime >= 1000 ? `${(totalLifetime/1000).toFixed(1)}k` : String(totalLifetime)} color="#16a34a" />
      </div>

      {/* Manual adjustment */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Manual Points Adjustment</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Phone</label>
            <input value={adjustPhone} onChange={e => setAdjustPhone(e.target.value)}
              placeholder="+61 ..."
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Points (+/−)</label>
            <input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)}
              placeholder="e.g. 50 or -10"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Reason</label>
            <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              placeholder="Staff goodwill, error correction…"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAdjust} disabled={adjustMut.isPending}
            style={{ background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}>
            {adjustMut.isPending ? '…' : 'Apply'}
          </button>
        </div>
        {adjustMsg && <p style={{ margin: '10px 0 0', fontSize: '13px', color: adjustMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{adjustMsg}</p>}
      </div>

      {/* Accounts table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Members ({filtered.length})</h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone or name…"
            style={{ border: '1px solid #e7e5e4', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', width: '220px' }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e7e5e4', color: '#78716c' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Name</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Balance</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#78716c', padding: '20px' }}>No members yet</td></tr>
            )}
            {filtered.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '8px 4px' }}>{a.phone}</td>
                <td style={{ padding: '8px 4px', color: '#78716c' }}>{a.name ?? '—'}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>{a.pointsBalance} pts</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#78716c' }}>{a.totalLifetimePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GiftCardsTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Gift Cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Gift size={20} />} label="Active Cards" value="34" color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Total Value" value="$1,240" color="#2563eb" />
        <StatCard icon={<CheckCircle size={20} />} label="Redeemed" value="18" color="#16a34a" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Gift card management — create, track balance, mark redeemed.</p>
      </div>
    </div>
  );
}

function SubscriptionsTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Subscription Passes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Subscribers" value="28" color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Monthly Revenue" value="$840" color="#16a34a" />
        <StatCard icon={<Coffee size={20} />} label="Credits Used" value="142" color="#d97706" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Subscription management — view passes, track credits, handle renewals.</p>
      </div>
    </div>
  );
}

function PushNotificationsTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Push Notifications</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Bell size={20} />} label="Subscribers" value="89" color="#1c1917" />
        <StatCard icon={<TrendingUp size={20} />} label="Sent Today" value="3" color="#2563eb" />
        <StatCard icon={<CheckCircle size={20} />} label="Delivery Rate" value="94%" color="#16a34a" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Push notification management — compose and send to subscribers.</p>
      </div>
    </div>
  );
}

function CateringTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Catering Requests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Truck size={20} />} label="New Requests" value="3" color="#d97706" />
        <StatCard icon={<CheckCircle size={20} />} label="Confirmed" value="8" color="#16a34a" />
        <StatCard icon={<Star size={20} />} label="Completed" value="24" color="#1c1917" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Catering management — view requests, send quotes, confirm bookings.</p>
      </div>
    </div>
  );
}

function CorporateTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Corporate Accounts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Briefcase size={20} />} label="Companies" value="6" color="#1c1917" />
        <StatCard icon={<ShoppingBag size={20} />} label="Monthly Orders" value="48" color="#2563eb" />
        <StatCard icon={<CreditCard size={20} />} label="Outstanding" value="$2,400" color='#d97706' />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Corporate account management — view accounts, track orders, manage billing.</p>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#1c1917', '#5E8B8B', '#d97706', '#16a34a', '#2563eb', '#dc2626'];

function AnalyticsTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [days, setDays] = useState(30);

  const overviewQuery = trpc.analytics.getOverview.useQuery({ token, days }, { enabled: !!token });
  const revenueQuery = trpc.analytics.getDailyRevenue.useQuery({ token, days }, { enabled: !!token });
  const topItemsQuery = trpc.analytics.getTopItems.useQuery({ token, days, limit: 8 }, { enabled: !!token });
  const hourlyQuery = trpc.analytics.getHourlyDistribution.useQuery({ token, days }, { enabled: !!token });
  const categoryQuery = trpc.analytics.getRevenueByCategory.useQuery({ token, days }, { enabled: !!token });
  const npsQuery = trpc.nps.getStats.useQuery();
  const wasteSummaryQuery = trpc.waste.getSummary.useQuery();
  const invLevelsQuery = trpc.venue.getInventoryLevels.useQuery();

  const overview = overviewQuery.data;
  const revenueData = revenueQuery.data ?? [];
  const topItems = topItemsQuery.data ?? [];
  const hourlyData = hourlyQuery.data ?? [];
  const categoryData = categoryQuery.data ?? [];
  const nps = npsQuery.data;
  const wasteSummary = wasteSummaryQuery.data ?? [];
  const invLevels = invLevelsQuery.data ?? [];

  const topItem = topItems[0]?.name ?? '—';

  const npsColor = nps == null ? '#78716c'
    : nps.score >= 50 ? '#16a34a'
    : nps.score >= 0 ? '#d97706'
    : '#dc2626';

  // Low stock items: quantity not null and quantity <= quantityAlert
  const lowStockItems = invLevels.filter((i: any) => i.quantity != null && i.quantityAlert != null && i.quantity <= i.quantityAlert);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Analytics</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                background: days === d ? '#1c1917' : '#fff',
                color: days === d ? '#fff' : '#78716c',
                border: '1px solid #e7e5e4', borderRadius: '6px',
                padding: '5px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<TrendingUp size={20} />} label={`Revenue (${days}d)`} value={overview ? `$${Number(overview.totalRevenue).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '…'} color="#16a34a" />
        <StatCard icon={<ShoppingBag size={20} />} label="Orders" value={overview ? String(overview.orderCount) : '…'} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Avg Order" value={overview ? `$${overview.avgOrder}` : '…'} color="#2563eb" />
        <StatCard icon={<Star size={20} />} label="Top Item" value={topItem} color="#d97706" />
      </div>

      {/* NPS Score Card */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="#5E8B8B" /> NPS Score
        </h3>
        {npsQuery.isLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : !nps ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No NPS data available</p>
        ) : (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '56px', fontWeight: 800, color: npsColor, lineHeight: 1 }}>{nps.score}</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px' }}>NPS Score</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                <span style={{ color: '#57534e' }}>Responses: <strong>{nps.totalResponses}</strong></span>
                <span style={{ color: '#57534e' }}>Avg score: <strong>{nps.avgScore ? Number(nps.avgScore).toFixed(1) : '—'}/10</strong></span>
              </div>
              {nps.recentComments && nps.recentComments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Comments</div>
                  {nps.recentComments.slice(0, 5).map((comment: string, i: number) => (
                    <div key={i} style={{
                      background: '#f5f5f4',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#57534e',
                      fontStyle: 'italic',
                    }}>
                      "{comment}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revenue trend chart */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Revenue Trend</h3>
        {revenueData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5E8B8B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5E8B8B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={d => {
                  const parts = d.split('-');
                  return `${parts[2]}/${parts[1]}`;
                }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#5E8B8B" strokeWidth={2}
                fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Top items */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Top Items by Quantity</h3>
          {topItems.length === 0 ? (
            <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#1c1917" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by category */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Revenue by Category</h3>
          {categoryData.length === 0 ? (
            <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} dataKey="revenue" nameKey="category"
                  cx="50%" cy="50%" outerRadius={80} label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {categoryData.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hourly heat map */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Busiest Hours</h3>
        {hourlyData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#5E8B8B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Supplier Suggestions */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={16} color="#5E8B8B" /> Supplier Suggestions
        </h3>

        {/* Top wasted items */}
        {wasteSummary.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              High Waste Items
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {wasteSummary.slice(0, 5).map((item: any, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#fffbeb',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                }}>
                  <Trash2 size={14} color="#d97706" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1c1917' }}>{item.itemName}</span>
                    <span style={{ color: '#d97706', fontSize: '12px', marginLeft: '8px' }}>{item.totalQuantity} units wasted</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic' }}>
                    Consider reducing order of {item.itemName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low stock items */}
        {lowStockItems.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Low Stock — Reorder Needed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lowStockItems.map((item: any, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                }}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <span style={{ fontSize: '13px', color: '#1c1917' }}>
                    <strong>{item.itemName ?? item.name}</strong>
                    {' '}— {item.quantity} remaining, reorder needed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wasteSummary.length === 0 && lowStockItems.length === 0 && (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No supplier suggestions at this time.</p>
        )}
      </div>
    </div>
  );
}

function StaffManagementTab({ venueId: _venueId, isAdmin }: { venueId: number; isAdmin: boolean }) {
  const { staff } = useStaffAuth();
  const [showForm, setShowForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'staff' as const });
  const [error, setError] = useState('');
  const utils = trpc.useUtils();

  const staffToken = staff ? localStorage.getItem('b1-staff-token') || '' : '';
  const { data: staffList } = trpc.staffAuth.list.useQuery(
    { token: staffToken },
    { enabled: !!staff && !!staffToken }
  );

  const createStaff = trpc.staffAuth.create.useMutation({
    onSuccess: () => {
      utils.staffAuth.list.invalidate();
      setShowForm(false);
      setNewStaff({ name: '', username: '', password: '', role: 'staff' });
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const updateStaff = trpc.staffAuth.update.useMutation({
    onSuccess: () => utils.staffAuth.list.invalidate(),
  });

  const resetPassword = trpc.staffAuth.resetPassword.useMutation({
    onSuccess: () => alert('Password reset successfully'),
    onError: (err) => alert(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newStaff.name || !newStaff.username || !newStaff.password) {
      setError('All fields are required');
      return;
    }
    createStaff.mutate({
      token: staffToken,
      name: newStaff.name,
      username: newStaff.username,
      password: newStaff.password,
      role: newStaff.role,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Staff Management</h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              background: showForm ? '#57534e' : '#1c1917',
              color: '#fafaf9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={16} /> {showForm ? 'Cancel' : 'Add Staff'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4',
          padding: '24px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create Staff Account</h3>
          {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              placeholder="Full Name"
              value={newStaff.name}
              onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <input
              placeholder="Username"
              value={newStaff.username}
              onChange={e => setNewStaff({ ...newStaff, username: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={newStaff.password}
              onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <select
              value={newStaff.role}
              onChange={e => setNewStaff({ ...newStaff, role: e.target.value as any })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none', background: '#fafaf9' }}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={createStaff.isPending}
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                background: '#1c1917',
                color: '#fafaf9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: createStaff.isPending ? 'not-allowed' : 'pointer',
                opacity: createStaff.isPending ? 0.7 : 1,
              }}
            >
              {createStaff.isPending ? 'Creating...' : 'Create Staff Account'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Login</th>
              {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {staffList?.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{s.name}</td>
                <td style={{ padding: '14px 16px', color: '#78716c' }}>{s.username}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: s.role === 'admin' ? '#fef2f2' : s.role === 'manager' ? '#fff7ed' : '#f5f5f4',
                    color: s.role === 'admin' ? '#dc2626' : s.role === 'manager' ? '#ea580c' : '#57534e',
                  }}>
                    {s.role}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: s.isActive ? '#22c55e' : '#d6d3d1',
                    }} />
                    <span style={{ fontSize: '12px', color: s.isActive ? '#16a34a' : '#a8a29e' }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: '#78716c', fontSize: '12px' }}>
                  {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                {isAdmin && (
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select
                        value={s.role}
                        onChange={(e) => updateStaff.mutate({ token: staffToken, staffId: s.id, role: e.target.value as any })}
                        style={{
                          padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4',
                          fontSize: '11px', background: '#fafaf9', cursor: 'pointer',
                        }}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        title="Reset Password"
                        onClick={() => {
                          const newPw = prompt('Enter new password:');
                          if (newPw) resetPassword.mutate({ token: staffToken, staffId: s.id, newPassword: newPw });
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#a8a29e', padding: '4px', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        title={s.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => updateStaff.mutate({ token: staffToken, staffId: s.id, isActive: !s.isActive })}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: s.isActive ? '#dc2626' : '#16a34a', padding: '4px',
                          display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        {s.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )) ?? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  No staff members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Venue Settings</h2>
      <div style={{ display: 'grid', gap: '16px' }}>
        {[
          { label: 'Business Hours', desc: 'Set opening and closing times for each day' },
          { label: 'Menu Management', desc: 'Add, edit, or remove menu items' },
          { label: 'Payment Methods', desc: 'Configure accepted payment options' },
          { label: 'Notification Preferences', desc: 'Set up order alerts and customer notifications' },
          { label: 'POS Integration', desc: 'Connect and sync with Square POS' },
        ].map((setting) => (
          <div key={setting.label} style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e7e5e4',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1c1917' }}>{setting.label}</div>
              <div style={{ fontSize: '13px', color: '#78716c', marginTop: '2px' }}>{setting.desc}</div>
            </div>
            <ChevronRight size={18} color="#d6d3d1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Schedule Helpers ───
function getWeekStart(offset: number): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  // Add timezone offset to avoid UTC-vs-local shift
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[local.getDay()]} ${local.getDate()}`;
}

function formatWeekRange(weekStart: string): string {
  const days = getWeekDays(weekStart);
  const first = new Date(days[0]);
  const last = new Date(days[6]);
  const addOffset = (d: Date) => new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  const f = addOffset(first);
  const l = addOffset(last);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[f.getDay()]} ${f.getDate()} ${months[f.getMonth()]} – ${dayNames[l.getDay()]} ${l.getDate()} ${months[l.getMonth()]}`;
}

// ─── Schedule Tab ───
function ScheduleTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newShift, setNewShift] = useState({ staffId: '', startTime: '', endTime: '', role: '' });
  const [addMsg, setAddMsg] = useState('');

  const utils = trpc.useUtils();
  const weekStart = getWeekStart(weekOffset);
  const weekDays = getWeekDays(weekStart);

  const staffQuery = trpc.scheduling.listStaff.useQuery({ token }, { enabled: !!token });
  const shiftsQuery = trpc.scheduling.listShifts.useQuery({ token, weekStart }, { enabled: !!token });

  const addShift = trpc.scheduling.addShift.useMutation({
    onSuccess: () => {
      utils.scheduling.listShifts.invalidate();
      setAddingDay(null);
      setNewShift({ staffId: '', startTime: '', endTime: '', role: '' });
      setAddMsg('');
    },
    onError: (e) => setAddMsg(e.message),
  });

  const deleteShift = trpc.scheduling.deleteShift.useMutation({
    onSuccess: () => utils.scheduling.listShifts.invalidate(),
  });

  const staffList = staffQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e7e5e4',
    fontSize: '12px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Header with week navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Schedule</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e5e4',
              background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >
            ← Prev Week
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', minWidth: '220px', textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e5e4',
              background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Next Week →
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: '#e7e5e4', color: '#57534e', fontSize: '12px', cursor: 'pointer',
              }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 7-column day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {weekDays.map((day) => {
          const dayShifts = shifts.filter((s: any) => s.date === day);
          const isAdding = addingDay === day;
          const todayStr = new Date().toISOString().split('T')[0];
          const isToday = day === todayStr;

          return (
            <div
              key={day}
              style={{
                background: '#fff',
                borderRadius: '10px',
                border: isToday ? '2px solid #1c1917' : '1px solid #e7e5e4',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Day header */}
              <div style={{
                padding: '10px 12px',
                background: isToday ? '#1c1917' : '#fafaf9',
                borderBottom: '1px solid #e7e5e4',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isToday ? '#fafaf9' : '#1c1917',
                }}>
                  {formatDayLabel(day)}
                </div>
                <div style={{ fontSize: '10px', color: isToday ? '#a8a29e' : '#78716c' }}>
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Shifts list */}
              <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dayShifts.map((shift: any) => (
                  <div
                    key={shift.id}
                    style={{
                      background: '#f5f5f4',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#1c1917', marginBottom: '2px', paddingRight: '16px' }}>
                      {shift.staffName}
                    </div>
                    <div style={{ color: '#57534e' }}>
                      {shift.startTime}–{shift.endTime}
                    </div>
                    {shift.role && (
                      <div style={{
                        marginTop: '4px',
                        display: 'inline-block',
                        padding: '2px 6px',
                        background: '#e7e5e4',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#78716c',
                        textTransform: 'capitalize',
                      }}>
                        {shift.role}
                      </div>
                    )}
                    <button
                      onClick={() => deleteShift.mutate({ token, shiftId: shift.id })}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#a8a29e',
                        fontSize: '14px',
                        lineHeight: 1,
                        padding: '0 2px',
                      }}
                      title="Delete shift"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Add shift inline form */}
                {isAdding ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <select
                      value={newShift.staffId}
                      onChange={e => setNewShift(s => ({ ...s, staffId: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">Select staff…</option>
                      {staffList.map((st: any) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={newShift.startTime}
                      onChange={e => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                      style={inputStyle}
                      placeholder="Start time"
                    />
                    <input
                      type="time"
                      value={newShift.endTime}
                      onChange={e => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                      style={inputStyle}
                      placeholder="End time"
                    />
                    <input
                      type="text"
                      value={newShift.role}
                      onChange={e => setNewShift(s => ({ ...s, role: e.target.value }))}
                      style={inputStyle}
                      placeholder="Role (e.g. Barista)"
                    />
                    {addMsg && <div style={{ color: '#dc2626', fontSize: '11px' }}>{addMsg}</div>}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          if (!newShift.staffId || !newShift.startTime || !newShift.endTime) {
                            setAddMsg('Staff, start and end time are required');
                            return;
                          }
                          addShift.mutate({
                            token,
                            date: day,
                            staffId: Number(newShift.staffId),
                            startTime: newShift.startTime,
                            endTime: newShift.endTime,
                            role: newShift.role || undefined,
                          });
                        }}
                        disabled={addShift.isPending}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                          background: '#1c1917', color: '#fafaf9', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {addShift.isPending ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setAddingDay(null); setNewShift({ staffId: '', startTime: '', endTime: '', role: '' }); setAddMsg(''); }}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e7e5e4',
                          background: '#fafaf9', color: '#57534e', fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingDay(day); setAddMsg(''); }}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px dashed #d6d3d1',
                      background: 'transparent',
                      color: '#a8a29e',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add shift
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Waste Log Tab ───
function WasteLogTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: menuItems } = trpc.venue.listMenuItems.useQuery({ venueId });
  const { data: wasteEntries, isLoading: wasteLoading } = trpc.waste.list.useQuery();

  const [itemName, setItemName] = useState('');
  const [menuItemId, setMenuItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<string>('Spoiled');
  const [costEstimate, setCostEstimate] = useState<string>('');
  const [formMsg, setFormMsg] = useState('');

  const logWaste = trpc.waste.log.useMutation({
    onSuccess: () => {
      utils.waste.list.invalidate();
      utils.waste.getSummary.invalidate();
      setItemName('');
      setMenuItemId('');
      setQuantity(1);
      setReason('Spoiled');
      setCostEstimate('');
      setFormMsg('Waste logged successfully');
      setTimeout(() => setFormMsg(''), 3000);
    },
    onError: (e) => setFormMsg(e.message),
  });

  const deleteWaste = trpc.waste.delete.useMutation({
    onSuccess: () => {
      utils.waste.list.invalidate();
      utils.waste.getSummary.invalidate();
    },
  });

  const todayStr = new Date().toDateString();
  const todayEntries = (wasteEntries ?? []).filter((e: any) => new Date(e.createdAt).toDateString() === todayStr);
  const todayCount = todayEntries.reduce((s: number, e: any) => s + (e.quantity ?? 0), 0);
  const todayCost = todayEntries.reduce((s: number, e: any) => s + (Number(e.costEstimate) || 0), 0);

  function handleLog() {
    setFormMsg('');
    const name = itemName.trim();
    if (!name && !menuItemId) { setFormMsg('Enter an item name or select from menu'); return; }
    logWaste.mutate({
      menuItemId: menuItemId !== '' ? Number(menuItemId) : undefined,
      itemName: name || (menuItems ?? []).find((m: any) => m.id === menuItemId)?.name || '',
      quantity,
      reason,
      costEstimate: costEstimate !== '' ? Number(costEstimate) : undefined,
    });
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Waste Log</h2>

      {/* Today summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<Trash2 size={20} />} label="Today's Waste Items" value={String(todayCount)} color="#d97706" />
        <StatCard icon={<CreditCard size={20} />} label="Today's Est. Cost" value={`$${todayCost.toFixed(2)}`} color="#dc2626" />
      </div>

      {/* Log Waste Form */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Log Waste</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Item Name</label>
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Croissant"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Menu Item (optional)</label>
            <select
              value={menuItemId}
              onChange={e => {
                const val = e.target.value;
                setMenuItemId(val === '' ? '' : Number(val));
                if (val !== '') {
                  const found = (menuItems ?? []).find((m: any) => m.id === Number(val));
                  if (found) setItemName(found.name);
                }
              }}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}
            >
              <option value="">Select from menu…</option>
              {(menuItems ?? []).map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Reason</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}
            >
              {['Spoiled', 'Dropped', 'Overproduced', 'Expired', 'Other'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Est. cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costEstimate}
              onChange={e => setCostEstimate(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleLog}
              disabled={logWaste.isPending}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#1c1917',
                color: '#fafaf9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: logWaste.isPending ? 'not-allowed' : 'pointer',
                opacity: logWaste.isPending ? 0.7 : 1,
              }}
            >
              {logWaste.isPending ? 'Logging…' : 'Log Waste'}
            </button>
          </div>
        </div>
        {formMsg && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: formMsg.includes('success') ? '#16a34a' : '#dc2626' }}>
            {formMsg}
          </p>
        )}
      </div>

      {/* Recent Waste Entries */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Recent Entries</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Cost</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date/Time</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}></th>
            </tr>
          </thead>
          <tbody>
            {wasteLoading ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (wasteEntries ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No waste entries yet</td></tr>
            ) : (wasteEntries ?? []).slice(0, 20).map((entry: any) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{entry.itemName}</td>
                <td style={{ padding: '12px 16px', color: '#44403c' }}>{entry.quantity}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#fef3c7',
                    color: '#d97706',
                  }}>
                    {entry.reason}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#44403c' }}>
                  {entry.costEstimate != null ? `$${Number(entry.costEstimate).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => deleteWaste.mutate({ id: entry.id })}
                    disabled={deleteWaste.isPending}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#a8a29e',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Waitlist Tab ───
function WaitlistTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [formMsg, setFormMsg] = useState('');

  const { data: queue, isLoading: queueLoading } = trpc.waitlist.getQueue.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  );

  const joinMut = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      utils.waitlist.getQueue.invalidate();
      setName('');
      setPhone('');
      setPartySize(2);
      setFormMsg('Added to queue');
      setTimeout(() => setFormMsg(''), 3000);
    },
    onError: (e) => setFormMsg(e.message),
  });

  const notifyMut = trpc.waitlist.notify.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const seatMut = trpc.waitlist.seat.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const cancelMut = trpc.waitlist.cancel.useMutation({
    onSuccess: () => utils.waitlist.getQueue.invalidate(),
  });

  const waitingCount = (queue ?? []).filter((e: any) => e.status === 'waiting').length;

  function handleAdd() {
    setFormMsg('');
    if (!name.trim() || !phone.trim()) { setFormMsg('Name and phone are required'); return; }
    joinMut.mutate({ venueId, name: name.trim(), phone: phone.trim(), partySize });
  }

  function formatWaitTime(joinedAt: string) {
    const diff = Date.now() - new Date(joinedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Waitlist</h2>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          background: waitingCount > 0 ? '#fef3c7' : '#f5f5f4',
          color: waitingCount > 0 ? '#d97706' : '#78716c',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          <ListOrdered size={14} />
          Queue length: {waitingCount} waiting
        </div>
      </div>

      {/* Add to Waitlist Form */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Add to Queue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Customer name"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+61 …"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Party Size</label>
            <input
              type="number"
              min="1"
              value={partySize}
              onChange={e => setPartySize(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={joinMut.isPending}
            style={{
              padding: '8px 20px',
              background: '#1c1917',
              color: '#fafaf9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: joinMut.isPending ? 'not-allowed' : 'pointer',
              opacity: joinMut.isPending ? 0.7 : 1,
              height: '36px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} /> {joinMut.isPending ? 'Adding…' : 'Add to Queue'}
          </button>
        </div>
        {formMsg && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: formMsg.includes('required') || formMsg.includes('Error') ? '#dc2626' : '#16a34a' }}>
            {formMsg}
          </p>
        )}
      </div>

      {/* Current Queue */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Current Queue</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Party</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wait</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueLoading ? (
              <tr><td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (queue ?? []).length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No one in the queue</td></tr>
            ) : (queue ?? []).map((entry: any, idx: number) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                waiting: { bg: '#fef3c7', text: '#d97706' },
                notified: { bg: '#dbeafe', text: '#2563eb' },
                seated: { bg: '#d1fae5', text: '#059669' },
                cancelled: { bg: '#fee2e2', text: '#dc2626' },
              };
              const sc = statusColors[entry.status] ?? statusColors.waiting;
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1c1917' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{entry.name}</td>
                  <td style={{ padding: '12px 16px', color: '#44403c' }}>{entry.partySize}</td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>{entry.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: sc.bg,
                      color: sc.text,
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                    {formatWaitTime(entry.joinedAt ?? entry.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {entry.status === 'waiting' && (
                        <button
                          onClick={() => notifyMut.mutate({ id: entry.id })}
                          disabled={notifyMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#dbeafe',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Notify
                        </button>
                      )}
                      {entry.status === 'notified' && (
                        <button
                          onClick={() => seatMut.mutate({ id: entry.id })}
                          disabled={seatMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#d1fae5',
                            color: '#059669',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Seat
                        </button>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'notified') && (
                        <button
                          onClick={() => cancelMut.mutate({ id: entry.id })}
                          disabled={cancelMut.isPending}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helpers ───
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e7e5e4',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: '12px', color: '#78716c', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#1c1917' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#d97706' },
    confirmed: { bg: '#dbeafe', text: '#2563eb' },
    ready: { bg: '#d1fae5', text: '#059669' },
    completed: { bg: '#f3f4f6', text: '#6b7280' },
    cancelled: { bg: '#fee2e2', text: '#dc2626' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      background: c.bg,
      color: c.text,
    }}>
      {status}
    </span>
  );
}