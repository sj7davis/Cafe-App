import { X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import DietaryBadge from './DietaryBadge';
import type { DietaryTag } from '@/data/menu';

interface OriginItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  dietary: string[];
  originRegion: string | null;
  originFarm: string | null;
  originAltitude: string | null;
  originProcess: string | null;
  originTastingNotes: string[];
  originStory: string | null;
}

interface OriginModalProps {
  item: OriginItem | null;
  onClose: () => void;
}

export default function OriginModal({ item, onClose }: OriginModalProps) {
  const { addItem, setIsOpen } = useCart();

  if (!item || !item.originRegion) return null;

  const handleAddToOrder = () => {
    addItem({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
    });
    setIsOpen(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(24,24,24,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--color-base)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 hover:opacity-50 transition-opacity">
          <X size={20} className="text-[var(--color-ink)]" />
        </button>

        <div className="p-8">
          <span className="font-data text-[var(--color-mid)]">ORIGIN STORY</span>
          <h3 className="font-category text-[var(--color-ink)] mt-2">{item.name}</h3>

          <div className="flex flex-wrap gap-1.5 mt-3 mb-6">
            {item.dietary.map((tag) => (
              <DietaryBadge key={tag} tag={tag as DietaryTag} />
            ))}
          </div>

          {/* Origin details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'REGION', value: item.originRegion },
              { label: 'FARM / STATION', value: item.originFarm },
              { label: 'ALTITUDE', value: item.originAltitude },
              { label: 'PROCESS', value: item.originProcess },
            ].map((field) => (
              <div key={field.label}>
                <span className="font-data text-[var(--color-mid)] block mb-1">{field.label}</span>
                <span className="font-item-desc text-[var(--color-ink)]">{field.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Tasting notes */}
          {item.originTastingNotes.length > 0 && item.originTastingNotes[0] !== 'Check daily board' && (
            <div className="mb-6">
              <span className="font-data text-[var(--color-mid)] block mb-2">TASTING NOTES</span>
              <div className="flex flex-wrap gap-2">
                {item.originTastingNotes.map((note) => (
                  <span key={note} className="font-data px-3 py-1.5 border" style={{ borderColor: 'rgba(24, 24, 24, 0.15)', color: 'var(--color-ink)' }}>
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Story */}
          {item.originStory && (
            <div className="mb-8">
              <span className="font-data text-[var(--color-mid)] block mb-2">THE STORY</span>
              <p className="font-body text-[var(--color-mid)] leading-relaxed" style={{ fontSize: '0.9375rem' }}>
                {item.originStory}
              </p>
            </div>
          )}

          {/* Price + Add button */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'rgba(24, 24, 24, 0.08)' }}>
            <span className="font-price text-[var(--color-ink)]">${item.price.toFixed(2)}</span>
            <button onClick={handleAddToOrder}
              className="font-button px-8 py-3 border border-[var(--color-ink)] text-[var(--color-ink)] bg-transparent hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all duration-300">
              ADD TO ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
