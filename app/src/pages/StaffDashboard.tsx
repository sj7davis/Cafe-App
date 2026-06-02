import React, { useState, useEffect, useRef } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { trpc } from '@/providers/trpc';
import { useVenueSSE } from '@/hooks/useVenueSSE';
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
  CalendarDays,
  CalendarOff,
  Trash2,
  ListOrdered,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Loader2,
  UserCircle,
  Shield,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';

// ─── Role-based tab definitions ───
type RoleName = 'staff' | 'manager' | 'admin';
const ROLE_RANK: Record<RoleName, number> = { staff: 0, manager: 1, admin: 2 };

type TabDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  minRole: RoleName;
  badge?: number;
};

function buildTabs(pendingOrders: number, pendingTimeOff: number): TabDef[] {
  return [
    { id: 'orders',        label: 'Orders',             icon: <ShoppingBag size={18} />,  minRole: 'staff' },
    { id: 'kitchen',       label: 'Kitchen/KDS',        icon: <Utensils size={18} />,     minRole: 'staff' },
    { id: 'clock',         label: 'Clock In/Out',        icon: <Clock size={18} />,        minRole: 'staff' },
    { id: 'myschedule',    label: 'My Schedule',         icon: <CalendarDays size={18} />, minRole: 'staff' },
    { id: 'training',      label: 'Training',            icon: <GraduationCap size={18} />,minRole: 'staff' },
    { id: 'profile',       label: 'Profile',             icon: <UserCircle size={18} />,   minRole: 'staff' },
    { id: 'reservations',  label: 'Reservations',        icon: <BookOpen size={18} />,     minRole: 'manager' },
    { id: 'waitlist',      label: 'Waitlist',            icon: <ListOrdered size={18} />,  minRole: 'manager' },
    { id: 'delivery',      label: 'Delivery',            icon: <Truck size={18} />,        minRole: 'manager' },
    { id: 'timeoff',       label: 'Time Off Requests',   icon: <CalendarOff size={18} />,  minRole: 'manager', badge: pendingTimeOff },
    { id: 'schedule',      label: 'Schedule',            icon: <Calendar size={18} />,     minRole: 'manager' },
    { id: 'giftcards',     label: 'Gift Cards',          icon: <Gift size={18} />,         minRole: 'admin' },
    { id: 'subscriptions', label: 'Subscriptions',       icon: <CreditCard size={18} />,   minRole: 'admin' },
    { id: 'push',          label: 'Push Notifications',  icon: <Bell size={18} />,         minRole: 'admin' },
    { id: 'catering',      label: 'Catering',            icon: <Utensils size={18} />,     minRole: 'admin' },
    { id: 'corporate',     label: 'Corporate',           icon: <Briefcase size={18} />,    minRole: 'admin' },
    { id: 'settings',      label: 'Settings',            icon: <Settings size={18} />,     minRole: 'admin' },
    // Management-only (not in visible tab list but reachable)
    { id: 'availability',  label: '86 List',             icon: <Package size={18} />,      minRole: 'staff' },
    { id: 'inventory',     label: 'Inventory',           icon: <Package size={18} />,      minRole: 'manager' },
    { id: 'loyalty',       label: 'Loyalty',             icon: <Star size={18} />,         minRole: 'manager' },
    { id: 'analytics',     label: 'Analytics',           icon: <BarChart3 size={18} />,    minRole: 'manager' },
    { id: 'waste',         label: 'Waste Log',           icon: <Trash2 size={18} />,       minRole: 'manager' },
    { id: 'staff',         label: 'Staff',               icon: <Users size={18} />,        minRole: 'manager' },
  ];
}

