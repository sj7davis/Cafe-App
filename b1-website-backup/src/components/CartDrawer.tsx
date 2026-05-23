import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface CartDrawerProps {
  onCheckout: () => void;
}

export default function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, isOpen, setIsOpen, updateQuantity, totalPrice } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150]">
      <div className="absolute inset-0 bg-[rgba(24,24,24,0.5)]" onClick={() => setIsOpen(false)} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md overflow-y-auto" style={{ background: 'var(--color-base)' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(24, 24, 24, 0.08)' }}>
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-[var(--color-ink)]" />
            <h3 className="font-section" style={{ fontSize: '1.25rem' }}>YOUR ORDER</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:opacity-50 transition-opacity">
            <X size={20} className="text-[var(--color-ink)]" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag size={32} className="text-[var(--color-mid)] mb-4" />
            <p className="font-body text-[var(--color-mid)]">Your order is empty</p>
            <p className="font-data text-[var(--color-mid)] mt-2">ADD ITEMS FROM THE MENU</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-0">
              {items.map((item) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid rgba(24, 24, 24, 0.08)' }}>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-item-name text-[var(--color-ink)]">{item.name}</h4>
                    <p className="font-item-desc text-[var(--color-mid)] mt-0.5">{item.description}</p>
                    {item.note && <p className="font-data text-[var(--color-mid)] mt-1">NOTE: {item.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-price text-[var(--color-ink)]">${(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all duration-200"
                        style={{ borderColor: 'rgba(24, 24, 24, 0.15)' }}>
                        <Minus size={14} />
                      </button>
                      <span className="font-price w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] transition-all duration-200"
                        style={{ borderColor: 'rgba(24, 24, 24, 0.15)' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 flex items-center justify-between border-t" style={{ borderColor: 'rgba(24, 24, 24, 0.15)' }}>
              <span className="font-nav text-[var(--color-ink)]">TOTAL</span>
              <span className="font-price text-[var(--color-ink)]">${totalPrice.toFixed(2)}</span>
            </div>
            <button onClick={onCheckout}
              className="font-button w-full mt-6 py-4 bg-[var(--color-ink)] text-[var(--color-base)] hover:opacity-85 transition-opacity duration-200">
              PROCEED TO CHECKOUT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
