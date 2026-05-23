import { useState, useRef, useEffect } from 'react';
import { Gift, Check } from 'lucide-react';
import { trpc } from '@/providers/trpc';

const presetAmounts = [25, 50, 75, 100];

export default function GiftCardSection() {
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const createCard = trpc.giftCard.create.useMutation({
    onSuccess: (data) => setCode(data.code),
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (finalAmount < 10) return;
    createCard.mutate({
      amount: finalAmount,
      senderName: senderName || undefined,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      message: message || undefined,
    });
  };

  const inputClasses = "w-full bg-transparent border px-4 py-3 text-[var(--color-ink)] font-form-input placeholder:text-[rgba(94,94,94,0.5)] placeholder:font-[Geist_Mono] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(24,24,24,0.4)] focus:outline-none transition-colors";

  return (
    <section ref={sectionRef} className="py-[var(--space-section)] border-t" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-2" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <Gift size={16} className="text-[var(--color-mid)]" />
            <span className="font-data text-[var(--color-mid)]">GIFT CARDS</span>
          </div>
          <h2 className="font-section text-[var(--color-ink)] mb-8" style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.4s ease' }}>
            GIVE THE GIFT OF B1
          </h2>

          {code ? (
            <div className="border p-8 text-center" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
              <Check size={32} className="text-[#5E8B5E] mx-auto mb-4" />
              <p className="font-category text-[var(--color-ink)]">GIFT CARD CREATED!</p>
              <div className="mt-6 p-4 border" style={{ background: 'var(--color-base)', borderColor: 'var(--color-ink)' }}>
                <span className="font-data text-[var(--color-mid)] block mb-2">CARD CODE</span>
                <span className="font-price text-[var(--color-ink)] text-2xl tracking-widest">{code}</span>
              </div>
              <p className="font-body text-[var(--color-mid)] mt-4">Share this code with the recipient. They can redeem it at checkout.</p>
              <button onClick={() => setCode(null)} className="font-button mt-6 px-6 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">BUY ANOTHER</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: '200ms' }}>
              <div>
                <label className="font-data text-[var(--color-mid)] block mb-2">AMOUNT</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {presetAmounts.map((a) => (
                    <button key={a} type="button" onClick={() => { setAmount(a); setCustomAmount(''); }}
                      className="font-button py-3 border transition-all"
                      style={{ borderColor: amount === a && !customAmount ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: amount === a && !customAmount ? 'var(--color-ink)' : 'transparent', color: amount === a && !customAmount ? 'var(--color-base)' : 'var(--color-ink)' }}>
                      ${a}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="CUSTOM AMOUNT" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                  className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} min="10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-data text-[var(--color-mid)] block mb-2">YOUR NAME</label>
                  <input type="text" placeholder="FROM" value={senderName} onChange={(e) => setSenderName(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                </div>
                <div>
                  <label className="font-data text-[var(--color-mid)] block mb-2">RECIPIENT NAME</label>
                  <input type="text" placeholder="TO" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                </div>
              </div>
              <div>
                <label className="font-data text-[var(--color-mid)] block mb-2">RECIPIENT PHONE (OPTIONAL)</label>
                <input type="tel" placeholder="04XX XXX XXX" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
              </div>
              <div>
                <label className="font-data text-[var(--color-mid)] block mb-2">MESSAGE (OPTIONAL)</label>
                <textarea placeholder="HAPPY BIRTHDAY..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                  className={`${inputClasses} resize-vertical`} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
              </div>
              <button type="submit" disabled={createCard.isPending}
                className="font-button w-full py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity disabled:opacity-50">
                {createCard.isPending ? 'CREATING...' : `CREATE $${customAmount || amount} GIFT CARD`}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
