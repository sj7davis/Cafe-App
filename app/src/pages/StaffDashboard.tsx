import { useStaffAuth } from '@/hooks/useStaffAuth';
import { trpc } from '@/providers/trpc';
import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

export default function StaffDashboard() {
  const { staff, venue, isAdmin, isManager, logout, loading } = useStaffAuth();
  const [activeTab, setActiveTab] = useState('orders');

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
            <SidebarItem icon={<ShoppingBag size={18} />} label="Orders" tab="orders" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Package size={18} />} label="Inventory" tab="inventory" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Star size={18} />} label="Loyalty" tab="loyalty" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Gift size={18} />} label="Gift Cards" tab="giftcards" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<CreditCard size={18} />} label="Subscriptions" tab="subscriptions" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Bell size={18} />} label="Push Notifications" tab="push" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Utensils size={18} />} label="Catering" tab="catering" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<Briefcase size={18} />} label="Corporate" tab="corporate" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarItem icon={<BarChart3 size={18} />} label="Analytics" tab="analytics" activeTab={activeTab} setActiveTab={setActiveTab} />

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
          {activeTab === 'orders' && <OrdersTab venueId={venue.id} />}
          {activeTab === 'inventory' && <InventoryTab venueId={venue.id} isManager={isManager} />}
          {activeTab === 'loyalty' && <LoyaltyTab venueId={venue.id} />}
          {activeTab === 'giftcards' && <GiftCardsTab venueId={venue.id} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab venueId={venue.id} />}
          {activeTab === 'push' && <PushNotificationsTab venueId={venue.id} />}
          {activeTab === 'catering' && <CateringTab venueId={venue.id} />}
          {activeTab === 'corporate' && <CorporateTab venueId={venue.id} />}
          {activeTab === 'analytics' && <AnalyticsTab venueId={venue.id} />}
          {activeTab === 'staff' && (isAdmin || isManager) && <StaffManagementTab venueId={venue.id} isAdmin={isAdmin} />}
          {activeTab === 'settings' && (isAdmin || isManager) && <SettingsTab venueId={venue.id} />}
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar Item ───
function SidebarItem({ icon, label, tab, activeTab, setActiveTab }: {
  icon: React.ReactNode; label: string; tab: string; activeTab: string; setActiveTab: (t: string) => void;
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
      }}
      onMouseEnter={(e) => {
        if (!isActive) { e.currentTarget.style.background = '#f5f5f4'; e.currentTarget.style.color = '#44403c'; }
      }}
      onMouseLeave={(e) => {
        if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#57534e'; }
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Tab Components ───
function OrdersTab({ venueId }: { venueId: number }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data: ordersList } = trpc.venue.listOrders.useQuery(
    { venueId, status: statusFilter === 'all' ? undefined : statusFilter, locationId: locationFilter ?? undefined, limit: 50 },
    { refetchInterval: 20_000 }
  );
  const { data: locationsList } = trpc.venue.listLocations.useQuery({ venueId });

  const updateStatus = trpc.venue.updateOrderStatus.useMutation({
    onSuccess: () => utils.venue.listOrders.invalidate(),
  });

  const token = localStorage.getItem('b1-staff-token') || '';

  const knownIds = useRef<Set<number>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [staffNoteDraft, setStaffNoteDraft] = useState<string>('');

  useEffect(() => {
    if (!ordersList) return;
    const incoming = new Set(ordersList.map(o => o.id));
    const isFirstLoad = knownIds.current.size === 0;
    if (!isFirstLoad) {
      const fresh = new Set([...incoming].filter(id => !knownIds.current.has(id)));
      if (fresh.size > 0) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Orders</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<ShoppingBag size={20} />} label="Today's Orders" value="24" color="#1c1917" />
        <StatCard icon={<Clock size={20} />} label="Pending" value="6" color="#d97706" />
        <StatCard icon={<CheckCircle size={20} />} label="Completed" value="16" color="#16a34a" />
        <StatCard icon={<TrendingUp size={20} />} label="Revenue" value="$486.50" color="#2563eb" />
      </div>

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
            {ordersList && ordersList.length > 0 ? ordersList.map((order) => (
              <tr
                key={order.id}
                data-testid={`order-row-${order.id}`}
                data-new-order={newOrderIds.has(order.id) ? 'true' : undefined}
                style={{
                  borderBottom: '1px solid #f5f5f4',
                  transition: 'background 0.15s',
                  background: newOrderIds.has(order.id) ? '#fffbeb' : '#fff',
                  borderLeft: newOrderIds.has(order.id) ? '3px solid #d97706' : '3px solid transparent',
                }}
                onMouseEnter={(e) => { if (!newOrderIds.has(order.id)) e.currentTarget.style.background = '#fafaf9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = newOrderIds.has(order.id) ? '#fffbeb' : '#fff'; }}
              >
                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{order.orderNumber}</td>
                <td style={{ padding: '14px 16px', color: '#44403c' }}>{order.customerName}</td>
                <td style={{ padding: '14px 16px', color: '#78716c' }}>${Number(order.totalAmount).toFixed(2)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={order.status} />
                </td>
                <td style={{ padding: '14px 16px' }}>
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
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  No orders found
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

  const { data: menuItems } = trpc.venue.listMenuItems.useQuery({ venueId });
  const { data: inventoryRows } = trpc.venue.getInventory.useQuery({ venueId });

  const toggleItem = trpc.venue.toggleInventoryItem.useMutation({
    onSuccess: () => utils.venue.getInventory.invalidate(),
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

  // Merge menu items with inventory state
  const items = (menuItems ?? []).map((item) => {
    const inv = invMap[item.id];
    return {
      ...item,
      isAvailable: inv ? inv.isAvailable : true,
      staffNote: inv ? (inv.staffNote ?? '') : '',
      soldOutAt: inv ? inv.soldOutAt : null,
    };
  });

  const filteredItems = categoryFilter === 'all'
    ? items
    : items.filter((i) => (i.category ?? '').toLowerCase() === categoryFilter.toLowerCase());

  const totalCount = items.length;
  const availableCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = items.filter((i) => !i.isAvailable).length;

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Inventory</h2>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Package size={20} />} label="Total Items" value={String(totalCount)} color="#1c1917" />
        <StatCard icon={<CheckCircle size={20} />} label="Available" value={String(availableCount)} color="#16a34a" />
        <StatCard icon={<XCircle size={20} />} label="Sold Out" value={String(soldOutCount)} color="#dc2626" />
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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Note</th>}
              {isManager && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toggle</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 6 : 4} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  {menuItems === undefined ? 'Loading...' : 'No items found'}
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const isToggling = togglingIds.has(item.id);
              const catColor = categoryColors[(item.category ?? '').toLowerCase()] ?? '#78716c';
              const noteVal = noteValues[item.id] !== undefined ? noteValues[item.id] : (item.staffNote ?? '');
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

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    {item.isAvailable ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Available
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
                        <XCircle size={14} /> Sold Out
                      </span>
                    )}
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

                  {/* Toggle */}
                  {isManager && (
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        disabled={isToggling}
                        onClick={() => handleToggle(item.id, item.isAvailable)}
                        style={{
                          padding: '5px 12px',
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
                        {isToggling ? '…' : item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                      </button>
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

function LoyaltyTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Loyalty Program</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Users size={20} />} label="Members" value="156" color="#1c1917" />
        <StatCard icon={<Star size={20} />} label="Points Issued" value="12.4k" color="#d97706" />
        <StatCard icon={<Gift size={20} />} label="Rewards Redeemed" value="89" color="#16a34a" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loyalty management — view accounts, adjust points, see redemption history.</p>
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

function AnalyticsTab({ venueId: _venueId }: { venueId: number }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<TrendingUp size={20} />} label="Today's Revenue" value="$486.50" color="#16a34a" />
        <StatCard icon={<ShoppingBag size={20} />} label="Today's Orders" value="24" color="#1c1917" />
        <StatCard icon={<Users size={20} />} label="Avg. Order Value" value="$20.27" color="#2563eb" />
        <StatCard icon={<Coffee size={20} />} label="Top Item" value="Flat White" color="#d97706" />
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>Analytics dashboard — revenue trends, popular items, peak hours, customer insights.</p>
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