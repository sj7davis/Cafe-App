import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useStaffAuth, isDemoMode } from '@/hooks/useStaffAuth';
import {
  Bell, Clock, Coffee, Package, TrendingUp, Users, X, Volume2, VolumeX,
  BarChart3, ChevronDown, ChevronUp, StickyNote, ToggleLeft, ToggleRight,
  Settings, LogOut, Shield, Loader2,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: '#C4953A', confirmed: '#5E8B8B', ready: '#5E8B5E', completed: '#5E5E5E', cancelled: '#B85450',
};
const statusLabels: Record<string, string> = {
  pending: 'NEW', confirmed: 'CONFIRMED', ready: 'READY', completed: 'DONE', cancelled: 'CANCELLED',
};
const roleColors: Record<string, string> = { admin: '#B85450', manager: '#C4953A', staff: '#5E8B8B' };

/* ─── Demo Data ─── */
const DEMO_ORDERS = [
  { id: 1, orderNumber: 'B1-0423', customerName: 'Sarah M.', status: 'pending', pickupTime: '10:30', paymentMethod: 'pickup', totalAmount: 16.50, orderNote: 'Extra hot please', staffNote: '', createdAt: new Date(Date.now() - 120000), items: [{ id: 1, quantity: 2, itemName: 'Flat White' }, { id: 2, quantity: 1, itemName: 'Seasonal Fruit Danish' }] },
  { id: 2, orderNumber: 'B1-0424', customerName: 'James K.', status: 'confirmed', pickupTime: '10:45', paymentMethod: 'online', totalAmount: 22.00, orderNote: '', staffNote: 'Regular customer', createdAt: new Date(Date.now() - 300000), items: [{ id: 3, quantity: 1, itemName: 'Cold Brew' }, { id: 4, quantity: 2, itemName: 'Olive & Rosemary Sourdough' }] },
  { id: 3, orderNumber: 'B1-0425', customerName: 'Emily R.', status: 'ready', pickupTime: '11:00', paymentMethod: 'pickup', totalAmount: 11.50, orderNote: 'Oat milk', staffNote: '', createdAt: new Date(Date.now() - 600000), items: [{ id: 5, quantity: 1, itemName: 'Mocha' }, { id: 6, quantity: 1, itemName: 'Portuguese Tart' }] },
  { id: 4, orderNumber: 'B1-0426', customerName: 'Tom H.', status: 'pending', pickupTime: '11:15', paymentMethod: 'pickup', totalAmount: 27.00, orderNote: 'Call when ready', staffNote: '', createdAt: new Date(Date.now() - 180000), items: [{ id: 7, quantity: 3, itemName: 'Flat White' }, { id: 8, quantity: 2, itemName: 'Croissant' }, { id: 9, quantity: 1, itemName: 'Cold Brew' }] },
  { id: 5, orderNumber: 'B1-0427', customerName: 'Lisa P.', status: 'completed', pickupTime: '09:30', paymentMethod: 'online', totalAmount: 9.50, orderNote: '', staffNote: '', createdAt: new Date(Date.now() - 3600000), items: [{ id: 10, quantity: 1, itemName: 'Cappuccino' }] },
];

const DEMO_STATS = { orderCount: 12, totalRevenue: 186.50, pendingCount: 2, readyCount: 1, completedCount: 8 };

const DEMO_MENU = [
  { id: 1, name: 'Espresso' }, { id: 2, name: 'Long Black' }, { id: 3, name: 'Flat White' },
  { id: 4, name: 'Cappuccino' }, { id: 5, name: 'Latte' }, { id: 6, name: 'Piccolo' },
  { id: 7, name: 'Mocha' }, { id: 8, name: 'Cold Brew' }, { id: 9, name: 'Batch Brew' },
  { id: 10, name: 'Seasonal Fruit Danish' }, { id: 11, name: 'Croissant' }, { id: 12, name: 'Portuguese Tart' },
  { id: 13, name: 'Olive & Rosemary Sourdough' }, { id: 14, name: 'Seeded Rye' }, { id: 15, name: 'Country Loaf' },
];

const DEMO_INVENTORY = [
  { menuItemId: 1, isAvailable: true }, { menuItemId: 2, isAvailable: true }, { menuItemId: 3, isAvailable: true },
  { menuItemId: 4, isAvailable: true }, { menuItemId: 5, isAvailable: false }, { menuItemId: 6, isAvailable: true },
  { menuItemId: 7, isAvailable: true }, { menuItemId: 8, isAvailable: true }, { menuItemId: 9, isAvailable: true },
  { menuItemId: 10, isAvailable: true }, { menuItemId: 11, isAvailable: false }, { menuItemId: 12, isAvailable: true },
  { menuItemId: 13, isAvailable: true }, { menuItemId: 14, isAvailable: true }, { menuItemId: 15, isAvailable: false },
];

