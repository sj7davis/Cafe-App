import { useState, useRef, useEffect } from 'react';
import { Coffee, Check } from 'lucide-react';
import { trpc } from '@/providers/trpc';

const plans = [
  { name: "Daily Coffee", credits: 10, price: 52, desc: "10 coffees — $5.20 each (save $3)" },
  { name: "The Regular", credits: 20, price: 99, desc: "20 coffees — $4.95 each (save $11)" },
  { name: "Office Fuel", credits: 50, price: 240, desc: "50 coffees — $4.80 each (save $35)" },
];

export default function SubscriptionSection() {
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '');
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [purchased, setPurchased] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const createPass = trpc.subscription.create.useMutation({ onSuccess: () => setPurchased(true) });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePurchase = () => {
    const plan = plans[selectedPlan];
    createPass.mutate({ phone, name: plan.name, totalCredits: plan.credits, price: plan.price });
  };

  const { data: myPasses } = trpc.subscription.list.useQuery({ phone }, { enabled: !!phone });

  return (
    <section ref={sectionRef} className="py-[var(--space-section)] border-t" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <Coffee size={16} className="text-[var(--color-mid)]" />
            <span className="font-data text-[var(--color-mid)]">COFFEE SUBSCRIPTION</span>
          </div>
          <h2 className="font-section text-[var(--color-ink)] mb-2" style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.4s ease' }}>
            BUY IN BULK, SAVE MORE
          </h2>
          <p className="font-body text-[var(--color-mid)] mb-8" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease', transitionDelay: '100ms' }}>
            Purchase a coffee pass and redeem one credit per visit. Show your phone at the counter.
          </p>

          {myPasses && myPasses.length > 0 && (
            <div className="mb-8 p-4 border" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
              <span className="font-data text-[var(--color-mid)] block mb-3">YOUR ACTIVE PASSES</span>
              {myPasses.map((pass) => (
                <div key={pass.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                  <span className="font-item-name">{pass.name}</span>
                  <span className="font-price">{pass.remainingCredits} / {pass.totalCredits} remaining</span>
                </div>
              ))}
            </div>
          )}

          {purchased ? (
            <div className="border p-8 text-center" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
              <Check size={32} className="text-[#5E8B5E] mx-auto mb-4" />
              <p className="font-category text-[var(--color-ink)]">PASS PURCHASED!</p>
              <p className="font-body text-[var(--color-mid)] mt-3">Show your phone at the counter to redeem credits.</p>
              <button onClick={() => setPurchased(false)} className="font-button mt-6 px-6 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">BUY ANOTHER</button>
            </div>
          ) : (
            <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: '200ms' }}>
              {!phone && (
                <div className="mb-6">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ENTER YOUR PHONE FIRST" required
                    className="w-full bg-transparent border px-4 py-3 font-form-input text-[var(--color-ink)] placeholder:text-[rgba(94,94,94,0.5)] focus:border-[var(--color-ink)] focus:outline-none transition-colors" style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {plans.map((plan, i) => (
                  <button key={plan.name} onClick={() => setSelectedPlan(i)}
                    className="border p-5 text-left transition-all hover:bg-[var(--color-base)]"
                    style={{ borderColor: selectedPlan === i ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: selectedPlan === i ? 'var(--color-base)' : 'transparent' }}>
                    <span className="font-item-name block">{plan.name}</span>
                    <span className="font-section block my-2" style={{ fontSize: '1.5rem' }}>${plan.price}</span>
                    <span className="font-data text-[var(--color-mid)] block">{plan.credits} CREDITS</span>
                    <span className="font-data text-[#5E8B5E] mt-1 block">{plan.desc}</span>
                  </button>
                ))}
              </div>
              <button onClick={handlePurchase} disabled={!phone || createPass.isPending}
                className="font-button w-full py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity disabled:opacity-50">
                {createPass.isPending ? 'PROCESSING...' : `BUY ${plans[selectedPlan].name} — $${plans[selectedPlan].price}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
