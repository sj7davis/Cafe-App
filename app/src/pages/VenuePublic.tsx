import { useParams, useSearchParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Coffee, MapPin, Phone, Clock, Globe, Loader2,
  ShoppingBag, Plus, Minus, X, ChevronRight, Star,
  Package, CheckCircle, QrCode, Download, Gift, AlertTriangle,
} from 'lucide-react';

// ─── Hours parsing helpers ───────────────────────────────────────────────────
function parseHourValue(raw: string): number | null {
  try {
    const clean = raw.trim().toLowerCase().replace(/\s/g, '');
    const ampm = clean.includes('am') ? 'am' : clean.includes('pm') ? 'pm' : null;
    if (!ampm) return null;
    const numPart = clean.replace('am', '').replace('pm', '');
    const [hStr, mStr] = numPart.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (isNaN(h)) return null;
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return h * 60 + m;
  } catch {
    return null;
  }
}

function parseOpenClose(hoursStr: string): { openMin: number; closeMin: number } | null {
  try {
    const parts = hoursStr.split(/[–—-]/);
    if (parts.length < 2) return null;
    const openMin = parseHourValue(parts[0].trim());
    const closeMin = parseHourValue(parts[1].trim());
    if (openMin === null || closeMin === null) return null;
    return { openMin, closeMin };
  } catch {
    return null;
  }
}

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${displayH}${suffix}` : `${displayH}:${String(m).padStart(2, '0')}${suffix}`;
}

function getOpenStatus(venue: {
  hoursWeekday?: string | null;
  hoursSaturday?: string | null;
  hoursSunday?: string | null;
}): { isOpen: boolean; label: string } | null {
  try {
    const now = new Date();
    const day = now.getDay();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    let hoursStr: string | null | undefined;
    if (day === 0) hoursStr = venue.hoursSunday;
    else if (day === 6) hoursStr = venue.hoursSaturday;
    else hoursStr = venue.hoursWeekday;

    if (!hoursStr) return null;
    const parsed = parseOpenClose(hoursStr);
    if (!parsed) return null;

    if (currentMin >= parsed.openMin && currentMin < parsed.closeMin) {
      return { isOpen: true, label: `Open now · closes at ${formatMinutes(parsed.closeMin)}` };
    } else {
      let nextDay = (day + 1) % 7;
      let nextHoursStr: string | null | undefined;
      if (nextDay === 0) nextHoursStr = venue.hoursSunday;
      else if (nextDay === 6) nextHoursStr = venue.hoursSaturday;
      else nextHoursStr = venue.hoursWeekday;
      const nextParsed = nextHoursStr ? parseOpenClose(nextHoursStr) : null;
      const nextLabel = nextParsed ? ` · opens tomorrow at ${formatMinutes(nextParsed.openMin)}` : '';
      return { isOpen: false, label: `Closed${nextLabel}` };
    }
  } catch {
    return null;
  }
}

// ─── Countdown helper ─────────────────────────────────────────────────────────
function formatCountdown(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return '';
  const totalMins = Math.floor(diff / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${mins}m`;
}

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  modifiers?: { group: string; option: string; priceAdj: number }[];
}

function cartKey(menuItemId: number, modifiers?: { group: string; option: string; priceAdj: number }[]) {
  if (!modifiers || modifiers.length === 0) return String(menuItemId);
  return `${menuItemId}::${modifiers.map(m => `${m.group}=${m.option}`).join('|')}`;
}

// ─── Happy hour check ─────────────────────────────────────────────────────────
function isWithinHappyHour(startTime: string, endTime: string): boolean {
  try {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    return cur >= start && cur < end;
  } catch {
    return false;
  }
}

