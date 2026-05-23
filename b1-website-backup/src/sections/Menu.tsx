import { useEffect, useRef, useState } from 'react';
import { Plus, Filter, Heart } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useCart } from '@/context/CartContext';
import DietaryBadge from '@/components/DietaryBadge';
import type { DietaryTag } from '@/data/menu';

type Category = 'coffee' | 'pastries' | 'bread';
const categoryData: Record<Category, { label: string; image: string }> = {
  coffee: { label: 'COFFEE', image: '/images/menu-coffee.jpg' },
  pastries: { label: 'PASTRIES', image: '/images/menu-pastries.jpg' },
  bread: { label: 'BREAD', image: '/images/menu-bread.jpg' },
};
const categories: Category[] = ['coffee', 'pastries', 'bread'];
const allDietaryTags: DietaryTag[] = ['V', 'VG', 'GF', 'DF'];

interface MenuItemF {
  id: number; name: string; description: string | null; price: number;
  dietary: string[]; category: string; originRegion: string | null;
  originFarm: string | null; originAltitude: string | null;
  originProcess: string | null; originTastingNotes: string[];
  originStory: string | null; isAvailable: boolean;
}

interface MenuProps { onOpenOrigin: (item: MenuItemF) => void; }

export default function Menu({ onOpenOrigin }: MenuProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('coffee');
  const [activeFilters, setActiveFilters] = useState<DietaryTag[]>([]);
  const [tabChanging, setTabChanging] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [phone, setPhone] = useState(() => localStorage.getItem('b1-phone') || '');
  const sectionRef = useRef<HTMLElement>(null);
  const [headerRevealed, setHeaderRevealed] = useState(false);
  const { addItem } = useCart();
  const utils = trpc.useUtils();

  const { data: menuItems, isLoading } = trpc.menu.listByCategory.useQuery({ category: activeCategory });
  const { data: favs } = trpc.favourites.list.useQuery({ phone }, { enabled: !!phone });
  const toggleFav = trpc.favourites.toggle.useMutation({ onSuccess: () => utils.favourites.list.invalidate() });

  const favIds = new Set((favs || []).map((f) => f.menuItemId));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setHeaderRevealed(true); observer.unobserve(e.target); } }); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredItems = (menuItems || []).filter((item: MenuItemF) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.some((f) => item.dietary.includes(f));
  });

  const handleTabChange = (cat: Category) => {
    if (cat === activeCategory) return;
    setTabChanging(true);
    setTimeout(() => { setActiveCategory(cat); setTabChanging(false); }, 200);
  };

  const toggleFilter = (tag: DietaryTag) => {
    setActiveFilters((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleAdd = (item: MenuItemF) => {
    if (!item.isAvailable) return;
    addItem({ id: item.id, name: item.name, description: item.description || '', price: item.price });
  };

  const splitText = (text: string, revealed: boolean) =>
    text.split('').map((char, i) => (
      <span key={i} className="char" style={{ transitionDelay: revealed ? `${i * 30}ms` : '0ms' }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));

  const catData = categoryData[activeCategory];

  return (
    <section ref={sectionRef} id="menu" style={{ background: 'var(--color-cream)' }} className="py-[var(--space-section)] relative">
      <div className="content-container">
        <div className="mb-16">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--color-mid)]" style={{ opacity: headerRevealed ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <path d="M8 5H3V19H8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M16 5H21V19H16" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <h2 className={`font-section text-[var(--color-ink)] mt-6 text-wrap-balance ${headerRevealed ? 'is-revealed' : ''}`}>
            <span className="text-reveal">{splitText('THE MENU', headerRevealed)}</span>
          </h2>
          <p className={`font-data text-[var(--color-mid)] mt-3 ${headerRevealed ? 'is-revealed' : ''}`}>
            <span className="text-reveal" style={{ transitionDelay: headerRevealed ? '200ms' : '0ms' }}>
              {splitText('COFFEE \u00B7 PASTRIES \u00B7 BREAD \u2014 CRAFTED DAILY', headerRevealed)}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-8">
            {categories.map((cat) => (
              <button key={cat} onClick={() => handleTabChange(cat)} className="font-tab pb-3 transition-colors"
                style={{ color: activeCategory === cat ? 'var(--color-ink)' : 'var(--color-mid)', borderBottom: activeCategory === cat ? '2px solid var(--color-ink)' : '2px solid transparent' }}>
                {categoryData[cat].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 font-data text-[var(--color-mid)] hover:text-[var(--color-ink)] transition-colors pb-3">
            <Filter size={14} />{activeFilters.length > 0 ? `${activeFilters.length} FILTER${activeFilters.length > 1 ? 'S' : ''}` : 'FILTER'}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
            {allDietaryTags.map((tag) => (
              <button key={tag} onClick={() => toggleFilter(tag)} className="font-data px-3 py-1.5 border transition-all"
                style={{ borderColor: activeFilters.includes(tag) ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: activeFilters.includes(tag) ? 'var(--color-ink)' : 'transparent', color: activeFilters.includes(tag) ? 'var(--color-base)' : 'var(--color-mid)' }}>
                {tag}
              </button>
            ))}
            {activeFilters.length > 0 && <button onClick={() => setActiveFilters([])} className="font-data px-3 py-1.5 text-[var(--color-mid)] hover:text-[var(--color-ink)]">CLEAR</button>}
          </div>
        )}

        <div className="mb-12 overflow-hidden" style={{ opacity: tabChanging ? 0 : 1, transition: 'opacity 200ms ease' }}>
          <div className="relative overflow-hidden group">
            <img src={catData.image} alt={catData.label} className="w-full max-h-[400px] object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-[rgba(24,24,24,0.06)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div style={{ opacity: tabChanging ? 0 : 1, transition: 'opacity 200ms ease' }}>
          {/* Save phone prompt */}
          {!phone && (
            <div className="mb-6 p-4 border flex items-center gap-3" style={{ borderColor: 'rgba(24,24,24,0.08)', background: 'var(--color-base)' }}>
              <span className="font-data text-[var(--color-mid)]">SAVE YOUR PHONE TO FAVOURITE ITEMS:</span>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); localStorage.setItem('b1-phone', e.target.value); }}
                placeholder="04XX XXX XXX" className="flex-1 bg-transparent border px-3 py-1.5 font-form-input text-sm focus:border-[var(--color-ink)] focus:outline-none max-w-[200px]" style={{ borderColor: 'rgba(24,24,24,0.15)' }} />
            </div>
          )}

          {isLoading ? <p className="font-data text-[var(--color-mid)]">LOADING...</p> :
           filteredItems.length === 0 ? <p className="font-body text-[var(--color-mid)] text-center py-8">No items match.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
              {filteredItems.map((item: MenuItemF, i: number) => (
                <div key={item.id} className="py-5 group" style={{ borderBottom: i < filteredItems.length - 1 ? '1px solid rgba(24,24,24,0.1)' : 'none', opacity: item.isAvailable ? 1 : 0.5 }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-item-name truncate ${item.isAvailable ? 'cursor-pointer hover:opacity-60' : 'line-through'} transition-opacity`}
                          onClick={() => item.isAvailable && item.originRegion && onOpenOrigin(item)}>
                          {item.name}
                          {item.isAvailable && item.originRegion && <span className="text-[var(--color-mid)] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">&#9432;</span>}
                        </h3>
                        {!item.isAvailable && <span className="font-data px-1.5 py-0.5 bg-[#B8545020] text-[#B85450]">SOLD OUT</span>}
                      </div>
                      <p className="font-item-desc text-[var(--color-mid)] mt-1">{item.description}</p>
                      {item.dietary.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">{item.dietary.map((tag: string) => <DietaryBadge key={tag} tag={tag as DietaryTag} />)}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-price text-[var(--color-ink)]">${item.price.toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        {phone && (
                          <button onClick={() => toggleFav.mutate({ phone, menuItemId: item.id })}
                            className="w-8 h-8 flex items-center justify-center border transition-all hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] hover:border-[var(--color-ink)]"
                            style={{ borderColor: favIds.has(item.id) ? 'var(--color-ink)' : 'rgba(24,24,24,0.15)', background: favIds.has(item.id) ? 'var(--color-ink)' : 'transparent', color: favIds.has(item.id) ? 'var(--color-base)' : 'var(--color-mid)' }}>
                            <Heart size={14} />
                          </button>
                        )}
                        <button onClick={() => handleAdd(item)} disabled={!item.isAvailable}
                          className="w-8 h-8 flex items-center justify-center border border-[rgba(24,24,24,0.15)] hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] hover:border-[var(--color-ink)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
