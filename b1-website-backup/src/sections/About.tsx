import { useEffect, useRef, useState } from 'react';

interface AboutProps {
  onCtaClick: () => void;
}

export default function About({ onCtaClick }: AboutProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const splitText = (text: string, r: boolean) => {
    return text.split('').map((char, i) => (
      <span
        key={i}
        className="char"
        style={{
          transitionDelay: r ? `${i * 30}ms` : '0ms',
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <section
      ref={sectionRef}
      id="about"
      className="py-[var(--space-section)] border-t"
      style={{
        background: 'var(--color-base)',
        borderColor: 'rgba(24, 24, 24, 0.08)',
      }}
    >
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-[5fr_4fr] gap-[var(--space-grid)]">
          {/* Left Column — Image */}
          <div
            className="overflow-hidden"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateX(0)' : 'translateX(-40px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <img
              src="/images/about-interior.jpg"
              alt="B1 by Backhaus interior"
              className="w-full h-full min-h-[400px] object-cover"
            />
          </div>

          {/* Right Column — Content */}
          <div className="flex flex-col justify-center">
            {/* Data Label */}
            <span
              className="font-data text-[var(--color-mid)]"
              style={{
                opacity: revealed ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              ABOUT — EST. 2024
            </span>

            {/* Headline */}
            <h2 className={`font-section text-[var(--color-ink)] mt-6 text-wrap-balance ${revealed ? 'is-revealed' : ''}`}>
              <span className="text-reveal">{splitText('PRECISION IN EVERY POUR', revealed)}</span>
            </h2>

            {/* Body Paragraph 1 */}
            <div
              className={`mt-8 max-w-[480px] ${revealed ? 'is-revealed' : ''}`}
            >
              <span
                className="text-reveal font-body block"
                style={{ color: 'var(--color-mid)', transitionDelay: revealed ? '200ms' : '0ms' }}
              >
                {splitText(
                  'B1 by Backhaus is a dedicated take-away coffee bar in East Keilor, born from a partnership with Melbourne\'s renowned Backhaus Bakery. We exist for one purpose: to serve exceptional coffee alongside world-class pastries and bread \u2014 fast, precise, and without compromise.',
                  revealed
                )}
              </span>
            </div>

            {/* Body Paragraph 2 */}
            <div
              className={`mt-6 max-w-[480px] ${revealed ? 'is-revealed' : ''}`}
            >
              <span
                className="text-reveal font-body block"
                style={{ color: 'var(--color-mid)', transitionDelay: revealed ? '300ms' : '0ms' }}
              >
                {splitText(
                  'No seating. No distractions. Just you, your coffee, and something warm from the oven. Every bean is sourced with intention. Every loaf is fermented with patience. Every interaction is designed to be effortless.',
                  revealed
                )}
              </span>
            </div>

            {/* CTA Button */}
            <button
              onClick={onCtaClick}
              className="font-button mt-10 self-start px-8 py-3.5 border border-[var(--color-ink)] text-[var(--color-ink)] bg-transparent hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all duration-300"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease, background-color 300ms ease, color 300ms ease',
                transitionDelay: revealed ? '500ms' : '0ms',
              }}
            >
              FIND US →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
