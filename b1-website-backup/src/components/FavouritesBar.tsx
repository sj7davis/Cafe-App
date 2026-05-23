import { useEffect, useRef, useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useCart } from '@/context/CartContext';

export default function FavouritesBar() {
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '');
  const [showInput, setShowInput] = useState(!phone);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const { addItem, setIsOpen } = useCart();

  const { data: usualItems } = trpc.menu.yourUsual.useQuery(
    { phone },
    { enabled: !!phone }
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('b1-phone', phone);
    setShowInput(false);
  };

  if (!usualItems || usualItems.length === 0) return (
    <section ref={sectionRef} className="py-8 border-t" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        {showInput ? (
          <form onSubmit={handleSavePhone} className="flex items-center gap-3 max-w-md">
            <span className="font-data text-[var(--color-mid)]">SAVE YOUR PHONE FOR REORDERING:</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="04XX XXX XXX" required
              className="flex-1 bg-transparent border px-3 py-2 font-form-input text-[var(--color-ink)] placeholder:text-[rgba(94,94,94,0.5)] focus:border-[var(--color-ink)] focus:outline-none transition-colors"
              style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            <button type="submit" className="font-button px-4 py-2 bg-[var(--color-ink)] text-[var(--color-base)]">SAVE</button>
          </form>
        ) : (
          <button onClick={() => setShowInput(true)}
            className="font-data text-[var(--color-mid)] hover:text-[var(--color-ink)] transition-colors flex items-center gap-2">
            <Heart size={12} /> SAVE YOUR PHONE FOR QUICK REORDERING
          </button>
        )}
      </div>
    </section>
  );

  return (
    <section ref={sectionRef} className="py-8 border-t" style={{ background: 'var(--color-cream)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={14} className="text-[var(--color-mid)]" />
          <span className="font-data text-[var(--color-mid)]">YOUR USUAL</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {usualItems.map((item) => (
            <button key={item.id} onClick={() => { addItem({ id: item.id, name: item.name, description: item.description || '', price: item.price }); setIsOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 border hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] hover:border-[var(--color-ink)] transition-all duration-200 group"
              style={{ borderColor: 'rgba(24,24,24,0.15)', opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <span className="font-item-name">{item.name}</span>
              <span className="font-price text-[var(--color-mid)] group-hover:text-[rgba(243,242,238,0.6)]">${item.price.toFixed(2)}</span>
              <Plus size={14} className="text-[var(--color-mid)] group-hover:text-[var(--color-base)]" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
