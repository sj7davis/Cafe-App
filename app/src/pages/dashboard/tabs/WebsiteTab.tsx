import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, Monitor, Smartphone, RefreshCw, Eye, EyeOff,
} from 'lucide-react';




import { TemplatePreviewCard, ImageUpload } from '../shared';


export function WebsiteTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  type BlockType = 'hero' | 'about' | 'gallery' | 'booking_cta' | 'hours' | 'social' | 'divider' | 'menu_preview' | 'reviews' | 'cta_banner';
  type Block = { id: string; type: BlockType; data: Record<string, any>; hidden?: boolean };

  const genId = () => Math.random().toString(36).slice(2, 9);

  // ── Theme state (stored in settingsJson.theme) ───────────────────────────────
  const savedTheme = (venue?.settingsJson as any)?.theme || {};
  const [themePrimary, setThemePrimary] = useState<string>(savedTheme.primaryColor || venue.primaryColor || '#09090B');
  const [themeAccent, setThemeAccent] = useState<string>(savedTheme.accentColor || venue.accentColor || '#5E8B8B');
  const [themeBg, setThemeBg] = useState<string>(savedTheme.bgColor || '#F8F6F2');
  const [themeFont, setThemeFont] = useState<string>(savedTheme.font || 'Inter');
  const [showDesign, setShowDesign] = useState(false);

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const saved = (venue as any).websiteBlocks;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(() => {
    const saved = (venue as any).websiteBlocks;
    return !Array.isArray(saved) || saved.length === 0;
  });
  const [saveMsg, setSaveMsg] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>((savedTheme as any)?.templateId || (savedTheme as any)?.template || null);

  // ── Live preview state ────────────────────────────────────────────────────────
  const [previewWidth, setPreviewWidth] = useState<'100%' | '390px'>('100%');
  const [previewKey, setPreviewKey] = useState(1);

  const updateMutation = trpc.venue.update.useMutation({
    onSuccess: () => {
      setSaveMsg('✓ Published');
      setPreviewKey(k => k + 1);
    }
  });

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/v/${venue.slug}` : `/v/${venue.slug}`;
  const bookUrl = typeof window !== 'undefined' ? `${window.location.origin}/book/${venue.slug}` : `/book/${venue.slug}`;
  const previewSrc = typeof window !== 'undefined' ? `${window.location.origin}/v/${venue.slug}?preview=1&t=${previewKey}` : '';

  const handleSave = () => {
    setSaveMsg('');
    const theme = { primaryColor: themePrimary, accentColor: themeAccent, bgColor: themeBg, font: themeFont, templateId: activeTemplateId || 'fresh', template: activeTemplateId || 'fresh' };
    const existingSettings = (venue?.settingsJson as any) || {};
    updateMutation.mutate({ token, data: { websiteBlocks: blocks, settingsJson: { ...existingSettings, theme } } as any });
  };

  // ── Block type helpers ────────────────────────────────────────────────────────
  const DEFAULTS: Record<BlockType, Record<string, any>> = {
    hero: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80', title: venue.name || 'Welcome', tagline: 'Specialty coffee & fresh food', ctaText: 'Order Now' },
    about: { title: 'Our Story', body: 'Tell customers what makes your cafe special...' },
    gallery: { images: [] },
    booking_cta: { title: 'Reserve a Table', subtitle: 'Book online in seconds — no phone call needed.', buttonText: 'Book Now' },
    hours: { weekday: venue.hoursWeekday || '', saturday: venue.hoursSaturday || '', sunday: venue.hoursSunday || '' },
    social: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' },
    divider: { style: 'space' },
    menu_preview: {},
    reviews: {},
    cta_banner: { title: 'Order Online Today', subtitle: 'Fresh food & great coffee, ready when you are.', buttonText: 'Order Now', bgColor: '#5E8B8B' },
  };

  const BLOCK_COLORS: Record<BlockType, string> = {
    hero: '#5E8B8B', about: '#D97706', gallery: '#7C3AED', booking_cta: '#2563EB',
    hours: '#059669', social: '#DB2777', divider: '#9CA3AF',
    menu_preview: '#EA580C', reviews: '#DC2626', cta_banner: '#0891B2',
  };

  const addBlock = (type: BlockType) => {
    const nb: Block = { id: genId(), type, data: { ...DEFAULTS[type] } };
    setBlocks(b => [...b, nb]);
    setEditingId(nb.id);
    setShowCatalog(false);
  };
  const updateBlock = (id: string, data: Record<string, any>) => setBlocks(b => b.map(bl => bl.id === id ? { ...bl, data } : bl));
  const removeBlock = (id: string) => { setBlocks(b => b.filter(bl => bl.id !== id)); if (editingId === id) setEditingId(null); };
  const toggleHidden = (id: string) => setBlocks(b => b.map(bl => bl.id === id ? { ...bl, hidden: !bl.hidden } : bl));

  const handleDragStart = (e: React.DragEvent, i: number) => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragging !== null && dragging !== i) {
      const arr = [...blocks];
      const [item] = arr.splice(dragging, 1);
      arr.splice(i, 0, item);
      setBlocks(arr);
    }
    setDragging(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const TEMPLATES: { id: string; name: string; tagline: string; preview: { bg: string; accent: string; headline: string }; palette: { primary: string; accent: string; bg: string }; blocks: () => Block[] }[] = [
    {
      id: 'fresh',
      name: 'Fresh',
      tagline: 'Clean & minimal',
      preview: { bg: '#FAFAF8', accent: '#16A34A', headline: '#09090B' },
      palette: { primary: '#09090B', accent: '#16A34A', bg: '#FAFAF8' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80', title: venue.name, tagline: 'Specialty coffee, served with care', ctaText: 'Order Now' } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Our Story', body: 'We started with one idea: great coffee should be simple, accessible, and a little bit joyful. Every cup we make is a small act of care.' } },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-4pm', saturday: venue.hoursSaturday || 'Sat: 8am-3pm', sunday: venue.hoursSunday || 'Sun: 9am-2pm' } },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'booking_cta' as BlockType, data: { title: 'Reserve a Table', subtitle: 'Skip the queue - book online in seconds.', buttonText: 'Book Now' } },
      ],
    },
    {
      id: 'warmth',
      name: 'Warmth',
      tagline: 'Cozy & artisan',
      preview: { bg: '#FDF6EE', accent: '#D97706', headline: '#7C3018' },
      palette: { primary: '#7C3018', accent: '#D97706', bg: '#FDF6EE' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&q=80', title: venue.name, tagline: 'Handcrafted coffee · Fresh baked daily', ctaText: 'View Our Menu' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Baked with Heart', body: 'Every pastry is baked on-site each morning. We use local produce, heritage grains, and recipes passed down through the team. Come in, slow down, and taste the difference.' } },
        { id: genId(), type: 'gallery' as BlockType, data: { images: [] } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-5pm', saturday: venue.hoursSaturday || 'Sat: 8am-4pm', sunday: venue.hoursSunday || 'Sun: 9am-3pm' } },
        { id: genId(), type: 'social' as BlockType, data: { instagram: (venue as any).instagramUrl || '', facebook: (venue as any).facebookUrl || '' } },
      ],
    },
    {
      id: 'noir',
      name: 'Noir',
      tagline: 'Dark & premium',
      preview: { bg: '#0D0D0F', accent: '#D4AF37', headline: '#FAFAFA' },
      palette: { primary: '#FAFAFA', accent: '#D4AF37', bg: '#0D0D0F' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=1200&q=80', title: venue.name, tagline: 'An exceptional coffee experience', ctaText: 'Reserve a Table' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Online Ordering Now Available', subtitle: 'Skip the queue. Order ahead and collect when you arrive.', buttonText: 'Order Now', bgColor: '#D4AF37' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'The Art of Coffee', body: "We've spent years refining every detail — from single-origin bean selection to the final pour. This is coffee taken seriously." } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-5pm', saturday: venue.hoursSaturday || 'Sat: 8am-4pm', sunday: venue.hoursSunday || 'Closed' } },
      ],
    },
    {
      id: 'garden',
      name: 'Garden',
      tagline: 'Fresh & sustainable',
      preview: { bg: '#F0F7F1', accent: '#5E8B8B', headline: '#1A3327' },
      palette: { primary: '#1A3327', accent: '#5E8B8B', bg: '#F0F7F1' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80', title: venue.name, tagline: 'Fresh food · Good coffee · Sustainable sourcing', ctaText: 'See the Menu' } },
        { id: genId(), type: 'about' as BlockType, data: { title: 'Grown with Care', body: "We source from local farms within 100km and compost everything we can. Good food is good for the people who eat it and the planet that grows it." } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'gallery' as BlockType, data: { images: [] } },
        { id: genId(), type: 'hours' as BlockType, data: { weekday: venue.hoursWeekday || 'Mon-Fri: 7am-4pm', saturday: venue.hoursSaturday || 'Sat: 8am-3pm', sunday: venue.hoursSunday || 'Sun: 9am-2pm' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Order Fresh Online', subtitle: 'Pick up your order — no waiting, no waste.', buttonText: 'Order Now', bgColor: '#1A3327' } },
      ],
    },
    {
      id: 'bold',
      name: 'Bold',
      tagline: 'Energetic & urban',
      preview: { bg: '#FFFFFF', accent: '#FF4D4D', headline: '#2D1B69' },
      palette: { primary: '#2D1B69', accent: '#FF4D4D', bg: '#FFFFFF' },
      blocks: () => [
        { id: genId(), type: 'hero' as BlockType, data: { imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=80', title: `${venue.name}.`, tagline: 'Bold coffee for bold mornings', ctaText: 'Order Now' } },
        { id: genId(), type: 'cta_banner' as BlockType, data: { title: 'Skip the Queue', subtitle: 'Order ahead on your phone. Ready when you are.', buttonText: 'Start Your Order', bgColor: '#FF4D4D' } },
        { id: genId(), type: 'menu_preview' as BlockType, data: {} },
        { id: genId(), type: 'about' as BlockType, data: { title: 'No Nonsense Coffee', body: 'We cut the fluff and focus on what matters: excellent espresso, fast service, and a vibe that gets you going. This is your third place.' } },
        { id: genId(), type: 'reviews' as BlockType, data: {} },
        { id: genId(), type: 'booking_cta' as BlockType, data: { title: 'Book Your Spot', subtitle: 'Tables go fast. Lock in your time.', buttonText: 'Reserve Now' } },
      ],
    },
  ];

  const CATALOG: { type: BlockType; label: string; icon: string; desc: string }[] = [
    { type: 'hero', label: 'Hero Banner', icon: '🖼️', desc: 'Full-width image with title & CTA' },
    { type: 'about', label: 'About Us', icon: '📖', desc: 'Your story in text' },
    { type: 'gallery', label: 'Photo Gallery', icon: '📷', desc: 'Grid of up to 9 photos' },
    { type: 'booking_cta', label: 'Book a Table', icon: '📅', desc: 'Reservation call-to-action' },
    { type: 'hours', label: 'Opening Hours', icon: '🕐', desc: 'Mon-Fri, Sat, Sun hours' },
    { type: 'social', label: 'Social Links', icon: '📱', desc: 'Instagram & Facebook' },
    { type: 'menu_preview', label: 'Menu Highlights', icon: '🍽️', desc: 'Auto-shows top menu items' },
    { type: 'reviews', label: 'Customer Reviews', icon: '⭐', desc: 'Shows recent 3★+ reviews' },
    { type: 'cta_banner', label: 'Call to Action', icon: '📣', desc: 'Full-width accent banner' },
    { type: 'divider', label: 'Spacer', icon: '➖', desc: 'Add space between sections' },
  ];

  const LABELS: Record<BlockType, string> = {
    hero: 'Hero Banner', about: 'About Us', gallery: 'Photo Gallery', booking_cta: 'Book a Table',
    hours: 'Opening Hours', social: 'Social Links', divider: 'Spacer',
    menu_preview: 'Menu Highlights', reviews: 'Customer Reviews', cta_banner: 'Call to Action',
  };
  const ICONS: Record<BlockType, string> = {
    hero: '🖼️', about: '📖', gallery: '📷', booking_cta: '📅',
    hours: '🕐', social: '📱', divider: '➖',
    menu_preview: '🍽️', reviews: '⭐', cta_banner: '📣',
  };

  const editingBlock = blocks.find(b => b.id === editingId) ?? null;

  const iStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--op-card-border)', borderRadius: 7, fontSize: 13, color: 'var(--op-text)', background: 'var(--op-card-bg)', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' };
  const lStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--op-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };

  // ── Colour palettes ──────────────────────────────────────────────────────────
  const PALETTES = [
    { name: 'Warm Cream', primary: '#09090B', accent: '#5E8B8B', bg: '#F8F6F2' },
    { name: 'Forest', primary: '#1A2E1A', accent: '#4A7C59', bg: '#F4F8F4' },
    { name: 'Ocean', primary: '#0D2137', accent: '#2B7FBB', bg: '#F0F6FC' },
    { name: 'Burnt', primary: '#2D1810', accent: '#D4622A', bg: '#FDF6F0' },
    { name: 'Rose', primary: '#2D1018', accent: '#C4697A', bg: '#FDF0F3' },
    { name: 'Midnight', primary: '#FAFAFA', accent: '#7B8CDE', bg: '#0D0D0F' },
  ];

  // ── Font options ─────────────────────────────────────────────────────────────
  const FONTS = [
    { value: 'Inter', label: 'Inter', sample: 'The quick brown fox' },
    { value: 'Playfair Display', label: 'Playfair Display', sample: 'The quick brown fox' },
    { value: 'DM Mono', label: 'DM Mono', sample: 'The quick brown fox' },
    { value: 'Space Grotesk', label: 'Space Grotesk', sample: 'The quick brown fox' },
  ];

  // Load Google Font when themeFont changes
  useEffect(() => {
    if (themeFont === 'Inter') return;
    const id = `gfont-${themeFont.replace(/\s/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(themeFont)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [themeFont]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Website Builder
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Design your public page. Drag blocks, pick a template, publish.
        </p>
      </div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Viewport toggle */}
          <div style={{ display: 'flex', borderRadius: 7, border: '1px solid var(--op-card-border)', overflow: 'hidden' }}>
            <button onClick={() => setPreviewWidth('100%')} title="Desktop" style={{ padding: '7px 12px', border: 'none', background: previewWidth === '100%' ? '#111827' : 'var(--op-card-bg)', color: previewWidth === '100%' ? '#fff' : 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Monitor size={14} /> Desktop
            </button>
            <button onClick={() => setPreviewWidth('390px')} title="Mobile" style={{ padding: '7px 12px', border: 'none', borderLeft: '1px solid var(--op-card-border)', background: previewWidth === '390px' ? '#111827' : 'var(--op-card-bg)', color: previewWidth === '390px' ? '#fff' : 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Smartphone size={14} /> Mobile
            </button>
          </div>
          <button onClick={() => setPreviewKey(k => k + 1)} title="Refresh preview" style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: 'var(--op-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', fontSize: 12, fontWeight: 500, color: 'var(--op-text)', textDecoration: 'none' }}>
            🔗 Open Live
          </a>
          {saveMsg && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{saveMsg}</span>}
          <button onClick={handleSave} disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', fontSize: 13, fontWeight: 600, cursor: updateMutation.isPending ? 'not-allowed' : 'pointer', opacity: updateMutation.isPending ? 0.7 : 1 }}>
            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish
          </button>
        </div>
      </div>

      {/* Shopify two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 0 }}>

        {/* Left panel: 380px sticky */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 76, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 16 }}>

          {/* Design panel (colour + font) */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDesign ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>Design</div>
                <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>Colours, fonts & palette</div>
              </div>
              <button onClick={() => setShowDesign(v => !v)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--op-text)' }}>
                {showDesign ? 'Hide' : 'Edit Design'}
              </button>
            </div>
            {showDesign && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Palette presets */}
                <div>
                  <label style={lStyle}>Colour Palettes</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {PALETTES.map(p => (
                      <button key={p.name} onClick={() => { setThemePrimary(p.primary); setThemeAccent(p.accent); setThemeBg(p.bg); }}
                        title={p.name}
                        style={{ borderRadius: 7, overflow: 'hidden', border: `2px solid ${themePrimary === p.primary && themeAccent === p.accent ? '#5E8B8B' : 'transparent'}`, cursor: 'pointer', padding: 0 }}>
                        <div style={{ height: 20, background: p.bg, display: 'flex' }}>
                          <div style={{ flex: 1, background: p.primary }} />
                          <div style={{ flex: 1, background: p.accent }} />
                          <div style={{ flex: 2, background: p.bg }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--op-text-muted)', background: 'var(--op-card-bg)', padding: '2px 4px', textAlign: 'center' }}>{p.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Colour pickers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lStyle}>Primary</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themePrimary} onChange={e => setThemePrimary(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themePrimary}</span>
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Accent</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themeAccent} onChange={e => setThemeAccent(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themeAccent}</span>
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Background</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                      <input type="color" value={themeBg} onChange={e => setThemeBg(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{themeBg}</span>
                    </div>
                  </div>
                </div>
                {/* Font picker */}
                <div>
                  <label style={lStyle}>Font Family</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {FONTS.map(f => (
                      <button key={f.value} onClick={() => setThemeFont(f.value)}
                        style={{ padding: '8px 12px', borderRadius: 7, border: `2px solid ${themeFont === f.value ? '#5E8B8B' : 'var(--op-card-border)'}`, background: themeFont === f.value ? 'rgba(94,139,139,0.08)' : 'var(--op-card-bg)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontFamily: f.value + ', sans-serif', color: 'var(--op-text)' }}>{f.sample}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: themeFont === f.value ? '#5E8B8B' : 'var(--op-text-muted)', marginLeft: 8, flexShrink: 0 }}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTemplates ? 16 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>Templates</div>
                <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>Choose a style for your venue page</div>
              </div>
              <button onClick={() => setShowTemplates(v => !v)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--op-text)' }}>
                {showTemplates ? 'Hide' : '✦ Browse Templates'}
              </button>
            </div>
            {showTemplates && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TEMPLATES.map(t => {
                  const isActive = activeTemplateId === t.id;
                  return (
                    <div key={t.id} style={{ borderRadius: 12, overflow: 'hidden', border: `2px solid ${isActive ? '#5E8B8B' : 'var(--op-card-border)'}`, background: 'var(--op-bg)', transition: 'border-color 0.15s' }}>
                      {/* ── Rich visual preview ── */}
                      <TemplatePreviewCard template={t} />
                      {/* ── Info + action ── */}
                      <div style={{ padding: '10px 14px 12px', background: 'var(--op-card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--op-text)' }}>{t.name}</span>
                            {isActive && <span style={{ fontSize: 9, fontWeight: 700, background: '#5E8B8B', color: '#fff', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.04em' }}>ACTIVE</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>{t.tagline}</div>
                        </div>
                        <button
                          onClick={() => {
                            setBlocks(t.blocks());
                            setThemePrimary(t.palette.primary);
                            setThemeAccent(t.palette.accent);
                            setThemeBg(t.palette.bg);
                            setActiveTemplateId(t.id);
                            setShowTemplates(false);
                            setEditingId(null);
                            setSaveMsg('Template applied — click Publish to go live');
                          }}
                          style={{ flexShrink: 0, padding: '7px 16px', background: isActive ? '#5E8B8B' : 'var(--op-text)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
                        >
                          {isActive ? '✓ Active' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blocks list */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>
                Page Blocks
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--op-text-muted)', marginLeft: 5 }}>({blocks.length})</span>
              </div>
              <button onClick={() => setShowCatalog(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: showCatalog ? '#374151' : '#111827', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={12} /> Add Block
              </button>
            </div>

            {showCatalog && (
              <div style={{ background: 'var(--op-bg)', border: '1px solid var(--op-card-border)', borderRadius: 8, padding: 10, marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                {CATALOG.map(c => (
                  <button key={c.type} onClick={() => addBlock(c.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--op-accent)'; e.currentTarget.style.background = 'var(--op-card-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--op-card-border)'; e.currentTarget.style.background = 'var(--op-card-bg)'; }}
                  >
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--op-text)' }}>{c.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--op-text-muted)' }}>{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {blocks.length === 0 && !showCatalog && (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--op-text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>No blocks yet</div>
                <div style={{ fontSize: 11 }}>Apply a template or click "Add Block" to start building</div>
              </div>
            )}

            <div>
              {blocks.map((block, i) => {
                const accentLeft = BLOCK_COLORS[block.type] || '#9CA3AF';
                const isEditing = editingId === block.id;
                const isDragTarget = dragOver === i && dragging !== i;
                return (
                  <div key={block.id}
                    draggable
                    onDragStart={e => handleDragStart(e, i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={e => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                      borderRadius: 8, marginBottom: 6, cursor: 'grab',
                      border: `2px solid ${isDragTarget ? '#5E8B8B' : isEditing ? 'var(--op-accent)' : 'var(--op-card-border)'}`,
                      background: isEditing ? 'var(--op-bg)' : 'var(--op-card-bg)',
                      opacity: dragging === i ? 0.45 : block.hidden ? 0.4 : 1,
                      borderLeft: `4px solid ${isDragTarget ? '#5E8B8B' : isEditing ? 'var(--op-accent)' : accentLeft}`,
                      boxShadow: isEditing ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      minHeight: 56,
                      transition: 'border-color 0.1s, box-shadow 0.1s',
                    }}
                  >
                    <span style={{ color: 'var(--op-card-border)', fontSize: 14, userSelect: 'none', flexShrink: 0 }}>⠿</span>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{ICONS[block.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)', textDecoration: block.hidden ? 'line-through' : 'none' }}>{LABELS[block.type]}</div>
                      <div style={{ fontSize: 10, color: 'var(--op-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {block.type === 'hero' && (block.data.tagline || block.data.title || '')}
                        {block.type === 'about' && (block.data.title || '')}
                        {block.type === 'gallery' && `${(block.data.images || []).filter((x: any) => x.url).length} photos`}
                        {block.type === 'booking_cta' && (block.data.title || '')}
                        {block.type === 'hours' && 'Hours display'}
                        {block.type === 'social' && 'Social links'}
                        {block.type === 'divider' && 'Section spacer'}
                        {block.type === 'menu_preview' && 'Auto-pulls menu items'}
                        {block.type === 'reviews' && 'Auto-pulls reviews'}
                        {block.type === 'cta_banner' && (block.data.title || 'Call to action')}
                      </div>
                    </div>
                    {/* Eye toggle */}
                    <button onClick={() => toggleHidden(block.id)} title={block.hidden ? 'Show block' : 'Hide block'}
                      style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: block.hidden ? '#D97706' : 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {block.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => setEditingId(isEditing ? null : block.id)}
                      style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--op-card-border)', background: isEditing ? 'var(--op-accent)' : 'var(--op-bg)', color: isEditing ? '#fff' : 'var(--op-text)', fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={() => removeBlock(block.id)}
                      style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--op-card-border)', background: 'var(--op-card-bg)', color: 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--op-card-bg)'; e.currentTarget.style.borderColor = 'var(--op-card-border)'; e.currentTarget.style.color = 'var(--op-text-muted)'; }}
                    ><X size={12} /></button>
                  </div>
                );
              })}
            </div>

            {/* Reset to default */}
            {blocks.length > 0 && (
              <button onClick={() => { if (window.confirm('Reset all blocks? This cannot be undone.')) { setBlocks([]); setEditingId(null); setActiveTemplateId(null); setSaveMsg(''); } }}
                style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Reset to empty
              </button>
            )}
          </div>

          {/* Block editor */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 16 }}>
            {editingBlock ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--op-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 17 }}>{ICONS[editingBlock.type]}</span> {LABELS[editingBlock.type]}
                </div>

                {editingBlock.type === 'hero' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <ImageUpload label="Hero Image" value={editingBlock.data.imageUrl || ''} onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })} />
                    <div><label style={lStyle}>Headline</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Your cafe name" /></div>
                    <div><label style={lStyle}>Tagline</label><input style={iStyle} value={editingBlock.data.tagline || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, tagline: e.target.value })} placeholder="Specialty coffee, served with care." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.ctaText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, ctaText: e.target.value })} placeholder="Order Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'about' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Section Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Our Story" /></div>
                    <div><label style={lStyle}>Body Text</label><textarea style={{ ...iStyle, minHeight: 90, resize: 'vertical' }} value={editingBlock.data.body || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, body: e.target.value })} placeholder="Tell your story..." /></div>
                    <ImageUpload label="Side Image (optional)" value={editingBlock.data.imageUrl || ''} onChange={url => updateBlock(editingBlock.id, { ...editingBlock.data, imageUrl: url })} />
                  </div>
                )}
                {editingBlock.type === 'gallery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Up to 9 photos — drag & drop or tap to upload</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                      {((editingBlock.data.images || []) as { url: string; caption: string }[]).map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <ImageUpload compact value={img.url} onChange={url => { const imgs = [...(editingBlock.data.images || [])]; imgs[i] = { ...img, url }; updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }} />
                          <button onClick={() => { const imgs = (editingBlock.data.images || []).filter((_: any, idx: number) => idx !== i); updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>×</button>
                        </div>
                      ))}
                      {(editingBlock.data.images || []).length < 9 && (
                        <button onClick={() => { const imgs = [...(editingBlock.data.images || []), { url: '', caption: '' }]; updateBlock(editingBlock.id, { ...editingBlock.data, images: imgs }); }}
                          style={{ aspectRatio: '1', borderRadius: 7, border: '2px dashed var(--op-card-border)', background: 'var(--op-bg)', fontSize: 20, color: 'var(--op-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      )}
                    </div>
                  </div>
                )}
                {editingBlock.type === 'booking_cta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Reserve a Table" /></div>
                    <div><label style={lStyle}>Subtitle</label><input style={iStyle} value={editingBlock.data.subtitle || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, subtitle: e.target.value })} placeholder="Book online in seconds." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.buttonText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, buttonText: e.target.value })} placeholder="Book Now" /></div>
                  </div>
                )}
                {editingBlock.type === 'hours' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Monday – Friday</label><input style={iStyle} value={editingBlock.data.weekday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, weekday: e.target.value })} placeholder="7:00am – 4:00pm" /></div>
                    <div><label style={lStyle}>Saturday</label><input style={iStyle} value={editingBlock.data.saturday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, saturday: e.target.value })} placeholder="8:00am – 3:00pm" /></div>
                    <div><label style={lStyle}>Sunday</label><input style={iStyle} value={editingBlock.data.sunday || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, sunday: e.target.value })} placeholder="9:00am – 2:00pm" /></div>
                  </div>
                )}
                {editingBlock.type === 'social' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Instagram URL</label><input style={iStyle} value={editingBlock.data.instagram || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, instagram: e.target.value })} placeholder="https://instagram.com/yourcafe" /></div>
                    <div><label style={lStyle}>Facebook URL</label><input style={iStyle} value={editingBlock.data.facebook || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, facebook: e.target.value })} placeholder="https://facebook.com/yourcafe" /></div>
                  </div>
                )}
                {editingBlock.type === 'divider' && (
                  <div>
                    <label style={lStyle}>Style</label>
                    <select style={iStyle} value={editingBlock.data.style || 'space'} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, style: e.target.value })}>
                      <option value="space">Space (gap)</option>
                      <option value="line">Line separator</option>
                    </select>
                  </div>
                )}
                {editingBlock.type === 'cta_banner' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div><label style={lStyle}>Title</label><input style={iStyle} value={editingBlock.data.title || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, title: e.target.value })} placeholder="Order Online Today" /></div>
                    <div><label style={lStyle}>Subtitle</label><input style={iStyle} value={editingBlock.data.subtitle || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, subtitle: e.target.value })} placeholder="Fresh food, ready when you are." /></div>
                    <div><label style={lStyle}>Button Text</label><input style={iStyle} value={editingBlock.data.buttonText || ''} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, buttonText: e.target.value })} placeholder="Order Now" /></div>
                    <div>
                      <label style={lStyle}>Banner Colour</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--op-card-border)', borderRadius: 6, background: 'var(--op-card-bg)' }}>
                        <input type="color" value={editingBlock.data.bgColor || '#5E8B8B'} onChange={e => updateBlock(editingBlock.id, { ...editingBlock.data, bgColor: e.target.value })} style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                        <span style={{ fontSize: 11, color: 'var(--op-text-muted)', fontFamily: 'monospace' }}>{editingBlock.data.bgColor || '#5E8B8B'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {editingBlock.type === 'menu_preview' && (
                  <div style={{ padding: '14px', background: 'var(--op-bg)', borderRadius: 7, border: '1px solid var(--op-card-border)', fontSize: 12, color: 'var(--op-text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                    🍽️ Automatically shows your top menu items — no editing needed.
                  </div>
                )}
                {editingBlock.type === 'reviews' && (
                  <div style={{ padding: '14px', background: 'var(--op-bg)', borderRadius: 7, border: '1px solid var(--op-card-border)', fontSize: 12, color: 'var(--op-text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                    ⭐ Automatically shows your recent reviews — no editing needed.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--op-text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 7 }}>✏️</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)' }}>Select a block to edit</div>
                <div style={{ fontSize: 11, marginTop: 3 }}>Click Edit on any block above</div>
              </div>
            )}
          </div>

          {/* Live links */}
          <div style={{ background: 'var(--op-card-bg)', borderRadius: 10, border: '1px solid var(--op-card-border)', padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--op-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Live Links</div>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', color: 'var(--op-text)', textDecoration: 'none', fontSize: 11, marginBottom: 6 }}>
              🌐 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            </a>
            <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--op-card-border)', background: 'var(--op-bg)', color: 'var(--op-text)', textDecoration: 'none', fontSize: 11 }}>
              📅 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookUrl}</span>
            </a>
          </div>
        </div>

        {/* Right panel: live preview iframe */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: '#1C1C1E', borderRadius: 12, overflow: 'hidden', border: '1px solid #333', minHeight: 600 }}>
            {/* Browser chrome */}
            <div style={{ background: '#2C2C2E', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA41' }} />
              </div>
              <div style={{ flex: 1, background: '#3A3A3C', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#8E8E93', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {publicUrl}
              </div>
            </div>
            {/* iframe area */}
            <div style={{ background: '#F5F5F5', display: 'flex', justifyContent: 'center', minHeight: 560, padding: previewWidth === '390px' ? '16px' : '0' }}>
              {previewWidth === '390px' ? (
                <div style={{ width: 390, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderRadius: '20px', overflow: 'hidden', border: '8px solid #1C1C1E' }}>
                  <iframe
                    key={previewKey}
                    src={previewSrc}
                    style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
                    title="Site preview"
                  />
                </div>
              ) : (
                <iframe
                  key={previewKey}
                  src={previewSrc}
                  style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
                  title="Site preview"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