export default function StaffDashboard() {
  const { staff, venue, token, venueId: _venueId, isAdmin, isManager, logout, loading } = useStaffAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const clockStatus = trpc.clock.getMyStatus.useQuery({ token }, { refetchInterval: 60000 });
  const clockIn = trpc.clock.clockIn.useMutation({ onSuccess: () => clockStatus.refetch() });
  const clockOut = trpc.clock.clockOut.useMutation({ onSuccess: () => clockStatus.refetch() });
  const isClockedIn = clockStatus.data?.isClockedIn ?? false;

  const { data: pendingOrdersData } = trpc.venue.listOrders.useQuery(
    { venueId: venue?.id ?? 0, status: 'pending', limit: 99 },
    { enabled: !!venue, refetchInterval: 15_000 }
  );
  const pendingCount = pendingOrdersData?.length ?? 0;

  const { data: timeOffData } = trpc.shiftManagement.listTimeOffRequests.useQuery(
    { token },
    { enabled: !!(token && (isAdmin || isManager)), refetchInterval: 60_000 }
  );
  const pendingTimeOff = (timeOffData ?? []).filter((r: any) => r.status === 'pending').length;

  // Build visible tabs based on role
  const allTabs = buildTabs(pendingCount, pendingTimeOff);
  const userRole: RoleName = (staff?.role as RoleName) ?? 'staff';
  const visibleTabs = allTabs.filter(t => ROLE_RANK[userRole] >= ROLE_RANK[t.minRole]);

  // Reset active tab if it's not in visibleTabs
  const visibleTabIds = visibleTabs.map(t => t.id);
  const safeActiveTab = visibleTabIds.includes(activeTab) ? activeTab : 'orders';

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => isClockedIn ? clockOut.mutate({ token }) : clockIn.mutate({ token })}
              style={{
                padding: '6px 14px',
                background: isClockedIn ? '#dc2626' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isClockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
            </button>
            {clockStatus.data?.lastEvent && (
              <div style={{ fontSize: '10px', color: '#a8a29e', textAlign: 'center' }}>
                {isClockedIn ? 'Clocked in' : 'Clocked out'} {new Date(clockStatus.data.lastEvent.clockedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
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
          overflowY: 'auto',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Staff-level tabs */}
            {visibleTabs.filter(t => t.minRole === 'staff').map(t => (
              <SidebarItem key={t.id} icon={t.icon} label={t.label} tab={t.id} activeTab={safeActiveTab} setActiveTab={setActiveTab} badge={t.badge} />
            ))}

            {/* Manager-level tabs */}
            {visibleTabs.some(t => t.minRole === 'manager') && (
              <>
                <div style={{
                  marginTop: '12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#a8a29e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '12px 12px 8px',
                  borderTop: '1px solid #e7e5e4',
                }}>
                  Management
                </div>
                {visibleTabs.filter(t => t.minRole === 'manager').map(t => (
                  <SidebarItem key={t.id} icon={t.icon} label={t.label} tab={t.id} activeTab={safeActiveTab} setActiveTab={setActiveTab} badge={t.badge} />
                ))}
              </>
            )}

            {/* Admin-level tabs */}
            {visibleTabs.some(t => t.minRole === 'admin') && (
              <>
                <div style={{
                  marginTop: '12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#a8a29e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '12px 12px 8px',
                  borderTop: '1px solid #e7e5e4',
                }}>
                  Admin
                </div>
                {visibleTabs.filter(t => t.minRole === 'admin').map(t => (
                  <SidebarItem key={t.id} icon={t.icon} label={t.label} tab={t.id} activeTab={safeActiveTab} setActiveTab={setActiveTab} badge={t.badge} />
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '28px', overflow: 'auto' }}>
          {safeActiveTab === 'orders'        && <OrdersTab venueId={venue.id} token={token} venue={venue} />}
          {safeActiveTab === 'kitchen'       && <OrdersTab venueId={venue.id} token={token} venue={venue} />}
          {safeActiveTab === 'inventory'     && <InventoryTab venueId={venue.id} isManager={isManager} />}
          {safeActiveTab === 'loyalty'       && <LoyaltyTab venueId={venue.id} token={token} />}
          {safeActiveTab === 'giftcards'     && <GiftCardsTab venueId={venue.id} />}
          {safeActiveTab === 'subscriptions' && <SubscriptionsTab venueId={venue.id} />}
          {safeActiveTab === 'push'          && <PushNotificationsTab venueId={venue.id} />}
          {safeActiveTab === 'catering'      && <CateringTab venueId={venue.id} />}
          {safeActiveTab === 'corporate'     && <CorporateTab venueId={venue.id} />}
          {safeActiveTab === 'analytics'     && <AnalyticsTab venueId={venue.id} token={token} />}
          {safeActiveTab === 'schedule'      && <ScheduleTab venueId={venue.id} token={token} />}
          {safeActiveTab === 'waste'         && <WasteLogTab venueId={venue.id} />}
          {safeActiveTab === 'waitlist'      && <WaitlistTab venueId={venue.id} />}
          {safeActiveTab === 'reservations'  && <ReservationsTab venueId={venue.id} token={token} />}
          {safeActiveTab === 'clock'         && <ClockHistoryTab token={token} />}
          {safeActiveTab === 'delivery'      && <DeliveryTab venueId={venue.id} />}
          {safeActiveTab === 'training'      && <TrainingTab venueId={venue.id} token={token} role={staff.role} />}
          {safeActiveTab === 'myschedule'    && <MyScheduleTab token={token} />}
          {safeActiveTab === 'timeoff'       && (isAdmin || isManager) && <TimeOffTab token={token} />}
          {safeActiveTab === 'profile'       && <ProfileTab token={token} staff={staff} />}
          {safeActiveTab === 'staff'         && (isAdmin || isManager) && <StaffManagementTab venueId={venue.id} isAdmin={isAdmin} />}
          {safeActiveTab === 'settings'      && (isAdmin || isManager) && <SettingsTab venueId={venue.id} />}
          {safeActiveTab === 'availability'  && <AvailabilityTab venueId={venue.id} token={token} />}
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

// ─── Receipt Printing ───
function printReceipt(order: any, venue: any, printerSize: '80mm' | '58mm' | 'a4' = '80mm') {
  const widths = { '80mm': '302px', '58mm': '218px', 'a4': '210mm' };
  const width = widths[printerSize];

  const itemsHtml = (() => {
    try {
      const items = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : (order.items || []);
      return items.map((item: any) =>
        `<tr><td>${item.name || item.itemName}${item.note ? `<br><small>${item.note}</small>` : ''}</td><td style="text-align:right">×${item.quantity || item.qty || 1}</td><td style="text-align:right">$${((item.unitPrice || item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2)}</td></tr>`
      ).join('');
    } catch { return '<tr><td colspan="3">Items unavailable</td></tr>'; }
  })();

  const subtotal = Number(order.totalAmount || 0) - Number(order.tipAmount || 0) + Number(order.discountAmount || 0);
  const tip = Number(order.tipAmount || 0);
  const discount = Number(order.discountAmount || 0);
  const total = Number(order.totalAmount || 0);
  void subtotal;

  const html = `<!DOCTYPE html><html><head><title>Receipt</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: ${width}; padding: 8px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .lg { font-size: 16px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
    @media print { @page { margin: 0; size: ${printerSize === 'a4' ? 'A4' : width + ' auto'}; } }
  </style></head><body>
  <div class="center bold lg">${venue?.name || 'Cafe'}</div>
  ${venue?.address ? `<div class="center" style="font-size:10px">${venue.address}</div>` : ''}
  ${venue?.phone ? `<div class="center" style="font-size:10px">Ph: ${venue.phone}</div>` : ''}
  <hr>
  <div>Order #${order.orderNumber}</div>
  <div>${new Date(order.createdAt).toLocaleString('en-AU')}</div>
  <div>${order.customerName} — ${order.customerPhone}</div>
  ${order.tableNumber ? `<div>Table: ${order.tableNumber}</div>` : ''}
  ${order.pickupTime ? `<div>Pickup: ${order.pickupTime}</div>` : ''}
  <hr>
  <table>
    <tbody>${itemsHtml}</tbody>
  </table>
  <hr>
  <table>
    ${discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-$${discount.toFixed(2)}</td></tr>` : ''}
    ${tip > 0 ? `<tr><td>Tip</td><td style="text-align:right">$${tip.toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td class="bold">TOTAL</td><td style="text-align:right" class="bold">$${total.toFixed(2)} AUD</td></tr>
  </table>
  <hr>
  <div class="center" style="font-size:10px">${order.paymentMethod === 'online' ? 'Paid online' : 'Pay at pickup'}</div>
  <div class="center bold" style="margin-top:8px">Thank you!</div>
  <div style="margin-top:24px"></div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=400,height=600');
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── Password Strength ───
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#e7e5e4' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#10b981' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 2, background: '#e7e5e4', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: color, transition: 'width 0.3s, background 0.3s', borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, marginTop: 3, display: 'block' }}>{label}</span>
    </div>
  );
}

// ─── Tab Components ───
function OrdersTab({ venueId, token, venue }: { venueId: number; token: string; venue?: any }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [waitInput, setWaitInput] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const [printerSize, setPrinterSize] = useState<'80mm' | '58mm' | 'a4'>('80mm');
  const utils = trpc.useUtils();
  const { data: ordersList } = trpc.venue.listOrders.useQuery(
    { venueId, status: statusFilter === 'all' ? undefined : statusFilter, locationId: locationFilter ?? undefined, limit: 50 },
    { refetchInterval: false }
  );

  useVenueSSE({
    venueId: venueId ?? null,
    token: token ?? null,
    events: ['order_update', 'order_new'],
    onEvent: () => {
      utils.venue.listOrders.invalidate();
    },
  });
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: holidayInfo } = trpc.venue.isPublicHoliday.useQuery({ venueId, date: todayStr });

  return (
    <div>
      {holidayInfo?.isHoliday && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
          🎉 Today is a public holiday. Check your surcharge settings are configured.
        </div>
      )}
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

      {/* Printer size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#78716c' }}>Printer:</span>
        {(['80mm', '58mm', 'a4'] as const).map(size => (
          <button
            key={size}
            onClick={() => setPrinterSize(size)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${printerSize === size ? '#1c1917' : '#e7e5e4'}`,
              background: printerSize === size ? '#1c1917' : '#fff',
              color: printerSize === size ? '#fff' : '#44403c',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {size === 'a4' ? 'A4' : size}
          </button>
        ))}
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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Print</th>
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
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => printReceipt(order, venue, printerSize)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #e7e5e4',
                          background: '#fafaf9',
                          color: '#44403c',
                          fontSize: 12,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🖨️ Print
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid #f5f5f4', background: '#f8fffe' }}>
                      <td colSpan={7} style={{ padding: '0 16px 14px 36px' }}>
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
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
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

function GiftCardsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const { data: cards, isLoading } = trpc.venue.listGiftCards.useQuery({ token }, { enabled: !!token });

  const markRedeemed = trpc.venue.redeemGiftCard.useMutation({
    onSuccess: () => utils.venue.listGiftCards.invalidate(),
  });

  const activeCount = (cards ?? []).filter(c => !c.isRedeemed).length;
  const totalValue = (cards ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const redeemedCount = (cards ?? []).filter(c => c.isRedeemed).length;

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Gift Cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Gift size={20} />} label="Active Cards" value={String(activeCount)} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Total Value" value={`$${totalValue.toFixed(2)}`} color="#2563eb" />
        <StatCard icon={<CheckCircle size={20} />} label="Redeemed" value={String(redeemedCount)} color="#16a34a" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Recipient</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Balance</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (cards ?? []).length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No gift cards yet</td></tr>
            ) : (cards ?? []).map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>{c.code}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.recipientName ?? c.recipientPhone ?? '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(c.amount).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(c.balance).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: c.isRedeemed ? '#fee2e2' : '#dcfce7', color: c.isRedeemed ? '#dc2626' : '#16a34a' }}>
                    {c.isRedeemed ? 'Redeemed' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  {!c.isRedeemed && (
                    <button
                      onClick={() => markRedeemed.mutate({ venueId, code: c.code, orderTotal: Number(c.balance) })}
                      disabled={markRedeemed.isPending}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Mark Redeemed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const { data: passes, isLoading } = trpc.venue.listSubscriptionPasses.useQuery({ token }, { enabled: !!token });
  const { data: passConfig } = trpc.venue.getPassConfig.useQuery({ venueId });

  const [editConfig, setEditConfig] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configCredits, setConfigCredits] = useState('');
  const [configPrice, setConfigPrice] = useState('');

  const upsertConfig = trpc.venue.upsertPassConfig.useMutation({
    onSuccess: () => {
      utils.venue.getPassConfig.invalidate();
      setEditConfig(false);
    },
  });

  const activeCount = (passes ?? []).filter(p => p.isActive).length;
  const totalValue = (passes ?? []).reduce((s, p) => s + Number(p.price), 0);
  const totalCreditsRemaining = (passes ?? []).reduce((s, p) => s + p.remainingCredits, 0);

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Subscription Passes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Active Passes" value={String(activeCount)} color="#1c1917" />
        <StatCard icon={<CreditCard size={20} />} label="Total Value" value={`$${totalValue.toFixed(2)}`} color="#16a34a" />
        <StatCard icon={<Coffee size={20} />} label="Credits Remaining" value={String(totalCreditsRemaining)} color="#d97706" />
      </div>

      {/* Pass Config */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Pass Configuration</h3>
          <button
            onClick={() => {
              setConfigName(passConfig?.name ?? '');
              setConfigCredits(passConfig?.totalCredits ? String(passConfig.totalCredits) : '');
              setConfigPrice(passConfig?.price ? String(passConfig.price) : '');
              setEditConfig(!editConfig);
            }}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {editConfig ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {!editConfig ? (
          passConfig ? (
            <p style={{ margin: 0, fontSize: '14px', color: '#44403c' }}>
              Current Pass: <strong>{passConfig.name}</strong> — {passConfig.totalCredits} credits for ${Number(passConfig.price).toFixed(2)}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: '#78716c' }}>No pass configured</p>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={configName} onChange={e => setConfigName(e.target.value)} placeholder="Monthly Coffee Pass"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Credits</label>
              <input type="number" value={configCredits} onChange={e => setConfigCredits(e.target.value)} placeholder="20"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Price ($)</label>
              <input type="number" value={configPrice} onChange={e => setConfigPrice(e.target.value)} placeholder="30"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <button
              onClick={() => {
                if (!configName || !configCredits || !configPrice) return;
                upsertConfig.mutate({ token, name: configName, totalCredits: Number(configCredits), price: Number(configPrice) });
              }}
              disabled={upsertConfig.isPending}
              style={{ background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}
            >
              {upsertConfig.isPending ? '…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Passes Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Credits</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Price</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Expires</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (passes ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No passes yet</td></tr>
            ) : (passes ?? []).map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.phone}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.name}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{p.remainingCredits}/{p.totalCredits}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>${Number(p.price).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PushNotificationsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const { data: subsData } = trpc.venue.listPushSubscriptions.useQuery({ token });
  const { isSubscribed, isSupported, isLoading, subscribe, unsubscribe } = usePushSubscription(venueId);

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Push Notifications</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Bell size={20} />} label="Total Subscribers" value={String(subsData?.count ?? 0)} color="#1c1917" />
        <StatCard icon={<CheckCircle size={20} />} label="This Device" value={isSubscribed ? 'Subscribed ✓' : 'Not subscribed'} color={isSubscribed ? '#16a34a' : '#78716c'} />
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>This Device</h3>
        <p style={{ color: '#78716c', fontSize: '14px', margin: '0 0 16px' }}>
          {isSubscribed
            ? 'This device will receive a push notification when any order is marked ready.'
            : 'Subscribe to receive browser push notifications when orders are marked ready.'}
        </p>
        {!isSupported ? (
          <p style={{ color: '#dc2626', fontSize: '13px' }}>Push notifications are not supported in this browser.</p>
        ) : isSubscribed ? (
          <button
            onClick={unsubscribe}
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            {isLoading ? 'Unsubscribing...' : 'Unsubscribe This Device'}
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            {isLoading ? 'Subscribing...' : '🔔 Enable Push Notifications'}
          </button>
        )}
      </div>

      <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', color: '#78716c', margin: 0 }}>
          Push notifications are sent when a <strong>new order arrives</strong> and when an order is marked <strong>Ready</strong>.
          Enable on each device where you want alerts — even when the tab is in the background.
        </p>
      </div>
    </div>
  );
}

function CateringTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState('all');
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [quoteText, setQuoteText] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');

  const { data: requests, isLoading } = trpc.venue.listCateringRequests.useQuery(
    { token, status: statusFilter === 'all' ? undefined : statusFilter },
    { enabled: !!token }
  );

  const updateStatus = trpc.venue.updateCateringStatus.useMutation({
    onSuccess: () => utils.venue.listCateringRequests.invalidate(),
  });

  const sendQuote = trpc.venue.sendCateringQuote.useMutation({
    onSuccess: () => {
      utils.venue.listCateringRequests.invalidate();
      setQuotingId(null);
      setQuoteText('');
      setQuoteAmount('');
    },
  });

  const newCount = (requests ?? []).filter(r => r.status === 'new').length;
  const confirmedCount = (requests ?? []).filter(r => r.status === 'confirmed').length;
  const completedCount = (requests ?? []).filter(r => r.status === 'completed').length;

  const statusColors: Record<string, { bg: string; color: string }> = {
    new: { bg: '#fef9c3', color: '#a16207' },
    quoted: { bg: '#dbeafe', color: '#1d4ed8' },
    confirmed: { bg: '#dcfce7', color: '#16a34a' },
    completed: { bg: '#f5f5f4', color: '#57534e' },
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Catering Requests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Truck size={20} />} label="New Requests" value={String(newCount)} color="#d97706" />
        <StatCard icon={<CheckCircle size={20} />} label="Confirmed" value={String(confirmedCount)} color="#16a34a" />
        <StatCard icon={<Star size={20} />} label="Completed" value={String(completedCount)} color="#1c1917" />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'new', 'quoted', 'confirmed', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: statusFilter === s ? '#1c1917' : '#e7e5e4', color: statusFilter === s ? '#fafaf9' : '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Event Date</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Guests</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (requests ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No catering requests</td></tr>
            ) : (requests ?? []).map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ borderBottom: quotingId === r.id ? 'none' : '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.phone}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.eventDate}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{r.guestCount}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...(statusColors[r.status] ?? { bg: '#f5f5f4', color: '#57534e' }) }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select
                        value={r.status}
                        onChange={e => {
                          if (e.target.value !== r.status) updateStatus.mutate({ token, requestId: r.id, status: e.target.value as any });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                      >
                        {['new', 'quoted', 'confirmed', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {r.email && (
                        <button
                          onClick={() => setQuotingId(quotingId === r.id ? null : r.id)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Send Quote
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {quotingId === r.id && (
                  <tr style={{ borderBottom: '1px solid #f5f5f4', background: '#f8faff' }}>
                    <td colSpan={6} style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#57534e' }}>Quote Details</label>
                        <textarea
                          value={quoteText}
                          onChange={e => setQuoteText(e.target.value)}
                          placeholder="Describe the catering package, menu items, inclusions..."
                          rows={3}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={quoteAmount}
                            onChange={e => setQuoteAmount(e.target.value)}
                            placeholder="Total amount ($)"
                            style={{ width: '160px', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px' }}
                          />
                          <button
                            onClick={() => sendQuote.mutate({ token, requestId: r.id, quoteText, totalAmount: quoteAmount })}
                            disabled={sendQuote.isPending || !quoteText || !quoteAmount}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1c1917', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {sendQuote.isPending ? '…' : 'Send Quote Email'}
                          </button>
                          <button
                            onClick={() => setQuotingId(null)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '13px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorporateTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', paymentTerms: 'net_7' as const });
  const [formError, setFormError] = useState('');

  const { data: accounts, isLoading } = trpc.venue.listCorporateAccounts.useQuery({ token }, { enabled: !!token });

  const createAccount = trpc.venue.createCorporateAccount.useMutation({
    onSuccess: () => {
      utils.venue.listCorporateAccounts.invalidate();
      setShowForm(false);
      setForm({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', paymentTerms: 'net_7' });
      setFormError('');
    },
    onError: (e) => setFormError(e.message),
  });

  const termsColors: Record<string, { bg: string; color: string }> = {
    prepaid: { bg: '#dcfce7', color: '#16a34a' },
    net_7: { bg: '#dbeafe', color: '#1d4ed8' },
    net_14: { bg: '#fef9c3', color: '#a16207' },
    net_30: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Corporate Accounts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: showForm ? '#57534e' : '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Company'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Briefcase size={20} />} label="Companies" value={String((accounts ?? []).length)} color="#1c1917" />
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Add Corporate Account</h3>
          {formError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{formError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Company Name</label>
              <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Acme Corp"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Name</label>
              <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Jane Smith"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Phone</label>
              <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+61 4xx xxx xxx"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Contact Email</label>
              <input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="jane@acme.com"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value as any })}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                <option value="prepaid">Prepaid</option>
                <option value="net_7">Net 7</option>
                <option value="net_14">Net 14</option>
                <option value="net_30">Net 30</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  if (!form.companyName || !form.contactName || !form.contactPhone) { setFormError('Company name, contact name and phone are required'); return; }
                  createAccount.mutate({ token, ...form, contactEmail: form.contactEmail || undefined });
                }}
                disabled={createAccount.isPending}
                style={{ width: '100%', background: '#1c1917', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '36px' }}
              >
                {createAccount.isPending ? '…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Company</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Contact</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Terms</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading...</td></tr>
            ) : (accounts ?? []).length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No corporate accounts yet</td></tr>
            ) : (accounts ?? []).map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{a.companyName}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{a.contactName}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{a.contactPhone}</td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{a.contactEmail ?? '—'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...(termsColors[a.paymentTerms ?? 'net_7'] ?? { bg: '#f5f5f4', color: '#57534e' }) }}>
                    {(a.paymentTerms ?? 'net_7').replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#78716c' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#1c1917', '#5E8B8B', '#d97706', '#16a34a', '#2563eb', '#dc2626'];
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AnalyticsTab({ venueId: _venueId, token }: { venueId: number; token: string }) {
  const [days, setDays] = useState(30);
  const analyticsRange = days;

  const overviewQuery = trpc.analytics.getOverview.useQuery({ token, days }, { enabled: !!token });
  const revenueQuery = trpc.analytics.getDailyRevenue.useQuery({ token, days }, { enabled: !!token });
  const topItemsQuery = trpc.analytics.getTopItems.useQuery({ token, days, limit: 8 }, { enabled: !!token });
  const hourlyQuery = trpc.analytics.getHourlyDistribution.useQuery({ token, days }, { enabled: !!token });
  const categoryQuery = trpc.analytics.getRevenueByCategory.useQuery({ token, days }, { enabled: !!token });
  const npsQuery = trpc.nps.getStats.useQuery();
  const wasteSummaryQuery = trpc.waste.getSummary.useQuery();
  const invLevelsQuery = trpc.venue.getInventoryLevels.useQuery();

  // Wave 4 new queries
  const { data: itemsByHour } = trpc.analytics.getItemsByHour.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: selloutEvents } = trpc.analytics.getSelloutEvents.useQuery(
    { token, days: 30 },
    { enabled: !!token }
  );
  const { data: orderTypes } = trpc.analytics.getOrderTypeBreakdown.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: repeatRate } = trpc.analytics.getRepeatCustomerRate.useQuery(
    { token, days: analyticsRange },
    { enabled: !!token }
  );
  const { data: itemsByDow } = trpc.analytics.getItemPopularityByDayOfWeek.useQuery(
    { token, days: 60 },
    { enabled: !!token }
  );

  // Heatmap computation
  const heatmapData = React.useMemo(() => {
    if (!itemsByHour) return { items: [] as string[], hours: [] as number[], map: {} as Record<string, Record<number, number>>, maxQty: 1 };
    const map: Record<string, Record<number, number>> = {};
    for (const row of itemsByHour) {
      if (!map[row.itemName]) map[row.itemName] = {};
      map[row.itemName][row.hour] = (map[row.itemName][row.hour] ?? 0) + row.qty;
    }
    const items = Object.entries(map)
      .map(([name, hours]) => ({ name, total: Object.values(hours).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(x => x.name);
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    const maxQty = Math.max(...Object.values(map).flatMap(h => Object.values(h)), 1);
    return { items, hours, map, maxQty };
  }, [itemsByHour]);

  // Sellout events grouped by item
  const selloutGrouped = React.useMemo(() => {
    if (!selloutEvents) return [];
    const byItem: Record<string, { count: number; events: typeof selloutEvents }> = {};
    for (const ev of selloutEvents) {
      if (!byItem[ev.itemName]) byItem[ev.itemName] = { count: 0, events: [] };
      byItem[ev.itemName].count += 1;
      byItem[ev.itemName].events.push(ev);
    }
    return Object.entries(byItem).map(([name, info]) => ({ name, count: info.count, latest: info.events[0] }));
  }, [selloutEvents]);

  // Item popularity by day of week — top 5 items with busiest day
  const dowData = React.useMemo(() => {
    if (!itemsByDow || itemsByDow.length === 0) return [];
    const map: Record<string, Record<number, number>> = {};
    for (const row of itemsByDow) {
      if (!map[row.itemName]) map[row.itemName] = {};
      map[row.itemName][row.dow] = (map[row.itemName][row.dow] ?? 0) + row.qty;
    }
    return Object.entries(map)
      .map(([name, dowMap]) => {
        const total = Object.values(dowMap).reduce((a, b) => a + b, 0);
        const busiestDow = Object.entries(dowMap).sort((a, b) => b[1] - a[1])[0];
        const chartData = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], qty: dowMap[i] ?? 0 }));
        return { name, total, busiestDow: busiestDow ? Number(busiestDow[0]) : 0, chartData };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [itemsByDow]);

  const overview = overviewQuery.data;
  const revenueData = revenueQuery.data ?? [];
  const topItems = topItemsQuery.data ?? [];
  const hourlyData = hourlyQuery.data ?? [];
  const categoryData = categoryQuery.data ?? [];
  const nps = npsQuery.data;
  const topWastedItems = wasteSummaryQuery.data?.topWastedItems ?? [];
  const totalWasteEntries = wasteSummaryQuery.data?.totalWasteEntries ?? 0;
  const totalWasteCost = wasteSummaryQuery.data?.totalCost ?? 0;
  const invLevels = invLevelsQuery.data ?? [];

  const topItem = topItems[0]?.name ?? '—';

  const npsColor = nps == null ? '#78716c'
    : (nps.npsScore ?? 0) >= 50 ? '#16a34a'
    : (nps.npsScore ?? 0) >= 0 ? '#d97706'
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
              <div style={{ fontSize: '56px', fontWeight: 800, color: npsColor, lineHeight: 1 }}>{nps.npsScore ?? '—'}</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px' }}>NPS Score</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                <span style={{ color: '#57534e' }}>Responses: <strong>{nps.totalResponses}</strong></span>
                <span style={{ color: '#57534e' }}>Avg score: <strong>{nps.averageScore ? Number(nps.averageScore).toFixed(1) : '—'}/10</strong></span>
              </div>
              {nps.recentResponses && nps.recentResponses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Responses</div>
                  {nps.recentResponses.slice(0, 5).map((resp: { score: number; comment?: string | null; createdAt: string | Date }, i: number) => (
                    <div key={i} style={{
                      background: '#f5f5f4',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#57534e',
                    }}>
                      <span style={{ fontWeight: 600, marginRight: '8px' }}>{resp.score}/10</span>
                      {resp.comment && <span style={{ fontStyle: 'italic' }}>"{resp.comment}"</span>}
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
        {topWastedItems.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              High Waste Items {totalWasteEntries > 0 && <span style={{ fontWeight: 400, textTransform: 'none' }}>({totalWasteEntries} total entries, ${totalWasteCost.toFixed(2)} est. cost)</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topWastedItems.slice(0, 5).map((item: any, i: number) => (
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

        {topWastedItems.length === 0 && lowStockItems.length === 0 && (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No supplier suggestions at this time.</p>
        )}
      </div>

      {/* ─── Order Type Breakdown ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Order Type Breakdown</h3>
        {!orderTypes || orderTypes.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(['pickup', 'dine_in', 'online'] as const).map(type => {
              const row = orderTypes.find((r: any) => r.orderType === type);
              const labels: Record<string, string> = { pickup: 'Pickup', dine_in: 'Dine-in', online: 'Online' };
              const colors: Record<string, string> = { pickup: '#2563eb', dine_in: '#d97706', online: '#16a34a' };
              return (
                <div key={type} style={{
                  flex: 1, minWidth: '140px', padding: '20px', borderRadius: '12px',
                  background: '#f8f8f8', border: '1px solid #e7e5e4', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: colors[type] ?? '#1c1917' }}>
                    {row ? row.count : 0}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#44403c', marginTop: '4px' }}>
                    {labels[type]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
                    ${row ? Number(row.revenue).toFixed(2) : '0.00'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Repeat Customer Rate ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Repeat Customer Rate</h3>
        {!repeatRate ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: repeatRate.rate >= 50 ? '#16a34a' : repeatRate.rate >= 25 ? '#d97706' : '#dc2626' }}>
                {repeatRate.rate}%
              </span>
              <span style={{ fontSize: '14px', color: '#78716c' }}>repeat customers</span>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#e7e5e4', borderRadius: '4px', height: '8px', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                width: `${repeatRate.rate}%`,
                background: repeatRate.rate >= 50 ? '#16a34a' : repeatRate.rate >= 25 ? '#d97706' : '#dc2626',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#78716c' }}>
              {repeatRate.repeat} of {repeatRate.total} customers came back in the last {analyticsRange} days
            </p>
          </div>
        )}
      </div>

      {/* ─── Item Popularity Heatmap ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Item Popularity Heatmap (by Hour)</h3>
        {heatmapData.items.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '11px', minWidth: 'max-content' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'right', color: '#78716c', fontWeight: 600, minWidth: '120px' }}>Item</th>
                  {heatmapData.hours.map(h => (
                    <th key={h} style={{ padding: '4px 4px', textAlign: 'center', color: '#78716c', fontWeight: 500, width: '36px' }}>
                      {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.items.map(itemName => (
                  <tr key={itemName}>
                    <td style={{ padding: '3px 8px', color: '#1c1917', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'right', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {itemName}
                    </td>
                    {heatmapData.hours.map(h => {
                      const qty = heatmapData.map[itemName]?.[h] ?? 0;
                      const intensity = qty / heatmapData.maxQty;
                      return (
                        <td key={h} style={{ padding: '3px 4px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '4px',
                            background: qty === 0 ? '#f5f5f4' : `rgba(94,139,139,${Math.max(0.15, intensity)})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: intensity > 0.5 ? '#fff' : '#44403c', fontWeight: 600,
                          }}>
                            {qty > 0 ? qty : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Sellout Events ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>
          ⚠️ Sellout Events (last 30 days)
        </h3>
        {!selloutEvents ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : selloutGrouped.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#16a34a' }}>
            <span>✓</span>
            <span>No sellouts recorded in last 30 days</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selloutGrouped.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#1c1917', fontWeight: 500 }}>
                  {item.name}
                  {item.count > 1 && (
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      — sold out {item.count}× in last 30 days
                    </span>
                  )}
                  {item.count === 1 && item.latest.soldOutAt && (
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: '#78716c' }}>
                      — sold out at {new Date(item.latest.soldOutAt).toLocaleString()}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Item Popularity by Day of Week ─── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginTop: '20px', marginBottom: '8px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Item Popularity by Day of Week (top 5)</h3>
        {dowData.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No data for this period</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {dowData.map(item => (
              <div key={item.name}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', color: '#78716c' }}>
                    — most popular on <strong>{DOW_LABELS[item.busiestDow]}</strong>
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={item.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v, 'Orders']} />
                    <Bar dataKey="qty" fill="#5E8B8B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
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

function SettingsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();

  // ── Wait Time ──
  const { data: waitTimeData } = trpc.venue.getWaitTime.useQuery({ venueId }, { enabled: !!venueId });
  const [waitInput, setWaitInput] = useState('');
  const [waitMsg, setWaitMsg] = useState('');
  const setWaitTime = trpc.venue.setWaitTime.useMutation({
    onSuccess: (data) => {
      setWaitMsg(`✓ Wait time set to ${data.minutes} min`);
      utils.venue.getWaitTime.invalidate();
      setTimeout(() => setWaitMsg(''), 3000);
    },
    onError: (e) => setWaitMsg(`Error: ${e.message}`),
  });

  // ── Venue Hours ──
  // Stored as 3 free-text fields: hoursWeekday (Mon-Fri), hoursSaturday, hoursSunday
  const [hoursWeekday, setHoursWeekday] = useState('');
  const [hoursSaturday, setHoursSaturday] = useState('');
  const [hoursSunday, setHoursSunday] = useState('');
  const [hoursMsg, setHoursMsg] = useState('');
const updateVenueMut = trpc.venue.update.useMutation({
    onSuccess: () => {
      setHoursMsg('✓ Hours saved');
      setTimeout(() => setHoursMsg(''), 3000);
    },
    onError: (e) => setHoursMsg(`Error: ${e.message}`),
  });

  // ── Notification Preferences (localStorage) ──
  const [chimeEnabled, setChimeEnabled] = useState(() => {
    const v = localStorage.getItem('b1-chime-enabled');
    return v === null ? true : v === 'true';
  });
  const [desktopNotif, setDesktopNotif] = useState(() => {
    const v = localStorage.getItem('b1-desktop-notif');
    return v === null ? true : v === 'true';
  });

  function handleChimeToggle(val: boolean) {
    setChimeEnabled(val);
    localStorage.setItem('b1-chime-enabled', String(val));
  }

  function handleDesktopNotifToggle(val: boolean) {
    setDesktopNotif(val);
    localStorage.setItem('b1-desktop-notif', String(val));
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7e5e4',
    padding: '24px',
    marginBottom: '16px',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#78716c',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
  };
  const inputStyle: React.CSSProperties = {
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const saveBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    background: '#1c1917',
    color: '#fafaf9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  };
  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f4',
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Venue Settings</h2>

      {/* ── Venue Hours ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Business Hours</h3>
        <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px' }}>
          Enter opening hours as text, e.g. "7:00am – 4:00pm". Leave blank if closed.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '4px' }}>
          <div>
            <label style={labelStyle}>Mon – Fri</label>
            <input
              value={hoursWeekday}
              onChange={e => setHoursWeekday(e.target.value)}
              placeholder="7:00am – 4:00pm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Saturday</label>
            <input
              value={hoursSaturday}
              onChange={e => setHoursSaturday(e.target.value)}
              placeholder="8:00am – 3:00pm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sunday</label>
            <input
              value={hoursSunday}
              onChange={e => setHoursSunday(e.target.value)}
              placeholder="Closed"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={() => {
              setHoursMsg('');
              updateVenueMut.mutate({
                token,
                data: {
                  hoursWeekday: hoursWeekday || undefined,
                  hoursSaturday: hoursSaturday || undefined,
                  hoursSunday: hoursSunday || undefined,
                },
              });
            }}
            disabled={updateVenueMut.isPending}
            style={saveBtnStyle}
          >
            {updateVenueMut.isPending ? 'Saving…' : 'Save Hours'}
          </button>
          {hoursMsg && (
            <span style={{ fontSize: '13px', color: hoursMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {hoursMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Wait Time ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Current Wait Time</h3>
        {waitTimeData != null && (
          <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 12px' }}>
            Current: <strong>{waitTimeData.minutes} min</strong>
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min="0"
            max="120"
            value={waitInput}
            onChange={e => setWaitInput(e.target.value)}
            placeholder="e.g. 15"
            style={{ ...inputStyle, width: '80px' }}
          />
          <span style={{ fontSize: '13px', color: '#78716c' }}>minutes</span>
          <button
            onClick={() => {
              const mins = Number(waitInput);
              if (!waitInput || mins < 0) return;
              setWaitMsg('');
              setWaitTime.mutate({ token, venueId, minutes: mins });
            }}
            disabled={setWaitTime.isPending}
            style={{ ...saveBtnStyle, marginTop: 0 }}
          >
            {setWaitTime.isPending ? 'Saving…' : 'Save'}
          </button>
          {waitMsg && (
            <span style={{ fontSize: '13px', color: waitMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {waitMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Notification Preferences ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>Notification Preferences</h3>
        <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px' }}>
          These settings are saved to this browser only.
        </p>
        <div>
          <div style={toggleRowStyle}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Play chime on new order</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>Plays an audio chime when a new order arrives</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={chimeEnabled}
                onChange={e => handleChimeToggle(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1c1917', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#57534e' }}>{chimeEnabled ? 'On' : 'Off'}</span>
            </label>
          </div>
          <div style={{ ...toggleRowStyle, borderBottom: 'none' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Show desktop notifications</div>
              <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>Shows browser notifications for new and ready orders</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={desktopNotif}
                onChange={e => handleDesktopNotifToggle(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1c1917', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#57534e' }}>{desktopNotif ? 'On' : 'Off'}</span>
            </label>
          </div>
        </div>
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

// ─── Reservations Tab ───
function ReservationsTab({ venueId, token }: { venueId: number; token: string }) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'floor'>('list');
  const [selectedFloorTable, setSelectedFloorTable] = useState<number | null>(null);
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: '', shape: 'rect', section: '' });
  const [walkIn, setWalkIn] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    reservationTime: new Date().toTimeString().slice(0, 5),
    notes: '',
  });
  const [walkInMsg, setWalkInMsg] = useState('');

  const { data: reservations, isLoading } = trpc.reservations.list.useQuery(
    { token, date: selectedDate, status: statusFilter !== 'all' ? statusFilter as any : undefined },
    { refetchInterval: 30000 }
  );

  const { data: tablesList } = trpc.venue.listTables.useQuery({ token });

  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => utils.reservations.list.invalidate(),
  });

  const assignTable = trpc.venue.assignReservationTable.useMutation({
    onSuccess: () => utils.reservations.list.invalidate(),
  });

  const saveTable = trpc.venue.saveTable.useMutation({
    onSuccess: () => {
      utils.venue.listTables.invalidate();
      setNewTable({ tableNumber: '', capacity: '', shape: 'rect', section: '' });
    },
  });

  const deleteTable = trpc.venue.deleteTable.useMutation({
    onSuccess: () => utils.venue.listTables.invalidate(),
  });

  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      utils.reservations.list.invalidate();
      setShowWalkInForm(false);
      setWalkIn({ customerName: '', customerPhone: '', partySize: 2, reservationTime: new Date().toTimeString().slice(0, 5), notes: '' });
      setWalkInMsg('Walk-in added!');
      setTimeout(() => setWalkInMsg(''), 3000);
    },
    onError: (e) => setWalkInMsg(e.message),
  });

  const list = reservations ?? [];
  const pendingCount = list.filter((r: any) => r.status === 'pending').length;
  const confirmedCount = list.filter((r: any) => r.status === 'confirmed').length;
  const seatedCount = list.filter((r: any) => r.status === 'seated').length;
  const tables = tablesList ?? [];

  // Build map of tableId -> today's reservation
  const tableReservationMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    const todayResv = list.filter((r: any) => r.reservationDate === today || !r.reservationDate);
    for (const r of todayResv) {
      if (r.tableId) map[r.tableId] = r;
    }
    return map;
  }, [list, today]);

  function getTableColor(table: any) {
    const resv = tableReservationMap[table.id];
    if (!resv) return '#d6d3d1';
    if (resv.status === 'seated') return '#dc2626';
    if (resv.status === 'confirmed') return '#16a34a';
    if (resv.status === 'pending') return '#d97706';
    return '#d6d3d1';
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fffbeb', color: '#d97706' },
    confirmed: { bg: '#f0fdfa', color: '#0d9488' },
    seated: { bg: '#f0fdf4', color: '#16a34a' },
    cancelled: { bg: '#f5f5f4', color: '#78716c' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Reservations</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* List/Floor toggle */}
          <div style={{ display: 'flex', gap: '4px', background: '#e7e5e4', padding: '4px', borderRadius: '8px' }}>
            {(['list', 'floor'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  background: viewMode === v ? '#1c1917' : 'transparent',
                  color: viewMode === v ? '#fafaf9' : '#57534e',
                }}>
                {v === 'list' ? 'List View' : 'Floor Plan'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowWalkInForm(!showWalkInForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: showWalkInForm ? '#57534e' : '#1c1917',
              color: '#fafaf9', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> {showWalkInForm ? 'Cancel' : 'Add Walk-in'}
          </button>
        </div>
      </div>

      {/* Walk-in form */}
      {showWalkInForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>Add Walk-in Reservation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
              <input value={walkIn.customerName} onChange={e => setWalkIn(w => ({ ...w, customerName: e.target.value }))}
                placeholder="Customer name"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phone</label>
              <input value={walkIn.customerPhone} onChange={e => setWalkIn(w => ({ ...w, customerPhone: e.target.value }))}
                placeholder="+61 4xx xxx xxx"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Party Size</label>
              <input type="number" min="1" value={walkIn.partySize} onChange={e => setWalkIn(w => ({ ...w, partySize: Number(e.target.value) }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Time</label>
              <input type="time" value={walkIn.reservationTime} onChange={e => setWalkIn(w => ({ ...w, reservationTime: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Notes</label>
            <input value={walkIn.notes} onChange={e => setWalkIn(w => ({ ...w, notes: e.target.value }))}
              placeholder="Dietary requirements, special occasions…"
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setWalkInMsg('');
                if (!walkIn.customerName) { setWalkInMsg('Name is required'); return; }
                createReservation.mutate({
                  venueId,
                  customerName: walkIn.customerName,
                  customerPhone: walkIn.customerPhone || undefined,
                  partySize: walkIn.partySize,
                  reservationDate: selectedDate,
                  reservationTime: walkIn.reservationTime,
                  notes: walkIn.notes || undefined,
                });
              }}
              disabled={createReservation.isPending}
              style={{ padding: '8px 20px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createReservation.isPending ? '…' : 'Add Walk-in'}
            </button>
            {walkInMsg && <span style={{ fontSize: '13px', color: walkInMsg.includes('!') ? '#16a34a' : '#dc2626' }}>{walkInMsg}</span>}
          </div>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'pending', 'confirmed', 'seated', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: statusFilter === s ? '#1c1917' : '#e7e5e4',
                color: statusFilter === s ? '#fafaf9' : '#57534e',
              }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Pending', count: pendingCount, color: '#d97706', bg: '#fffbeb' },
          { label: 'Confirmed', count: confirmedCount, color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Seated', count: seatedCount, color: '#16a34a', bg: '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '10px 18px', borderRadius: '10px', background: stat.bg,
            border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.count}</span>
            <span style={{ fontSize: '13px', color: stat.color, fontWeight: 500 }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Floor Plan View */}
      {viewMode === 'floor' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#57534e' }}>
              {[
                { color: '#d6d3d1', label: 'Available' },
                { color: '#16a34a', label: 'Confirmed' },
                { color: '#d97706', label: 'Pending' },
                { color: '#dc2626', label: 'Occupied' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowTableEditor(!showTableEditor)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e7e5e4', background: '#fff', color: '#57534e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {showTableEditor ? 'Hide Editor' : 'Edit Tables'}
            </button>
          </div>

          {/* Table Editor */}
          {showTableEditor && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Table Editor</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Table #</label>
                  <input value={newTable.tableNumber} onChange={e => setNewTable(t => ({ ...t, tableNumber: e.target.value }))}
                    placeholder="e.g. T1"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Capacity</label>
                  <input type="number" min="1" value={newTable.capacity} onChange={e => setNewTable(t => ({ ...t, capacity: e.target.value }))}
                    placeholder="4"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Shape</label>
                  <select value={newTable.shape} onChange={e => setNewTable(t => ({ ...t, shape: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                    <option value="rect">Rectangle</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Section</label>
                  <input value={newTable.section} onChange={e => setNewTable(t => ({ ...t, section: e.target.value }))}
                    placeholder="Indoor"
                    style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '7px 8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <button
                  onClick={() => {
                    if (!newTable.tableNumber || !newTable.capacity) return;
                    saveTable.mutate({ token, tableNumber: newTable.tableNumber, capacity: Number(newTable.capacity), shape: newTable.shape, section: newTable.section || undefined });
                  }}
                  disabled={saveTable.isPending}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              {tables.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Table</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Capacity</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Shape</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#78716c', fontWeight: 600, fontSize: '11px' }}>Section</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.tableNumber}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c' }}>{t.capacity}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c', textTransform: 'capitalize' }}>{t.shape ?? 'rect'}</td>
                        <td style={{ padding: '6px 8px', color: '#78716c' }}>{t.section ?? '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <button
                            onClick={() => deleteTable.mutate({ token, tableId: t.id })}
                            disabled={deleteTable.isPending}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Floor Plan Canvas */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', minHeight: '300px', position: 'relative' }}>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#78716c', padding: '40px', fontSize: '14px' }}>
                No tables configured. Click "Edit Tables" to add tables.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {tables.map((t: any) => {
                  const color = getTableColor(t);
                  const resv = tableReservationMap[t.id];
                  const isSelected = selectedFloorTable === t.id;
                  const isCircle = t.shape === 'circle';
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedFloorTable(isSelected ? null : t.id)}
                      style={{
                        width: isCircle ? '80px' : '100px',
                        height: '80px',
                        borderRadius: isCircle ? '50%' : '10px',
                        background: color,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #1c1917' : '3px solid transparent',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 0 0 2px #1c191744' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{t.tableNumber}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{t.capacity} seats</div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Selected table info popup */}
            {selectedFloorTable && (() => {
              const t = tables.find((t: any) => t.id === selectedFloorTable);
              const resv = t ? tableReservationMap[t.id] : null;
              return t ? (
                <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f5f5f4', borderRadius: '10px', fontSize: '13px' }}>
                  <strong>Table {t.tableNumber}</strong> — {t.capacity} seats {t.section ? `(${t.section})` : ''}
                  {resv ? (
                    <div style={{ marginTop: '6px', color: '#44403c' }}>
                      <strong>{resv.customerName}</strong> — {resv.reservationTime} — {resv.partySize} people
                      <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: statusColors[resv.status]?.bg ?? '#f5f5f4', color: statusColors[resv.status]?.color ?? '#78716c' }}>
                        {resv.status}
                      </span>
                    </div>
                  ) : (
                    <span style={{ marginLeft: '8px', color: '#78716c' }}>No reservation today</span>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Reservation cards */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: '#fff',
              borderRadius: '12px', border: '1px solid #e7e5e4', color: '#78716c', fontSize: '14px',
            }}>
              No reservations for this date
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {list.map((r: any) => {
                const sc = statusColors[r.status] ?? statusColors.pending;
                return (
                  <div key={r.id} style={{
                    background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    {/* Time badge */}
                    <div style={{
                      minWidth: '72px', padding: '10px 8px', borderRadius: '10px',
                      background: sc.bg, textAlign: 'center', flexShrink: 0,
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: sc.color, lineHeight: 1 }}>
                        {r.reservationTime ?? '—'}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: sc.color, textTransform: 'uppercase', marginTop: '3px' }}>
                        {r.status}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1c1917', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {r.customerName ?? 'Unknown'}
                        {r.tableId && tables.find((t: any) => t.id === r.tableId) && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>
                            Table {tables.find((t: any) => t.id === r.tableId)?.tableNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: '#78716c', flexWrap: 'wrap' }}>
                        {r.customerPhone && <span>{r.customerPhone}</span>}
                        <span>👥 {r.partySize} {r.partySize === 1 ? 'person' : 'people'}</span>
                      </div>
                      {r.notes && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#57534e', fontStyle: 'italic' }}>
                          {r.notes}
                        </div>
                      )}
                      {/* Table assignment */}
                      {tables.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Assign Table:</label>
                          <select
                            value={r.tableId ?? ''}
                            onChange={e => {
                              const tableId = e.target.value ? Number(e.target.value) : null;
                              assignTable.mutate({ token, reservationId: r.id, tableId });
                            }}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                          >
                            <option value="">Unassigned</option>
                            {tables.map((t: any) => (
                              <option key={t.id} value={t.id}>Table {t.tableNumber} ({t.capacity} seats)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {r.status === 'pending' && (
                        <button
                          onClick={() => updateStatus.mutate({ token, id: r.id, status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#f0fdfa', color: '#0d9488', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Confirm
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus.mutate({ token, id: r.id, status: 'seated' })}
                          disabled={updateStatus.isPending}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Seat
                        </button>
                      )}
                      {(r.status === 'pending' || r.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ token, id: r.id, status: 'no_show' })}
                            disabled={updateStatus.isPending}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#fff7ed', color: '#ea580c', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            No Show
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ token, id: r.id, status: 'cancelled' })}
                            disabled={updateStatus.isPending}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
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

// ─── Clock History Tab ───
function ClockHistoryTab({ token }: { token: string }) {
  const [days, setDays] = useState(14);

  const { data: shiftHistory, isLoading: historyLoading } = trpc.clock.getShiftHistory.useQuery({ token, days });
  const { data: hoursSummary, isLoading: summaryLoading } = trpc.clock.getHoursSummary.useQuery({ token, days });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Clock History</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 14, 30].map(d => (
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

      {/* Hours Summary Cards */}
      {summaryLoading ? (
        <div style={{ color: '#78716c', padding: '16px', fontSize: '14px' }}>Loading summary…</div>
      ) : (hoursSummary ?? []).length === 0 ? (
        <div style={{ color: '#78716c', padding: '16px', fontSize: '14px' }}>No clock data for this period.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {(hoursSummary ?? []).map((s: any) => (
            <div key={s.staffId} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', marginBottom: '8px' }}>{s.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '4px' }}>
                <span>Total Hours</span>
                <span style={{ fontWeight: 700, color: '#1c1917' }}>{Number(s.totalHours ?? 0).toFixed(1)}h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '4px' }}>
                <span>Shifts</span>
                <span style={{ fontWeight: 600 }}>{s.shiftCount}</span>
              </div>
              {s.penaltyFlags && s.penaltyFlags.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {s.penaltyFlags.map((flag: string, i: number) => (
                    <span key={i} style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#d97706', marginRight: '4px', marginBottom: '4px',
                    }}>
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event Log Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Event Log</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : (shiftHistory ?? []).length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No clock events in this period</td></tr>
            ) : (shiftHistory ?? []).map((ev: any) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '12px 16px', color: '#44403c', fontSize: '12px' }}>
                  {new Date(ev.clockedAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1917' }}>{ev.staffName ?? ev.staffId}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    background: ev.type === 'clock_in' ? '#dcfce7' : '#fee2e2',
                    color: ev.type === 'clock_in' ? '#16a34a' : '#dc2626',
                  }}>
                    {ev.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>{ev.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Delivery Tab ───
function DeliveryTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const utils = trpc.useUtils();
  const [platformFilter, setPlatformFilter] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', fee: '' });
  const [logMsg, setLogMsg] = useState('');

  const { data: orders, isLoading } = trpc.delivery.list.useQuery(
    { token: localStorage.getItem('b1-staff-token') || '', platform: platformFilter || undefined, days: 30 }
  );

  const updateStatus = trpc.delivery.updateStatus.useMutation({
    onSuccess: () => utils.delivery.list.invalidate(),
  });

  const createOrder = trpc.delivery.create.useMutation({
    onSuccess: () => {
      utils.delivery.list.invalidate();
      setShowLogForm(false);
      setLogForm({ platform: 'uber_eats', customerName: '', items: '', subtotal: '', fee: '' });
      setLogMsg('Order logged!');
      setTimeout(() => setLogMsg(''), 3000);
    },
    onError: (e) => setLogMsg(e.message),
  });

  const list = orders ?? [];
  const totalOrders = list.length;
  const totalRevenue = list.reduce((s: number, o: any) => s + Number(o.subtotal ?? 0), 0);
  const totalFees = list.reduce((s: number, o: any) => s + Number(o.fee ?? 0), 0);

  const platformColors: Record<string, { bg: string; color: string }> = {
    uber_eats: { bg: '#fef3c7', color: '#d97706' },
    doordash: { bg: '#fee2e2', color: '#dc2626' },
    menulog: { bg: '#dbeafe', color: '#2563eb' },
    manual: { bg: '#f0fdf4', color: '#16a34a' },
  };

  const platformLabel: Record<string, string> = {
    uber_eats: 'Uber Eats',
    doordash: 'DoorDash',
    menulog: 'Menulog',
    manual: 'Manual',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Delivery Orders</h2>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: showLogForm ? '#57534e' : '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> {showLogForm ? 'Cancel' : 'Log Order'}
        </button>
      </div>

      {/* Log Order Form */}
      {showLogForm && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>Log Delivery Order</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Platform</label>
              <select value={logForm.platform} onChange={e => setLogForm(f => ({ ...f, platform: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', background: '#fafaf9', boxSizing: 'border-box' }}>
                <option value="uber_eats">Uber Eats</option>
                <option value="doordash">DoorDash</option>
                <option value="menulog">Menulog</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Customer Name</label>
              <input value={logForm.customerName} onChange={e => setLogForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Customer"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Subtotal ($)</label>
              <input type="number" min="0" step="0.01" value={logForm.subtotal} onChange={e => setLogForm(f => ({ ...f, subtotal: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Fee ($)</label>
              <input type="number" min="0" step="0.01" value={logForm.fee} onChange={e => setLogForm(f => ({ ...f, fee: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Items</label>
            <textarea value={logForm.items} onChange={e => setLogForm(f => ({ ...f, items: e.target.value }))}
              placeholder="List items here…"
              rows={2}
              style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setLogMsg('');
                if (!logForm.customerName || !logForm.subtotal) { setLogMsg('Customer name and subtotal required'); return; }
                createOrder.mutate({ token, platform: logForm.platform, customerName: logForm.customerName, items: logForm.items, subtotal: Number(logForm.subtotal), fee: logForm.fee ? Number(logForm.fee) : 0 });
              }}
              disabled={createOrder.isPending}
              style={{ padding: '8px 20px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createOrder.isPending ? '…' : 'Log Order'}
            </button>
            {logMsg && <span style={{ fontSize: '13px', color: logMsg.includes('!') ? '#16a34a' : '#dc2626' }}>{logMsg}</span>}
          </div>
        </div>
      )}

      {/* Platform Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[{ value: '', label: 'All' }, { value: 'uber_eats', label: 'Uber Eats' }, { value: 'doordash', label: 'DoorDash' }, { value: 'menulog', label: 'Menulog' }, { value: 'manual', label: 'Manual' }].map(p => (
          <button key={p.value} onClick={() => setPlatformFilter(p.value)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              background: platformFilter === p.value ? '#1c1917' : '#e7e5e4',
              color: platformFilter === p.value ? '#fafaf9' : '#57534e',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<Truck size={20} />} label="Total Orders" value={String(totalOrders)} color="#1c1917" />
        <StatCard icon={<TrendingUp size={20} />} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="#16a34a" />
        <StatCard icon={<CreditCard size={20} />} label="Total Fees Paid" value={`$${totalFees.toFixed(2)}`} color="#dc2626" />
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net $</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#78716c' }}>No delivery orders found</td></tr>
            ) : list.map((o: any) => {
              const pc = platformColors[o.platform] ?? { bg: '#f5f5f4', color: '#57534e' };
              const net = Number(o.subtotal ?? 0) - Number(o.fee ?? 0);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: pc.bg, color: pc.color }}>
                      {platformLabel[o.platform] ?? o.platform}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#1c1917', fontWeight: 500 }}>{o.customerName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={o.status ?? 'pending'}
                      onChange={e => updateStatus.mutate({ token, orderId: o.id, status: e.target.value })}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', background: '#fafaf9', cursor: 'pointer' }}
                    >
                      {['pending', 'confirmed', 'picked_up', 'delivered', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: net >= 0 ? '#16a34a' : '#dc2626' }}>
                    ${net.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#78716c', fontSize: '12px' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-AU') : '—'}
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

// ─── Training Tab ───
function TrainingTab({ venueId, token, role }: { venueId: number; token: string; role: string }) {
  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const [teamView, setTeamView] = useState<'my' | 'team'>('my');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskRole, setNewTaskRole] = useState('all');
  const [addTaskMsg, setAddTaskMsg] = useState('');

  const utils = trpc.useUtils();

  const myProgressQuery = trpc.training.getMyProgress.useQuery(
    { token },
    { enabled: !!token }
  );

  const teamProgressQuery = trpc.training.getTeamProgress.useQuery(
    { token },
    { enabled: !!token && isManagerOrAdmin && teamView === 'team' }
  );

  const completeTask = trpc.training.completeTask.useMutation({
    onSuccess: () => utils.training.getMyProgress.invalidate(),
  });

  const signOff = trpc.training.signOff.useMutation({
    onSuccess: () => {
      utils.training.getTeamProgress.invalidate();
      utils.training.getMyProgress.invalidate();
    },
  });

  const createTask = trpc.training.createTask.useMutation({
    onSuccess: () => {
      setAddTaskMsg('Task created!');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskRole('all');
      setShowAddTask(false);
      utils.training.getMyProgress.invalidate();
      utils.training.getTeamProgress.invalidate();
      setTimeout(() => setAddTaskMsg(''), 3000);
    },
    onError: (e) => setAddTaskMsg(`Error: ${e.message}`),
  });

  const myData = myProgressQuery.data as {
    tasks: { id: number; title: string; description?: string | null; completionId?: number | null; completedAt?: string | null; signedOffAt?: string | null }[];
    completed: number;
    total: number;
  } | undefined;

  const teamData = teamProgressQuery.data as {
    members: {
      staffId: number;
      name: string;
      role: string;
      completed: number;
      total: number;
      pendingSignOffs: { completionId: number; taskTitle: string }[];
    }[];
  } | undefined;

  const pct = myData && myData.total > 0 ? Math.round((myData.completed / myData.total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Training</h2>
        {isManagerOrAdmin && (
          <button
            onClick={() => setShowAddTask(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#1c1917', color: '#fafaf9', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Add Task
          </button>
        )}
      </div>

      {/* Add Task form */}
      {showAddTask && isManagerOrAdmin && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>New Training Task</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Title *</label>
              <input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Coffee machine cleaning"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="Optional details or instructions…"
                rows={3}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Required Role</label>
              <select
                value={newTaskRole}
                onChange={e => setNewTaskRole(e.target.value)}
                style={{ border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', background: '#fff', color: '#1c1917' }}
              >
                <option value="all">All Staff</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={!newTaskTitle.trim() || createTask.isPending}
                onClick={() => {
                  if (!newTaskTitle.trim()) return;
                  createTask.mutate({ token, venueId, title: newTaskTitle.trim(), description: newTaskDesc.trim() || undefined, requiredRole: newTaskRole });
                }}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600,
                  cursor: !newTaskTitle.trim() ? 'not-allowed' : 'pointer',
                  opacity: !newTaskTitle.trim() ? 0.5 : 1,
                }}
              >
                {createTask.isPending ? '…' : 'Create'}
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e7e5e4', background: '#fafaf9', color: '#57534e', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              {addTaskMsg && <span style={{ fontSize: '13px', color: addTaskMsg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{addTaskMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab toggle for manager/admin */}
      {isManagerOrAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '20px' }}>
          {(['my', 'team'] as const).map(v => (
            <button
              key={v}
              onClick={() => setTeamView(v)}
              style={{
                padding: '7px 18px', borderRadius: '20px', border: 'none', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
                background: teamView === v ? '#1c1917' : '#e7e5e4',
                color: teamView === v ? '#fafaf9' : '#57534e',
              }}
            >
              {v === 'my' ? 'My Tasks' : 'Team Progress'}
            </button>
          ))}
        </div>
      )}

      {/* My Tasks view */}
      {(!isManagerOrAdmin || teamView === 'my') && (
        <div>
          {myProgressQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>
              <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          ) : myProgressQuery.error ? (
            <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '13px' }}>
              {myProgressQuery.error.message}
            </div>
          ) : (
            <div>
              {/* Progress bar */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>My Progress</span>
                  <span style={{ fontSize: '13px', color: '#78716c' }}>{myData?.completed ?? 0} / {myData?.total ?? 0} tasks ({pct}%)</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: '#e7e5e4', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: pct === 100 ? '#16a34a' : '#5E8B8B', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Task checklist */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
                {!myData || myData.tasks.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No training tasks assigned yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {myData.tasks.map((task, idx) => {
                      const isCompleted = !!task.completionId;
                      const isSignedOff = !!task.signedOffAt;
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
                            borderBottom: idx < myData.tasks.length - 1 ? '1px solid #f5f5f4' : 'none',
                            background: isSignedOff ? '#f0fdf4' : isCompleted ? '#fffbeb' : '#fff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            disabled={isCompleted || completeTask.isPending}
                            onChange={() => {
                              if (!isCompleted) completeTask.mutate({ token, taskId: task.id });
                            }}
                            style={{ width: 18, height: 18, accentColor: '#16a34a', marginTop: 2, cursor: isCompleted ? 'default' : 'pointer', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                                {task.title}
                              </span>
                              {isCompleted && !isSignedOff && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#d97706' }}>
                                  Pending sign-off
                                </span>
                              )}
                              {isSignedOff && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a' }}>
                                  Signed off ✓
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#78716c', lineHeight: 1.4 }}>{task.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Progress view */}
      {isManagerOrAdmin && teamView === 'team' && (
        <div>
          {teamProgressQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>
              <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          ) : teamProgressQuery.error ? (
            <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '13px' }}>
              {teamProgressQuery.error.message}
            </div>
          ) : !teamData || teamData.members.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>
              No staff members found
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sign-offs</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.members.map(member => {
                    const memberPct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
                    return (
                      <tr key={member.staffId} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{member.name}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                            textTransform: 'uppercase',
                            background: member.role === 'admin' ? '#fee2e2' : member.role === 'manager' ? '#fed7aa' : '#f3f4f6',
                            color: member.role === 'admin' ? '#dc2626' : member.role === 'manager' ? '#ea580c' : '#6b7280',
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e7e5e4', overflow: 'hidden', minWidth: 80 }}>
                              <div style={{ height: '100%', borderRadius: 4, background: memberPct === 100 ? '#16a34a' : '#5E8B8B', width: `${memberPct}%` }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#78716c', flexShrink: 0 }}>
                              {member.completed}/{member.total} ({memberPct}%)
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {member.pendingSignOffs.length === 0 ? (
                            <span style={{ fontSize: '12px', color: '#a8a29e' }}>None pending</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {member.pendingSignOffs.map(sf => (
                                <div key={sf.completionId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: '12px', color: '#78716c' }}>{sf.taskTitle}</span>
                                  <button
                                    disabled={signOff.isPending}
                                    onClick={() => signOff.mutate({ token, completionId: sf.completionId })}
                                    style={{
                                      padding: '2px 8px', borderRadius: '4px', border: 'none',
                                      background: '#dcfce7', color: '#16a34a', fontSize: '11px',
                                      fontWeight: 700, cursor: 'pointer',
                                    }}
                                  >
                                    Sign Off
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My Schedule Tab ───
function MyScheduleTab({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [toStart, setToStart] = useState('');
  const [toEnd, setToEnd] = useState('');
  const [toType, setToType] = useState<'annual' | 'sick' | 'unpaid' | 'other'>('annual');
  const [toReason, setToReason] = useState('');
  const [toMsg, setToMsg] = useState('');
  const [toError, setToError] = useState('');

  const { data: shifts, isLoading: shiftsLoading } = trpc.scheduling.getMyShifts.useQuery(
    { token, weeksAhead: 3 },
    { enabled: !!token }
  );

  const { data: availability, isLoading: availLoading } = trpc.shiftManagement.getMyAvailability.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: timeOffRequests, isLoading: torLoading } = trpc.shiftManagement.getMyTimeOffRequests.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: swapRequests } = trpc.shiftManagement.listShiftSwapRequests.useQuery(
    { token },
    { enabled: !!token }
  );

  const setAvailability = trpc.shiftManagement.setAvailability.useMutation({
    onSuccess: () => utils.shiftManagement.getMyAvailability.invalidate(),
  });

  const requestTimeOff = trpc.shiftManagement.requestTimeOff.useMutation({
    onSuccess: () => {
      utils.shiftManagement.getMyTimeOffRequests.invalidate();
      setShowTimeOffForm(false);
      setToStart(''); setToEnd(''); setToReason('');
      setToMsg('Time off request submitted!');
      setToError('');
      setTimeout(() => setToMsg(''), 4000);
    },
    onError: (e: any) => { setToError(e.message); },
  });

  const requestSwap = trpc.shiftManagement.requestShiftSwap.useMutation({
    onSuccess: () => utils.shiftManagement.listShiftSwapRequests.invalidate(),
  });

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group shifts by week label
  const shiftList = (shifts ?? []) as any[];
  const torList = (timeOffRequests ?? []) as any[];
  const availMap: Record<number, { isAvailable: boolean; preferredStart?: string; preferredEnd?: string }> = {};
  if (availability) {
    for (const a of availability as any[]) {
      availMap[a.dayOfWeek] = { isAvailable: a.isAvailable, preferredStart: a.preferredStart ?? undefined, preferredEnd: a.preferredEnd ?? undefined };
    }
  }

  function formatShiftDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${dayNames[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  const torStatusColors: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#fef3c7', color: '#d97706' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    denied:   { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 28px' }}>My Schedule</h2>

      {/* ── Upcoming Shifts ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Upcoming Shifts</h3>
        {shiftsLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : shiftList.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No upcoming shifts scheduled</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shiftList.map((shift: any) => (
              <div key={shift.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: '#f5f5f4',
                borderRadius: '10px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>
                    {formatShiftDate(shift.date)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#57534e', marginTop: '2px' }}>
                    {shift.startTime}–{shift.endTime}
                  </div>
                </div>
                {shift.role && (
                  <span style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                    fontWeight: 700, background: '#e7e5e4', color: '#57534e', textTransform: 'capitalize',
                  }}>
                    {shift.role}
                  </span>
                )}
                <button
                  onClick={() => requestSwap.mutate({ token, fromShiftId: shift.id })}
                  disabled={requestSwap.isPending}
                  title="Request shift swap"
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid #e7e5e4',
                    background: '#fff', color: '#78716c', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Swap
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── My Availability ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>My Availability</h3>
        {availLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {DAYS.map((day, idx) => {
              const avail = availMap[idx] ?? { isAvailable: true };
              return (
                <div key={idx} style={{
                  borderRadius: '10px',
                  border: '1px solid #e7e5e4',
                  padding: '10px 6px',
                  textAlign: 'center',
                  background: avail.isAvailable ? '#f0fdf4' : '#fef2f2',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', marginBottom: '8px' }}>{day}</div>
                  <button
                    onClick={() => setAvailability.mutate({ token, dayOfWeek: idx, isAvailable: !avail.isAvailable })}
                    style={{
                      width: '100%',
                      padding: '5px 0',
                      borderRadius: '6px',
                      border: 'none',
                      background: avail.isAvailable ? '#16a34a' : '#dc2626',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {avail.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                  {avail.isAvailable && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <input
                        type="time"
                        defaultValue={avail.preferredStart ?? ''}
                        onBlur={e => setAvailability.mutate({ token, dayOfWeek: idx, isAvailable: true, preferredStart: e.target.value || undefined })}
                        style={{ width: '100%', padding: '3px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e7e5e4', boxSizing: 'border-box' }}
                      />
                      <input
                        type="time"
                        defaultValue={avail.preferredEnd ?? ''}
                        onBlur={e => setAvailability.mutate({ token, dayOfWeek: idx, isAvailable: true, preferredEnd: e.target.value || undefined })}
                        style={{ width: '100%', padding: '3px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e7e5e4', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Time Off Requests ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Time Off Requests</h3>
          <button
            onClick={() => setShowTimeOffForm(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: showTimeOffForm ? '#57534e' : '#1c1917',
              color: '#fafaf9', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> {showTimeOffForm ? 'Cancel' : 'Request Time Off'}
          </button>
        </div>

        {toMsg && <div style={{ marginBottom: '12px', fontSize: '13px', color: '#16a34a' }}>{toMsg}</div>}

        {showTimeOffForm && (
          <div style={{ background: '#f5f5f4', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            {toError && <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>{toError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Start Date</label>
                <input type="date" value={toStart} onChange={e => setToStart(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>End Date</label>
                <input type="date" value={toEnd} onChange={e => setToEnd(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Type</label>
                <select value={toType} onChange={e => setToType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Reason (optional)</label>
              <textarea value={toReason} onChange={e => setToReason(e.target.value)} rows={2}
                placeholder="Any additional details…"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <button
              onClick={() => {
                setToError('');
                if (!toStart || !toEnd) { setToError('Start and end date are required'); return; }
                requestTimeOff.mutate({ token, startDate: toStart, endDate: toEnd, type: toType, reason: toReason || undefined });
              }}
              disabled={requestTimeOff.isPending}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {requestTimeOff.isPending ? '…' : 'Submit Request'}
            </button>
          </div>
        )}

        {torLoading ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>Loading…</p>
        ) : torList.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '13px' }}>No time off requests yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {torList.map((r: any) => {
              const sc = torStatusColors[r.status] ?? torStatusColors.pending;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f5f5f4', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917' }}>
                      {r.startDate} → {r.endDate}
                    </div>
                    <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px', textTransform: 'capitalize' }}>
                      {r.type}{r.reason ? ` — ${r.reason}` : ''}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.color }}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Shift Swaps ── */}
      {(swapRequests ?? []).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>My Shift Swap Requests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(swapRequests as any[]).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f5f5f4', borderRadius: '8px' }}>
                <div style={{ flex: 1, fontSize: '13px', color: '#44403c' }}>
                  Swap request for shift on {r.shiftDate ?? `#${r.fromShiftId}`}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: '#fef3c7', color: '#d97706' }}>
                  {r.status ?? 'pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Time Off Requests Tab (Manager+) ───
function TimeOffTab({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const { data: requests, isLoading } = trpc.shiftManagement.listTimeOffRequests.useQuery(
    { token },
    { enabled: !!token, refetchInterval: 30_000 }
  );

  const reviewTimeOff = trpc.shiftManagement.reviewTimeOff.useMutation({
    onSuccess: () => utils.shiftManagement.listTimeOffRequests.invalidate(),
  });

  const list = (requests ?? []) as any[];
  const filtered = filter === 'pending' ? list.filter(r => r.status === 'pending') : list;

  const torStatusColors: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#fef3c7', color: '#d97706' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    denied:   { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Time Off Requests</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: filter === f ? '#1c1917' : '#e7e5e4',
                color: filter === f ? '#fafaf9' : '#57534e',
              }}>
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>
          No {filter === 'pending' ? 'pending ' : ''}time off requests
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dates</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const sc = torStatusColors[r.status] ?? torStatusColors.pending;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{r.staffName ?? `Staff #${r.staffId}`}</td>
                    <td style={{ padding: '14px 16px', color: '#44403c' }}>{r.startDate} → {r.endDate}</td>
                    <td style={{ padding: '14px 16px', color: '#57534e', textTransform: 'capitalize' }}>{r.type}</td>
                    <td style={{ padding: '14px 16px', color: '#78716c' }}>{r.reason ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, decision: 'approved' })}
                            disabled={reviewTimeOff.isPending}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewTimeOff.mutate({ token, requestId: r.id, decision: 'denied' })}
                            disabled={reviewTimeOff.isPending}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ───
function ProfileTab({ token, staff }: { token: string; staff: { id: number; name: string; username: string; role: string; email?: string | null; twoFaEnabled?: boolean } }) {
  const utils = trpc.useUtils();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: staff.name ?? '',
    email: (staff as any).email ?? '',
    phone: (staff as any).phone ?? '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // 2FA
  const [twoFaMsg, setTwoFaMsg] = useState('');
  const [twoFaError, setTwoFaError] = useState('');

  // Clock PIN
  const [pinValue, setPinValue] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

  const updateProfile = trpc.staffAuth.updateMyProfile.useMutation({
    onSuccess: () => {
      setProfileMsg('Profile updated!');
      setProfileError('');
      setTimeout(() => setProfileMsg(''), 3000);
    },
    onError: (e: any) => { setProfileError(e.message); },
  });

  const changePassword = trpc.staffAuth.changePassword.useMutation({
    onSuccess: () => {
      setPwMsg('Password changed!');
      setPwError('');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 3000);
    },
    onError: (e: any) => { setPwError(e.message); },
  });

  const enable2FA = trpc.staffAuth.enable2FA.useMutation({
    onSuccess: () => {
      setTwoFaMsg('Two-factor authentication enabled.');
      setTwoFaError('');
      utils.staffAuth.me.invalidate();
    },
    onError: (e: any) => { setTwoFaError(e.message); },
  });

  const disable2FA = trpc.staffAuth.disable2FA.useMutation({
    onSuccess: () => {
      setTwoFaMsg('Two-factor authentication disabled.');
      setTwoFaError('');
      utils.staffAuth.me.invalidate();
    },
    onError: (e: any) => { setTwoFaError(e.message); },
  });

  const setPin = trpc.staffAuth.setClockPin.useMutation({
    onSuccess: () => {
      setPinMsg('PIN set!');
      setPinError('');
      setPinValue('');
      setTimeout(() => setPinMsg(''), 3000);
    },
    onError: (e: any) => { setPinError(e.message); },
  });

  const clearPin = trpc.staffAuth.clearClockPin.useMutation({
    onSuccess: () => {
      setPinMsg('PIN cleared.');
      setPinError('');
      setTimeout(() => setPinMsg(''), 3000);
    },
    onError: (e: any) => { setPinError(e.message); },
  });

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7e5e4',
    padding: '24px',
    marginBottom: '16px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e7e5e4',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const labelSt: React.CSSProperties = {
    fontSize: '11px',
    color: '#78716c',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
  };

  const saveBtnSt: React.CSSProperties = {
    padding: '9px 20px',
    background: '#1c1917',
    color: '#fafaf9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  };

  const twoFaEnabled = (staff as any).twoFaEnabled ?? false;

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>My Profile</h2>

      {/* ── Staff Info ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCircle size={18} color="#5E8B8B" /> Personal Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelSt}>Full Name</label>
            <input
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>Username</label>
            <input
              value={staff.username}
              disabled
              style={{ ...inputStyle, background: '#f5f5f4', color: '#78716c' }}
            />
          </div>
          <div>
            <label style={labelSt}>Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>Phone</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+61 4xx xxx xxx"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <button
            onClick={() => {
              setProfileError('');
              updateProfile.mutate({ token, name: profileForm.name, email: profileForm.email || undefined, phone: profileForm.phone || undefined });
            }}
            disabled={updateProfile.isPending}
            style={{ ...saveBtnSt, opacity: updateProfile.isPending ? 0.7 : 1 }}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save Profile'}
          </button>
          {profileMsg && <span style={{ fontSize: '13px', color: '#16a34a' }}>{profileMsg}</span>}
          {profileError && <span style={{ fontSize: '13px', color: '#dc2626' }}>{profileError}</span>}
        </div>
      </div>

      {/* ── Change Password ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={18} color="#5E8B8B" /> Change Password
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <div>
            <label style={labelSt}>Current Password</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              autoComplete="current-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>New Password</label>
            <input
              type="password"
              value={pwForm.newPw}
              onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
            <PasswordStrengthBar password={pwForm.newPw} />
          </div>
          <div>
            <label style={labelSt}>Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              setPwError('');
              if (!pwForm.current || !pwForm.newPw) { setPwError('All fields are required'); return; }
              if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
              changePassword.mutate({ token, currentPassword: pwForm.current, newPassword: pwForm.newPw });
            }}
            disabled={changePassword.isPending}
            style={{ ...saveBtnSt, opacity: changePassword.isPending ? 0.7 : 1 }}
          >
            {changePassword.isPending ? 'Changing…' : 'Change Password'}
          </button>
          {pwMsg && <span style={{ fontSize: '13px', color: '#16a34a' }}>{pwMsg}</span>}
          {pwError && <span style={{ fontSize: '13px', color: '#dc2626' }}>{pwError}</span>}
        </div>
      </div>

      {/* ── Security / 2FA ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="#5E8B8B" /> Security
        </h3>

        {/* 2FA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f5f5f4' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Two-Factor Authentication</div>
            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
              {twoFaEnabled ? 'Enabled — your account is protected by email 2FA' : 'Disabled — enable to require an email code on login'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              background: twoFaEnabled ? '#dcfce7' : '#f3f4f6',
              color: twoFaEnabled ? '#16a34a' : '#6b7280',
            }}>
              {twoFaEnabled ? 'ON' : 'OFF'}
            </span>
            {twoFaEnabled ? (
              <button
                onClick={() => { setTwoFaError(''); setTwoFaMsg(''); disable2FA.mutate({ token }); }}
                disabled={disable2FA.isPending}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {disable2FA.isPending ? '…' : 'Disable 2FA'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setTwoFaError('');
                  setTwoFaMsg('');
                  if (!profileForm.email && !(staff as any).email) {
                    setTwoFaError('Add an email address to your profile first');
                    return;
                  }
                  enable2FA.mutate({ token });
                }}
                disabled={enable2FA.isPending}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {enable2FA.isPending ? '…' : 'Enable 2FA'}
              </button>
            )}
          </div>
        </div>

        {/* Email verification status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Email Address</div>
            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
              {profileForm.email || (staff as any).email || 'No email set'}
            </div>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            background: (staff as any).emailVerifiedAt ? '#dcfce7' : '#fef3c7',
            color: (staff as any).emailVerifiedAt ? '#16a34a' : '#d97706',
          }}>
            {(staff as any).emailVerifiedAt ? 'Verified' : 'Not verified'}
          </span>
        </div>

        {(twoFaMsg || twoFaError) && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: twoFaError ? '#dc2626' : '#16a34a' }}>
            {twoFaError || twoFaMsg}
          </div>
        )}
      </div>

      {/* ── Clock-In PIN ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={18} color="#5E8B8B" /> Clock-In PIN
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>PIN (4–8 digits)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            pattern="\d{4,8}"
            placeholder="Enter 4–8 digit PIN"
            value={pinValue}
            onChange={e => { setPinError(''); setPinValue(e.target.value.replace(/\D/g, '')); }}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
          />
        </div>
        <button
          style={{ ...saveBtnSt, opacity: (pinValue.length < 4 || setPin.isPending) ? 0.6 : 1, cursor: (pinValue.length < 4 || setPin.isPending) ? 'not-allowed' : 'pointer' }}
          disabled={pinValue.length < 4 || setPin.isPending}
          onClick={() => setPin.mutate({ token, pin: pinValue })}
        >
          {setPin.isPending ? 'Saving…' : 'Set PIN'}
        </button>
        <div style={{ marginTop: '8px' }}>
          <button
            style={{ background: 'none', border: 'none', color: '#78716c', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            onClick={() => clearPin.mutate({ token })}
            disabled={clearPin.isPending}
          >
            {clearPin.isPending ? 'Clearing…' : 'Clear PIN'}
          </button>
        </div>
        {(pinMsg || pinError) && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: pinError ? '#dc2626' : '#16a34a' }}>
            {pinError || pinMsg}
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#a8a29e' }}>
          Staff enter this PIN on the shared clock-in tablet to clock in or out.
        </div>
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

// ─── Availability (86 List) Tab ───
function AvailabilityTab({ venueId, token }: { venueId: number; token: string }) {
  const utils = trpc.useUtils();

  const { data: menuItemsData, isLoading: menuLoading } = trpc.venue.listMenuItems.useQuery({ venueId });
  const { data: inventoryRows, isLoading: invLoading } = trpc.venue.getInventory.useQuery({ venueId });

  const toggleItem = trpc.venue.toggleInventoryItem.useMutation({
    onSuccess: () => {
      utils.venue.getInventory.invalidate();
    },
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'soldout'>('all');

  // Build map: menuItemId -> isAvailable
  const invMap: Record<number, boolean> = {};
  if (inventoryRows) {
    for (const row of inventoryRows as any[]) {
      invMap[row.menuItemId] = row.isAvailable;
    }
  }

  const allItems = (menuItemsData ?? []) as any[];
  const items = allItems
    .filter(i => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !(i.category ?? '').toLowerCase().includes(q)) return false;
      }
      const avail = invMap[i.id] !== false; // default available if no inventory row
      if (filter === 'available' && !avail) return false;
      if (filter === 'soldout' && avail) return false;
      return true;
    });

  const soldOutCount = allItems.filter(i => invMap[i.id] === false).length;

  const isLoading = menuLoading || invLoading;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: '0 0 4px' }}>86 List — Item Availability</h2>
        <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
          Toggle items on/off. Sold-out items are hidden on the ordering page in real-time.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 18px', background: soldOutCount > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${soldOutCount > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold Out</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: soldOutCount > 0 ? '#DC2626' : '#16A34A' }}>{soldOutCount}</div>
        </div>
        <div style={{ padding: '10px 18px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1c1917' }}>{allItems.length - soldOutCount}</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 13, color: '#1c1917' }}
        />
        {(['all', 'available', 'soldout'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${filter === f ? '#1c1917' : '#e7e5e4'}`,
              background: filter === f ? '#1c1917' : '#fff', color: filter === f ? '#fafaf9' : '#78716c',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{f === 'soldout' ? 'Sold Out' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#78716c', fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p style={{ color: '#78716c', fontSize: 14 }}>No items found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item: any) => {
          const isAvailable = invMap[item.id] !== false;
          const isPending = toggleItem.isPending && (toggleItem.variables as any)?.menuItemId === item.id;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                minHeight: 56, padding: '10px 16px',
                background: isAvailable ? '#fff' : '#FEF2F2',
                border: `1px solid ${isAvailable ? '#e7e5e4' : '#FECACA'}`,
                borderRadius: 10,
                transition: 'all 0.15s',
              }}
            >
              {/* Item info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1c1917' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#78716c', marginTop: 1 }}>
                  {item.category && <span style={{ textTransform: 'capitalize' }}>{item.category}</span>}
                  {item.price && <span style={{ marginLeft: 8 }}>${parseFloat(item.price).toFixed(2)}</span>}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: isAvailable ? '#D1FAE5' : '#FEE2E2',
                color: isAvailable ? '#065F46' : '#DC2626',
              }}>
                {isAvailable ? '✅ Available' : '❌ Sold Out'}
              </span>

              {/* Toggle */}
              <button
                disabled={isPending}
                onClick={() => {
                  toggleItem.mutate({ venueId, menuItemId: item.id, isAvailable: !isAvailable });
                }}
                style={{
                  position: 'relative', width: 52, height: 28, borderRadius: 14,
                  border: 'none', cursor: isPending ? 'wait' : 'pointer',
                  background: isAvailable ? '#16A34A' : '#D1D5DB',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  padding: 0,
                }}
                title={isAvailable ? 'Mark as Sold Out' : 'Mark as Available'}
              >
                <span style={{
                  position: 'absolute', top: 3, left: isAvailable ? 26 : 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}