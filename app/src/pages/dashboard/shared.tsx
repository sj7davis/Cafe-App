// Shared constants, helpers and sub-components for OwnerDashboard tabs.
// Exported from here and imported by each tab file.

import { useState, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Coffee, Edit2, Trash2,
  GripVertical, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';

import { useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export const DS = {
  card: {
    background: 'var(--op-card-bg)',
    borderRadius: 'var(--op-radius-card)',
    border: '1px solid var(--op-card-border)',
    padding: '20px 24px',
    boxShadow: 'var(--op-shadow)',
  } as React.CSSProperties,
  cardFlush: {
    background: 'var(--op-card-bg)',
    borderRadius: 'var(--op-radius-card)',
    border: '1px solid var(--op-card-border)',
    boxShadow: 'var(--op-shadow)',
    overflow: 'hidden',
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--op-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: 6,
    display: 'block',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--op-text)',
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--op-card-border)',
    borderRadius: 'var(--op-radius-input)',
    fontSize: 14,
    color: 'var(--op-text)',
    background: 'var(--op-bg)',
    outline: 'none',
    fontFamily: 'var(--op-font-sans)',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btnPrimary: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: 'none',
    background: 'var(--op-accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: '1px solid var(--op-card-border)',
    background: 'var(--op-card-bg)',
    color: 'var(--op-text)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.15s',
  } as React.CSSProperties,
  btnDanger: {
    padding: '9px 18px',
    borderRadius: 'var(--op-radius)',
    border: '1px solid #FECACA',
    background: '#FEF2F2',
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,
  tableHeader: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--op-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--op-card-border)',
    background: 'var(--op-bg)',
  } as React.CSSProperties,
  tableCell: {
    padding: '11px 14px',
    fontSize: 13,
    color: 'var(--op-text)',
    borderBottom: '1px solid var(--op-card-border)',
    verticalAlign: 'middle' as const,
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: 'var(--op-text-muted)',
    fontSize: 13,
  } as React.CSSProperties,
  badge: (color: string, bg: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 9px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color,
  } as React.CSSProperties),
};

// ─── Image upload styles (used inside ImageUpload below) ──────────────────────
const IMG_UPLOAD_INPUT: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid var(--op-card-border)',
  borderRadius: 6, fontSize: 11, color: 'var(--op-text-muted)', background: 'var(--op-card-bg)',
  boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--op-font-sans)',
};
const IMG_UPLOAD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--op-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
};

export function ImageUpload({
  value, onChange, label = 'Image', compact = false,
}: {
  value: string; onChange: (url: string) => void; label?: string; compact?: boolean;
}) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) { setError('Please pick an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
      // Prepend origin so the URL works from any page
      const fullUrl = json.url.startsWith('http') ? json.url : window.location.origin + json.url;
      onChange(fullUrl);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) doUpload(f);
  };

  if (compact) {
    // Square thumbnail for gallery grid
    return (
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: uploading ? 'wait' : 'pointer',
          border: `2px dashed ${dragOver ? '#5E8B8B' : 'var(--op-card-border)'}`,
          background: value ? 'transparent' : (dragOver ? 'rgba(94,139,139,0.06)' : 'var(--op-bg)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}
      >
        {value && !uploading
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : uploading
            ? <div style={{ fontSize: 18 }}>⏳</div>
            : <div style={{ fontSize: 22, color: 'var(--op-text-muted)' }}>📷</div>
        }
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={IMG_UPLOAD_LABEL}>{label}</label>}

      {/* Drop zone / preview */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%', height: value ? 110 : 78, borderRadius: 8, overflow: 'hidden',
          border: `2px dashed ${dragOver ? '#5E8B8B' : 'var(--op-card-border)'}`,
          background: value ? 'transparent' : (dragOver ? 'rgba(94,139,139,0.06)' : 'var(--op-bg)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer', position: 'relative',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {value && !uploading ? (
          <>
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.55)', padding: '5px 10px',
              fontSize: 11, color: '#fff', fontWeight: 600, textAlign: 'center',
            }}>
              Click or drag to replace
            </div>
          </>
        ) : uploading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⏳</div>
            <div style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Uploading…</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--op-text)' }}>Upload photo</div>
            <div style={{ fontSize: 10, color: 'var(--op-text-muted)', marginTop: 2 }}>Drag & drop or click · JPG PNG WebP · max 5 MB</div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: '#DC2626' }}>{error}</div>}

      {/* URL paste fallback */}
      <input
        style={IMG_UPLOAD_INPUT}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Or paste a URL…"
      />

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
    </div>
  );
}

