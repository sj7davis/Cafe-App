import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { todayRotation } from '@/data/menu';

export default function SeasonalBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('banner-dismissed') === 'true';
  });

  if (dismissed || !todayRotation.limitedDrop) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('banner-dismissed', 'true');
  };

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 py-3 px-4"
      style={{
        background: 'var(--color-ink)',
        borderBottom: '1px solid rgba(243, 242, 238, 0.08)',
      }}
    >
      <div className="content-container flex items-center justify-center gap-3 relative">
        <Sparkles size={14} style={{ color: 'rgba(243, 242, 238, 0.6)' }} />
        <span className="font-data" style={{ color: 'rgba(243, 242, 238, 0.8)', letterSpacing: '0.08em' }}>
          LIMITED DROP — {todayRotation.limitedDrop}
        </span>
        <button
          onClick={handleDismiss}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 opacity-40 hover:opacity-70 transition-opacity"
          aria-label="Dismiss banner"
        >
          <X size={14} style={{ color: '#F3F2EE' }} />
        </button>
      </div>
    </div>
  );
}
