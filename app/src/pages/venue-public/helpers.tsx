// Opening-hours / cart / formatting helpers + website block renderer for VenuePublic.


// ─── Hours parsing helpers ───────────────────────────────────────────────────

export function parseHourValue(raw: string): number | null {
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

export function parseOpenClose(hoursStr: string): { openMin: number; closeMin: number } | null {
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

export function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${displayH}${suffix}` : `${displayH}:${String(m).padStart(2, '0')}${suffix}`;
}

export function getOpenStatus(venue: {
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
      const nextDay = (day + 1) % 7;
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
export function formatCountdown(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return '';
  const totalMins = Math.floor(diff / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${mins}m`;
}

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  modifiers?: { group: string; option: string; priceAdj: number }[];
}

export function cartKey(menuItemId: number, modifiers?: { group: string; option: string; priceAdj: number }[]) {
  if (!modifiers || modifiers.length === 0) return String(menuItemId);
  return `${menuItemId}::${modifiers.map(m => `${m.group}=${m.option}`).join('|')}`;
}

// ─── Happy hour check ─────────────────────────────────────────────────────────
export function isWithinHappyHour(startTime: string, endTime: string): boolean {
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

// ─── Template style definitions ───────────────────────────────────────────────
export const TEMPLATE_STYLES: Record<string, {
  heroOverlay: string;
  heroBtnBg: string;
  heroBtnColor: string;
  sectionBg: string;
  altSectionBg: string;
  headingColor: string;
  bodyColor: string;
  borderColor: string;
  ctaBg: string;
  ctaHeadingColor: string;
  cardBg: string;
  cardRadius: number;
  cardShadow: string;
}> = {
  fresh: {
    heroOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
    heroBtnBg: 'var_primary',
    heroBtnColor: '#ffffff',
    sectionBg: '#FFFFFF',
    altSectionBg: '#FAFAF8',
    headingColor: '#09090B',
    bodyColor: '#71717A',
    borderColor: '#E4E4E7',
    ctaBg: 'var_primary',
    ctaHeadingColor: '#FFFFFF',
    cardBg: '#FAFAF8',
    cardRadius: 12,
    cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  warmth: {
    heroOverlay: 'linear-gradient(to bottom, rgba(68,28,12,0.2) 0%, rgba(68,28,12,0.7) 100%)',
    heroBtnBg: '#D97706',
    heroBtnColor: '#FFFFFF',
    sectionBg: '#FDF6EE',
    altSectionBg: '#FEF3C7',
    headingColor: '#7C3018',
    bodyColor: '#92400E',
    borderColor: '#FDE68A',
    ctaBg: '#7C3018',
    ctaHeadingColor: '#FEF3C7',
    cardBg: '#FFFBEB',
    cardRadius: 8,
    cardShadow: '0 2px 8px rgba(124,48,24,0.08)',
  },
  noir: {
    heroOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.85) 100%)',
    heroBtnBg: '#D4AF37',
    heroBtnColor: '#0D0D0F',
    sectionBg: '#0D0D0F',
    altSectionBg: '#181818',
    headingColor: '#FAFAFA',
    bodyColor: '#A1A1AA',
    borderColor: '#27272A',
    ctaBg: '#D4AF37',
    ctaHeadingColor: '#0D0D0F',
    cardBg: '#1C1C1E',
    cardRadius: 4,
    cardShadow: '0 1px 4px rgba(0,0,0,0.4)',
  },
  garden: {
    heroOverlay: 'linear-gradient(to bottom, rgba(26,51,39,0.1) 0%, rgba(26,51,39,0.65) 100%)',
    heroBtnBg: '#1A3327',
    heroBtnColor: '#FFFFFF',
    sectionBg: '#F0F7F1',
    altSectionBg: '#FFFFFF',
    headingColor: '#1A3327',
    bodyColor: '#4A6A5A',
    borderColor: '#C5E0CA',
    ctaBg: '#1A3327',
    ctaHeadingColor: '#D4F0DC',
    cardBg: '#FFFFFF',
    cardRadius: 16,
    cardShadow: '0 2px 12px rgba(26,51,39,0.08)',
  },
  bold: {
    heroOverlay: 'linear-gradient(135deg, rgba(45,27,105,0.85) 0%, rgba(255,77,77,0.6) 100%)',
    heroBtnBg: '#FF4D4D',
    heroBtnColor: '#FFFFFF',
    sectionBg: '#FFFFFF',
    altSectionBg: '#F8F7FF',
    headingColor: '#2D1B69',
    bodyColor: '#6B6B8E',
    borderColor: '#E0DCFF',
    ctaBg: '#FF4D4D',
    ctaHeadingColor: '#FFFFFF',
    cardBg: '#F8F7FF',
    cardRadius: 20,
    cardShadow: '0 4px 20px rgba(45,27,105,0.12)',
  },
};

