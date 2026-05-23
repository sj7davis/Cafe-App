import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { trpc } from '@/providers/trpc';

const pickupSlots = ['ASAP (~5 min)', '10 min', '15 min', '20 min', '30 min'];

interface CheckoutModalProps { onClose: () => void; onSuccess: () => void; }

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  const { items, totalPrice, clearCart } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('ASAP (~5 min)');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pickup' | 'online'>('pickup');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrder = trpc.order.create.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('b1-last-order', JSON.stringify({ id: data.orderNumber, name, pickupTime: selectedSlot, total: finalTotal, timestamp: new Date().toISOString() }));
      localStorage.setItem('b1-phone', phone);
      clearCart();
      onSuccess();
    },
    onError: () => setIsSubmitting(false),
  });

  const checkGiftCard = trpc.giftCard.checkBalance.useQuery(
    { code: giftCardCode },
    { enabled: giftCardCode.length >= 10 }
  );

  const redeemGiftCard = trpc.giftCard.redeem.useMutation();

  const giftCardDiscount = checkGiftCard.data ? Math.min(parseFloat(checkGiftCard.data.balance.toString()), totalPrice) : 0;
  const finalTotal = Math.max(0, totalPrice - giftCardDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    if (giftCardCode && giftCardDiscount > 0) {
      redeemGiftCard.mutate({ code: giftCardCode, amount: giftCardDiscount });
    }
    createOrder.mutate({
      customerName: name, customerPhone: phone, pickupTime: selectedSlot,
      orderNote: orderNote || undefined, paymentMethod,
      totalAmount: finalTotal,
      items: items.map((item) => ({ menuItemId: item.id, itemName: item.name, quantity: item.quantity, unitPrice: item.price, note: item.note || undefined })),
    });
  };

  const inputClasses = "w-full bg-transparent border px-4 py-3.5 text-[var(--color-ink)] font-form-input placeholder:text-[rgba(94,94,94,0.5)] placeholder:font-[Geist_Mono] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(24,24,24,0.4)] focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(24,24,24,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--color-base)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 hover:opacity-50"><X size={20} className="text-[var(--color-ink)]" /></button>
        <div className="p-8">
          <span className="font-data text-[var(--color-mid)]">CLICK & COLLECT</span>
          <h3 className="font-category text-[var(--color-ink)] mt-2">PRE-ORDER</h3>

          <div className="mt-6 p-4 border" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
            <span className="font-data text-[var(--color-mid)] block mb-2">YOUR ORDER</span>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-1"><span className="font-item-desc">{item.quantity}x {item.name}</span><span className="font-price text-[var(--color-mid)]">${(item.price * item.quantity).toFixed(2)}</span></div>
            ))}
            {giftCardDiscount > 0 && <div className="flex justify-between py-1"><span className="font-item-desc text-[#5E8B5E]">Gift Card</span><span className="font-price text-[#5E8B5E]">-${giftCardDiscount.toFixed(2)}</span></div>}
            <div className="mt-2 pt-2 border-t flex justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
              <span className="font-nav">TOTAL</span><span className="font-price">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-6">
            <label className="font-data text-[var(--color-mid)] block mb-2">PAYMENT METHOD</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'pickup' as const, label: 'PAY AT PICKUP' }, { key: 'online' as const, label: 'PAY ONLINE (Coming Soon)' }].map((opt) => (
                <button key={opt.key} type="button" onClick={() => setPaymentMethod(opt.key)} disabled={opt.key === 'online'}
                  className="font-data py-3 border text-center transition-all disabled:opacity-40"
                  style={{ borderColor: paymentMethod === opt.key ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: paymentMethod === opt.key ? 'var(--color-ink)' : 'transparent', color: paymentMethod === opt.key ? 'var(--color-base)' : 'var(--color-mid)' }}>
                  {paymentMethod === opt.key && <Check size={10} className="inline mr-1" />}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gift Card */}
          <div className="mt-4">
            <label className="font-data text-[var(--color-mid)] block mb-2">GIFT CARD CODE (OPTIONAL)</label>
            <div className="flex gap-2">
              <input type="text" value={giftCardCode} onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                placeholder="B1XXXXXX" className={`${inputClasses} flex-1`} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
            {checkGiftCard.data && <p className="font-data text-[#5E8B5E] mt-1">Balance: ${checkGiftCard.data.balance.toFixed(2)}</p>}
            {checkGiftCard.data === null && giftCardCode.length >= 10 && <p className="font-data text-[#B85450] mt-1">Invalid code</p>}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-data text-[var(--color-mid)] block mb-2">YOUR NAME</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="FIRST & LAST NAME" className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
            <div>
              <label className="font-data text-[var(--color-mid)] block mb-2">PHONE NUMBER</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04XX XXX XXX" className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
            <div>
              <label className="font-data text-[var(--color-mid)] block mb-2">PICKUP TIME</label>
              <div className="grid grid-cols-3 gap-2">
                {pickupSlots.map((slot) => (
                  <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}
                    className="font-data py-2.5 px-2 border text-center transition-all"
                    style={{ borderColor: selectedSlot === slot ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: selectedSlot === slot ? 'var(--color-ink)' : 'transparent', color: selectedSlot === slot ? 'var(--color-base)' : 'var(--color-mid)' }}>
                    {selectedSlot === slot && <Check size={10} className="inline mr-1" />}{slot}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-data text-[var(--color-mid)] block mb-2">ORDER NOTES (OPTIONAL)</label>
              <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="EXTRA HOT / NO SUGAR / DECAF..." rows={2} className={`${inputClasses} resize-vertical`} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
            <button type="submit" disabled={isSubmitting} className="font-button w-full py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity disabled:opacity-50">
              {isSubmitting ? 'PLACING ORDER...' : `PLACE ORDER${finalTotal > 0 ? ` — $${finalTotal.toFixed(2)}` : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
