import { useState, useRef, useEffect } from 'react';
import { Building2, Check } from 'lucide-react';
import { trpc } from '@/providers/trpc';

export default function CorporateSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactPhone: '', contactEmail: '', billingAddress: '' });
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const create = trpc.corporate.create.useMutation({ onSuccess: () => setSubmitted(true) });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const input = "w-full bg-transparent border px-4 py-3 font-form-input placeholder:text-[rgba(94,94,94,0.5)] placeholder:font-[Geist_Mono] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(24,24,24,0.4)] focus:outline-none transition-colors";

  return (
    <section ref={sectionRef} className="py-[var(--space-section)] border-t" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-grid)]">
          <div style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateX(0)' : 'translateX(-20px)', transition: 'all 0.5s ease' }}>
            <div className="flex items-center gap-3 mb-3"><Building2 size={16} className="text-[var(--color-mid)]" /><span className="font-data text-[var(--color-mid)]">CORPORATE ACCOUNTS</span></div>
            <h2 className="font-section text-[var(--color-ink)] mb-4">COFFEE FOR YOUR TEAM</h2>
            <p className="font-body text-[var(--color-mid)] mb-6">Regular office orders? Set up a corporate account for easy monthly billing, standing orders, and priority service.</p>
            <div className="space-y-3">
              {['Net-7 / Net-14 / Net-30 payment terms', 'Standing daily or weekly orders', 'Itemised monthly invoicing', 'Dedicated account manager'].map((item) => (
                <div key={item} className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[var(--color-ink)] flex-shrink-0" /><span className="font-item-desc">{item}</span></div>
              ))}
            </div>
          </div>
          <div style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateX(0)' : 'translateX(20px)', transition: 'all 0.5s ease', transitionDelay: '150ms' }}>
            {submitted ? (
              <div className="border p-8 text-center h-full flex flex-col items-center justify-center" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
                <Check size={32} className="text-[#5E8B5E] mb-4" />
                <p className="font-category text-[var(--color-ink)]">APPLICATION SENT!</p>
                <p className="font-body text-[var(--color-mid)] mt-3">We'll contact you within 24 hours to set up your account.</p>
                <button onClick={() => setSubmitted(false)} className="font-button mt-6 px-6 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">NEW APPLICATION</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
                <input type="text" placeholder="COMPANY NAME" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={input} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="text" placeholder="CONTACT NAME" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={input} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="tel" placeholder="PHONE" required value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className={input} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="email" placeholder="EMAIL" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={input} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <textarea placeholder="BILLING ADDRESS" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} rows={2} className={`${input} resize-vertical`} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <button type="submit" disabled={create.isPending} className="font-button w-full py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity disabled:opacity-50">{create.isPending ? 'SENDING...' : 'APPLY FOR CORPORATE ACCOUNT'}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
