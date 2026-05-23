import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, Search, RotateCcw, Clock, Package, Star } from 'lucide-react';

export default function OrderLookup() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);

  const { data: orders, isLoading } = trpc.order.customerHistory.useQuery(
    { phone },
    { enabled: searched && phone.length > 5 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length > 5) setSearched(true);
  };

  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState<string | null>(null);

  const submitReview = trpc.reviews.create.useMutation({
    onSuccess: (_, vars) => { setReviewSubmitted(vars.orderId.toString()); setReviewingOrder(null); },
  });

  const cancelOrder = trpc.order.cancel.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = { pending: '#C4953A', confirmed: '#5E8B8B', ready: '#5E8B5E', completed: '#5E5E5E', cancelled: '#B85450' };
    return colors[s] || '#5E5E5E';
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--color-base)' }}>
      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="content-container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 border hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-section" style={{ fontSize: '1.25rem' }}>MY ORDERS</h1>
            <span className="font-data text-[var(--color-mid)]">ORDER HISTORY & TRACKING</span>
          </div>
        </div>
      </header>

      <div className="content-container py-8 max-w-lg">
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="ENTER YOUR PHONE NUMBER" required
            className="flex-1 bg-transparent border px-4 py-3 font-form-input text-[var(--color-ink)] placeholder:text-[rgba(94,94,94,0.5)] placeholder:font-[Geist_Mono] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[var(--color-ink)] focus:outline-none transition-colors"
            style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
          <button type="submit" className="px-4 py-3 border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">
            <Search size={18} />
          </button>
        </form>

        {isLoading && <p className="font-data text-[var(--color-mid)]">Loading...</p>}

        {orders && orders.length === 0 && searched && (
          <div className="text-center py-12">
            <Package size={32} className="text-[var(--color-mid)] mx-auto mb-4" />
            <p className="font-body text-[var(--color-mid)]">No orders found for this number.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: order.status === 'ready' ? 'var(--color-cream)' : 'var(--color-base)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-item-name">{order.orderNumber}</span>
                    <span className="font-data px-1.5 py-0.5" style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-price">${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <Clock size={10} className="text-[var(--color-mid)]" />
                  <span className="font-data text-[var(--color-mid)]">{new Date(order.createdAt).toLocaleDateString('en-AU')}</span>
                  <span className="font-data text-[var(--color-mid)]">PICKUP: {order.pickupTime}</span>
                  {order.paymentMethod === 'pickup' && <span className="font-data px-1.5 py-0.5" style={{ background: 'rgba(94,139,94,0.12)', color: '#5E8B5E' }}>PAY AT PICKUP</span>}
                </div>

                {order.status === 'pending' && (
                  <button onClick={() => { if (confirm('Cancel this order?')) cancelOrder.mutate({ orderNumber: order.orderNumber }); }}
                    className="font-data text-[#B85450] hover:underline mb-2">CANCEL ORDER</button>
                )}

                {order.status === 'completed' && reviewingOrder !== order.orderNumber && reviewSubmitted !== order.id.toString() && (
                  <button onClick={() => setReviewingOrder(order.orderNumber)}
                    className="font-data text-[var(--color-mid)] hover:text-[var(--color-ink)] transition-colors flex items-center gap-1">
                    <Star size={10} /> RATE YOUR ORDER
                  </button>
                )}

                {reviewSubmitted === order.id.toString() && <p className="font-data text-[#5E8B5E]">THANKS FOR YOUR REVIEW!</p>}

                {reviewingOrder === order.orderNumber && (
                  <div className="mt-3 p-3 border" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setRating(s)} className="w-8 h-8 border flex items-center justify-center transition-all"
                          style={{ borderColor: s <= rating ? '#C4953A' : 'rgba(24,24,24,0.15)', background: s <= rating ? '#C4953A20' : 'transparent' }}>
                          <Star size={14} style={{ color: s <= rating ? '#C4953A' : 'var(--color-mid)' }} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was it? (optional)"
                        className="flex-1 bg-transparent border px-3 py-2 font-form-input text-sm focus:outline-none focus:border-[var(--color-ink)]" style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                      <button onClick={() => submitReview.mutate({ orderId: order.id, customerName: order.customerName, rating, comment: comment || undefined })}
                        className="font-button px-4 py-2 bg-[var(--color-ink)] text-[var(--color-base)]">SUBMIT</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
