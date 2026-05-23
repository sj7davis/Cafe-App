import { useRef, useState, useEffect } from 'react';
import { Package, Plus } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useCart } from '@/context/CartContext';

export default function BundleDeals() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const { addItem } = useCart();
  const { data: bundles } = trpc.bundle.list.useQuery();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); observer.unobserve(e.target); } }); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  if (!bundles || bundles.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-10 border-t" style={{ background: 'var(--color-base)', borderColor: 'rgba(24,24,24,0.08)' }}>
      <div className="content-container">
        <div className="flex items-center gap-3 mb-6" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <Package size={16} className="text-[var(--color-mid)]" />
          <span className="font-data text-[var(--color-mid)]">BUNDLE DEALS — SAVE WHEN YOU PAIR</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bundles.map((bundle, i) => (
            <div key={bundle.id} className="border p-5 group hover:bg-[var(--color-cream)] transition-all cursor-pointer"
              style={{ borderColor: 'rgba(24,24,24,0.15)', opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.4s ease', transitionDelay: `${i * 100}ms` }}
              onClick={() => bundle.items?.forEach((item: any) => addItem({ id: item.id, name: item.name, description: item.description || '', price: item.price }))}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-item-name text-[var(--color-ink)]">{bundle.name}</h3>
                <Plus size={16} className="text-[var(--color-mid)] group-hover:text-[var(--color-ink)] transition-colors" />
              </div>
              <p className="font-item-desc text-[var(--color-mid)] mb-3">{bundle.description}</p>
              <div className="flex items-center gap-2">
                {bundle.items?.map((item: any, idx: number) => (
                  <span key={idx} className="font-data px-2 py-0.5 border" style={{ borderColor: 'rgba(24,24,24,0.1)', color: 'var(--color-mid)' }}>{item.name}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(24,24,24,0.06)' }}>
                <span className="font-price text-[var(--color-ink)]">${bundle.bundlePrice.toFixed(2)}</span>
                {bundle.savings > 0 && <span className="font-data text-[#5E8B5E]">SAVE ${bundle.savings.toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
