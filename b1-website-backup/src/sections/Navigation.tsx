import { useEffect, useRef, useState } from 'react';
import { X, ShoppingBag, UserCog } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import QueueStatus from '@/components/QueueStatus';

interface NavigationProps {
  onMenuClick: (id: string) => void;
}

export default function Navigation({ onMenuClick }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [hidden, setHidden] = useState(false);
  const { totalItems, setIsOpen } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 64 && currentY > lastScrollY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'MENU', id: 'menu' },
    { label: 'ABOUT', id: 'about' },
    { label: 'CONTACT', id: 'contact' },
  ];

  const handleLinkClick = (id: string) => {
    setMobileOpen(false);
    onMenuClick(id);
  };

  return (
    <>
      <nav
        ref={navRef}
        data-nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ease"
        style={{
          background: 'rgba(243, 242, 238, 0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(24, 24, 24, 0.08)',
          transform: hidden ? 'translateY(-64px)' : 'translateY(0)',
          transitionProperty: 'transform, background, backdrop-filter, border-bottom-color',
        }}
      >
        <div className="content-container w-full flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => onMenuClick('hero')} className="flex items-center">
            <img
              data-nav-logo
              src="/images/b1-logo-dark.png"
              alt="B1 by Backhaus"
              className="h-9 w-auto transition-all duration-300"
            />
          </button>

          {/* Desktop: Queue Status */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
            <QueueStatus />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-6">
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  data-nav-link
                  onClick={() => handleLinkClick(link.id)}
                  className="font-nav text-[var(--color-ink)] hover:opacity-40 transition-opacity duration-200"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Staff Portal Link */}
            <button
              onClick={() => { window.location.href = '/#/staff-login'; }}
              className="flex items-center gap-1.5 p-2 hover:opacity-60 transition-opacity"
              title="Staff Portal"
            >
              <UserCog size={18} className="text-[var(--color-ink)]" />
              <span className="font-data text-[0.625rem] text-[var(--color-ink)]">STAFF</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 hover:opacity-60 transition-opacity"
              aria-label="View order"
            >
              <ShoppingBag size={20} className="text-[var(--color-ink)]" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center font-data text-[0.5rem]" style={{ background: 'var(--color-ink)', color: 'var(--color-base)' }}>
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              data-nav-hamburger
              className="md:hidden flex flex-col gap-[6px] p-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <span className="w-6 h-[2px] bg-[var(--color-ink)]" />
              <span className="w-6 h-[2px] bg-[var(--color-ink)]" />
              <span className="w-6 h-[2px] bg-[var(--color-ink)]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--color-base)] flex flex-col items-center justify-center gap-8">
          <button className="absolute top-4 right-4 p-2" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={24} className="text-[var(--color-ink)]" />
          </button>
          {navLinks.map((link, i) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className="font-category text-[var(--color-ink)] menu-item-animated"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {link.label}
            </button>
          ))}
          {/* Mobile staff shortcut */}
          <button
            onClick={() => { setMobileOpen(false); window.location.href = '/#/staff-login'; }}
            className="font-category text-[var(--color-ink)] menu-item-animated flex items-center gap-3"
            style={{ animationDelay: '300ms' }}
          >
            <UserCog size={20} />
            STAFF PORTAL
          </button>
          {/* Mobile cart shortcut */}
          <button
            onClick={() => { setMobileOpen(false); setIsOpen(true); }}
            className="font-category text-[var(--color-ink)] menu-item-animated flex items-center gap-3"
            style={{ animationDelay: '400ms' }}
          >
            <ShoppingBag size={20} />
            YOUR ORDER {totalItems > 0 && `(${totalItems})`}
          </button>
        </div>
      )}
    </>
  );
}
