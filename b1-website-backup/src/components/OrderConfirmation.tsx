import { useEffect, useState, useRef } from 'react';
import { Check, Clock, Bell } from 'lucide-react';

interface OrderData {
  id: string; name: string; pickupTime: string; total: number; timestamp: string;
}

interface OrderConfirmationProps { onClose: () => void; }

export default function OrderConfirmation({ onClose }: OrderConfirmationProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [eta, setEta] = useState(8);
  const [pushEnabled, setPushEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const saved = localStorage.getItem('b1-last-order');
    if (saved) setOrder(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!order) return;
    // Calculate ETA from pickup time
    let mins = 8;
    if (order.pickupTime.includes('10')) mins = 10;
    else if (order.pickupTime.includes('15')) mins = 15;
    else if (order.pickupTime.includes('20')) mins = 20;
    else if (order.pickupTime.includes('30')) mins = 30;
    setEta(mins);

    timerRef.current = setInterval(() => {
      setEta((prev) => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; });
    }, 60000);
    return () => clearInterval(timerRef.current);
  }, [order]);

  useEffect(() => { const t = setTimeout(onClose, 30000); return () => clearTimeout(t); }, [onClose]);

  const subscribePush = async () => {
    if (!('Notification' in window) || !order) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    setPushEnabled(true);
    // Store phone for push targeting
    const phone = localStorage.getItem('b1-phone');
    if (phone) {
      // In production, subscribe to push service here
      new Notification('B1 by Backhaus', { body: `We'll notify you when order ${order.id} is ready!`, icon: '/images/b1-logo-dark.png' });
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(24,24,24,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-md" style={{ background: 'var(--color-base)' }}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(94,139,94,0.12)' }}>
            <Check size={32} className="text-[#5E8B5E]" />
          </div>
          <span className="font-data text-[var(--color-mid)]">ORDER CONFIRMED</span>
          <h3 className="font-category text-[var(--color-ink)] mt-3">THANK YOU, {order.name.split(' ')[0].toUpperCase()}</h3>

          {/* ETA Countdown */}
          <div className="mt-6 p-4 border" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={16} className="text-[var(--color-mid)]" />
              <span className="font-data text-[var(--color-mid)]">ESTIMATED WAIT</span>
            </div>
            <p className="font-section" style={{ fontSize: '2rem' }}>{eta <= 0 ? 'READY SOON' : `~${eta} MIN`}</p>
            <p className="font-data text-[var(--color-mid)] mt-2">ORDER REF: {order.id}</p>
            <p className="font-price text-[var(--color-ink)] mt-1">TOTAL: ${order.total.toFixed(2)}</p>
          </div>

          {/* Push Notification CTA */}
          {!pushEnabled && 'Notification' in window && (
            <button onClick={subscribePush}
              className="mt-4 w-full py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all flex items-center justify-center gap-2 font-button">
              <Bell size={16} /> GET NOTIFIED WHEN READY
            </button>
          )}
          {pushEnabled && <p className="font-data text-[#5E8B5E] mt-3">NOTIFICATIONS ENABLED — WE'LL LET YOU KNOW!</p>}

          <p className="font-item-desc text-[var(--color-mid)] mt-4">Show your order reference at the counter.</p>
          <button onClick={onClose} className="font-button mt-6 px-10 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">CLOSE</button>
        </div>
      </div>
    </div>
  );
}
