import { useState, useRef, useEffect } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import { trpc } from '@/providers/trpc';

export default function ReferralSection() {
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const { data: referral } = trpc.referral.getOrCreate.useQuery(
    { phone, name: name || undefined },
    { enabled: !!phone && phone.length >= 8 }
  );

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCopy = () => {
    if (referral?.code) {
      const url = `${window.location.origin}/?ref=${referral.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section ref={sectionRef} className="py-12 border-t" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <Gift size={16} className="text-[var(--color-mid)]" />
            <span className="font-data text-[var(--color-mid)]">REFER A FRIEND</span>
          </div>
          <h2 className="font-section text-[var(--color-ink)] mb-3" style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.4s ease' }}>
            GIVE $5, GET $5
          </h2>
          <p className="font-body text-[var(--color-mid)] mb-6" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease', transitionDelay: '100ms' }}>
            Share your unique link. When a friend places their first order, you both get $5 credit.
          </p>

          {!phone ? (
            <div className="flex gap-2" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: '200ms' }}>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="YOUR PHONE" className="flex-1 bg-transparent border px-4 py-3 font-form-input focus:border-[var(--color-ink)] focus:outline-none transition-colors" style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
          ) : referral ? (
            <div className="border p-6" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)', opacity: revealed ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: '200ms' }}>
              <span className="font-data text-[var(--color-mid)] block mb-2">YOUR REFERRAL LINK</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-price text-lg bg-[var(--color-base)] px-4 py-3 border text-left" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
                  {window.location.origin}/?ref={referral.code}
                </code>
                <button onClick={handleCopy} className="px-4 py-3 border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div><span className="font-data text-[var(--color-mid)] block">FRIENDS JOINED</span><span className="font-price text-2xl">{referral.uses}</span></div>
                <div><span className="font-data text-[var(--color-mid)] block">CREDIT EARNED</span><span className="font-price text-2xl">${referral.creditEarned}</span></div>
              </div>
            </div>
          ) : (
            <p className="font-data text-[var(--color-mid)]">Loading your referral code...</p>
          )}
        </div>
      </div>
    </section>
  );
}