// ─── Website block renderer ───────────────────────────────────────────────────
export function renderWebsiteBlocks(
  blocks: any[],
  primaryColor: string,
  slug: string,
  allMenuItems: any[],
  reviewsList: any[],
  accentColor: string,
  _bgColor?: string,
  font?: string,
  templateId?: string,
) {
  const ts = TEMPLATE_STYLES[templateId || 'fresh'] || TEMPLATE_STYLES.fresh;
  const heroBtnBg = ts.heroBtnBg === 'var_primary' ? primaryColor : ts.heroBtnBg;
  const ctaBg = ts.ctaBg === 'var_primary' ? primaryColor : ts.ctaBg;

  // Filter hidden blocks
  return blocks.filter((b: any) => !b?.hidden).map((block: any) => {
    if (!block?.type) return null;
    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id || block.type} style={{ position: 'relative', height: 'clamp(280px, 40vw, 520px)', overflow: 'hidden' }}>
            {block.data?.imageUrl && <img src={block.data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: ts.heroOverlay }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(20px,4vw,56px)', textAlign: 'center' }}>
              {block.data?.title && <h1 style={{ fontSize: 'clamp(1.8rem,5vw,3.4rem)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.35)', fontFamily: font ? `${font}, Inter, sans-serif` : undefined }}>{block.data.title}</h1>}
              {block.data?.tagline && <p style={{ fontSize: 'clamp(0.875rem,2vw,1.1rem)', color: 'rgba(255,255,255,0.9)', margin: '0 0 22px', fontStyle: 'italic' }}>{block.data.tagline}</p>}
              {block.data?.ctaText && (
                <a href="#venue-menu" style={{ display: 'inline-block', padding: '12px 30px', background: heroBtnBg, color: ts.heroBtnColor, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {block.data.ctaText}
                </a>
              )}
            </div>
          </section>
        );
      case 'about':
        return (
          <section key={block.id || 'about'} style={{ background: ts.sectionBg, padding: 'clamp(36px,6vw,72px) clamp(20px,8vw,80px)', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              {block.data?.title && <h2 style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)', fontWeight: 700, color: ts.headingColor, margin: '0 0 16px', letterSpacing: '-0.02em' }}>{block.data.title}</h2>}
              {block.data?.body && <p style={{ fontSize: 15, lineHeight: 1.78, color: ts.bodyColor, whiteSpace: 'pre-line', margin: 0 }}>{block.data.body}</p>}
            </div>
          </section>
        );
      case 'gallery': {
        const imgs = (block.data?.images || []).filter((i: any) => i?.url);
        if (!imgs.length) return null;
        return (
          <section key={block.id || 'gallery'} style={{ background: ts.altSectionBg, padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,48px)', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxWidth: 960, margin: '0 auto' }}>
              {imgs.map((img: any, i: number) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: ts.cardRadius, overflow: 'hidden' }}>
                  <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </section>
        );
      }
      case 'booking_cta':
        return (
          <section key={block.id || 'booking'} style={{ background: ctaBg, padding: 'clamp(40px,6vw,64px) 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            {block.data?.title && <h2 style={{ fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 700, color: ts.ctaHeadingColor, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{block.data.title}</h2>}
            {block.data?.subtitle && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: '0 0 22px' }}>{block.data.subtitle}</p>}
            <a href={`/book/${slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '13px 34px', background: '#fff', color: ctaBg, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {block.data?.buttonText || 'Book Now'}
            </a>
          </section>
        );
      case 'hours':
        return (
          <section key={block.id || 'hours'} style={{ background: ts.altSectionBg, padding: 'clamp(32px,5vw,56px) clamp(20px,8vw,80px)', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: ts.headingColor, margin: '0 0 20px', letterSpacing: '-0.02em' }}>Opening Hours</h2>
              {[{ day: 'Monday - Friday', h: block.data?.weekday }, { day: 'Saturday', h: block.data?.saturday }, { day: 'Sunday', h: block.data?.sunday }]
                .filter(r => r.h)
                .map(r => (
                  <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${ts.borderColor}` }}>
                    <span style={{ fontSize: 14, color: ts.headingColor, fontWeight: 500 }}>{r.day}</span>
                    <span style={{ fontSize: 14, color: ts.bodyColor }}>{r.h}</span>
                  </div>
                ))}
            </div>
          </section>
        );
      case 'social':
        return (
          <section key={block.id || 'social'} style={{ background: ts.altSectionBg, padding: '28px 20px', textAlign: 'center', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {block.data?.instagram && <a href={block.data.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: `1px solid ${ts.borderColor}`, background: ts.cardBg, color: ts.headingColor, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Instagram</a>}
              {block.data?.facebook && <a href={block.data.facebook} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: `1px solid ${ts.borderColor}`, background: ts.cardBg, color: ts.headingColor, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Facebook</a>}
            </div>
          </section>
        );
      case 'divider':
        return block.data?.style === 'line'
          ? <hr key={block.id || 'hr'} style={{ border: 'none', borderTop: `1px solid ${ts.borderColor}`, margin: 0 }} />
          : <div key={block.id || 'space'} style={{ height: 40, background: ts.sectionBg }} />;

      case 'menu_preview': {
        const topItems = allMenuItems.slice(0, 3);
        if (!topItems.length) return null;
        return (
          <section key={block.id || 'menu_preview'} style={{ background: ts.sectionBg, padding: 'clamp(36px,5vw,64px) clamp(20px,6vw,80px)', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: ts.headingColor, margin: '0 0 24px', letterSpacing: '-0.02em', textAlign: 'center' }}>Menu Highlights</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {topItems.map((item: any) => (
                  <div key={item.id} style={{ background: ts.cardBg, borderRadius: ts.cardRadius, padding: '16px 18px', border: `1px solid ${ts.borderColor}`, boxShadow: ts.cardShadow }}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: Math.max(4, ts.cardRadius - 4), marginBottom: 10 }} />}
                    <div style={{ fontSize: 15, fontWeight: 700, color: ts.headingColor, marginBottom: 4 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: ts.bodyColor, marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
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
          <section key={block.id || 'reviews'} style={{ background: ts.altSectionBg, padding: 'clamp(36px,5vw,64px) clamp(20px,6vw,80px)', borderBottom: `1px solid ${ts.borderColor}` }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: ts.headingColor, margin: '0 0 24px', letterSpacing: '-0.02em', textAlign: 'center' }}>What Our Customers Say</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {goodReviews.map((review: any) => (
                  <div key={review.id} style={{ background: ts.cardBg, borderRadius: ts.cardRadius, padding: '18px 20px', border: `1px solid ${ts.borderColor}`, boxShadow: ts.cardShadow }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <span key={i} style={{ color: '#F59E0B', fontSize: 16 }}>&#9733;</span>
                      ))}
                    </div>
                    {review.comment && <p style={{ fontSize: 13, color: ts.bodyColor, lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic' }}>"{review.comment}"</p>}
                    {review.customerName && <div style={{ fontSize: 11, fontWeight: 600, color: ts.bodyColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{review.customerName}</div>}
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
