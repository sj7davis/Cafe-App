// StaffDashboard — shell, nav and tab switching. Tabs live in ./tabs/.
import React, { useState } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { trpc } from '@/providers/trpc';


import {
  Coffee,
  Users,
  ShoppingBag,
  Package,
  Star,
  Settings,
  LogOut,
  Clock,
  AlertTriangle,
  Utensils,
  Gift,
  CreditCard,
  Bell,
  BarChart3,
  Truck,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarOff,
  Trash2,
  ListOrdered,
  BookOpen,
  GraduationCap,
  UserCircle,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { SidebarItem } from './shared';
import { OrdersTab } from './tabs/OrdersTab';
import { InventoryTab } from './tabs/InventoryTab';
import { LoyaltyTab } from './tabs/LoyaltyTab';
import { GiftCardsTab } from './tabs/GiftCardsTab';
import { SubscriptionsTab } from './tabs/SubscriptionsTab';
import { PushNotificationsTab } from './tabs/PushNotificationsTab';
import { CateringTab } from './tabs/CateringTab';
import { CorporateTab } from './tabs/CorporateTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { StaffManagementTab } from './tabs/StaffManagementTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ScheduleTab } from './tabs/ScheduleTab';
import { WasteLogTab } from './tabs/WasteLogTab';
import { ReservationsTab } from './tabs/ReservationsTab';
import { WaitlistTab } from './tabs/WaitlistTab';
import { ClockHistoryTab } from './tabs/ClockHistoryTab';
import { DeliveryTab } from './tabs/DeliveryTab';
import { TrainingTab } from './tabs/TrainingTab';
import { MyScheduleTab } from './tabs/MyScheduleTab';
import { TimeOffTab } from './tabs/TimeOffTab';
import { ProfileTab } from './tabs/ProfileTab';
import { AvailabilityTab } from './tabs/AvailabilityTab';

type RoleName = 'staff' | 'manager' | 'admin';
const ROLE_RANK: Record<RoleName, number> = { staff: 0, manager: 1, admin: 2 };

type TabDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  minRole: RoleName;
  badge?: number;
};

function buildTabs(_pendingOrders: number, pendingTimeOff: number): TabDef[] {
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
