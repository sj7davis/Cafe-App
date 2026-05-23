import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';

interface HeroProps {
  onCtaClick: () => void;
}

export default function Hero({ onCtaClick }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sublineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Text reveal animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Split text into characters for reveal
  const splitText = (text: string, reveal: boolean) => {
    return text.split('').map((char, i) => (
      <span
        key={i}
        className="char"
        style={{
          transitionDelay: reveal ? `${i * 30}ms` : '0ms',
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative w-full min-h-[100dvh] overflow-hidden flex items-center justify-center"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-coffee-bar.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--color-overlay)' }}
        />
      </div>

      {/* Blueprint Data Overlay */}
      {/* Top-left: IS—105 */}
      <span className="font-data fixed top-[88px] left-8 z-10 hidden md:block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        IS—105
      </span>

      {/* Top-right: Current Time */}
      <span className="font-data fixed top-[88px] right-8 z-10 hidden md:block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        {currentTime}
      </span>

      {/* Bottom-left: Coordinates */}
      <span className="font-data absolute bottom-10 left-8 z-10 hidden md:block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        -37.7282° E
      </span>

      {/* Bottom-center: Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-2" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        <span className="font-data">SCROLL TO EXPLORE</span>
      </div>

      {/* Bottom-right: Brand code */}
      <span className="font-data absolute bottom-10 right-8 z-10 hidden md:block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        B1BACKHAUS
      </span>

      {/* Horizontal rule line */}
      <div
        className="absolute bottom-[120px] left-0 right-0 h-px hidden md:block"
        style={{ background: 'rgba(243, 242, 238, 0.12)' }}
      />

      {/* Hero Content */}
      <div className="relative z-10 content-container flex flex-col items-center text-center">
        {/* Logo */}
        <img
          src="/images/b1-logo-light.png"
          alt="B1 by Backhaus"
          className="w-[120px] h-[120px] mb-8"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        {/* Headline */}
        <h1
          ref={headlineRef}
          className={`font-display text-[#F3F2EE] text-wrap-balance ${isRevealed ? 'is-revealed' : ''}`}
          style={{ mixBlendMode: 'difference' }}
        >
          <span className="text-reveal">{splitText('B1 BY BACKHAUS', isRevealed)}</span>
        </h1>

        {/* Subheadline */}
        <p
          ref={sublineRef}
          className={`font-tab mt-6 ${isRevealed ? 'is-revealed' : ''}`}
          style={{ color: 'rgba(243, 242, 238, 0.6)' }}
        >
          <span className="text-reveal" style={{ transitionDelay: isRevealed ? '400ms' : '0ms' }}>
            {splitText('PREMIUM COFFEE \u0026 BAKERY \u2014 TAKE AWAY ONLY', isRevealed)}
          </span>
        </p>

        {/* CTA Button */}
        <button
          ref={ctaRef}
          onClick={onCtaClick}
          className="font-button mt-10 px-10 py-4 border transition-all duration-300 ease hover:bg-[#F3F2EE] hover:text-[#181818]"
          style={{
            borderColor: 'rgba(243, 242, 238, 0.4)',
            color: '#F3F2EE',
            background: 'transparent',
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 500ms ease, transform 500ms ease, background-color 300ms ease, color 300ms ease',
            transitionDelay: isRevealed ? '600ms' : '0ms',
          }}
        >
          VIEW MENU →
        </button>

        {/* Scroll Indicator */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 md:hidden">
          <ArrowDown
            size={16}
            className="animate-bounce-subtle"
            style={{ color: 'rgba(243, 242, 238, 0.5)' }}
          />
        </div>
      </div>
    </section>
  );
}
