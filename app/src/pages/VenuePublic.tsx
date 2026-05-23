import { useParams } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useState } from 'react';
import {
  Coffee, MapPin, Phone, Clock, Globe, Loader2,
  ShoppingBag, Plus, Minus, X, ChevronRight, Star,
  Package, CheckCircle
} from 'lucide-react';

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export default function VenuePublic() {
  const { slug } = useParams<{ slug: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { data: venue, isLoading, error } = trpc.venue.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  const { data: menuItems } = trpc.venue.listMenu.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const createOrder = trpc.venue.createOrder.useMutation({
    onSuccess: () => {
      setCart([]);
      setShowCart(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#181818' }} />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
        <div className="text-center">
          <Coffee size={40} style={{ color: '#5E5E5E' }} className="mx-auto mb-4" />
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>Cafe Not Found</h1>
          <p className="font-data" style={{ color: '#5E5E5E', fontSize: '0.625rem' }}>This cafe does not exist or is not public yet.</p>
        </div>
      </div>
    );
  }

  const primaryColor = venue.primaryColor || '#181818';
  const accentColor = venue.accentColor || '#5E8B8B';

  const coffeeItems = menuItems?.filter(i => i.category === 'coffee') || [];
  const pastryItems = menuItems?.filter(i => i.category === 'pastries') || [];
  const breadItems = menuItems?.filter(i => i.category === 'bread') || [];

  const addToCart = (item: typeof menuItems extends readonly (infer T)[] ? T : never) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.menuItemId !== menuItemId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !venue.id) return;
    createOrder.mutate({
      venueId: venue.id,
      customerName: 'Guest Customer',
      customerPhone: '0400000000',
      pickupTime: 'ASAP',
      items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
    });
  };

  return (
    <div style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Success Toast */}
      {orderSuccess && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#16a34a', color: 'white', padding: '12px 24px', borderRadius: 8,
          zIndex: 200, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <CheckCircle size={18} /> Order placed successfully!
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.4)',
        }} onClick={() => setShowCart(false)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 420,
            background: '#F3F2EE', padding: 24, overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: primaryColor, textTransform: 'uppercase' }}>
                Your Order
              </h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#5E5E5E" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#5E5E5E' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {cart.map(item => (
                    <div key={item.menuItemId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid rgba(24,24,24,0.06)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{item.name}</div>
                        <div style={{ fontSize: 13, color: '#5E5E5E' }}>${item.price.toFixed(2)} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => removeFromCart(item.menuItemId)}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                            background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                        <button
                          onClick={() => addToCart(menuItems?.find(m => m.id === item.menuItemId)!)}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                            background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 24, paddingTop: 24,
                  borderTop: '2px solid rgba(24,24,24,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#5E5E5E' }}>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={createOrder.isPending}
                    style={{
                      width: '100%', padding: 14, borderRadius: 8, border: 'none',
                      background: primaryColor, color: '#F3F2EE', fontSize: 14, fontWeight: 600,
                      cursor: createOrder.isPending ? 'not-allowed' : 'pointer',
                      opacity: createOrder.isPending ? 0.7 : 1,
                    }}
                  >
                    {createOrder.isPending ? 'Placing Order...' : 'Place Order'}
                  </button>
                  {createOrder.error && (
                    <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{createOrder.error.message}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 100,
            background: primaryColor, color: '#F3F2EE',
            borderRadius: 50, padding: '14px 20px',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontSize: 14, fontWeight: 600,
          }}
        >
          <ShoppingBag size={18} />
          {cartCount} item{cartCount !== 1 ? 's' : ''}
          <span style={{ marginLeft: 4 }}>${cartTotal.toFixed(2)}</span>
          <ChevronRight size={16} />
        </button>
      )}

      {/* Header */}
      <header className="border-b" style={{ borderColor: `${primaryColor}15` }}>
        <div className="content-container py-8 text-center">
          {venue.logoUrl ? (
            <img src={venue.logoUrl} alt={venue.name} className="h-16 w-auto mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: primaryColor }}>
              <Coffee size={28} style={{ color: '#F3F2EE' }} />
            </div>
          )}
          <h1 style={{ fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: primaryColor }}>
            {venue.name}
          </h1>
          {venue.description && (
            <p className="mt-3 mx-auto" style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#5E5E5E', maxWidth: '500px' }}>
              {venue.description}
            </p>
          )}
        </div>
      </header>

      {/* Info Bar */}
      <div className="border-b" style={{ borderColor: `${primaryColor}15`, background: '#E8E4DD' }}>
        <div className="content-container py-4 flex flex-wrap items-center justify-center gap-6">
          {venue.address && (
            <div className="flex items-center gap-2">
              <MapPin size={14} style={{ color: '#5E5E5E' }} />
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>{venue.address}</span>
            </div>
          )}
          {venue.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} style={{ color: '#5E5E5E' }} />
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>{venue.phone}</span>
            </div>
          )}
          {venue.hoursWeekday && (
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: '#5E5E5E' }} />
              <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
                {venue.hoursWeekday} (Mon-Fri)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Section */}
      <section className="content-container py-12">
        <h2 className="font-data text-center mb-10" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor }}>
          Our Menu
        </h2>

        {/* Coffee */}
        {coffeeItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Coffee size={20} style={{ color: accentColor }} />
              <h3 className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: primaryColor }}>
                Coffee
              </h3>
              <div className="flex-1 h-px" style={{ background: `${primaryColor}10` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coffeeItems.map(item => (
                <MenuCard key={item.id} item={item} accentColor={accentColor} onAdd={() => addToCart(item)} cartQty={cart.find(c => c.menuItemId === item.id)?.quantity || 0} onRemove={() => removeFromCart(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Pastries */}
        {pastryItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Star size={20} style={{ color: accentColor }} />
              <h3 className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: primaryColor }}>
                Pastries
              </h3>
              <div className="flex-1 h-px" style={{ background: `${primaryColor}10` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastryItems.map(item => (
                <MenuCard key={item.id} item={item} accentColor={accentColor} onAdd={() => addToCart(item)} cartQty={cart.find(c => c.menuItemId === item.id)?.quantity || 0} onRemove={() => removeFromCart(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Bread */}
        {breadItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Package size={20} style={{ color: accentColor }} />
              <h3 className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: primaryColor }}>
                Bread
              </h3>
              <div className="flex-1 h-px" style={{ background: `${primaryColor}10` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breadItems.map(item => (
                <MenuCard key={item.id} item={item} accentColor={accentColor} onAdd={() => addToCart(item)} cartQty={cart.find(c => c.menuItemId === item.id)?.quantity || 0} onRemove={() => removeFromCart(item.id)} />
              ))}
            </div>
          </div>
        )}

        {(!menuItems || menuItems.length === 0) && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#5E5E5E' }}>
            <Coffee size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>Menu coming soon</p>
          </div>
        )}
      </section>

      {/* Hours Detail */}
      <section className="content-container py-12 border-t" style={{ borderColor: `${primaryColor}15` }}>
        <div className="max-w-md mx-auto border p-6" style={{ borderColor: `${primaryColor}15` }}>
          <h2 className="font-data mb-4 text-center" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor }}>
            Opening Hours
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Monday — Friday', hours: venue.hoursWeekday || 'Closed' },
              { label: 'Saturday', hours: venue.hoursSaturday || 'Closed' },
              { label: 'Sunday', hours: venue.hoursSunday || 'Closed' },
            ].map((h) => (
              <div key={h.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                <span style={{ fontSize: '0.875rem', color: '#181818' }}>{h.label}</span>
                <span className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>{h.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t" style={{ borderColor: `${primaryColor}15` }}>
        <div className="content-container text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe size={14} style={{ color: '#5E5E5E' }} />
            <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>
              Powered by <a href="/" style={{ color: accentColor, textDecoration: 'none' }}>B1 Platform</a>
            </span>
          </div>
          <span className="font-data" style={{ fontSize: '0.5625rem', color: '#5E5E5E' }}>
            &copy; {new Date().getFullYear()} {venue.name}
          </span>
        </div>
      </footer>
    </div>
  );
}

function MenuCard({
  item,
  accentColor,
  onAdd,
  cartQty,
  onRemove,
}: {
  item: { id: number; name: string; description: string | null; price: string; image: string | null };
  accentColor: string;
  onAdd: () => void;
  cartQty: number;
  onRemove: () => void;
}) {
  return (
    <div style={{
      border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8, padding: 16,
      background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#181818', marginBottom: 4 }}>{item.name}</div>
        {item.description && (
          <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 8, lineHeight: 1.4 }}>{item.description}</div>
        )}
        <div style={{ fontWeight: 700, fontSize: 15, color: accentColor }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {cartQty > 0 && (
          <>
            <button
              onClick={onRemove}
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Minus size={14} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{cartQty}</span>
          </>
        )}
        <button
          onClick={onAdd}
          style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: '#181818', color: '#F3F2EE', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
