/**
 * AppShell — Operator layout wrapper (sidebar + top bar + content).
 * Must be rendered inside a <ThemeProvider> from ThemeContext.tsx.
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

export function AppShell({
  groups,
  activeId,
  onSelect,
  topBarLeft,
  topBarRight,
  children,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--op-bg, #FAFAFA)',
        color: 'var(--op-text, #09090B)',
        fontFamily: 'var(--op-font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      }}
    >
      {/* Top bar — 56px */}
      <header
        style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--op-card-bg, #FFFFFF)',
          borderBottom: '1px solid var(--op-card-border, #E4E4E7)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          gap: 12,
          zIndex: 40,
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Left slot */}
        {topBarLeft && <div style={{ display: 'flex', alignItems: 'center' }}>{topBarLeft}</div>}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--op-card-border, #E4E4E7)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--op-text-secondary, #71717A)',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--op-bg, #FAFAFA)';
            e.currentTarget.style.color = 'var(--op-text, #09090B)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--op-text-secondary, #71717A)';
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Right slot */}
        {topBarRight && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{topBarRight}</div>}
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
        <SidebarNav groups={groups} activeId={activeId} onSelect={onSelect} />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--op-bg, #FAFAFA)',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
