import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { trpc } from '@/providers/trpc';

export default function CateringSection() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const createRequest = trpc.catering.create.useMutation({
    onSuccess: () => setSubmitted(true),
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
    const count = parseInt(guestCount);
    if (count < 6) return;
    createRequest.mutate({ name, phone, email: email || undefined, eventDate, guestCount: count, details: details || undefined });
  };

  const inputClasses = "w-full bg-transparent border px-4 py-3 text-[var(--color-ink)] font-form-input placeholder:text-[rgba(94,94,94,0.5)] placeholder:font-[Geist_Mono] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(24,24,24,0.4)] focus:outline-none transition-colors";

  return (
    <section ref={sectionRef} className="py-[var(--space-section)] border-t" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-grid)]">
          <div style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateX(0)' : 'translateX(-20px)', transition: 'all 0.5s ease' }}>
            <div className="flex items-center gap-3 mb-3">
              <CalendarDays size={16} className="text-[var(--color-mid)]" />
              <span className="font-data text-[var(--color-mid)]">CATERING</span>
            </div>
            <h2 className="font-section text-[var(--color-ink)] mb-4">EVENTS & OFFICE ORDERS</h2>
            <p className="font-body text-[var(--color-mid)] mb-6">
              Planning an event or office meeting? We cater with 24-hour notice for orders of 6 or more items. Fresh pastries, artisan bread, and premium coffee delivered or ready for pickup.
            </p>
            <div className="space-y-3">
              {['Minimum 6 items or $60', '24-hour advance notice', 'Custom selections available', 'Delivery or pickup options'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-[var(--color-ink)] flex-shrink-0" />
                  <span className="font-item-desc text-[var(--color-ink)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateX(0)' : 'translateX(20px)', transition: 'all 0.5s ease', transitionDelay: '150ms' }}>
            {submitted ? (
              <div className="border p-8 text-center h-full flex flex-col items-center justify-center" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
                <Check size={32} className="text-[#5E8B5E] mb-4" />
                <p className="font-category text-[var(--color-ink)]">REQUEST SENT!</p>
                <p className="font-body text-[var(--color-mid)] mt-3">We'll contact you within 24 hours to confirm your catering order.</p>
                <button onClick={() => setSubmitted(false)} className="font-button mt-6 px-6 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">NEW REQUEST</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" placeholder="YOUR NAME" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="tel" placeholder="PHONE" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="email" placeholder="EMAIL (OPTIONAL)" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="date" placeholder="EVENT DATE" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <input type="number" placeholder="NUMBER OF GUESTS (MIN 6)" required value={guestCount} onChange={(e) => setGuestCount(e.target.value)} min="6" className={inputClasses} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <textarea placeholder="TELL US WHAT YOU NEED..." value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className={`${inputClasses} resize-vertical`} style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
                <button type="submit" disabled={createRequest.isPending} className="font-button w-full py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity disabled:opacity-50">
                  {createRequest.isPending ? 'SENDING...' : 'REQUEST QUOTE'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
