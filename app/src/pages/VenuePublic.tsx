import { useParams, useSearchParams, Link, useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Coffee, MapPin, Phone, Clock, Globe, Loader2,
  ShoppingBag, Plus, Minus, X, ChevronRight, Star,
  Package, CheckCircle, QrCode, Download, Gift, AlertTriangle, Bell, Users, Search, History, ChevronDown,
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

// ─── Website block renderer ───────────────────────────────────────────────────
function renderWebsiteBlocks(
  blocks: any[],
  primaryColor: string,
  slug: string,
  allMenuItems: any[],
  reviewsList: any[],
  accentColor: string,
) {
  // Filter hidden blocks
  return blocks.filter((b: any) => !b?.hidden).map((block: any) => {
    if (!block?.type) return null;
    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id || block.type} style={{ position: 'relative', height: 'clamp(280px, 40vw, 520px)', overflow: 'hidden' }}>
            {block.data?.imageUrl && <img src={block.data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.65) 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(20px,4vw,56px)', textAlign: 'center' }}>
              {block.data?.title && <h1 style={{ fontSize: 'clamp(1.8rem,5vw,3.4rem)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>{block.data.title}</h1>}
              {block.data?.tagline && <p style={{ fontSize: 'clamp(0.875rem,2vw,1.1rem)', color: 'rgba(255,255,255,0.9)', margin: '0 0 22px', fontStyle: 'italic' }}>{block.data.tagline}</p>}
              {block.data?.ctaText && (
                <a href="#venue-menu" style={{ display: 'inline-block', padding: '12px 30px', background: primaryColor, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {block.data.ctaText}
                </a>
              )}
            </div>
          </section>
        );
      case 'about':
        return (
          <section key={block.id || 'about'} style={{ background: '#fff', padding: 'clamp(36px,6vw,72px) clamp(20px,8vw,80px)', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              {block.data?.title && <h2 style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)', fontWeight: 700, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>{block.data.title}</h2>}
              {block.data?.body && <p style={{ fontSize: 15, lineHeight: 1.78, color: '#6B7280', whiteSpace: 'pre-line', margin: 0 }}>{block.data.body}</p>}
            </div>
          </section>
        );
      case 'gallery': {
        const imgs = (block.data?.images || []).filter((i: any) => i?.url);
        if (!imgs.length) return null;
        return (
          <section key={block.id || 'gallery'} style={{ background: '#F9FAFB', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxWidth: 960, margin: '0 auto' }}>
              {imgs.map((img: any, i: number) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </section>
        );
      }
      case 'booking_cta':
        return (
          <section key={block.id || 'booking'} style={{ background: primaryColor, padding: 'clamp(40px,6vw,64px) 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            {block.data?.title && <h2 style={{ fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{block.data.title}</h2>}
            {block.data?.subtitle && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: '0 0 22px' }}>{block.data.subtitle}</p>}
            <a href={`/book/${slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '13px 34px', background: '#fff', color: primaryColor, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {block.data?.buttonText || 'Book Now'}
            </a>
          </section>
        );
      case 'hours':
        return (
          <section key={block.id || 'hours'} style={{ background: '#fff', padding: 'clamp(32px,5vw,56px) clamp(20px,8vw,80px)', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Opening Hours</h2>
              {[{ day: 'Monday – Friday', h: block.data?.weekday }, { day: 'Saturday', h: block.data?.saturday }, { day: 'Sunday', h: block.data?.sunday }]
                .filter(r => r.h)
                .map(r => (
                  <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{r.day}</span>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>{r.h}</span>
                  </div>
                ))}
            </div>
          </section>
        );
      case 'social':
        return (
          <section key={block.id || 'social'} style={{ background: '#F9FAFB', padding: '28px 20px', textAlign: 'center', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {block.data?.instagram && <a href={block.data.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>📷 Instagram</a>}
              {block.data?.facebook && <a href={block.data.facebook} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>👥 Facebook</a>}
            </div>
          </section>
        );
      case 'divider':
        return block.data?.style === 'line'
          ? <hr key={block.id || 'hr'} style={{ border: 'none', borderTop: '1px solid rgba(24,24,24,0.08)', margin: 0 }} />
          : <div key={block.id || 'space'} style={{ height: 40 }} />;

      case 'menu_preview': {
        const topItems = allMenuItems.slice(0, 3);
        if (!topItems.length) return null;
        return (
          <section key={block.id || 'menu_preview'} style={{ background: '#fff', padding: 'clamp(36px,5vw,64px) clamp(20px,6vw,80px)', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: primaryColor, margin: '0 0 24px', letterSpacing: '-0.02em', textAlign: 'center' }}>Menu Highlights</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {topItems.map((item: any) => (
                  <div key={item.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '16px 18px', border: '1px solid rgba(24,24,24,0.06)' }}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 7, marginBottom: 10 }} />}
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
                    <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>${parseFloat(item.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'reviews': {
        const goodReviews = (reviewsList || []).filter((r: any) => r.rating >= 3).slice(0, 3);
        if (!goodReviews.length) return null;
        return (
          <section key={block.id || 'reviews'} style={{ background: '#F9FAFB', padding: 'clamp(36px,5vw,64px) clamp(20px,6vw,80px)', borderBottom: '1px solid rgba(24,24,24,0.07)' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: primaryColor, margin: '0 0 24px', letterSpacing: '-0.02em', textAlign: 'center' }}>What Our Customers Say</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {goodReviews.map((review: any) => (
                  <div key={review.id} style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', border: '1px solid rgba(24,24,24,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <span key={i} style={{ color: '#F59E0B', fontSize: 16 }}>★</span>
                      ))}
                    </div>
                    {review.comment && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic' }}>"{review.comment}"</p>}
                    {review.customerName && <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{review.customerName}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'cta_banner': {
        const bannerBg = block.data?.bgColor || accentColor || '#5E8B8B';
        return (
          <section key={block.id || 'cta_banner'} style={{ background: bannerBg, padding: 'clamp(40px,6vw,72px) 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            {block.data?.title && <h2 style={{ fontSize: 'clamp(1.4rem,3.5vw,2.2rem)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.03em' }}>{block.data.title}</h2>}
            {block.data?.subtitle && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', margin: '0 0 26px' }}>{block.data.subtitle}</p>}
            <a href="#venue-menu" style={{ display: 'inline-block', padding: '14px 38px', background: '#fff', color: bannerBg, borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
              {block.data?.buttonText || 'Order Now'}
            </a>
          </section>
        );
      }

      default:
        return null;
    }
  });
}

export default function VenuePublic() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
  const [tipOption, setTipOption] = useState<null | 10 | 15 | 20 | 'custom'>(null);
  const [tipCustom, setTipCustom] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [cateringForm, setCateringForm] = useState({ name: '', phone: '', email: '', eventDate: '', guestCount: '', details: '' });
  const [cateringSubmitted, setCateringSubmitted] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
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

  // ── Split bill ────────────────────────────────────────────────────────────────
  const [showSplit, setShowSplit] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // ── Add more items (dine-in) ──────────────────────────────────────────────────
  const [addMoreCart, setAddMoreCart] = useState<CartItem[]>([]);
  const [showAddMore, setShowAddMore] = useState(false);

  // ── Scheduled pickup time ─────────────────────────────────────────────────────
  const [pickupMode, setPickupMode] = useState<'asap' | 'schedule'>('asap');
  const [scheduleDay, setScheduleDay] = useState<'today' | 'tomorrow'>('today');
  const [scheduleSlot, setScheduleSlot] = useState('');

  // ── Favourite orders ──────────────────────────────────────────────────────────
  const [showSaveFav, setShowSaveFav] = useState(false);
  const [favLabel, setFavLabel] = useState('');
  const saveFavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Group order ───────────────────────────────────────────────────────────────
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'start' | 'join'>('start');
  const [groupHostName, setGroupHostName] = useState('');
  const [groupJoinCode, setGroupJoinCode] = useState('');
  const [groupSessionCode, setGroupSessionCode] = useState<string | null>(null);

  // ── Push notifications ────────────────────────────────────────────────────────
  const [wantsPushNotify, setWantsPushNotify] = useState(false);

  // ── PWA install prompt (deferred — shown after first order) ──────────────────
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // ── Stripe return verification ────────────────────────────────────────────────
  const stripeSessionParam = searchParams.get('session');
  const stripeOrderParam = searchParams.get('order');
  const stripeGiftcardParam = searchParams.get('giftcard');
  const stripePassParam = searchParams.get('pass');
  const [stripeConfirmed, setStripeConfirmed] = useState(false);

  // ── Loyalty redemption ────────────────────────────────────────────────────────
  const [redeemPoints, setRedeemPoints] = useState(0);

  // ── Gift card purchase panel state ────────────────────────────────────────────
  const [showGiftCardPanel, setShowGiftCardPanel] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState('');
  const [giftCardRecipientName, setGiftCardRecipientName] = useState('');
  const [giftCardRecipientEmail, setGiftCardRecipientEmail] = useState('');
  const [giftCardMessage, setGiftCardMessage] = useState('');

  // ── Pass purchase panel state ─────────────────────────────────────────────────
  const [showPassPanel, setShowPassPanel] = useState(false);

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

  const { data: inventoryRows } = trpc.venue.getInventory.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  // Build availability map from inventory
  const invAvailMap: Record<number, boolean> = {};
  if (inventoryRows) {
    for (const row of inventoryRows) {
      invAvailMap[row.menuItemId] = row.isAvailable;
    }
  }

  const { data: bundles } = trpc.venue.listBundlesPublic.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  const { data: happyHourData } = trpc.venue.getHappyHour.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id }
  );

  // ── Public holiday surcharge ──────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: holidayData } = trpc.venue.isPublicHoliday.useQuery(
    { venueId: venue?.id || 0, date: todayStr },
    { enabled: !!venue?.id }
  );
  const isPublicHoliday = holidayData?.isHoliday ?? false;

  const { data: customerMe } = trpc.customerAuth.me.useQuery(undefined, {
    enabled: !!venue?.id,
  });

  const { data: loyaltyRewards } = trpc.loyaltyRewards.list.useQuery(
    { venueId: venue?.id || 0 },
    { enabled: !!venue?.id && showRewardsCatalogue }
  );

  const cartItemIdList = cart.map(c => c.menuItemId).filter(id => id > 0);

  const upsellQuery = trpc.venue.getUpsellSuggestions.useQuery(
    { venueId: venue?.id || 0, cartItemIds: cartItemIdList },
    { enabled: !!venue?.id && cartItemIdList.length > 0 && showCart }
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

  // ── Order history panel ──────────────────────────────────────────────────────
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const orderHistoryPanelQuery = trpc.venue.getOrderHistory.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone, limit: 10 },
    { enabled: !!venue?.id && checkoutPhone.length >= 8 }
  );

  const historyOrders = orderHistoryPanelQuery.data ?? [];

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

  // ── Stripe session verification (called when ?session= is in URL after payment) ─
  const verifySessionQuery = trpc.stripeCheckout.verifySession.useQuery(
    { sessionId: stripeSessionParam ?? '', venueSlug: slug ?? '' },
    { enabled: !!stripeSessionParam && !!slug && stripeOrderParam === 'success' }
  );

  // ── Pass config for public pass purchase panel ────────────────────────────────
  const passConfigQuery = trpc.venue.getPassConfig.useQuery(
    { venueId: venue?.id ?? 0 },
    { enabled: !!venue?.id }
  );

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

  // ── Stripe Checkout mutations ─────────────────────────────────────────────────
  const createCheckoutSession = trpc.stripeCheckout.createCheckoutSession.useMutation();
  const createGiftCardCheckout = trpc.stripeCheckout.createGiftCardCheckoutSession.useMutation();
  const createPassCheckout = trpc.stripeCheckout.createPassCheckoutSession.useMutation();

  // ── Favourite orders queries/mutations ────────────────────────────────────────
  const favouriteOrdersQuery = trpc.venue.listFavouriteOrders.useQuery(
    { venueId: venue?.id ?? 0, phone: checkoutPhone },
    { enabled: !!venue?.id && checkoutPhone.length >= 8 }
  );
  const saveFavouriteMutation = trpc.venue.saveFavouriteOrder.useMutation({
    onSuccess: () => {
      setShowSaveFav(false);
      showToast('⭐ Saved to favourites!');
      favouriteOrdersQuery.refetch();
    },
  });
  const incrementFavUsage = trpc.venue.incrementFavouriteUsage.useMutation();

  // ── Group order mutations ──────────────────────────────────────────────────────
  const createGroupSession = trpc.venue.createGroupSession.useMutation({
    onSuccess: (data) => {
      setGroupSessionCode((data as { sessionCode: string }).sessionCode);
    },
  });

  const createAddMoreOrder = trpc.venue.createOrder.useMutation({
    onSuccess: () => {
      setAddMoreCart([]);
      setShowAddMore(false);
      showToast('Additional items added to your table!');
    },
  });

  const createOrder = trpc.venue.createOrder.useMutation({
    onSuccess: (data) => {
      // capture cart before clearing for save-favourite
      const savedCart = [...cart];
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
      // Push notification subscription if opted in
      if (wantsPushNotify && checkoutPhone && 'serviceWorker' in navigator && 'PushManager' in window) {
        import('@/hooks/usePushSubscription').then(({ subscribePush }) => {
          subscribePush(checkoutPhone).catch(() => {});
        }).catch(() => {});
      }
      // Show save-favourite prompt if phone filled and has items
      if (checkoutPhone && savedCart.length > 0) {
        setFavLabel(savedCart[0].name + (savedCart.length > 1 ? ` + ${savedCart.length - 1} more` : ''));
        setShowSaveFav(true);
        if (saveFavTimer.current) clearTimeout(saveFavTimer.current);
        saveFavTimer.current = setTimeout(() => setShowSaveFav(false), 10000);
      }
    },
  });

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Capture deferred beforeinstallprompt event (not available on iOS)
  useEffect(() => {
    if (isIOS) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show install banner after first successful order (deferred UX)
  useEffect(() => {
    if (!placedOrderNumber) return;
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    // iOS: show native share instruction; non-iOS: only show when prompt is available
    if (isIOS || installPrompt) {
      setShowInstallBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedOrderNumber, installPrompt]);

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

  // Stripe return — show toasts for gift card and pass successes
  useEffect(() => {
    if (stripeGiftcardParam === 'success') showToast('Gift card purchased! Check your email for the code.');
    if (stripePassParam === 'success') showToast('Pass purchased! Use it at checkout.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeGiftcardParam, stripePassParam]);

  // Stripe order confirmed — clear cart when verifySession reports paid
  useEffect(() => {
    if (verifySessionQuery.data?.paid && !stripeConfirmed) {
      setStripeConfirmed(true);
      setCart([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifySessionQuery.data?.paid]);

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
  const themeFont = (venue?.settingsJson as any)?.theme?.font;

  // Inject Google Font if theme font is set
  useEffect(() => {
    if (!themeFont || themeFont === 'Inter') return;
    const id = `gfont-vp-${themeFont.replace(/\s/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(themeFont)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [themeFont]);

  const waitMinutes = (venue.settingsJson as { waitTimeMinutes?: number } | null)?.waitTimeMinutes ?? 0;
  const openStatus = getOpenStatus(venue);

  const allMenuItems = menuItems || [];
  const filteredMenu = allMenuItems.filter(i => {
    if (dietaryFilter && !i.dietary?.split(',').map(d => d.trim()).includes(dietaryFilter)) return false;
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      if (!i.name.toLowerCase().includes(q) && !i.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

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

    // Upsell is shown persistently inside the cart drawer — no floating sheet needed
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

  // ── Reorder handler: add all items from a past order into the current cart ───
  type HistoryOrder = {
    id: number;
    orderNumber: string;
    createdAt: Date;
    totalAmount: string;
    items: { itemName: string; quantity: number; menuItemId: number }[];
  };

  const handleReorder = (order: HistoryOrder) => {
    let added = 0;
    for (const item of order.items) {
      const menuItem = allMenuItems.find(m => m.id === item.menuItemId || m.name === item.itemName);
      if (menuItem) {
        for (let i = 0; i < item.quantity; i++) {
          addToCart(menuItem);
        }
        added += item.quantity;
      }
    }
    if (added > 0) {
      showToast(`${added} item${added > 1 ? 's' : ''} added to cart`);
    } else {
      showToast('Some items are no longer available');
    }
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
    : tipOption === null ? 0
    : (cartSubtotal * (tipOption as number)) / 100;

  // Discount: use promo code if present, otherwise happy hour (better of the two)
  const promoDiscountAmount = appliedDiscount?.amount ?? 0;
  const happyHourDiscountAmount = happyHourDiscount > 0 ? (cartSubtotal * happyHourDiscount) / 100 : 0;
  const effectivePromo = promoDiscountAmount > 0 ? promoDiscountAmount : happyHourDiscountAmount;

  // Loyalty discount: redeemPoints / 10 = dollar value, clamped so it never exceeds remaining total
  const loyaltyDiscount = Math.min(
    redeemPoints / 10,
    Math.max(0, cartSubtotal - effectivePromo - appliedGiftDiscount)
  );

  const totalAfterDiscounts = Math.max(0, cartSubtotal - effectivePromo - appliedGiftDiscount - loyaltyDiscount);

  // Public holiday surcharge
  const surchargePercent = isPublicHoliday
    ? (((venue as { settingsJson?: unknown })?.settingsJson as { publicHolidaySurcharge?: number } | null)?.publicHolidaySurcharge ?? 10)
    : 0;
  const surchargeAmount = isPublicHoliday ? (cartSubtotal * surchargePercent / 100) : 0;

  const orderTotal = totalAfterDiscounts + tipAmount + surchargeAmount;

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

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !venue?.id) return;
    const notesParts: string[] = [];
    if (appliedGiftDiscount > 0) notesParts.push(`Gift card: -$${appliedGiftDiscount.toFixed(2)}`);
    if (tableNumber) notesParts.push(`Table: ${tableNumber}`);
    if (isPublicHoliday && surchargeAmount > 0) notesParts.push(`Public holiday surcharge (${surchargePercent}%): +$${surchargeAmount.toFixed(2)}`);
    const resolvedPickupTime = orderType === 'dine-in'
      ? 'Now'
      : pickupMode === 'asap'
        ? 'ASAP'
        : scheduleSlot
          ? `${scheduleDay === 'today' ? 'Today' : 'Tomorrow'} at ${scheduleSlot}`
          : (checkoutPickupTime || 'ASAP');

    // Build items array for Stripe — each cart line maps to { menuItemId, name, itemName, quantity, unitPrice }
    const stripeItems = cart.map(c => {
      const menuItem = allMenuItems.find(m => m.id === c.menuItemId);
      return {
        menuItemId: c.menuItemId,
        name: menuItem?.name ?? c.name ?? 'Item',
        itemName: menuItem?.name ?? c.name ?? 'Item',
        quantity: c.quantity,
        unitPrice: c.price, // already includes modifier price adjustments
      };
    });

    try {
      const result = await createCheckoutSession.mutateAsync({
        venueId: venue.id,
        items: stripeItems,
        tipAmount: tipAmount + surchargeAmount,
        discountAmount: effectivePromo + appliedGiftDiscount + loyaltyDiscount,
        discountCode: appliedDiscount?.code,
        customerName: checkoutName || 'Guest',
        customerPhone: checkoutPhone || '0000000000',
        customerEmail: checkoutEmail || undefined,
        pickupTime: resolvedPickupTime,
        orderNote: notesParts.join('; ') || undefined,
        locationId: selectedLocationId ?? undefined,
        loyaltyPhone: redeemPoints > 0 ? checkoutPhone : undefined,
        loyaltyPointsRedeemed: redeemPoints,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (e: unknown) {
      showToast((e as { message?: string }).message ?? 'Could not start checkout. Please try again.');
    }
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
    <div style={{ background: '#F8F6F2', fontFamily: themeFont ? `'${themeFont}', Inter, -apple-system, sans-serif` : 'Inter, -apple-system, sans-serif' }}>

      {/* ── Stripe order confirmation banner ────────────────────────────────── */}
      {stripeOrderParam === 'success' && verifySessionQuery.data?.paid && (
        <div style={{
          background: 'rgba(94,139,139,0.08)', border: '1px solid rgba(94,139,139,0.25)',
          borderRadius: 12, padding: '20px 24px', margin: '16px auto',
          maxWidth: 560, display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <CheckCircle size={22} style={{ color: accentColor, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B', marginBottom: 4, letterSpacing: '-0.02em' }}>
              Payment confirmed
            </div>
            {verifySessionQuery.data.orderNumber ? (
              <div style={{ fontSize: 13, color: '#71717A' }}>
                Order{' '}
                <span style={{ fontWeight: 700, color: accentColor }}>
                  #{verifySessionQuery.data.orderNumber}
                </span>
                {' '}is being prepared.{' '}
                <Link
                  to={`/order/${verifySessionQuery.data.orderNumber}`}
                  style={{ color: accentColor, fontWeight: 600, textDecoration: 'underline' }}
                >
                  View order status →
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#71717A' }}>Your order has been received and is being prepared.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Gift card success banner ─────────────────────────────────────────── */}
      {stripeGiftcardParam === 'success' && (
        <div style={{
          background: 'rgba(94,139,139,0.08)', border: '1px solid rgba(94,139,139,0.25)',
          borderRadius: 12, padding: '20px 24px', margin: '16px auto',
          maxWidth: 560, display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <CheckCircle size={22} style={{ color: accentColor, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B', marginBottom: 4, letterSpacing: '-0.02em' }}>
              Gift card purchased!
            </div>
            <div style={{ fontSize: 13, color: '#71717A' }}>
              Your gift card has been sent. Check your email for the code.
            </div>
          </div>
        </div>
      )}

      {/* ── Pass success banner ──────────────────────────────────────────────── */}
      {stripePassParam === 'success' && (
        <div style={{
          background: 'rgba(94,139,139,0.08)', border: '1px solid rgba(94,139,139,0.25)',
          borderRadius: 12, padding: '20px 24px', margin: '16px auto',
          maxWidth: 560, display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <CheckCircle size={22} style={{ color: accentColor, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B', marginBottom: 4, letterSpacing: '-0.02em' }}>
              Pass purchased!
            </div>
            <div style={{ fontSize: 13, color: '#71717A' }}>
              Your coffee pass is ready. Enter your phone number at checkout to use your credits.
            </div>
          </div>
        </div>
      )}

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

      {/* Upsell suggestions are shown inside the cart drawer — see cart drawer section below */}

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

      {/* Save Favourite Prompt */}
      {showSaveFav && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#fff', borderRadius: 12, padding: '16px 20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 380, width: 'calc(100% - 32px)',
          border: '1px solid rgba(94,139,139,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>⭐ Save as favourite order?</span>
            <button onClick={() => { setShowSaveFav(false); if (saveFavTimer.current) clearTimeout(saveFavTimer.current); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
              <X size={14} />
            </button>
          </div>
          <input
            value={favLabel}
            onChange={e => setFavLabel(e.target.value)}
            placeholder="Label for this order"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 13, color: '#181818', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <button
            onClick={() => {
              if (!venue?.id || !checkoutPhone || !favLabel.trim()) return;
              const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
              saveFavouriteMutation.mutate({
                venueId: venue.id,
                phone: checkoutPhone,
                label: favLabel.trim(),
                itemsJson: JSON.stringify(cart),
                totalAmount: total,
              });
            }}
            disabled={saveFavouriteMutation.isPending || !favLabel.trim()}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: '#5E8B8B', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', opacity: !favLabel.trim() ? 0.5 : 1,
            }}
          >
            {saveFavouriteMutation.isPending ? 'Saving…' : 'Save Favourite'}
          </button>
        </div>
      )}

      {/* Group Order Modal */}
      {showGroupModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => { setShowGroupModal(false); setGroupSessionCode(null); }}
        >
          <div
            style={{ background: '#F3F2EE', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 480, padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#181818', margin: 0 }}>👥 Group Order</h2>
              <button onClick={() => { setShowGroupModal(false); setGroupSessionCode(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#5E5E5E" />
              </button>
            </div>
            {groupSessionCode ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#181818', letterSpacing: 4, marginBottom: 8 }}>{groupSessionCode}</div>
                <p style={{ fontSize: 13, color: '#5E5E5E', marginBottom: 12 }}>Share this code with your group</p>
                <div style={{
                  background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12,
                  color: '#5E8B8B', border: '1px solid rgba(94,139,139,0.2)', wordBreak: 'break-all', marginBottom: 16,
                }}>
                  {window.location.origin}/group/{groupSessionCode}?v={venue?.id}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/group/${groupSessionCode}?v=${venue?.id}`); showToast('Link copied!'); }}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#181818', color: '#F3F2EE', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Copy Link
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {(['start', 'join'] as const).map(tab => (
                    <button key={tab} onClick={() => setGroupModalTab(tab)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                      background: groupModalTab === tab ? '#181818' : '#fff',
                      color: groupModalTab === tab ? '#F3F2EE' : '#181818',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}>
                      {tab === 'start' ? 'Start Group Order' : 'Join Group Order'}
                    </button>
                  ))}
                </div>
                {groupModalTab === 'start' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      placeholder="Your name"
                      value={groupHostName}
                      onChange={e => setGroupHostName(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }}
                    />
                    <button
                      onClick={() => {
                        if (!venue?.id || !groupHostName.trim()) return;
                        createGroupSession.mutate({ venueId: venue.id, hostPhone: checkoutPhone || '', hostName: groupHostName.trim() });
                      }}
                      disabled={createGroupSession.isPending || !groupHostName.trim()}
                      style={{ padding: '12px 0', borderRadius: 8, border: 'none', background: '#5E8B8B', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !groupHostName.trim() ? 0.5 : 1 }}
                    >
                      {createGroupSession.isPending ? 'Creating…' : 'Create Group Session'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      placeholder="Enter session code"
                      value={groupJoinCode}
                      onChange={e => setGroupJoinCode(e.target.value.toUpperCase())}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818', letterSpacing: 2 }}
                    />
                    <button
                      onClick={() => { if (groupJoinCode.trim()) navigate(`/group/${groupJoinCode.trim()}?v=${venue?.id}`); }}
                      disabled={!groupJoinCode.trim()}
                      style={{ padding: '12px 0', borderRadius: 8, border: 'none', background: '#5E8B8B', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !groupJoinCode.trim() ? 0.5 : 1 }}
                    >
                      Join Group
                    </button>
                  </div>
                )}
              </>
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
                    setShowSplit(false);
                    setShowAddMore(false);
                    setAddMoreCart([]);
                  }}
                  style={{
                    display: 'block', margin: '16px auto 0', background: 'none',
                    border: 'none', color: '#5E5E5E', fontSize: 13, cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Dismiss
                </button>

                {/* ── PWA install banner (deferred — shown after first order) ── */}
                {showInstallBanner && !isIOS && (
                  <div style={{
                    marginTop: 16, padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(94,139,139,0.09)', border: '1px solid rgba(94,139,139,0.25)',
                    display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', fontWeight: 500 }}>
                      Add to your home screen for faster ordering next time
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={async () => {
                          if (!installPrompt) return;
                          const prompt = installPrompt as any;
                          prompt.prompt();
                          await prompt.userChoice;
                          setShowInstallBanner(false);
                          setInstallPrompt(null);
                        }}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 7,
                          background: '#5E8B8B', color: '#fff', border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Add to Home Screen
                      </button>
                      <button
                        onClick={() => {
                          setShowInstallBanner(false);
                          localStorage.setItem('pwa-install-dismissed', '1');
                        }}
                        style={{
                          padding: '9px 14px', borderRadius: 7, background: 'none',
                          border: '1px solid rgba(24,24,24,0.18)', color: '#6B7280',
                          fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                )}

                {/* ── iOS install hint (deferred — shown after first order) ─── */}
                {showInstallBanner && isIOS && (
                  <div style={{
                    marginTop: 16, padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(94,139,139,0.09)', border: '1px solid rgba(94,139,139,0.25)',
                    fontSize: 13, color: '#374151', textAlign: 'left',
                  }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 500 }}>Add to your home screen</p>
                    <p style={{ margin: 0, color: '#6B7280' }}>
                      Tap the Share button then "Add to Home Screen" for faster ordering.
                    </p>
                  </div>
                )}

                {/* ── Split Bill ────────────────────────────────────────────── */}
                <div style={{ marginTop: 24, borderTop: '1px solid rgba(24,24,24,0.08)', paddingTop: 20 }}>
                  {!showSplit ? (
                    <button
                      onClick={() => setShowSplit(true)}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 8,
                        border: '1px solid rgba(24,24,24,0.18)', background: '#fff',
                        color: '#181818', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      💳 Split Bill
                    </button>
                  ) : (
                    <SplitBillPanel
                      orderTotal={orderTotal}
                      splitCount={splitCount}
                      setSplitCount={setSplitCount}
                      onClose={() => setShowSplit(false)}
                      slug={slug || ''}
                      tableNumber={tableNumber}
                    />
                  )}
                </div>

                {/* ── Add More Items (dine-in only) ─────────────────────────── */}
                {tableNumber && venue?.id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(24,24,24,0.08)', paddingTop: 16 }}>
                    {!showAddMore ? (
                      <button
                        onClick={() => setShowAddMore(true)}
                        style={{
                          width: '100%', padding: '10px 0', borderRadius: 8,
                          border: '1px solid rgba(94,139,139,0.35)', background: 'rgba(94,139,139,0.07)',
                          color: '#5E8B8B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <Plus size={15} /> Add More Items to Table {tableNumber}
                      </button>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>
                            Add More — Table {tableNumber}
                          </span>
                          <button onClick={() => { setShowAddMore(false); setAddMoreCart([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
                            <X size={14} />
                          </button>
                        </div>
                        {/* Mini item picker */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                          {(menuItems || []).map(mi => {
                            const qty = addMoreCart.find(c => c.menuItemId === mi.id)?.quantity ?? 0;
                            return (
                              <div key={mi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(24,24,24,0.08)' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>{mi.name}</div>
                                  <div style={{ fontSize: 11, color: '#5E8B8B' }}>${Number(mi.price).toFixed(2)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {qty > 0 && (
                                    <>
                                      <button
                                        onClick={() => setAddMoreCart(prev => {
                                          const ex = prev.find(c => c.menuItemId === mi.id);
                                          if (!ex) return prev;
                                          if (ex.quantity <= 1) return prev.filter(c => c.menuItemId !== mi.id);
                                          return prev.map(c => c.menuItemId === mi.id ? { ...c, quantity: c.quantity - 1 } : c);
                                        })}
                                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => setAddMoreCart(prev => {
                                      const ex = prev.find(c => c.menuItemId === mi.id);
                                      if (ex) return prev.map(c => c.menuItemId === mi.id ? { ...c, quantity: c.quantity + 1 } : c);
                                      return [...prev, { menuItemId: mi.id, name: mi.name, price: Number(mi.price), quantity: 1 }];
                                    })}
                                    style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#181818', color: '#F3F2EE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {addMoreCart.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 8 }}>
                              {addMoreCart.reduce((s, c) => s + c.quantity, 0)} item(s) · ${addMoreCart.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}
                            </div>
                            <button
                              disabled={createAddMoreOrder.isPending}
                              onClick={() => {
                                if (!venue?.id || addMoreCart.length === 0) return;
                                createAddMoreOrder.mutate({
                                  venueId: venue.id,
                                  customerName: checkoutName || 'Guest',
                                  customerPhone: checkoutPhone || '0000000000',
                                  pickupTime: 'Now',
                                  items: addMoreCart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
                                  orderType: 'dine_in',
                                  tableNumber: tableNumber,
                                  tipAmount: 0,
                                });
                              }}
                              style={{
                                width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                                background: '#5E8B8B', color: '#fff', fontSize: 13, fontWeight: 600,
                                cursor: createAddMoreOrder.isPending ? 'not-allowed' : 'pointer',
                                opacity: createAddMoreOrder.isPending ? 0.7 : 1,
                              }}
                            >
                              {createAddMoreOrder.isPending ? 'Sending…' : 'Send to Kitchen'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

                  {/* ── Order history panel ─────────────────────────────────── */}
                  {checkoutPhone.length >= 8 && historyOrders.length > 0 && (
                    <div style={{ borderRadius: 12, border: '1px solid rgba(94,139,139,0.2)', background: '#F8F6F2', overflow: 'hidden' }}>
                      <button
                        onClick={() => setShowOrderHistory(v => !v)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, color: '#181818',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <History size={14} style={{ color: accentColor }} />
                          Your recent orders ({historyOrders.length})
                        </span>
                        <ChevronDown size={14} style={{ color: '#5E5E5E', transform: showOrderHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      {showOrderHistory && (
                        <div style={{ borderTop: '1px solid rgba(24,24,24,0.08)', padding: '8px 0' }}>
                          {historyOrders.map(order => {
                            const displayItems = order.items.slice(0, 3);
                            const extra = order.items.length - displayItems.length;
                            const dateStr = new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
                            return (
                              <div key={order.id} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#181818' }}>{dateStr}</span>
                                    <span style={{ fontSize: 11, color: '#5E5E5E', marginLeft: 8 }}>#{order.orderNumber}</span>
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#181818' }}>${Number(order.totalAmount).toFixed(2)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 8 }}>
                                  {displayItems.map((item, i) => (
                                    <span key={i}>
                                      {item.quantity > 1 && <span style={{ fontWeight: 600 }}>{item.quantity}x </span>}
                                      {item.itemName}
                                      {i < displayItems.length - 1 && ', '}
                                    </span>
                                  ))}
                                  {extra > 0 && <span style={{ color: accentColor }}> and {extra} more</span>}
                                </div>
                                <button
                                  onClick={() => handleReorder(order)}
                                  style={{
                                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${accentColor}`,
                                    background: 'transparent', color: accentColor,
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  }}
                                >
                                  Reorder
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#181818', cursor: 'pointer', padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={wantsPushNotify}
                        onChange={e => setWantsPushNotify(e.target.checked)}
                        style={{ width: 14, height: 14, accentColor: '#5E8B8B' }}
                      />
                      <Bell size={13} style={{ color: '#5E8B8B' }} />
                      Notify me when my order is ready
                    </label>
                  )}
                  {loyaltyBalance !== null && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexWrap: 'wrap', marginBottom: 6 }}>
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
                      {/* ── Loyalty points redemption control ────────────────── */}
                      {loyaltyBalance >= 100 ? (
                        <div style={{
                          background: '#FFFFFF', borderRadius: 8, border: '1px solid #E4E4E7',
                          padding: '12px 14px',
                        }}>
                          <label style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: 13, color: '#09090B', cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={redeemPoints > 0}
                              onChange={e => {
                                if (e.target.checked) {
                                  // Redeem up to the lesser of (balance floored to multiple of 10)
                                  // and (subtotal * 10 = max points that would cover the subtotal)
                                  const maxByBalance = Math.floor(loyaltyBalance / 10) * 10;
                                  const maxByTotal = Math.floor(cartSubtotal * 10 / 10) * 10;
                                  setRedeemPoints(Math.min(maxByBalance, Math.max(0, maxByTotal)));
                                } else {
                                  setRedeemPoints(0);
                                }
                              }}
                              style={{ width: 15, height: 15, accentColor: accentColor }}
                            />
                            <span>
                              Redeem{' '}
                              <span style={{ fontWeight: 700, color: accentColor }}>
                                {redeemPoints > 0 ? redeemPoints : Math.min(Math.floor(loyaltyBalance / 10) * 10, Math.floor(cartSubtotal * 10 / 10) * 10)} pts
                              </span>
                              {' '}= <span style={{ fontWeight: 700, color: '#09090B' }}>${(Math.min(Math.floor(loyaltyBalance / 10) * 10, Math.floor(cartSubtotal * 10 / 10) * 10) / 10).toFixed(2)} off</span>
                            </span>
                          </label>
                          {redeemPoints > 0 && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#71717A' }}>
                              -{redeemPoints} pts = -${loyaltyDiscount.toFixed(2)} applied to your total
                            </div>
                          )}
                        </div>
                      ) : loyaltyBalance > 0 && loyaltyBalance < 100 ? (
                        <div style={{ fontSize: 12, color: '#71717A', padding: '6px 0' }}>
                          Earn {100 - loyaltyBalance} more points to unlock redemption (minimum 100 pts)
                        </div>
                      ) : null}
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
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: '#181818', display: 'block', marginBottom: 6 }}>
                        Pickup time
                      </label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: pickupMode === 'schedule' ? 10 : 0 }}>
                        {(['asap', 'schedule'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setPickupMode(mode)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              border: pickupMode === mode ? 'none' : '1px solid rgba(24,24,24,0.12)',
                              background: pickupMode === mode ? '#181818' : '#fff',
                              color: pickupMode === mode ? '#F3F2EE' : '#181818',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {mode === 'asap' ? 'ASAP' : 'Schedule'}
                          </button>
                        ))}
                      </div>
                      {pickupMode === 'schedule' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(['today', 'tomorrow'] as const).map(day => (
                              <button
                                key={day}
                                onClick={() => setScheduleDay(day)}
                                style={{
                                  flex: 1, padding: '6px 0', borderRadius: 8,
                                  border: scheduleDay === day ? 'none' : '1px solid rgba(24,24,24,0.12)',
                                  background: scheduleDay === day ? '#5E8B8B' : '#fff',
                                  color: scheduleDay === day ? '#fff' : '#181818',
                                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  textTransform: 'capitalize' as const,
                                }}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                          <select
                            value={scheduleSlot}
                            onChange={e => setScheduleSlot(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 13, background: '#fff', color: '#181818' }}
                          >
                            <option value="">Select a time…</option>
                            {(() => {
                              const slots: string[] = [];
                              const now = new Date();
                              let startMin = now.getHours() * 60 + now.getMinutes() + 30;
                              // round up to next 15-min slot
                              startMin = Math.ceil(startMin / 15) * 15;
                              const endMin = startMin + 8 * 60;
                              for (let m = startMin; m <= endMin; m += 15) {
                                const h = Math.floor(m / 60) % 24;
                                const min = m % 60;
                                const suffix = h >= 12 ? 'pm' : 'am';
                                const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
                                slots.push(min === 0 ? `${displayH}${suffix}` : `${displayH}:${String(min).padStart(2, '0')}${suffix}`);
                              }
                              return slots.map(s => <option key={s} value={s}>{s}</option>);
                            })()}
                          </select>
                          {scheduleSlot && (
                            <div style={{ fontSize: 12, color: '#5E8B8B', fontWeight: 500 }}>
                              Pickup: {scheduleDay === 'today' ? 'Today' : 'Tomorrow'} at {scheduleSlot}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

                  {/* ── Upsell panel — shown inside cart drawer before checkout ── */}
                  {upsellQuery.data && upsellQuery.data.length > 0 && (
                    <div style={{
                      borderRadius: 10, border: '1px solid rgba(94,139,139,0.25)',
                      background: 'rgba(94,139,139,0.04)', padding: '12px 14px',
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#5E8B8B', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Customers also ordered
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(upsellQuery.data as { id: number; name: string; price: string }[]).map(sug => (
                          <div key={sug.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#fff', borderRadius: 8, padding: '8px 10px',
                            border: '1px solid rgba(24,24,24,0.07)',
                          }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>{sug.name}</div>
                              <div style={{ fontSize: 12, color: '#5E8B8B' }}>${Number(sug.price).toFixed(2)}</div>
                            </div>
                            <button
                              onClick={() => {
                                const mi = allMenuItems.find(m => m.id === sug.id);
                                if (mi) addToCart(mi);
                              }}
                              style={{
                                padding: '6px 14px', borderRadius: 8, border: 'none',
                                background: '#181818', color: '#F3F2EE',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tip selection — hidden for dine-in (ACCC: options start unselected) */}
                  {orderType !== 'dine-in' && (
                  <div style={{ marginBottom: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1c1917' }}>Add a tip?</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setTipOption(10)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `2px solid ${tipOption === 10 ? '#1c1917' : '#e7e5e4'}`,
                          background: tipOption === 10 ? '#1c1917' : '#fff',
                          color: tipOption === 10 ? '#fff' : '#1c1917',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        10% (${((cartSubtotal * 10) / 100).toFixed(2)})
                      </button>
                      <button
                        onClick={() => setTipOption(15)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `2px solid ${tipOption === 15 ? '#1c1917' : '#e7e5e4'}`,
                          background: tipOption === 15 ? '#1c1917' : '#fff',
                          color: tipOption === 15 ? '#fff' : '#1c1917',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        15% (${((cartSubtotal * 15) / 100).toFixed(2)})
                      </button>
                      <button
                        onClick={() => setTipOption(20)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `2px solid ${tipOption === 20 ? '#1c1917' : '#e7e5e4'}`,
                          background: tipOption === 20 ? '#1c1917' : '#fff',
                          color: tipOption === 20 ? '#fff' : '#1c1917',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        20% (${((cartSubtotal * 20) / 100).toFixed(2)})
                      </button>
                      <button
                        onClick={() => setTipOption('custom')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `2px solid ${tipOption === 'custom' ? '#1c1917' : '#e7e5e4'}`,
                          background: tipOption === 'custom' ? '#1c1917' : '#fff',
                          color: tipOption === 'custom' ? '#fff' : '#1c1917',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Custom
                      </button>
                      <button
                        onClick={() => setTipOption(null)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `2px solid ${tipOption === null ? '#1c1917' : '#e7e5e4'}`,
                          background: tipOption === null ? '#1c1917' : '#fff',
                          color: tipOption === null ? '#fff' : '#1c1917',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        No Tip
                      </button>
                    </div>
                    {tipOption === 'custom' && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: '#44403c' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={tipCustom}
                          onChange={e => setTipCustom(e.target.value)}
                          placeholder="0.00"
                          style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 14 }}
                        />
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <p style={{ fontSize: 12, color: '#78716c', marginTop: 6 }}>
                        Tip: ${tipAmount.toFixed(2)} — 100% goes to the team
                      </p>
                    )}
                  </div>
                  )}

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
                  {loyaltyDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#d97706', fontSize: 13 }}>
                      <span>⭐ Loyalty points ({redeemPoints} pts)</span>
                      <span>-${loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {isPublicHoliday && surchargeAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400e', fontSize: '13px', marginBottom: 6 }}>
                      <span>🎉 Public Holiday Surcharge ({surchargePercent}%)</span>
                      <span>+${surchargeAmount.toFixed(2)}</span>
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
                    disabled={createCheckoutSession.isPending}
                    style={{
                      width: '100%', padding: 14, borderRadius: 8, border: 'none',
                      background: accentColor || primaryColor, color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                      cursor: createCheckoutSession.isPending ? 'not-allowed' : 'pointer',
                      opacity: createCheckoutSession.isPending ? 0.5 : 1,
                      fontFamily: 'Inter, -apple-system, sans-serif',
                    }}
                  >
                    {createCheckoutSession.isPending ? 'Placing Order…' : 'Place Order'}
                  </button>
                  {createCheckoutSession.error && (
                    <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{createCheckoutSession.error.message}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button — visible on ALL screen sizes when cart has items */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100,
            background: accentColor || '#181818', color: '#fff',
            borderRadius: 14, padding: '14px 28px',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
            fontSize: 15, fontWeight: 700,
            whiteSpace: 'nowrap',
            minWidth: 260,
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={18} />
            <span>{cartCount} item{cartCount !== 1 ? 's' : ''} · View Cart</span>
          </span>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Website blocks (from block editor) OR fallback hero/about/gallery */}
      {Array.isArray((venue as any).websiteBlocks) && (venue as any).websiteBlocks.length > 0 ? (
        renderWebsiteBlocks((venue as any).websiteBlocks, primaryColor, slug || '', allMenuItems, reviewsList || [], accentColor)
      ) : (
        <>
          {(venue as any).heroImageUrl ? (
            <div style={{ position: 'relative', height: 'clamp(280px, 42vw, 520px)', overflow: 'hidden' }}>
              <img
                src={(venue as any).heroImageUrl}
                alt={venue.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.62) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(20px,4vw,48px)', textAlign: 'center' }}>
                {venue.logoUrl && (
                  <img src={venue.logoUrl} alt={venue.name} style={{ height: 52, width: 'auto', objectFit: 'contain', margin: '0 auto 12px', display: 'block', filter: 'brightness(0) invert(1)' }} />
                )}
                <h1 style={{ fontWeight: 400, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {venue.name}
                </h1>
                {(venue as any).tagline && (
                  <p style={{ marginTop: 10, fontSize: 'clamp(0.875rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                    {(venue as any).tagline}
                  </p>
                )}
              </div>
            </div>
          ) : (
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
                {(venue as any).tagline ? (
                  <p className="mt-2 mx-auto" style={{ fontSize: '1rem', fontStyle: 'italic', color: primaryColor, opacity: 0.8, maxWidth: '500px' }}>
                    {(venue as any).tagline}
                  </p>
                ) : venue.description && (
                  <p className="mt-3 mx-auto" style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#5E5E5E', maxWidth: '500px' }}>
                    {venue.description}
                  </p>
                )}
              </div>
            </header>
          )}
          {(venue as any).aboutText && (
            <section style={{ background: '#fff', borderBottom: '1px solid rgba(24,24,24,0.08)' }}>
              <div className="content-container py-10" style={{ maxWidth: 720 }}>
                <h2 style={{ fontWeight: 400, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#181818', marginBottom: 16 }}>
                  {(venue as any).aboutTitle || 'Our Story'}
                </h2>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, color: '#5E5E5E', whiteSpace: 'pre-line' }}>
                  {(venue as any).aboutText}
                </p>
              </div>
            </section>
          )}
          {Array.isArray((venue as any).galleryImages) && (venue as any).galleryImages.length > 0 && (
            <section style={{ background: '#F3F2EE', borderBottom: '1px solid rgba(24,24,24,0.08)' }}>
              <div className="content-container py-8">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                  {((venue as any).galleryImages as {url:string;caption:string}[]).map((img, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden' }}>
                      <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Menu anchor */}
      <div id="venue-menu" />

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

      {/* Public Holiday Banner */}
      {isPublicHoliday && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #f59e0b', padding: '8px 16px', textAlign: 'center', fontSize: '13px', color: '#92400e' }}>
          🎉 Public Holiday — a {surchargePercent}% surcharge applies today as required by Fair Work Australia
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

      {/* Book a Table button */}
      {(venue?.settingsJson as { reservationsEnabled?: boolean } | null)?.reservationsEnabled !== false && (
        <div style={{ textAlign: 'center', padding: '14px 16px' }}>
          <a
            href={`/book/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', background: primaryColor, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
          >
            📅 Book a Table
          </a>
        </div>
      )}

      {/* Social links */}
      {((venue as any).instagramUrl || (venue as any).facebookUrl) && (
        <div style={{ textAlign: 'center', padding: '8px 16px 4px', display: 'flex', justifyContent: 'center', gap: 16 }}>
          {(venue as any).instagramUrl && (
            <a href={(venue as any).instagramUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#5E5E5E', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              📷 Instagram
            </a>
          )}
          {(venue as any).facebookUrl && (
            <a href={(venue as any).facebookUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#5E5E5E', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              👥 Facebook
            </a>
          )}
        </div>
      )}

      {/* Group Order Entry + Favourite Orders */}
      <div className="content-container" style={{ paddingTop: 16 }}>
        {/* Group Order Button */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button
            onClick={() => setShowGroupModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 99, border: '1px solid rgba(24,24,24,0.18)',
              background: '#fff', color: '#181818', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Users size={15} />
            Group Order?
          </button>
        </div>

        {/* Favourite Orders */}
        {checkoutPhone.length >= 8 && favouriteOrdersQuery.data && favouriteOrdersQuery.data.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 8 }}>⭐ Your Favourites</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' as const }}>
              {(favouriteOrdersQuery.data as { id: number; label: string; totalAmount: string | number; itemsJson: string }[]).map(fav => (
                <div key={fav.id} style={{
                  flexShrink: 0, background: '#fff', border: '1px solid rgba(94,139,139,0.2)',
                  borderRadius: 10, padding: '10px 14px', minWidth: 150, maxWidth: 200,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.label}</div>
                  <div style={{ fontSize: 11, color: '#5E8B8B', marginBottom: 8 }}>${Number(fav.totalAmount).toFixed(2)}</div>
                  <button
                    onClick={() => {
                      try {
                        const items = JSON.parse(fav.itemsJson) as CartItem[];
                        setCart(items);
                        incrementFavUsage.mutate({ id: fav.id });
                        showToast('Favourites loaded to cart');
                      } catch {
                        showToast('Could not load this favourite');
                      }
                    }}
                    style={{
                      width: '100%', padding: '5px 0', borderRadius: 6, border: 'none',
                      background: '#5E8B8B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

        {/* Search */}
        {allMenuItems.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              type="text"
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder="Search menu…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 34px',
                border: '1px solid rgba(24,24,24,0.14)',
                borderRadius: 8, fontSize: 13, color: '#181818',
                background: '#fff', outline: 'none',
              }}
            />
            {menuSearch && (
              <button
                onClick={() => setMenuSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Category Jump Nav */}
        {allMenuItems.length > 0 && (coffeeItems.length > 0 || pastryItems.length > 0 || breadItems.length > 0) && (
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
            marginBottom: 16, WebkitOverflowScrolling: 'touch',
          }}>
            {[
              { label: 'Coffee', show: coffeeItems.length > 0, anchor: 'menu-coffee' },
              { label: 'Pastries', show: pastryItems.length > 0, anchor: 'menu-pastries' },
              { label: 'Bread', show: breadItems.length > 0, anchor: 'menu-bread' },
            ].filter(c => c.show).map(cat => (
              <button
                key={cat.anchor}
                onClick={() => document.getElementById(cat.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{
                  flexShrink: 0,
                  borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${accentColor}40`,
                  background: 'transparent',
                  color: accentColor,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

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
          <div className="mb-10" id="menu-coffee" style={{ scrollMarginTop: 80 }}>
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
                  isAvailable={invAvailMap[item.id] !== undefined ? invAvailMap[item.id] : true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pastries */}
        {pastryItems.length > 0 && (
          <div className="mb-10" id="menu-pastries" style={{ scrollMarginTop: 80 }}>
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
                  isAvailable={invAvailMap[item.id] !== undefined ? invAvailMap[item.id] : true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bread */}
        {breadItems.length > 0 && (
          <div className="mb-10" id="menu-bread" style={{ scrollMarginTop: 80 }}>
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
                  isAvailable={invAvailMap[item.id] !== undefined ? invAvailMap[item.id] : true}
                />
              ))}
            </div>
          </div>
        )}

        {/* No search results */}
        {menuSearch.trim() && coffeeItems.length === 0 && pastryItems.length === 0 && breadItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
            <Search size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>No items match "{menuSearch}"</p>
            <button onClick={() => setMenuSearch('')} style={{ marginTop: 8, fontSize: 12, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear search
            </button>
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

      {/* ── Gift Cards & Pass Purchase ──────────────────────────────────────── */}
      <section className="content-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto' }}>

          {/* Gift Card Panel */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showGiftCardPanel ? 16 : 0 }}>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: accentColor, marginBottom: 4,
                }}>
                  Gift Cards
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B', letterSpacing: '-0.02em' }}>
                  Send a gift to someone special
                </div>
              </div>
              <button
                onClick={() => setShowGiftCardPanel(p => !p)}
                style={{
                  background: showGiftCardPanel ? 'transparent' : accentColor,
                  color: showGiftCardPanel ? '#09090B' : '#FFFFFF',
                  border: showGiftCardPanel ? '1px solid #E4E4E7' : 'none',
                  borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, -apple-system, sans-serif',
                }}
              >
                {showGiftCardPanel ? 'Cancel' : 'Buy a gift card'}
              </button>
            </div>
            {showGiftCardPanel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#71717A', display: 'block', marginBottom: 6 }}>
                    Amount ($)
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: giftCardAmount ? 0 : 0 }}>
                    {[20, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setGiftCardAmount(String(amt))}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                          border: giftCardAmount === String(amt) ? 'none' : '1px solid #E4E4E7',
                          background: giftCardAmount === String(amt) ? accentColor : '#FAFAFA',
                          color: giftCardAmount === String(amt) ? '#FFFFFF' : '#09090B',
                          cursor: 'pointer',
                        }}
                      >
                        ${amt}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="5"
                      step="5"
                      placeholder="Other"
                      value={[20, 50, 100].includes(Number(giftCardAmount)) ? '' : giftCardAmount}
                      onChange={e => setGiftCardAmount(e.target.value)}
                      style={{
                        flex: 1, padding: '11px 14px', border: '1px solid #E4E4E7',
                        borderRadius: 8, fontSize: 14, color: '#09090B', background: '#FAFAFA',
                        outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif',
                      }}
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Recipient name (optional)"
                  value={giftCardRecipientName}
                  onChange={e => setGiftCardRecipientName(e.target.value)}
                  style={{
                    padding: '11px 14px', border: '1px solid #E4E4E7', borderRadius: 8,
                    fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none',
                    boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif', width: '100%',
                  }}
                />
                <input
                  type="email"
                  placeholder="Recipient email (send gift card to them)"
                  value={giftCardRecipientEmail}
                  onChange={e => setGiftCardRecipientEmail(e.target.value)}
                  style={{
                    padding: '11px 14px', border: '1px solid #E4E4E7', borderRadius: 8,
                    fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none',
                    boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif', width: '100%',
                  }}
                />
                <textarea
                  placeholder="Personal message (optional)"
                  value={giftCardMessage}
                  onChange={e => setGiftCardMessage(e.target.value)}
                  rows={2}
                  style={{
                    padding: '11px 14px', border: '1px solid #E4E4E7', borderRadius: 8,
                    fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none',
                    resize: 'vertical', fontFamily: 'Inter, sans-serif', width: '100%',
                    boxSizing: 'border-box' as const,
                  }}
                />
                {createGiftCardCheckout.error && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: '#DC2626',
                  }}>
                    {createGiftCardCheckout.error.message}
                  </div>
                )}
                <button
                  disabled={!giftCardAmount || Number(giftCardAmount) < 5 || createGiftCardCheckout.isPending || !venue?.id}
                  onClick={async () => {
                    if (!venue?.id || !giftCardAmount || Number(giftCardAmount) < 5) return;
                    try {
                      const result = await createGiftCardCheckout.mutateAsync({
                        venueId: venue.id,
                        amount: Number(giftCardAmount),
                        recipientName: giftCardRecipientName || undefined,
                        recipientEmail: giftCardRecipientEmail || undefined,
                        message: giftCardMessage || undefined,
                        senderName: checkoutName || undefined,
                      });
                      if (result.url) window.location.href = result.url;
                    } catch {
                      // error shown via createGiftCardCheckout.error
                    }
                  }}
                  style={{
                    padding: '11px 18px', borderRadius: 8, border: 'none',
                    background: accentColor, color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                    cursor: (!giftCardAmount || Number(giftCardAmount) < 5 || createGiftCardCheckout.isPending) ? 'not-allowed' : 'pointer',
                    opacity: (!giftCardAmount || Number(giftCardAmount) < 5 || createGiftCardCheckout.isPending) ? 0.5 : 1,
                    fontFamily: 'Inter, -apple-system, sans-serif',
                  }}
                >
                  {createGiftCardCheckout.isPending
                    ? 'Redirecting…'
                    : giftCardAmount && Number(giftCardAmount) >= 5
                      ? `Pay $${Number(giftCardAmount).toFixed(2)} with Stripe`
                      : 'Choose an amount to continue'}
                </button>
              </div>
            )}
          </div>

          {/* Pass Purchase Panel — only shown when passConfig exists */}
          {passConfigQuery.data && (
            <div style={{
              background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPassPanel ? 16 : 0 }}>
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: accentColor, marginBottom: 4,
                  }}>
                    Coffee Pass
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B', letterSpacing: '-0.02em' }}>
                    {(passConfigQuery.data as { name?: string }).name || 'Coffee Pass'} — ${Number((passConfigQuery.data as { price?: number }).price ?? 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>
                    {(passConfigQuery.data as { totalCredits?: number }).totalCredits ?? ''} drinks included
                  </div>
                </div>
                <button
                  onClick={() => setShowPassPanel(p => !p)}
                  style={{
                    background: showPassPanel ? 'transparent' : accentColor,
                    color: showPassPanel ? '#09090B' : '#FFFFFF',
                    border: showPassPanel ? '1px solid #E4E4E7' : 'none',
                    borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, -apple-system, sans-serif',
                  }}
                >
                  {showPassPanel ? 'Cancel' : 'Buy a pass'}
                </button>
              </div>
              {showPassPanel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={checkoutName}
                    onChange={e => setCheckoutName(e.target.value)}
                    style={{
                      padding: '11px 14px', border: '1px solid #E4E4E7', borderRadius: 8,
                      fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none',
                      boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif', width: '100%',
                    }}
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Phone number (to link your pass)"
                    value={checkoutPhone}
                    onChange={e => setCheckoutPhone(e.target.value)}
                    style={{
                      padding: '11px 14px', border: '1px solid #E4E4E7', borderRadius: 8,
                      fontSize: 14, color: '#09090B', background: '#FAFAFA', outline: 'none',
                      boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif', width: '100%',
                    }}
                  />
                  {createPassCheckout.error && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                      padding: '10px 14px', fontSize: 13, color: '#DC2626',
                    }}>
                      {createPassCheckout.error.message}
                    </div>
                  )}
                  <button
                    disabled={!checkoutName.trim() || checkoutPhone.length < 8 || createPassCheckout.isPending || !venue?.id}
                    onClick={async () => {
                      if (!venue?.id || !checkoutName.trim() || checkoutPhone.length < 8) return;
                      try {
                        const result = await createPassCheckout.mutateAsync({
                          venueId: venue.id,
                          phone: checkoutPhone,
                          name: checkoutName,
                        });
                        if (result.url) window.location.href = result.url;
                      } catch {
                        // error shown via createPassCheckout.error
                      }
                    }}
                    style={{
                      padding: '11px 18px', borderRadius: 8, border: 'none',
                      background: accentColor, color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                      cursor: (!checkoutName.trim() || checkoutPhone.length < 8 || createPassCheckout.isPending) ? 'not-allowed' : 'pointer',
                      opacity: (!checkoutName.trim() || checkoutPhone.length < 8 || createPassCheckout.isPending) ? 0.5 : 1,
                      fontFamily: 'Inter, -apple-system, sans-serif',
                    }}
                  >
                    {createPassCheckout.isPending
                      ? 'Redirecting…'
                      : `Pay $${Number((passConfigQuery.data as { price?: number }).price ?? 0).toFixed(2)} with Stripe`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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

// ─── SplitBillPanel ─────────────────────────────────────────────────────────
function SplitBillPanel({
  orderTotal,
  splitCount,
  setSplitCount,
  onClose,
  slug,
  tableNumber,
}: {
  orderTotal: number;
  splitCount: number;
  setSplitCount: (n: number) => void;
  onClose: () => void;
  slug: string;
  tableNumber: string | null;
}) {
  const shareAmount = orderTotal / splitCount;
  const splitUrl = `${window.location.origin}/v/${slug}${tableNumber ? `?table=${tableNumber}` : ''}?split=${splitCount}&total=${orderTotal.toFixed(2)}`;

  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(splitUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }

  return (
    <div style={{ background: 'rgba(94,139,139,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(94,139,139,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#181818' }}>💳 Split Bill</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: '#181818', flexShrink: 0 }}>How many people?</label>
        <input
          type="number"
          min={2}
          max={10}
          value={splitCount}
          onChange={e => setSplitCount(Math.min(10, Math.max(2, Number(e.target.value))))}
          style={{
            width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)',
            fontSize: 15, fontWeight: 700, textAlign: 'center', background: '#fff', color: '#181818',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: splitCount }, (_, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: '#fff', borderRadius: 8,
            border: '1px solid rgba(24,24,24,0.08)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>Person {i + 1}</div>
              <div style={{ fontSize: 12, color: '#5E5E5E' }}>1 / {splitCount} of ${orderTotal.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#5E8B8B' }}>${shareAmount.toFixed(2)}</span>
              <a
                href={`/v/${slug}?split_pay=1&amount=${shareAmount.toFixed(2)}&person=${i + 1}`}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none',
                  background: '#181818', color: '#F3F2EE', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                }}
              >
                Pay My Share
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleCopy}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8,
          border: '1px solid rgba(94,139,139,0.35)', background: copiedLink ? '#f0fdf4' : '#fff',
          color: copiedLink ? '#16a34a' : '#5E8B8B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {copiedLink ? '✓ Link Copied!' : '🔗 Copy Split Link'}
      </button>
      <p style={{ fontSize: 11, color: '#5E5E5E', margin: '8px 0 0', textAlign: 'center' }}>
        Share this link so each person can pay their share of ${shareAmount.toFixed(2)}
      </p>
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
  isAvailable,
}: {
  item: MenuItemWithExtras;
  accentColor: string;
  onAdd: () => void;
  cartQty: number;
  onRemove: () => void;
  nowMs: number;
  isAvailable?: boolean;
}) {
  const soldOut = isAvailable === false;
  const dietaryTags = item.dietary ? item.dietary.split(',').map(d => d.trim()).filter(Boolean) : [];

  const countdown = item.activeTo && new Date(item.activeTo).getTime() > nowMs
    ? formatCountdown(item.activeTo)
    : null;

  return (
    <div style={{
      border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8,
      background: 'white', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      opacity: soldOut ? 0.75 : 1,
      transition: 'box-shadow 0.15s',
    }}>
      {soldOut && (
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', zIndex: 1 }}>
          Sold Out
        </div>
      )}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: '100%', aspectRatio: '16 / 9', background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}06 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Coffee size={28} style={{ color: `${accentColor}50` }} />
        </div>
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
          {((item as any).dietaryTags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
              {((item as any).dietaryTags as string[]).map(tag => (
                <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {((item as any).allergens || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginRight: 2 }}>Contains:</span>
              {((item as any).allergens as string[]).map(a => (
                <span key={a} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 500 }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, color: accentColor, marginBottom: dietaryTags.length > 0 ? 6 : 0, marginTop: 6 }}>
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
          {cartQty > 0 && !soldOut && (
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
            disabled={soldOut}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: soldOut ? '#d1d5db' : '#181818', color: '#F3F2EE',
              cursor: soldOut ? 'not-allowed' : 'pointer',
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