function AuthLoading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#181818' }} />
        <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>
          AUTHENTICATING...
        </p>
      </div>
    </div>
  );
}

function AuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
      <div className="text-center max-w-sm mx-4">
        <Shield size={40} className="mx-auto mb-4" style={{ color: '#B85450' }} />
        <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>
          AUTH FAILED
        </h1>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: '1.5rem' }}>
          Could not verify your session.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onRetry} className="px-6 py-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
            RETRY
          </button>
          <button onClick={() => { localStorage.removeItem('b1-staff-token'); window.location.reload(); }} className="px-6 py-3 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#B85450' }}>
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const navigate = useNavigate();
  const { staff, token, loading: authLoading, error: authError, isAdmin, isManager, logout } = useStaffAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inventory'>('active');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [staffNoteInput, setStaffNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const demo = isDemoMode();

  useEffect(() => {
    if (authLoading) return;
    if (!staff || !token) {
      navigate('/staff-login');
    } else {
      setAuthChecked(true);
    }
  }, [authLoading, staff, token, navigate]);

  if (authLoading) return <AuthLoading />;
  if (authError && !staff && !demo) return <AuthError onRetry={() => window.location.reload()} />;
  if (!authChecked || !staff || !token) return null;

  return (
    <StaffDashboard
      staff={staff}
      isAdmin={isAdmin}
      isManager={isManager}
      logout={logout}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
      newOrderAlert={newOrderAlert}
      setNewOrderAlert={setNewOrderAlert}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      expandedOrder={expandedOrder}
      setExpandedOrder={setExpandedOrder}
      staffNoteInput={staffNoteInput}
      setStaffNoteInput={setStaffNoteInput}
      showNoteInput={showNoteInput}
      setShowNoteInput={setShowNoteInput}
      navigate={navigate}
      demo={demo}
    />
  );
}