export default function VenuePublic() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // ── Table mode ──────────────────────────────────────────────────────────────
  const tableParam = searchParams.get('table');
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'pickup' | 'dine-in'>('pickup');

  useEffect(() => {
    if (tableParam) {
      setTableNumber(tableParam);
      setOrderType('dine-in');
    }
  }, [tableParam]);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutPickupTime, setCheckoutPickupTime] = useState('ASAP');
  const [checkoutMilk, setCheckoutMilk] = useState('');
  const [checkoutSugar, setCheckoutSugar] = useState('');
  const [checkoutGiftCode, setCheckoutGiftCode] = useState('');
  const [appliedGiftDiscount, setAppliedGiftDiscount] = useState(0);
  const [checkoutUsePass, setCheckoutUsePass] = useState(false);
  const [tipOption, setTipOption] = useState<0 | 5 | 10 | 15 | 'custom'>(0);
  const [tipCustom, setTipCustom] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [cateringForm, setCateringForm] = useState({ name: '', phone: '', email: '', eventDate: '', guestCount: '', details: '' });
  const [cateringSubmitted, setCateringSubmitted] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [modifierModalItem, setModifierModalItem] = useState<NonNullable<typeof menuItems>[number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Upsell state ─────────────────────────────────────────────────────────────
  const [showUpsell, setShowUpsell] = useState(false);
  const shownUpsell = useRef(false);
  const upsellDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Countdown state ───────────────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now());

  // ── Happy hour state ──────────────────────────────────────────────────────────
  const [happyHourDiscount, setHappyHourDiscount] = useState(0);

  // ── Loyalty rewards catalogue ─────────────────────────────────────────────────
  const [showRewardsCatalogue, setShowRewardsCatalogue] = useState(false);

  // ── Abandoned cart debounce ───────────────────────────────────────────────────
  const abandonedCartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── tRPC queries ──────────────────────────────────────────────────────────────
  const { data: venue, isLoading, error } = trpc.venue.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  const { data: menuItems } = trpc.venue.listMenu.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const { data: reviewsList } = trpc.venue.listReviews.useQuery(
    { venueId: venue?.id ?? 0, limit: 20 },
    { enabled: !!venue?.id }
  );

  const { data: locationsList } = trpc.venue.listLocations.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const { data: bundles } = trpc.venue.listBundlesPublic.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const { data: happyHourData } = trpc.venue.getHappyHour.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const { data: customerMe } = trpc.customerAuth.me.useQuery(undefined, {
    enabled: !!venue?.id,
  });

  const { data: loyaltyRewards } = trpc.loyaltyRewards.list.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id && showRewardsCatalogue }
  );

  const cartSlugs = cart.map(c => {
    const mi = (menuItems || []).find(m => m.id === c.menuItemId);
    return mi ? (mi as { id: number; slug?: string }).slug || String(mi.id) : String(c.menuItemId);
  });

  const upsellQuery = trpc.venue.getUpsellSuggestions.useQuery(
    { venueId: venue?.id || 0, slugs: cartSlugs },
    { enabled: false }
  );

  const avgRating = reviewsList && reviewsList.length > 0
    ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
    : null;

  const prefQuery = trpc.venue.getCustomerPreferences.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone },
    { enabled: false }
  );

  const orderHistoryQuery = trpc.venue.getOrdersByPhone.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone, limit: 5 },
    { enabled: false }
  );

  const upsertPreferences = trpc.venue.upsertCustomerPreferences.useMutation();
  const submitCatering = trpc.venue.submitCateringRequest.useMutation({
    onSuccess: () => {
      setCateringSubmitted(true);
      setCateringForm({ name: '', phone: '', email: '', eventDate: '', guestCount: '', details: '' });
    },
  });

  const redeemGiftCardMutation = trpc.venue.redeemGiftCard.useMutation({
    onSuccess: (data) => { setAppliedGiftDiscount(data.discount); },
    onError: (err) => { alert(err.message); },
  });

  const passQuery = trpc.venue.getPassByPhone.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone },
    { enabled: false }
  );
  const passInfo = passQuery.data ?? null;

  const usePassCreditMutation = trpc.venue.usePassCredit.useMutation();
  const validateDiscountMut = trpc.promo.validateDiscount.useMutation();

  const loyaltyQuery = trpc.loyalty.getAccount.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone },
    { enabled: !!venue?.id && checkoutPhone.length >= 8 }
  );
  const loyaltyBalance = loyaltyQuery.data?.pointsBalance ?? null;

  const redeemRewardMutation = trpc.loyaltyRewards.redeem.useMutation({
    onSuccess: (_, vars) => {
      const reward = (loyaltyRewards || []).find((r: { id: number }) => r.id === vars.rewardId);
      showToast(`Reward redeemed! ${reward ? (reward as { description?: string }).description || (reward as { name: string }).name : ''}`);
      loyaltyQuery.refetch();
    },
  });

  const saveAbandonedCartMutation = trpc.venue.saveAbandonedCart.useMutation();
  const clearAbandonedCartMutation = trpc.venue.clearAbandonedCart.useMutation();

  const createOrder = trpc.venue.createOrder.useMutation({
    onSuccess: (data) => {
      setCart([]);
      setPlacedOrderNumber(data.orderNumber);
      setShowCart(true);
      shownUpsell.current = false;
      if (checkoutPhone && venue?.id) {
        clearAbandonedCartMutation.mutate({ venueId: venue.id, phone: checkoutPhone });
      }
      if (checkoutPhone && venue?.id && (checkoutMilk || checkoutSugar)) {
        upsertPreferences.mutate({
          venueId: venue.id,
          phone: checkoutPhone,
          milk: checkoutMilk || undefined,
          sugar: checkoutSugar || undefined,
        });
      }
      if (checkoutUsePass && passInfo?.id && venue?.id) {
        usePassCreditMutation.mutate({ passId: passInfo.id, venueId: venue.id });
      }
    },
  });

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (locationsList && locationsList.length === 1) {
      setSelectedLocationId(locationsList[0].id);
    }
  }, [locationsList]);

  useEffect(() => {
    if (!venue?.slug) return;
    const url = `${window.location.origin}/v/${venue.slug}`;
    QRCode.toDataURL(url, { width: 240, margin: 2 })
      .then(setQrDataUrl)
      .catch((err: unknown) => console.error('[qr] generation failed:', err));
  }, [venue?.slug]);

  // Countdown ticker — updates every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Happy hour check
  useEffect(() => {
    if (!happyHourData) { setHappyHourDiscount(0); return; }
    const hh = happyHourData as { startTime?: string; endTime?: string; discountPercent?: number; label?: string };
    if (hh.startTime && hh.endTime && hh.discountPercent && isWithinHappyHour(hh.startTime, hh.endTime)) {
      setHappyHourDiscount(hh.discountPercent);
    } else {
      setHappyHourDiscount(0);
    }
  }, [happyHourData]);

  // Abandoned cart debounce — save after 2 min of no cart change
  useEffect(() => {
    if (abandonedCartTimer.current) clearTimeout(abandonedCartTimer.current);
    if (cart.length === 0 || checkoutPhone.length < 8 || !venue?.id) return;
    abandonedCartTimer.current = setTimeout(() => {
      const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
      saveAbandonedCartMutation.mutate({
        venueId: venue.id,
        phone: checkoutPhone,
        customerName: checkoutName || undefined,
        itemsJson: JSON.stringify(cart),
        totalAmount: total,
      });
    }, 2 * 60 * 1000);
    return () => {
      if (abandonedCartTimer.current) clearTimeout(abandonedCartTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, checkoutPhone, venue?.id]);

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

  const waitMinutes = (venue.settingsJson as { waitTimeMinutes?: number } | null)?.waitTimeMinutes ?? 0;
  const openStatus = getOpenStatus(venue);

  const allMenuItems = menuItems || [];
  const filteredMenu = dietaryFilter
    ? allMenuItems.filter(i => i.dietary?.split(',').map(d => d.trim()).includes(dietaryFilter))
    : allMenuItems;

  const coffeeItems = filteredMenu.filter(i => i.category === 'coffee');
  const pastryItems = filteredMenu.filter(i => i.category === 'pastries');
  const breadItems = filteredMenu.filter(i => i.category === 'bread');

  type MenuItem = NonNullable<typeof menuItems>[number];

  const addToCart = (item: MenuItem, modifiers?: { group: string; option: string; priceAdj: number }[]) => {
    const key = cartKey(item.id, modifiers);
    const modAdj = modifiers ? modifiers.reduce((s, m) => s + m.priceAdj, 0) : 0;
    setCart(prev => {
      const existing = prev.find(c => cartKey(c.menuItemId, c.modifiers) === key);
      if (existing) {
        return prev.map(c => cartKey(c.menuItemId, c.modifiers) === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: Number(item.price) + modAdj,
        quantity: 1,
        modifiers: modifiers && modifiers.length > 0 ? modifiers : undefined,
      }];
    });

    // Trigger upsell after adding
    setTimeout(async () => {
      if (!shownUpsell.current && cart.length >= 0) {
        const result = await upsellQuery.refetch();
        if (result.data && result.data.length > 0) {
          shownUpsell.current = true;
          setShowUpsell(true);
          if (upsellDismissTimer.current) clearTimeout(upsellDismissTimer.current);
          upsellDismissTimer.current = setTimeout(() => setShowUpsell(false), 4000);
        }
      }
    }, 300);
  };

  const addBundleToCart = (bundle: { id: number; name: string; bundlePrice: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === -bundle.id);
      if (existing) {
        return prev.map(c => c.menuItemId === -bundle.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        menuItemId: -bundle.id,
        name: bundle.name,
        price: bundle.bundlePrice,
        quantity: 1,
        note: 'Bundle deal',
      }];
    });
    showToast(`${bundle.name} added to cart`);
  };

  const removeFromCart = (key: string) => {
    setCart(prev => {
      const existing = prev.find(c => cartKey(c.menuItemId, c.modifiers) === key);
      if (existing && existing.quantity > 1) {
        return prev.map(c => cartKey(c.menuItemId, c.modifiers) === key ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => cartKey(c.menuItemId, c.modifiers) !== key);
    });
  };

  const handleAddItem = (item: MenuItem) => {
    setModifierModalItem(item);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePhoneBlur = async () => {
    if (checkoutPhone.length >= 8 && venue?.id) {
      const result = await prefQuery.refetch();
      if (result.data) {
        if (result.data.milk) setCheckoutMilk(result.data.milk);
        if (result.data.sugar) setCheckoutSugar(result.data.sugar);
      }
      await passQuery.refetch();
      await orderHistoryQuery.refetch();
    }
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const tipAmount = tipOption === 'custom'
    ? Math.max(0, Number(tipCustom) || 0)
    : tipOption === 0 ? 0
    : (cartSubtotal * tipOption) / 100;

  // Discount: use promo code if present, otherwise happy hour (better of the two)
  const promoDiscountAmount = appliedDiscount?.amount ?? 0;
  const happyHourDiscountAmount = happyHourDiscount > 0 ? (cartSubtotal * happyHourDiscount) / 100 : 0;
  const effectivePromo = promoDiscountAmount > 0 ? promoDiscountAmount : happyHourDiscountAmount;
  const totalAfterDiscounts = Math.max(0, cartSubtotal - effectivePromo - appliedGiftDiscount);
  const orderTotal = totalAfterDiscounts + tipAmount;

  async function handleApplyDiscountCode() {
    setDiscountError('');
    if (!discountCodeInput.trim() || !venue?.id) return;
    try {
      const result = await validateDiscountMut.mutateAsync({
        venueId: venue.id,
        code: discountCodeInput.trim(),
        orderAmount: cartSubtotal,
      });
      setAppliedDiscount({ code: discountCodeInput.trim().toUpperCase(), amount: result.discountAmount, description: result.description });
      setDiscountCodeInput('');
    } catch (e: unknown) {
      setDiscountError((e as { message?: string }).message ?? 'Invalid code');
    }
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !venue?.id) return;
    const notesParts: string[] = [];
    if (appliedGiftDiscount > 0) notesParts.push(`Gift card: -$${appliedGiftDiscount.toFixed(2)}`);
    if (tableNumber) notesParts.push(`Table: ${tableNumber}`);
    createOrder.mutate({
      venueId: venue.id,
      customerName: checkoutName || 'Guest',
      customerPhone: checkoutPhone || '0000000000',
      pickupTime: orderType === 'dine-in' ? 'Now' : (checkoutPickupTime || 'ASAP'),
      locationId: selectedLocationId ?? undefined,
      customerEmail: checkoutEmail || undefined,
      orderNote: notesParts.join('; ') || undefined,
      items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity, note: c.note, modifiers: c.modifiers })),
      tipAmount,
      discountCode: appliedDiscount?.code,
      discountAmount: effectivePromo + appliedGiftDiscount,
      earnLoyalty: true,
      orderType: orderType,
      tableNumber: tableNumber ?? undefined,
    });
  };

  // Allergen warnings
  const customerAllergies = (customerMe as { allergies?: string } | undefined)?.allergies?.toLowerCase() ?? '';
  const allergenWarnings: string[] = [];
  if (customerAllergies && cart.length > 0) {
    const cartItemsData = cart.map(c => (allMenuItems.find(m => m.id === c.menuItemId)));
    const hasDietary = (tag: string) => cartItemsData.some(i => i?.dietary?.toLowerCase().includes(tag));

    if (customerAllergies.includes('nut') && !cartItemsData.every(i => i?.dietary?.toLowerCase().includes('nut-free'))) {
      if (hasDietary('nut') || !hasDietary('nut-free')) allergenWarnings.push('nuts');
    }
    if (customerAllergies.includes('gluten') && !cartItemsData.every(i => i?.dietary?.toLowerCase().includes('gf'))) {
      allergenWarnings.push('gluten');
    }
    if (customerAllergies.includes('dairy') && !cartItemsData.every(i => i?.dietary?.toLowerCase().includes('dairy-free'))) {
      allergenWarnings.push('dairy');
    }
  }

  const happyHourInfo = happyHourData as { startTime?: string; endTime?: string; discountPercent?: number; label?: string } | undefined;

  return (
    <div style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: '#181818', color: '#F3F2EE',
          padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* Upsell bottom sheet */}
      {showUpsell && upsellQuery.data && upsellQuery.data.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#fff', borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 380, width: 'calc(100% - 32px)',
          border: '1px solid rgba(24,24,24,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#181818' }}>Customers also ordered:</span>
            <button onClick={() => setShowUpsell(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(upsellQuery.data as { id: number; name: string; price: string }[]).slice(0, 3).map(sug => (
              <div key={sug.id} style={{ flex: 1, border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#181818', marginBottom: 2 }}>{sug.name}</div>
                <div style={{ fontSize: 11, color: '#5E8B8B', marginBottom: 6 }}>${Number(sug.price).toFixed(2)}</div>
                <button
                  onClick={() => {
                    const mi = allMenuItems.find(m => m.id === sug.id);
                    if (mi) { addToCart(mi); setShowUpsell(false); }
                  }}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#181818', color: '#F3F2EE', cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modifier modal */}
      {modifierModalItem && (
        <ModifierModal
          item={modifierModalItem}
          onClose={() => setModifierModalItem(null)}
          onConfirm={(modifiers) => {
            addToCart(modifierModalItem, modifiers);
            setModifierModalItem(null);
          }}
        />
      )}

      {/* Loyalty Rewards Catalogue Modal */}
      {showRewardsCatalogue && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowRewardsCatalogue(false)}
        >
          <div
            style={{ background: '#F3F2EE', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '70dvh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#181818', margin: 0 }}>Redeem a Reward</h2>
              <button onClick={() => setShowRewardsCatalogue(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#5E5E5E" />
              </button>
            </div>
            {!loyaltyRewards || loyaltyRewards.length === 0 ? (
              <p style={{ color: '#5E5E5E', fontSize: 14 }}>No rewards available at the moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(loyaltyRewards as { id: number; name: string; description?: string; pointsCost: number; rewardValue?: string }[]).map(reward => (
                  <div key={reward.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid rgba(24,24,24,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#181818', marginBottom: 2 }}>{reward.name}</div>
                        {reward.description && <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 4 }}>{reward.description}</div>}
                        {reward.rewardValue && <div style={{ fontSize: 12, color: '#5E8B8B' }}>{reward.rewardValue}</div>}
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginTop: 4 }}>⭐ {reward.pointsCost} pts</div>
                      </div>
                      <button
                        disabled={!checkoutPhone || (loyaltyBalance ?? 0) < reward.pointsCost || redeemRewardMutation.isPending}
                        onClick={() => {
                          if (!venue?.id || !checkoutPhone) return;
                          redeemRewardMutation.mutate({ venueId: venue.id, phone: checkoutPhone, rewardId: reward.id });
                        }}
                        style={{
                          padding: '8px 16px', borderRadius: 8, border: 'none',
                          background: (loyaltyBalance ?? 0) >= reward.pointsCost ? '#181818' : '#ccc',
                          color: '#F3F2EE', fontSize: 13, fontWeight: 600,
                          cursor: (loyaltyBalance ?? 0) >= reward.pointsCost ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                        }}
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

            {placedOrderNumber ? (
              <div data-testid="post-checkout-panel" style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={48} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
                <h3 style={{ fontWeight: 600, fontSize: 18, color: '#181818', marginBottom: 8 }}>Order Confirmed</h3>
                <p style={{ color: '#5E5E5E', fontSize: 13, marginBottom: 6 }}>Your order number is</p>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#181818', marginBottom: 20, letterSpacing: 0.5 }}>{placedOrderNumber}</div>
                <Link
                  to={`/order/${placedOrderNumber}`}
                  data-testid="order-status-link"
                  style={{
                    display: 'inline-block', padding: '12px 24px',
                    background: '#181818', color: '#fff', textDecoration: 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                  }}
                >
                  Track Your Order
                </Link>
                <button
                  onClick={() => {
                    setPlacedOrderNumber(null);
                    setShowCart(false);
                    setCheckoutName('');
                    setCheckoutPhone('');
                    setCheckoutMilk('');
                    setCheckoutSugar('');
                    setCheckoutPickupTime('ASAP');
                    setCheckoutGiftCode('');
                    setAppliedGiftDiscount(0);
                    setCheckoutUsePass(false);
                  }}
                  style={{
                    display: 'block', margin: '16px auto 0', background: 'none',
                    border: 'none', color: '#5E5E5E', fontSize: 13, cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#5E5E5E' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                {/* Allergen warning */}
                {allergenWarnings.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                    borderRadius: 8, marginBottom: 16,
                  }}>
                    <AlertTriangle size={16} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#92400e' }}>
                      ⚠️ Allergen alert: This order may contain {allergenWarnings.join(', ')}. Review before ordering.
                    </span>
                  </div>
                )}

                {/* Recent Orders */}
                {checkoutPhone.length >= 8 && orderHistoryQuery.data && orderHistoryQuery.data.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Recent Orders
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {orderHistoryQuery.data.map(order => (
                        <OrderAgainRow
                          key={order.id}
                          order={order}
                          venueId={venue.id}
                          menuItems={menuItems || []}
                          onOrderAgain={(items) => {
                            items.forEach(i => addToCart(i));
                            if (order.customerName && !checkoutName) setCheckoutName(order.customerName);
                            showToast('Items added to cart');
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {cart.map(item => {
                    const key = cartKey(item.menuItemId, item.modifiers);
                    return (
                      <div key={key} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0', borderBottom: '1px solid rgba(24,24,24,0.06)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{item.name}</div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div style={{ fontSize: 11, color: '#5E5E5E', marginTop: 2 }}>
                              {item.modifiers.map(m => m.option).join(', ')}
                            </div>
                          )}
                          {item.note && (
                            <div style={{ fontSize: 11, color: '#5E8B8B', marginTop: 2 }}>{item.note}</div>
                          )}
                          <div style={{ fontSize: 13, color: '#5E5E5E' }}>${item.price.toFixed(2)} each</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            onClick={() => removeFromCart(key)}
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                              background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 600, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            onClick={() => {
                              const mi = menuItems?.find(m => m.id === item.menuItemId);
                              if (mi) addToCart(mi, item.modifiers);
                            }}
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                              background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Checkout form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderTop: '1px solid rgba(24,24,24,0.06)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#181818', margin: 0 }}>Your details</h3>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={checkoutName}
                    onChange={e => setCheckoutName(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Phone number"
                    value={checkoutPhone}
                    onChange={e => setCheckoutPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                  />
                  {loyaltyBalance !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706', borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>
                        ⭐ {loyaltyBalance} pts — ${(loyaltyBalance / 10).toFixed(2)} available to redeem
                      </span>
                      {loyaltyBalance > 0 && (
                        <button
                          onClick={() => setShowRewardsCatalogue(true)}
                          style={{ fontSize: 12, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          Redeem a reward →
                        </button>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: 4 }}>
                      Email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — for order confirmation)</span>
                    </label>
                    <input
                      type="email"
                      value={checkoutEmail}
                      onChange={e => setCheckoutEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(24,24,24,0.15)', background: '#F3F2EE', fontFamily: 'Geist Mono', fontSize: '0.75rem', color: '#181818', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {/* Pickup time — hidden for dine-in */}
                  {orderType !== 'dine-in' ? (
                    <input
                      type="text"
                      placeholder="Pickup time (e.g. ASAP, 10:30am)"
                      value={checkoutPickupTime}
                      onChange={e => setCheckoutPickupTime(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                    />
                  ) : (
                    <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(94,139,139,0.3)', fontSize: 14, background: 'rgba(94,139,139,0.05)', color: '#5E8B8B' }}>
                      🍽️ Dine-in · Table {tableNumber} · Now
                    </div>
                  )}
                  <select
                    value={checkoutMilk}
                    onChange={e => setCheckoutMilk(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                  >
                    <option value="">Milk preference (optional)</option>
                    <option value="full cream">Full Cream</option>
                    <option value="skim">Skim</option>
                    <option value="oat">Oat</option>
                    <option value="almond">Almond</option>
                    <option value="soy">Soy</option>
                    <option value="none">No milk</option>
                  </select>
                  <select
                    value={checkoutSugar}
                    onChange={e => setCheckoutSugar(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                  >
                    <option value="">Sugar (optional)</option>
                    <option value="0">No sugar</option>
                    <option value="0.5">1/2 sugar</option>
                    <option value="1">1 sugar</option>
                    <option value="2">2 sugars</option>
                    <option value="3">3 sugars</option>
                  </select>

                  {/* Location selector */}
                  {locationsList && locationsList.length > 1 && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: '#181818', display: 'block', marginBottom: 4 }}>
                        Pickup Location *
                      </label>
                      <select
                        value={selectedLocationId ?? ''}
                        onChange={e => setSelectedLocationId(e.target.value ? Number(e.target.value) : null)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                      >
                        <option value="">Select a location…</option>
                        {locationsList.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name} — {loc.address}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Discount code */}
                  {!appliedDiscount ? (
                    <div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Promo / discount code"
                          value={discountCodeInput}
                          onChange={e => { setDiscountCodeInput(e.target.value.toUpperCase()); setDiscountError(''); }}
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyDiscountCode()}
                        />
                        <button
                          onClick={handleApplyDiscountCode}
                          disabled={!discountCodeInput.trim() || validateDiscountMut.isPending}
                          style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#181818', color: '#F3F2EE', fontSize: 13, cursor: 'pointer', opacity: !discountCodeInput.trim() ? 0.5 : 1 }}
                        >
                          {validateDiscountMut.isPending ? '…' : 'Apply'}
                        </button>
                      </div>
                      {discountError && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{discountError}</p>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#16a34a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🏷️ {appliedDiscount.code} — {appliedDiscount.description}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>-${appliedDiscount.amount.toFixed(2)}</span>
                        <button onClick={() => setAppliedDiscount(null)} style={{ background: 'none', border: 'none', color: '#78716c', cursor: 'pointer', fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  )}

                  {/* Tip selection */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#181818', display: 'block', marginBottom: 6 }}>
                      Add a tip (optional)
                    </label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: tipOption === 'custom' ? 8 : 0 }}>
                      {([0, 5, 10, 15, 'custom'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setTipOption(opt)}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                            background: tipOption === opt ? '#181818' : '#fff',
                            color: tipOption === opt ? '#F3F2EE' : '#181818',
                            fontSize: 12, cursor: 'pointer', fontWeight: tipOption === opt ? 600 : 400,
                          }}
                        >
                          {opt === 0 ? 'None' : opt === 'custom' ? 'Other' : `${opt}%`}
                        </button>
                      ))}
                    </div>
                    {tipOption === 'custom' && (
                      <input
                        type="number" min="0" step="0.50"
                        placeholder="Enter tip amount ($)"
                        value={tipCustom}
                        onChange={e => setTipCustom(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818', boxSizing: 'border-box' }}
                      />
                    )}
                    {tipAmount > 0 && (
                      <p style={{ fontSize: 12, color: '#5E5E5E', margin: '4px 0 0' }}>
                        Tip: ${tipAmount.toFixed(2)} — thank you! 🙏
                      </p>
                    )}
                  </div>

                  {/* Gift card */}
                  {appliedGiftDiscount === 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Gift card code"
                        value={checkoutGiftCode}
                        onChange={e => setCheckoutGiftCode(e.target.value.toUpperCase())}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 8,
                          border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818',
                        }}
                      />
                      <button
                        onClick={() => {
                          if (checkoutGiftCode && venue?.id) {
                            redeemGiftCardMutation.mutate({
                              venueId: venue.id,
                              code: checkoutGiftCode,
                              orderTotal: cartTotal,
                            });
                          }
                        }}
                        disabled={redeemGiftCardMutation.isPending || !checkoutGiftCode}
                        style={{
                          padding: '10px 14px', borderRadius: 8, border: 'none',
                          background: '#181818', color: '#F3F2EE', fontSize: 13, cursor: 'pointer',
                          opacity: redeemGiftCardMutation.isPending || !checkoutGiftCode ? 0.6 : 1,
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {appliedGiftDiscount > 0 && (
                    <div style={{ fontSize: 13, color: '#16a34a', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gift card applied</span>
                      <span>-${appliedGiftDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Pass credit toggle */}
                  {passInfo && passInfo.remainingCredits > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#181818', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checkoutUsePass}
                        onChange={e => setCheckoutUsePass(e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>
                        Use 1 pass credit
                        <span style={{ color: '#5E5E5E', fontSize: 12, marginLeft: 6 }}>
                          ({passInfo.remainingCredits} remaining)
                        </span>
                      </span>
                    </label>
                  )}
                </div>

                <div style={{
                  marginTop: 24, paddingTop: 24,
                  borderTop: '2px solid rgba(24,24,24,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#5E5E5E' }}>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a', fontSize: 13 }}>
                      <span>🏷️ {appliedDiscount.description}</span>
                      <span>-${appliedDiscount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {!appliedDiscount && happyHourDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a', fontSize: 13 }}>
                      <span>⚡ Happy Hour discount</span>
                      <span>-${happyHourDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {appliedGiftDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a', fontSize: 13 }}>
                      <span>🎁 Gift card</span>
                      <span>-${appliedGiftDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#5E5E5E', fontSize: 13 }}>
                      <span>Tip 🙏</span>
                      <span>+${tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
                    <span>Total</span>
                    <span>${orderTotal.toFixed(2)}</span>
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

      {/* Table mode banner */}
      {tableNumber && (
        <div style={{
          textAlign: 'center', padding: '10px 16px', fontSize: 14, fontWeight: 600,
          background: 'rgba(94,139,139,0.12)', color: '#5E8B8B',
          borderBottom: '1px solid rgba(94,139,139,0.2)',
        }}>
          🍽️ Dine-in — Table {tableNumber}
        </div>
      )}

      {/* Happy Hour Banner */}
      {happyHourDiscount > 0 && happyHourInfo && (
        <div style={{
          textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 600,
          background: 'rgba(234,179,8,0.12)', color: '#b45309',
          borderBottom: '1px solid rgba(234,179,8,0.2)',
          animation: 'pulse 2s infinite',
        }}>
          ⚡ Happy Hour: {happyHourInfo.label || 'Special Offer'} — {happyHourDiscount}% off all items!
        </div>
      )}

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

      {/* Open/Closed Banner */}
      {openStatus && (
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 500,
          background: openStatus.isOpen ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)',
          color: openStatus.isOpen ? '#15803d' : '#dc2626',
          borderBottom: `1px solid ${openStatus.isOpen ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)'}`,
        }}>
          {openStatus.isOpen ? '🟢' : '🔴'} {openStatus.label}
        </div>
      )}

      {/* Menu Section */}
      <section className="content-container py-12">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <h2 className="font-data text-center" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor, margin: 0 }}>
            Our Menu
          </h2>
          {waitMinutes > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: 'rgba(217,119,6,0.12)', color: '#b45309',
              borderRadius: 99, padding: '3px 10px',
            }}>
              ⏱ ~{waitMinutes} min wait
            </span>
          )}
        </div>

        {/* Dietary Filter Pills */}
        {allMenuItems.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
            marginBottom: 24, WebkitOverflowScrolling: 'touch',
          }}>
            {[
              { label: 'All', value: null },
              { label: '🌱 Vegan', value: 'vegan' },
              { label: '🌾 GF', value: 'gluten-free' },
              { label: '🥛 Dairy-free', value: 'dairy-free' },
              { label: '🥜 Nut-free', value: 'nut-free' },
              { label: '🥦 Vegetarian', value: 'vegetarian' },
            ].map(pill => {
              const active = dietaryFilter === pill.value;
              return (
                <button
                  key={pill.label}
                  onClick={() => setDietaryFilter(pill.value)}
                  style={{
                    flexShrink: 0,
                    borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 500,
                    border: active ? 'none' : '1px solid rgba(24,24,24,0.18)',
                    background: active ? '#181818' : '#fff',
                    color: active ? '#F3F2EE' : '#181818',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}

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
                <MenuCard
                  key={item.id}
                  item={item}
                  accentColor={accentColor}
                  onAdd={() => handleAddItem(item)}
                  cartQty={cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0)}
                  onRemove={() => removeFromCart(cartKey(item.id))}
                  nowMs={now}
                />
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
                <MenuCard
                  key={item.id}
                  item={item}
                  accentColor={accentColor}
                  onAdd={() => handleAddItem(item)}
                  cartQty={cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0)}
                  onRemove={() => removeFromCart(cartKey(item.id))}
                  nowMs={now}
                />
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
                <MenuCard
                  key={item.id}
                  item={item}
                  accentColor={accentColor}
                  onAdd={() => handleAddItem(item)}
                  cartQty={cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0)}
                  onRemove={() => removeFromCart(cartKey(item.id))}
                  nowMs={now}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bundle Deals */}
        {bundles && bundles.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Gift size={20} style={{ color: accentColor }} />
              <h3 className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: primaryColor }}>
                Bundle Deals
              </h3>
              <div className="flex-1 h-px" style={{ background: `${primaryColor}10` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(bundles as { id: number; name: string; description?: string; bundlePrice: number; items?: string[] }[]).map(bundle => (
                <div key={bundle.id} style={{
                  border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8,
                  background: 'white', padding: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#181818', marginBottom: 2 }}>🎁 {bundle.name}</div>
                      {bundle.description && (
                        <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 6 }}>{bundle.description}</div>
                      )}
                      {bundle.items && bundle.items.length > 0 && (
                        <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>
                          {bundle.items.map((it, idx) => (
                            <li key={idx} style={{ fontSize: 11, color: '#5E5E5E', marginBottom: 2 }}>{it}</li>
                          ))}
                        </ul>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>${Number(bundle.bundlePrice).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => addBundleToCart(bundle)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: '#181818', color: '#F3F2EE', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
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
        {locationsList && locationsList.length > 0 ? (
          <div>
            <h2 className="font-data mb-8 text-center" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor }}>
              Our Locations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {locationsList.map((loc) => (
                <div key={loc.id} className="border p-6" style={{ borderColor: `${primaryColor}15` }}>
                  <div style={{ fontWeight: 500, fontSize: '1rem', color: primaryColor, marginBottom: 8 }}>{loc.name}</div>
                  <div className="flex items-center gap-2 mb-4" style={{ fontSize: '0.875rem', color: '#5E5E5E' }}>
                    <MapPin size={12} style={{ color: '#5E5E5E', flexShrink: 0 }} />
                    {loc.address}
                  </div>
                  {loc.phone && (
                    <div className="flex items-center gap-2 mb-4" style={{ fontSize: '0.875rem', color: '#5E5E5E' }}>
                      <Phone size={12} style={{ color: '#5E5E5E', flexShrink: 0 }} />
                      {loc.phone}
                    </div>
                  )}
                  {(loc.hoursWeekday || loc.hoursSaturday || loc.hoursSunday) && (
                    <div className="space-y-2">
                      {[
                        { label: 'Monday — Friday', hours: loc.hoursWeekday || 'Closed' },
                        { label: 'Saturday', hours: loc.hoursSaturday || 'Closed' },
                        { label: 'Sunday', hours: loc.hoursSunday || 'Closed' },
                      ].map((h) => (
                        <div key={h.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                          <span style={{ fontSize: '0.875rem', color: '#181818' }}>{h.label}</span>
                          <span className="font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E' }}>{h.hours}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
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
        )}
      </section>

      {/* Catering Enquiries */}
      <section className="content-container py-12 border-t" style={{ borderColor: `${primaryColor}15` }}>
        <div className="max-w-lg mx-auto">
          <h2 className="font-data mb-2 text-center" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor }}>
            Catering Enquiries
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#5E5E5E', marginBottom: '2rem' }}>
            Planning an event? Get in touch and we'll put together a catering package for you.
          </p>
          {cateringSubmitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle size={48} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
              <h3 style={{ fontWeight: 600, fontSize: 18, color: '#181818', marginBottom: 8 }}>Enquiry Received</h3>
              <p style={{ color: '#5E5E5E', fontSize: 14, marginBottom: 20 }}>We'll be in touch soon to discuss your event.</p>
              <button
                onClick={() => setCateringSubmitted(false)}
                style={{ background: 'none', border: 'none', color: '#5E5E5E', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" placeholder="Your name *" value={cateringForm.name} onChange={e => setCateringForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }} />
              <input type="tel" placeholder="Phone number *" value={cateringForm.phone} onChange={e => setCateringForm(f => ({ ...f, phone: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }} />
              <input type="email" placeholder="Email address (optional)" value={cateringForm.email} onChange={e => setCateringForm(f => ({ ...f, email: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }} />
              <input type="text" placeholder="Event date * (e.g. 15 June 2026)" value={cateringForm.eventDate} onChange={e => setCateringForm(f => ({ ...f, eventDate: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }} />
              <input type="number" placeholder="Number of guests *" min={1} value={cateringForm.guestCount} onChange={e => setCateringForm(f => ({ ...f, guestCount: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }} />
              <textarea placeholder="Tell us about your event (optional)" rows={4} value={cateringForm.details} onChange={e => setCateringForm(f => ({ ...f, details: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818', resize: 'vertical' }} />
              {submitCatering.error && (
                <p style={{ color: '#dc2626', fontSize: 13 }}>{submitCatering.error.message}</p>
              )}
              <button
                onClick={() => {
                  if (!venue?.id || !cateringForm.name || !cateringForm.phone || !cateringForm.eventDate || !cateringForm.guestCount) return;
                  submitCatering.mutate({
                    venueId: venue.id,
                    name: cateringForm.name,
                    phone: cateringForm.phone,
                    email: cateringForm.email || undefined,
                    eventDate: cateringForm.eventDate,
                    guestCount: parseInt(cateringForm.guestCount, 10),
                    details: cateringForm.details || undefined,
                  });
                }}
                disabled={submitCatering.isPending || !cateringForm.name || !cateringForm.phone || !cateringForm.eventDate || !cateringForm.guestCount}
                style={{
                  width: '100%', padding: 14, borderRadius: 8, border: 'none',
                  background: primaryColor, color: '#F3F2EE', fontSize: 14, fontWeight: 600,
                  cursor: submitCatering.isPending ? 'not-allowed' : 'pointer',
                  opacity: (!cateringForm.name || !cateringForm.phone || !cateringForm.eventDate || !cateringForm.guestCount) ? 0.5 : 1,
                }}
              >
                {submitCatering.isPending ? 'Sending…' : 'Send Enquiry'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      {reviewsList && reviewsList.length > 0 && (
        <section style={{ padding: '32px 16px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#181818', margin: 0 }}>Reviews</h2>
            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={20} fill="#F5B400" color="#F5B400" />
                <span style={{ fontSize: 16, fontWeight: 600, color: '#181818' }}>{avgRating.toFixed(1)}</span>
                <span style={{ fontSize: 14, color: '#5E5E5E' }}>({reviewsList.length})</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviewsList.slice(0, 5).map((r) => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid rgba(24,24,24,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} fill={i <= r.rating ? '#F5B400' : '#D1D1D1'} color={i <= r.rating ? '#F5B400' : '#D1D1D1'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>{r.customerName}</span>
                </div>
                {r.comment && (
                  <p style={{ fontSize: 14, color: '#5E5E5E', margin: 0 }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* QR Code Section */}
      {qrDataUrl && (
        <section className="content-container py-10 border-t" style={{ borderColor: `${primaryColor}15` }}>
          <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="font-data mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: primaryColor }}>
              Order via QR
            </h2>
            <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 16 }}>
              Scan to open this menu on your phone.
            </p>
            {!showQr ? (
              <button
                onClick={() => setShowQr(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.18)',
                  background: '#fff', color: '#181818', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <QrCode size={16} />
                Show QR Code
              </button>
            ) : (
              <div>
                <img
                  src={qrDataUrl}
                  alt="QR code for ordering"
                  style={{ width: 200, height: 200, margin: '0 auto 12px', display: 'block', borderRadius: 8 }}
                />
                <a
                  href={qrDataUrl}
                  download={`${venue.slug}-qr.png`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: '#181818', color: '#F3F2EE', fontSize: 12, fontWeight: 500,
                    textDecoration: 'none', cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            )}
          </div>
        </section>
      )}

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

// ─── OrderAgainRow ──────────────────────────────────────────────────────────
function OrderAgainRow({
  order,
  venueId,
  menuItems,
  onOrderAgain,
}: {
  order: { id: number; orderNumber: string; customerName: string | null; status: string; totalAmount: string | number; createdAt: string };
  venueId: number;
  menuItems: { id: number; name: string; price: string }[];
  onOrderAgain: (items: { id: number; name: string; price: number }[]) => void;
}) {
  const orderItemsQuery = trpc.venue.getOrderItemsByOrderId.useQuery(
    { orderId: order.id, venueId },
    { enabled: false }
  );

  const handleOrderAgain = async () => {
    const result = await orderItemsQuery.refetch();
    if (!result.data) return;
    const items = result.data.flatMap(oi => {
      const mi = menuItems.find(m => m.id === oi.menuItemId);
      if (!mi) return [];
      return [{ id: mi.id, name: mi.name, price: Number(mi.price) }];
    });
    onOrderAgain(items);
  };

  const date = new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const total = Number(order.totalAmount).toFixed(2);

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      border: '1px solid rgba(24,24,24,0.08)',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#181818' }}>#{order.orderNumber}</div>
        <div style={{ fontSize: 11, color: '#5E5E5E' }}>{date} · ${total}</div>
        <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'capitalize' }}>{order.status}</div>
      </div>
      <button
        onClick={handleOrderAgain}
        disabled={orderItemsQuery.isFetching}
        style={{
          padding: '6px 12px', borderRadius: 6, border: 'none',
          background: '#181818', color: '#F3F2EE', fontSize: 12, fontWeight: 600,
          cursor: orderItemsQuery.isFetching ? 'not-allowed' : 'pointer',
          opacity: orderItemsQuery.isFetching ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {orderItemsQuery.isFetching ? '…' : 'Order Again'}
      </button>
    </div>
  );
}

// ─── ModifierModal ───────────────────────────────────────────────────────────
type ModifierGroup = { id: number; name: string; options: { name: string; priceAdj: number }[]; required: boolean };

function ModifierModal({
  item,
  onClose,
  onConfirm,
}: {
  item: { id: number; name: string };
  onClose: () => void;
  onConfirm: (modifiers: { group: string; option: string; priceAdj: number }[]) => void;
}) {
  const { data: groups, isLoading } = trpc.venue.listMenuModifiersPublic.useQuery(
    { menuItemId: item.id },
    { enabled: true }
  );

  const [selections, setSelections] = useState<Record<string, { option: string; priceAdj: number }>>({});

  const hasLoaded = !isLoading && groups !== undefined;
  const hasModifiers = groups && groups.length > 0;

  useEffect(() => {
    if (hasLoaded && !hasModifiers) {
      onConfirm([]);
    }
  }, [hasLoaded, hasModifiers, onConfirm]);

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#F3F2EE' }} />
      </div>
    );
  }

  if (!hasModifiers) return null;

  const requiredGroups = (groups as ModifierGroup[]).filter(g => g.required);
  const allRequiredSelected = requiredGroups.every(g => selections[g.name]);

  const handleConfirm = () => {
    const mods = Object.entries(selections).map(([group, { option, priceAdj }]) => ({ group, option, priceAdj }));
    onConfirm(mods);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#F3F2EE', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 480,
          padding: 24, maxHeight: '80dvh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#181818', margin: 0 }}>
            Customise — {item.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#5E5E5E" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(groups as ModifierGroup[]).map(group => (
            <div key={group.id}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 8 }}>
                {group.name}
                {group.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.options.map(opt => (
                  <label key={opt.name} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#181818' }}>
                    <input
                      type="radio"
                      name={`mod-${group.id}`}
                      checked={selections[group.name]?.option === opt.name}
                      onChange={() => setSelections(prev => ({ ...prev, [group.name]: { option: opt.name, priceAdj: opt.priceAdj } }))}
                      style={{ accentColor: '#181818' }}
                    />
                    <span>{opt.name}</span>
                    {opt.priceAdj !== 0 && (
                      <span style={{ fontSize: 12, color: '#5E5E5E', marginLeft: 'auto' }}>
                        {opt.priceAdj > 0 ? `+$${opt.priceAdj.toFixed(2)}` : `-$${Math.abs(opt.priceAdj).toFixed(2)}`}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 8,
              border: '1px solid rgba(24,24,24,0.15)', background: 'none',
              fontSize: 14, cursor: 'pointer', color: '#5E5E5E',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allRequiredSelected}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 8, border: 'none',
              background: '#181818', color: '#F3F2EE',
              fontSize: 14, fontWeight: 600,
              cursor: allRequiredSelected ? 'pointer' : 'not-allowed',
              opacity: allRequiredSelected ? 1 : 0.5,
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

const DIETARY_EMOJI: Record<string, string> = {
  vegan: '🌱',
  'gluten-free': '🌾',
  'dairy-free': '🥛',
  'nut-free': '🥜',
  vegetarian: '🥦',
};

type MenuItemWithExtras = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  dietary?: string | null;
  isLimitedTime?: boolean;
  limitedTimeLabel?: string | null;
  activeTo?: string | null;
};

function MenuCard({
  item,
  accentColor,
  onAdd,
  cartQty,
  onRemove,
  nowMs,
}: {
  item: MenuItemWithExtras;
  accentColor: string;
  onAdd: () => void;
  cartQty: number;
  onRemove: () => void;
  nowMs: number;
}) {
  const dietaryTags = item.dietary ? item.dietary.split(',').map(d => d.trim()).filter(Boolean) : [];

  const countdown = item.activeTo && new Date(item.activeTo).getTime() > nowMs
    ? formatCountdown(item.activeTo)
    : null;

  return (
    <div style={{
      border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8,
      background: 'white', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div style={{
        padding: 16, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{item.name}</div>
            {item.isLimitedTime && item.limitedTimeLabel && (
              <span style={{
                fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px',
                background: 'rgba(249,115,22,0.12)', color: '#ea580c',
              }}>
                {item.limitedTimeLabel}
              </span>
            )}
          </div>
          {countdown && (
            <div style={{ fontSize: 10, color: '#ea580c', marginBottom: 4, fontWeight: 500 }}>
              ⏳ Ends in {countdown}
            </div>
          )}
          {item.description && (
            <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 8, lineHeight: 1.4 }}>{item.description}</div>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, color: accentColor, marginBottom: dietaryTags.length > 0 ? 6 : 0 }}>
            ${Number(item.price).toFixed(2)}
          </div>
          {dietaryTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {dietaryTags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, fontWeight: 500,
                  background: 'rgba(94,139,139,0.1)', color: '#5E8B8B',
                  borderRadius: 99, padding: '2px 7px',
                }}>
                  {DIETARY_EMOJI[tag] ?? ''} {tag}
                </span>
              ))}
            </div>
          )}
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
    </div>
  );
}
