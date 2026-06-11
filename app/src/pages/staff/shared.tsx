// Shared helpers and small components for the staff dashboard tabs.
import React from 'react';





// ─── Role-based tab definitions ───

export const CHART_COLORS = ['#1c1917', '#5E8B8B', '#d97706', '#16a34a', '#2563eb', '#dc2626'];
export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function playNewOrderChime() {
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
  } catch { /* browser may block audio without a user gesture */ }
}

export function SidebarItem({ icon, label, tab, activeTab, setActiveTab, badge }: {
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

export function printReceipt(order: any, venue: any, printerSize: '80mm' | '58mm' | 'a4' = '80mm') {
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
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=400,height=600');
  if (w) { w.document.write(html); w.document.close(); }
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
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

export function PasswordStrengthBar({ password }: { password: string }) {
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

export function getWeekStart(offset: number): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  // Add timezone offset to avoid UTC-vs-local shift
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[local.getDay()]} ${local.getDate()}`;
}

export function formatWeekRange(weekStart: string): string {
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

export function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
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

export function StatusBadge({ status }: { status: string }) {
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
