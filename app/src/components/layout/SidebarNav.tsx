import { useState, type ElementType } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ElementType;
}

export interface SidebarNavGroup {
  group: string;
  items: SidebarNavItem[];
}

interface SidebarNavProps {
  groups: SidebarNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'b1-sidebar-collapsed';

export function SidebarNav({ groups, activeId, onSelect }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage may be unavailable
      }
      return next;
    });
  }

  const width = collapsed ? 56 : 240;

  return (
    <nav
      style={{
        width,
        flexShrink: 0,
        background: 'var(--op-sidebar, #18181B)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.18s ease',
        paddingBottom: 16,
        position: 'relative',
      }}
    >
      {/* Collapse toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: collapsed ? '12px 0' : '12px 8px',
        }}
      >
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.45)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav groups */}
      {groups.map(({ group, items }) => (
        <div key={group} style={{ marginTop: 4 }}>
          {/* Group heading — hidden when collapsed */}
          {!collapsed && (
            <div
              style={{
                padding: '8px 16px 4px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {group}
            </div>
          )}

          {items.map((item) => {
            const Icon = item.icon as ElementType<{ size?: number }>;
            const isActive = item.id === activeId;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  width: '100%',
                  padding: collapsed ? '9px 0' : '8px 16px',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? '#5E8B8B' : 'transparent'}`,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.1s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }
                }}
              >
                <Icon size={14} />
                {!collapsed && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Sidebar footer — shown only when expanded */}
      {!collapsed && (
        <div
          style={{
            marginTop: 'auto',
            padding: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
            B1 Platform
          </div>
        </div>
      )}
    </nav>
  );
}