export function TemplatePreviewCard({ template: t }: { template: { id: string; preview: { bg: string; accent: string; headline: string }; palette: { primary: string; accent: string; bg: string } } }) {
  const { bg, accent, headline } = t.preview;

  // Each template gets a unique layout thumbnail
  const thumbnails: Record<string, React.ReactNode> = {
    fresh: (
      <div style={{ background: bg, height: 160, padding: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Hero */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.52))`, backgroundImage: `url(https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 80, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.9)', marginBottom: 4 }} />
            <div style={{ width: 50, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.6)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 3, padding: '3px 8px' }}>
              <div style={{ width: 30, height: 4, borderRadius: 1, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* Menu section */}
        <div style={{ background: '#fff', padding: '8px 14px', borderBottom: `1px solid ${headline}12` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.7, marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: `${headline}10`, border: `1px solid ${headline}15` }} />)}
          </div>
        </div>
        {/* About + CTA */}
        <div style={{ background: '#FAFAF8', padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 45, height: 4, borderRadius: 2, background: headline, opacity: 0.8, marginBottom: 4 }} />
            <div style={{ width: 80, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
          </div>
          <div style={{ background: headline, borderRadius: 3, padding: '4px 8px' }}>
            <div style={{ width: 28, height: 3, borderRadius: 1, background: '#fff' }} />
          </div>
        </div>
      </div>
    ),

    warmth: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — warm overlay */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(68,28,12,0.3), rgba(68,28,12,0.65))`, backgroundImage: `url(https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 75, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.92)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.65)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 3, padding: '3px 8px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 1, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* About — warm cream */}
        <div style={{ background: '#FDF6EE', padding: '8px 14px', borderBottom: `1px solid #FDE68A` }}>
          <div style={{ width: 55, height: 5, borderRadius: 2, background: headline, opacity: 0.8, marginBottom: 5 }} />
          <div style={{ width: 110, height: 3, borderRadius: 2, background: headline, opacity: 0.4, marginBottom: 3 }} />
          <div style={{ width: 90, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
        </div>
        {/* Hours */}
        <div style={{ background: '#FEF3C7', padding: '7px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ width: 55, height: 3, borderRadius: 2, background: headline, opacity: 0.6 }} />
            <div style={{ width: 35, height: 3, borderRadius: 2, background: accent, opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: headline, opacity: 0.4 }} />
            <div style={{ width: 30, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    ),

    noir: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — deep dark */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.88))`, backgroundImage: `url(https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 80, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.95)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.6)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 2, padding: '3px 8px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 1, background: '#0D0D0F' }} />
            </div>
          </div>
        </div>
        {/* Gold banner */}
        <div style={{ background: accent, padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: '#0D0D0F', opacity: 0.7 }} />
          <div style={{ background: '#0D0D0F', borderRadius: 3, padding: '3px 7px' }}>
            <div style={{ width: 24, height: 3, borderRadius: 1, background: accent }} />
          </div>
        </div>
        {/* Dark about */}
        <div style={{ background: '#181818', padding: '8px 14px', borderBottom: `1px solid #27272A` }}>
          <div style={{ width: 55, height: 5, borderRadius: 2, background: '#FAFAFA', opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 100, height: 3, borderRadius: 2, background: '#A1A1AA', opacity: 0.6, marginBottom: 3 }} />
          <div style={{ width: 80, height: 3, borderRadius: 2, background: '#A1A1AA', opacity: 0.4 }} />
        </div>
      </div>
    ),

    garden: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero */}
        <div style={{ height: 72, background: `linear-gradient(to bottom, rgba(26,51,39,0.15), rgba(26,51,39,0.62))`, backgroundImage: `url(https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 85, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.95)', marginBottom: 4 }} />
            <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.7)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: headline, borderRadius: 16, padding: '3px 9px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, background: '#D4F0DC' }} />
            </div>
          </div>
        </div>
        {/* About — sage */}
        <div style={{ background: '#F0F7F1', padding: '8px 14px', borderBottom: `1px solid #C5E0CA` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 105, height: 3, borderRadius: 2, background: headline, opacity: 0.4, marginBottom: 3 }} />
          <div style={{ width: 85, height: 3, borderRadius: 2, background: headline, opacity: 0.3 }} />
        </div>
        {/* Dark green CTA */}
        <div style={{ background: headline, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 65, height: 4, borderRadius: 2, background: '#D4F0DC', opacity: 0.8 }} />
          <div style={{ background: accent, borderRadius: 16, padding: '3px 9px' }}>
            <div style={{ width: 28, height: 4, borderRadius: 2, background: '#fff' }} />
          </div>
        </div>
      </div>
    ),

    bold: (
      <div style={{ background: bg, height: 160, overflow: 'hidden' }}>
        {/* Hero — purple/coral gradient */}
        <div style={{ height: 72, background: `linear-gradient(135deg, rgba(45,27,105,0.88), rgba(255,77,77,0.65))`, backgroundImage: `url(https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=60)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '10px 14px' }}>
          <div>
            <div style={{ width: 88, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.97)', marginBottom: 4 }} />
            <div style={{ width: 55, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.65)', marginBottom: 8 }} />
            <div style={{ display: 'inline-block', background: accent, borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, background: '#fff' }} />
            </div>
          </div>
        </div>
        {/* Coral CTA strip */}
        <div style={{ background: accent, padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 70, height: 4, borderRadius: 2, background: '#fff', opacity: 0.9 }} />
          <div style={{ background: '#fff', borderRadius: 20, padding: '3px 8px' }}>
            <div style={{ width: 26, height: 3, borderRadius: 2, background: accent }} />
          </div>
        </div>
        {/* White content */}
        <div style={{ background: '#fff', padding: '8px 14px', borderBottom: `1px solid #E0DCFF` }}>
          <div style={{ width: 60, height: 5, borderRadius: 2, background: headline, opacity: 0.85, marginBottom: 5 }} />
          <div style={{ width: 100, height: 3, borderRadius: 2, background: '#6B6B8E', opacity: 0.5, marginBottom: 3 }} />
          <div style={{ width: 80, height: 3, borderRadius: 2, background: '#6B6B8E', opacity: 0.35 }} />
        </div>
      </div>
    ),
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {thumbnails[t.id] ?? (
        <div style={{ height: 160, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, opacity: 0.3 }}>☕</span>
        </div>
      )}
      {/* Colour palette strip at bottom of preview */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', borderRadius: '6px 0 0 0', overflow: 'hidden' }}>
        {[t.preview.bg, t.preview.headline, t.preview.accent].map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  );
}

export function TabletPinSection({ venue, token, inputCls, inputStyle }: { venue: any; token: string; inputCls: string; inputStyle: React.CSSProperties }) {
  const [tabletPin, setTabletPin] = useState(venue.tabletPin || '');
  const [msg, setMsg] = useState('');
  const mutation = trpc.venue.update.useMutation({
    onSuccess: () => { setMsg('Saved!'); setTimeout(() => setMsg(''), 2000); },
  });
  const tabletUrl = `${window.location.origin}/tablet/${venue.slug}`;

  // Extract handler to avoid regex-in-JSX parsing issues on Linux builds
  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.split('').filter(ch => ch >= '0' && ch <= '9').join('');
    setTabletPin(digitsOnly.slice(0, 6));
  }

  return (
    <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.5rem' }}>Tablet / iPad POS</h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Open <span style={{ fontFamily: 'Geist Mono', fontSize: 12, background: 'rgba(24,24,24,0.06)', padding: '2px 6px', borderRadius: 3 }}>{tabletUrl}</span> on any iPad or tablet. Staff enter this PIN to access the counter view.
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' as const }}>
        <div>
          <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' }}>PIN (4-6 digits)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={tabletPin}
            onChange={handlePinChange}
            placeholder="e.g. 1234"
            className={inputCls}
            style={{ ...inputStyle, width: 140 }}
          />
        </div>
        <button
          onClick={() => { setMsg(''); mutation.mutate({ token, data: { tabletPin: tabletPin || null } }); }}
          disabled={mutation.isPending}
          className="px-6 py-3 font-button flex items-center gap-2"
          style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save PIN
        </button>
        {msg && <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>{msg}</span>}
      </div>
      {tabletPin.length >= 4 && (
        <a href={tabletUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14, fontSize: '0.8125rem', color: '#5E8B8B', textDecoration: 'underline' }}>
          Open tablet view
        </a>
      )}
    </div>
  );
}

export function SortableMenuRow({
  item, venue, token, inventoryLevels, stockFormOpen, stockForm,
  setStockFormOpen, setStockForm, setInventoryQty,
  openModifiers, setOpenModifiers,
  deleteConfirm, setDeleteConfirm, deleteMutation, startEdit,
}: {
  item: any; venue: any; token: string; inventoryLevels: any[];
  stockFormOpen: number | null; stockForm: { quantity: string; quantityAlert: string };
  setStockFormOpen: (id: number | null) => void;
  setStockForm: (f: any) => void;
  setInventoryQty: any;
  openModifiers: Set<number>; setOpenModifiers: React.Dispatch<React.SetStateAction<Set<number>>>;
  deleteConfirm: number | null; setDeleteConfirm: (id: number | null) => void;
  deleteMutation: any; startEdit: (item: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const dragStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative',
  };
  const inv = (inventoryLevels as any[])?.find((r: any) => r.menuItemId === item.id);
  const qty = inv?.quantity ?? null;
  const alert = inv?.quantityAlert ?? null;
  const isLow = qty !== null && alert !== null && qty <= alert;

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <div className="flex items-center justify-between gap-3 p-4" style={{ background: 'var(--op-card-bg)', border: '1px solid var(--op-card-border)' }}>
        {/* Drag handle */}
        <div
          {...attributes} {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'var(--op-card-border)', flexShrink: 0, touchAction: 'none', padding: '2px 0' }}
          title="Drag to reorder"
        >
          <GripVertical size={15} />
        </div>

        {/* Thumbnail */}
        {item.image ? (
          <img src={item.image} alt={item.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,24,24,0.04)', borderRadius: 6, border: '1px dashed rgba(24,24,24,0.12)' }}>
            <Coffee size={18} style={{ color: 'var(--op-text-muted)' }} />
          </div>
        )}

        {/* Name / price / badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)', display: 'block', marginBottom: 3 }}>{item.name}</span>
          <span style={{ fontFamily: 'Geist Mono', fontSize: 13, color: 'var(--op-text)', fontWeight: 700 }}>${Number(item.price).toFixed(2)}</span>
          {((Array.isArray(item.allergens) && item.allergens.length > 0) || (Array.isArray(item.dietaryTags) && item.dietaryTags.length > 0)) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {(Array.isArray(item.allergens) ? item.allergens : []).map((a: string) => (
                <span key={a} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{a}</span>
              ))}
              {(Array.isArray(item.dietaryTags) ? item.dietaryTags : []).map((t: string) => (
                <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="flex flex-col items-end mr-1" style={{ minWidth: 80 }}>
          <div className="flex items-center gap-1 mb-1">
            {qty !== null ? (
              <span className="font-data" style={{ fontSize: '0.5625rem', letterSpacing: '0.06em', color: isLow ? '#B85450' : '#5E5E5E' }}>{qty} in stock</span>
            ) : (
              <span className="font-data" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)' }}>—</span>
            )}
            {isLow && <span className="font-data" style={{ fontSize: '0.5rem', background: 'rgba(184,84,80,0.12)', color: '#B85450', padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Low</span>}
          </div>
          {stockFormOpen === item.id ? (
            <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
              <input type="number" min={0} placeholder="Qty" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} style={{ border: '1px solid var(--op-card-border)', padding: '3px 6px', fontSize: 12, background: 'var(--op-card-bg)', color: 'var(--op-text)', width: '100%' }} />
              <input type="number" min={0} placeholder="Alert at" value={stockForm.quantityAlert} onChange={e => setStockForm({ ...stockForm, quantityAlert: e.target.value })} style={{ border: '1px solid var(--op-card-border)', padding: '3px 6px', fontSize: 12, background: 'var(--op-card-bg)', color: 'var(--op-text)', width: '100%' }} />
              <div className="flex gap-1">
                <button onClick={() => { setInventoryQty.mutate({ menuItemId: item.id, quantity: Number(stockForm.quantity), quantityAlert: stockForm.quantityAlert ? Number(stockForm.quantityAlert) : undefined }, { onSuccess: () => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); } }); }} style={{ flex: 1, background: '#181818', color: '#F3F2EE', border: 'none', fontSize: 11, padding: '3px 6px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setStockFormOpen(null); setStockForm({ quantity: '', quantityAlert: '' }); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', fontSize: 11, padding: '3px 6px', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setStockFormOpen(item.id); setStockForm({ quantity: qty !== null ? String(qty) : '', quantityAlert: alert !== null ? String(alert) : '' }); }} style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, background: 'none', border: '1px solid rgba(24,24,24,0.12)', padding: '2px 7px', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>Set Stock</button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setOpenModifiers(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} title="Manage Modifiers" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            {openModifiers.has(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => startEdit(item)} title="Edit" className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => setDeleteConfirm(item.id)} title="Delete" className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {openModifiers.has(item.id) && <ModifiersPanel menuItemId={item.id} venueId={venue.id} token={token} />}

      {deleteConfirm === item.id && (
        <div className="p-4 border-x border-b" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#F3F2EE' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--op-text)', marginBottom: 12 }}>Delete this item? Orders referencing it will be preserved.</p>
          <div className="flex items-center gap-3">
            <button onClick={() => deleteMutation.mutate({ token, menuItemId: item.id })} disabled={deleteMutation.isPending} className="px-4 py-2 font-button flex items-center gap-2" style={{ background: '#B85450', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 font-button" style={{ background: 'transparent', color: 'var(--op-text)', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}>
              Keep Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline editor for a menu item's modifier groups (e.g. "Milk: Oat +$0.50").
// Options are entered as comma-separated "Name:+price" pairs.
function ModifiersPanel({ menuItemId, venueId, token }: { menuItemId: number; venueId: number; token: string }) {
  const [name, setName] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(false);

  const { data: groups, isLoading, refetch } = trpc.venue.listMenuModifiers.useQuery({ venueId, menuItemId });
  const addMutation = trpc.venue.addMenuModifier.useMutation({
    onSuccess: () => { setName(''); setOptionsText(''); setRequired(false); refetch(); },
  });
  const deleteMutation = trpc.venue.deleteMenuModifier.useMutation({ onSuccess: () => refetch() });

  const parsedOptions = optionsText
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const [optName, priceStr] = s.split(':').map(p => p.trim());
      return { name: optName, priceAdj: Number(priceStr) || 0 };
    })
    .filter(o => o.name);

  return (
    <div className="p-4 border-x border-b" style={{ borderColor: 'rgba(24,24,24,0.12)', background: '#F3F2EE' }}>
      <p className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', marginBottom: 10 }}>Modifier Groups</p>

      {isLoading ? (
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {(groups ?? []).length === 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)', margin: 0 }}>No modifiers yet — add one below.</p>
          )}
          {(groups ?? []).map(g => (
            <div key={g.id} className="flex items-center justify-between gap-3" style={{ background: 'var(--op-card-bg)', border: '1px solid var(--op-card-border)', padding: '8px 12px' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--op-text)' }}>{g.name}</span>
                {g.required && <span className="font-data" style={{ fontSize: '0.5625rem', marginLeft: 8, padding: '1px 5px', background: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Required</span>}
                <div style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)', marginTop: 2 }}>
                  {(g.options ?? []).map(o => o.priceAdj ? `${o.name} +$${o.priceAdj.toFixed(2)}` : o.name).join(' · ')}
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate({ token, modifierId: g.id })} disabled={deleteMutation.isPending} title="Delete group" className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent', flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name (e.g. Milk)" style={{ ...DS.input, width: 180 }} />
        <input value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder="Options: Full Cream, Oat:0.50, Soy:0.50" style={{ ...DS.input, flex: 1, minWidth: 220 }} />
        <label className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--op-text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Required
        </label>
        <button
          onClick={() => addMutation.mutate({ token, menuItemId, name: name.trim(), options: parsedOptions, required })}
          disabled={addMutation.isPending || !name.trim() || parsedOptions.length === 0}
          className="px-4 py-2 font-button flex items-center gap-2"
          style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!name.trim() || parsedOptions.length === 0) ? 0.5 : 1 }}
        >
          {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Group
        </button>
      </div>
      {addMutation.isError && <p style={{ fontSize: '0.75rem', color: '#B85450', marginTop: 6 }}>{addMutation.error.message}</p>}
    </div>
  );
}

export function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function addWeekDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const CHART_COLORS = ['#5E8B8B', '#C4953A', '#5E8B5E', '#B85450', '#8B7355', '#5E5E8B'];
// FONTS and PALETTES are defined inside WebsiteTab — not module-level exports.
