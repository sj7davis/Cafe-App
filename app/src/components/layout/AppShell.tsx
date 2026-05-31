/**
 * AppShell — Operator layout wrapper.
 * Desktop: sticky top-bar + collapsible left sidebar + scrollable main.
 * Mobile (< 768px): top-bar + bottom tab bar (sidebar hidden).
 */
import { type ReactNode, type ElementType } from 'react';
import { Sun, Moon } from 'lucide-react';
import { SidebarNav, type SidebarNavGroup } from './SidebarNav';
import { useTheme } from './ThemeContext';

interface AppShellProps {
  groups: SidebarNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  topBarLeft?: ReactNode;
  topBarRight?: ReactNode;
  children: ReactNode;
}

/** Flatten nav groups into a flat list for the mobile bottom bar (first 5 only). */
function getPrimaryItems(groups: SidebarNavGroup[]) {
  const all = groups.flatMap(g => g.items);
  // Take first 5 across all groups — these are the "Main" group items
  return all.slice(0, 5);
}

export function AppShell({
  groups,
  activeId,
  onSelect,
  topBarLeft,
  topBarRight,
  children,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const mobileItems = getPrimaryItems(groups);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--op-bg)',
        color: 'var(--op-text)',
        fontFamily: 'var(--op-font-sans, Inter, -apple-system, sans-serif)',
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--op-card-bg)',
          borderBottom: '1px solid var(--op-card-border)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          gap: 12,
          zIndex: 40,
          position: 'sticky',
          top: 0,
        }}
      >
        {topBarLeft && <div style={{ display: 'flex', alignItems: 'center' }}>{topBarLeft}</div>}
        <div style={{ flex: 1 }} />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid var(--op-card-border)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--op-text-secondary)', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--op-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {topBarRight && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{topBarRight}</div>}
      </header>

      {/* ── Body: sidebar (desktop) + content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

        {/* Sidebar — hidden on mobile via CSS */}
        <div className="app-sidebar">
          <SidebarNav groups={groups} activeId={activeId} onSelect={onSelect} />
        </div>

        {/* Main content — extra bottom padding on mobile for the tab bar */}
        <main
          className="app-main"
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--op-bg)',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>

      {/* ── Bottom tab bar — mobile only ── */}
      <nav className="app-bottom-tab-bar" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 64,
        background: 'var(--op-card-bg)',
        borderTop: '1px solid var(--op-card-border)',
        display: 'none', // shown via CSS media query
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {mobileItems.map(item => {
          const Icon = item.icon as ElementType<{ size?: number }>;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                height: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--op-accent)' : 'var(--op-text-muted)',
                transition: 'color 0.1s',
                padding: '4px 0',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: '0.02em' }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: 24, height: 2,
                  borderRadius: 1,
                  background: 'var(--op-accent)',
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Responsive rules — injected once, minimal footprint */}
      <style>{`
        @media (max-width: 767px) {
          .app-sidebar    { display: none !important; }
          .app-bottom-tab-bar { display: flex !important; }
          .app-main       { padding-bottom: 72px !important; }
        }
      `}</style>
    </div>
  );
}
