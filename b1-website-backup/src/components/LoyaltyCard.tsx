import { useEffect, useRef, useState } from 'react';
import { Coffee } from 'lucide-react';

const MAX_STAMPS = 9;

export default function LoyaltyCard() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [stamps, setStamps] = useState(() => {
    const saved = localStorage.getItem('b1-loyalty');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleStamp = () => {
    const newStamps = (stamps + 1) % (MAX_STAMPS + 1);
    setStamps(newStamps);
    localStorage.setItem('b1-loyalty', String(newStamps));
    if (newStamps === 0) {
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-[var(--space-section)] border-t"
      style={{
        background: 'var(--color-cream)',
        borderColor: 'rgba(24, 24, 24, 0.08)',
      }}
    >
      <div className="content-container">
        <div className="max-w-xl mx-auto">
          <span
            className="font-data block text-center"
            style={{
              color: 'var(--color-mid)',
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            LOYALTY PROGRAM
          </span>
          <h2
            className="font-section text-[var(--color-ink)] text-center mt-3 mb-2"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              transitionDelay: '100ms',
            }}
          >
            B1 REWARDS
          </h2>
          <p
            className="font-body text-[var(--color-mid)] text-center mb-10"
            style={{
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.4s ease',
              transitionDelay: '200ms',
            }}
          >
            Buy 9 coffees, get your 10th free. Ask our staff to stamp your digital card with each visit.
          </p>

          {/* Card */}
          <div
            className="border p-8 relative"
            style={{
              background: 'var(--color-base)',
              borderColor: 'rgba(24, 24, 24, 0.15)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              transitionDelay: '300ms',
            }}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-8">
              <img src="/images/b1-logo-dark.png" alt="B1" className="h-8 w-auto" />
              <span className="font-data text-[var(--color-mid)]">DIGITAL STAMP CARD</span>
            </div>

            {/* Stamps Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {Array.from({ length: MAX_STAMPS }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square flex items-center justify-center border transition-all duration-300"
                  style={{
                    borderColor: i < stamps ? 'var(--color-ink)' : 'rgba(24, 24, 24, 0.15)',
                    background: i < stamps ? 'var(--color-ink)' : 'transparent',
                  }}
                >
                  {i < stamps && <Coffee size={18} className="text-[var(--color-base)]" />}
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="font-data text-[var(--color-mid)]">
                {stamps} / {MAX_STAMPS} STAMPS
              </span>
              <span className="font-data text-[var(--color-mid)]">
                {MAX_STAMPS - stamps} MORE FOR A FREE COFFEE
              </span>
            </div>

            {/* Reward message */}
            {showReward && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'var(--color-ink)' }}
              >
                <div className="text-center">
                  <Coffee size={40} className="text-[var(--color-base)] mx-auto mb-3" />
                  <p className="font-category text-[var(--color-base)]">FREE COFFEE!</p>
                  <p className="font-data mt-2" style={{ color: 'rgba(243,242,238,0.6)' }}>SHOW THIS SCREEN TO STAFF</p>
                </div>
              </div>
            )}
          </div>

          {/* Debug button for demo purposes */}
          <button
            onClick={handleStamp}
            className="font-data mx-auto block mt-6 text-[var(--color-mid)] hover:text-[var(--color-ink)] transition-colors underline"
          >
            [ DEMO: TAP TO ADD STAMP ]
          </button>
        </div>
      </div>
    </section>
  );
}