function StaffDashboard({
  staff, isAdmin, isManager, logout, soundEnabled, setSoundEnabled,
  newOrderAlert, setNewOrderAlert, activeTab, setActiveTab,
  expandedOrder, setExpandedOrder, staffNoteInput, setStaffNoteInput,
  showNoteInput, setShowNoteInput, navigate, demo,
}: any) {
  const utils = trpc.useUtils();
  const { data: apiActiveOrders } = trpc.staff.activeOrders.useQuery(undefined, { refetchInterval: 5000, enabled: !demo });
  const { data: apiStats } = trpc.staff.todayStats.useQuery(undefined, { refetchInterval: 10000, enabled: !demo });
  const { data: apiMenuItems } = trpc.menu.listByCategory.useQuery({ category: 'coffee' }, { enabled: !demo });
  const { data: apiPastryItems } = trpc.menu.listByCategory.useQuery({ category: 'pastries' }, { enabled: !demo });
  const { data: apiBreadItems } = trpc.menu.listByCategory.useQuery({ category: 'bread' }, { enabled: !demo });
  const { data: apiInventoryList } = trpc.inventory.list.useQuery(undefined, { refetchInterval: 10000, enabled: !demo });

  const updateStatus = trpc.staff.updateStatus.useMutation({ onSuccess: () => { utils.staff.activeOrders.invalidate(); utils.staff.todayStats.invalidate(); } });
  const addStaffNote = trpc.staff.addStaffNote.useMutation({ onSuccess: () => utils.staff.activeOrders.invalidate() });
  const toggleInventory = trpc.inventory.toggle.useMutation({ onSuccess: () => { utils.inventory.list.invalidate(); utils.menu.listByCategory.invalidate(); } });

  // Use demo data or API data
  const activeOrders = demo ? DEMO_ORDERS : apiActiveOrders;
  const stats = demo ? DEMO_STATS : apiStats;
  const allMenuItems = demo ? DEMO_MENU.slice(0, 9) : apiMenuItems;
  const pastryItems = demo ? DEMO_MENU.slice(9, 12) : apiPastryItems;
  const breadItems = demo ? DEMO_MENU.slice(12) : apiBreadItems;
  const inventoryList = demo ? DEMO_INVENTORY : apiInventoryList;

  const handleStatusChange = (orderId: number, status: string) => {
    if (demo) { alert(`[DEMO] Would update order ${orderId} to ${status}`); return; }
    updateStatus.mutate({ orderId, status: status as any });
  };
  const handleAddNote = (orderId: number) => {
    if (demo) { setStaffNoteInput(''); setShowNoteInput(null); return; }
    if (!staffNoteInput.trim()) return; addStaffNote.mutate({ orderId, note: staffNoteInput }); setStaffNoteInput(''); setShowNoteInput(null);
  };

  const getTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s`; if (diff < 3600) return `${Math.floor(diff / 60)}m`; return `${Math.floor(diff / 3600)}h`;
  };

  const invMap = new Map((inventoryList || []).map((i: any) => [i.menuItemId, i.isAvailable]));
  const allItems = [...(allMenuItems || []), ...(pastryItems || []), ...(breadItems || [])];

  return (
    <div className="min-h-[100dvh]" style={{ background: '#F3F2EE' }}>
      {demo && (
        <div className="fixed top-0 left-0 right-0 z-[300] py-2 px-6 flex items-center justify-center gap-2" style={{ background: '#5E8B8B' }}>
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F3F2EE' }}>
            DEMO MODE — Changes are not saved
          </span>
        </div>
      )}
      {newOrderAlert && (
        <div className="fixed top-0 left-0 right-0 z-[300] py-4 px-6 flex items-center justify-center gap-3 animate-pulse" style={{ background: '#181818', marginTop: demo ? '28px' : 0 }}>
          <Bell size={20} style={{ color: '#F3F2EE' }} /><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F3F2EE' }}>NEW ORDER: {newOrderAlert}</span><button onClick={() => setNewOrderAlert(null)}><X size={16} style={{ color: '#F3F2EE' }} /></button>
        </div>
      )}

      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#F3F2EE', marginTop: demo ? '28px' : 0 }}>
        <div className="content-container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/b1-logo-dark.png" alt="B1" className="h-8 w-auto" />
            <div>
              <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>STAFF DASHBOARD</h1>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>ORDER MANAGEMENT</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {demo && (
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', background: 'rgba(94,139,139,0.15)', color: '#5E8B8B' }}>DEMO</span>
            )}
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-7 h-7 flex items-center justify-center" style={{ background: `${roleColors[staff.role]}20` }}>
                <Shield size={14} style={{ color: roleColors[staff.role] }} />
              </div>
              <div>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#181818', display: 'block' }}>{staff.name}</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: roleColors[staff.role] }}>{staff.role.toUpperCase()}</span>
              </div>
            </div>
            {isManager && (
              <button onClick={() => navigate('/analytics')} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="Analytics"><BarChart3 size={16} /></button>
            )}
            {isAdmin && (
              <button onClick={() => navigate('/staff-settings')} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="Staff Settings"><Settings size={16} /></button>
            )}
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
            <button onClick={logout} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="Log Out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      {stats && (
        <div className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
          <div className="content-container py-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[{ label: 'ORDERS', value: stats.orderCount, icon: Package }, { label: 'REVENUE', value: `$${stats.totalRevenue.toFixed(0)}`, icon: TrendingUp }, { label: 'PENDING', value: stats.pendingCount, icon: Clock }, { label: 'READY', value: stats.readyCount, icon: Coffee }, { label: 'COMPLETED', value: stats.completedCount, icon: Users }].map((s) => (
              <div key={s.label} className="flex items-center gap-3"><s.icon size={16} style={{ color: '#5E5E5E' }} /><div><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block' }}>{s.label}</span><span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '1.125rem', color: '#181818' }}>{s.value}</span></div></div>
            ))}
          </div>
        </div>
      )}

      <div className="content-container py-6">
        <div className="flex gap-6 mb-6 border-b" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
          <button onClick={() => setActiveTab('active')} className="pb-3 transition-colors" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === 'active' ? '#181818' : '#5E5E5E', borderBottom: activeTab === 'active' ? '2px solid #181818' : '2px solid transparent' }}>ACTIVE ORDERS</button>
          {isManager && (
            <button onClick={() => setActiveTab('inventory')} className="pb-3 transition-colors" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: activeTab === 'inventory' ? '#181818' : '#5E5E5E', borderBottom: activeTab === 'inventory' ? '2px solid #181818' : '2px solid transparent' }}>INVENTORY</button>
          )}
        </div>

        {activeTab === 'active' ? (
          !activeOrders || activeOrders.length === 0 ? (
            <div className="py-20 text-center border" style={{ borderColor: 'rgba(24,24,24,0.08)' }}><Package size={32} style={{ color: '#5E5E5E' }} className="mx-auto mb-4" /><p style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', color: '#5E5E5E' }}>No active orders</p></div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order: any) => (
                <div key={order.id} className="border p-5" style={{ borderColor: order.status === 'pending' ? statusColors.pending : 'rgba(24,24,24,0.08)', background: order.status === 'pending' ? '#E8E4DD' : '#F3F2EE' }}>
                  <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <div className="flex items-start gap-3"><div className="w-3 h-3 mt-1 flex-shrink-0" style={{ background: statusColors[order.status] }} /><div>
                      <div className="flex items-center gap-2 flex-wrap"><span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: '#181818' }}>{order.orderNumber}</span><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: `${statusColors[order.status]}20`, color: statusColors[order.status] }}>{statusLabels[order.status]}</span>{order.paymentMethod === 'pickup' && <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(94,139,94,0.12)', color: '#5E8B5E' }}>PAY AT PICKUP</span>}</div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap"><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>{order.customerName}</span><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>{getTimeAgo(order.createdAt)} ago</span><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>PICKUP: {order.pickupTime}</span></div>
                    </div></div>
                    <div className="flex items-center gap-3"><span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '1rem', color: '#181818' }}>${order.totalAmount.toFixed(2)}</span>{expandedOrder === order.id ? <ChevronUp size={16} style={{ color: '#5E5E5E' }} /> : <ChevronDown size={16} style={{ color: '#5E5E5E' }} />}</div>
                  </div>
                  {expandedOrder === order.id && (
                    <div className="pl-6 border-t pt-3 mt-3" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                      {order.items.map((item: any) => (<div key={item.id} className="flex items-center gap-2 py-0.5"><span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>{item.quantity}x</span><span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', color: '#181818' }}>{item.itemName}</span>{item.note && <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>({item.note})</span>}</div>))}
                      {order.orderNote && <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', marginTop: '0.5rem' }}>CUSTOMER NOTE: {order.orderNote}</p>}
                      {order.staffNote && <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E8B8B', marginTop: '0.5rem' }}>STAFF NOTE: {order.staffNote}</p>}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {order.status === 'pending' && (<><button onClick={() => handleStatusChange(order.id, 'confirmed')} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: '1px solid #181818', background: 'transparent', color: '#181818' }} className="hover:bg-[#181818] hover:text-[#F3F2EE] transition-all">CONFIRM</button><button onClick={() => handleStatusChange(order.id, 'cancelled')} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: '1px solid rgba(24,24,24,0.15)', background: 'transparent', color: '#5E5E5E' }} className="hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all">CANCEL</button></>)}
                        {order.status === 'confirmed' && <button onClick={() => handleStatusChange(order.id, 'ready')} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: '1px solid #5E8B5E', background: 'transparent', color: '#5E8B5E' }} className="hover:bg-[#5E8B5E] hover:text-[#F3F2EE] transition-all">MARK READY</button>}
                        {order.status === 'ready' && <button onClick={() => handleStatusChange(order.id, 'completed')} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: '1px solid #181818', background: '#181818', color: '#F3F2EE' }} className="hover:opacity-85">MARK PICKED UP</button>}
                        <button onClick={() => setShowNoteInput(showNoteInput === order.id ? null : order.id)} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px', border: '1px solid rgba(24,24,24,0.15)', background: 'transparent', color: '#5E5E5E' }} className="hover:text-[#181818] transition-all flex items-center gap-1"><StickyNote size={12} /> NOTE</button>
                      </div>
                      {showNoteInput === order.id && (<div className="mt-3 flex gap-2"><input type="text" value={staffNoteInput} onChange={(e) => setStaffNoteInput(e.target.value)} placeholder="Add internal note..." className="flex-1 bg-transparent border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }} /><button onClick={() => handleAddNote(order.id)} style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', background: '#181818', color: '#F3F2EE', border: 'none' }}>ADD</button></div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: '1rem' }}>TOGGLE ITEMS SOLD OUT / AVAILABLE</p>
            <div className="space-y-1">
              {allItems.map((item: any) => {
                const isAvailable = invMap.get(item.id) ?? true;
                return (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b px-3" style={{ borderColor: 'rgba(24,24,24,0.06)', background: isAvailable ? 'transparent' : 'rgba(184,84,80,0.04)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: isAvailable ? '#5E8B5E' : '#B85450' }} />
                      <span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: isAvailable ? '#181818' : '#5E5E5E', textDecoration: isAvailable ? 'none' : 'line-through' }}>{item.name}</span>
                      {!isAvailable && <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(184,84,80,0.12)', color: '#B85450' }}>SOLD OUT</span>}
                    </div>
                    <button onClick={() => { if (demo) { alert(`[DEMO] Would toggle ${item.name}`); return; } toggleInventory.mutate({ menuItemId: item.id, isAvailable: !isAvailable }); }}
                      className="flex items-center gap-2 transition-all" style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: isAvailable ? '#5E8B5E' : '#B85450', background: 'transparent', border: 'none' }}>
                      {isAvailable ? <ToggleRight size={24} className="text-[#5E8B5E]" /> : <ToggleLeft size={24} className="text-[#B85450]" />}
                      {isAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                    </button>
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
