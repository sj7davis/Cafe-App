---
phase: 07-dual-identity-ui-refresh
plan: "01"
subsystem: design-system
tags: [design-tokens, dark-mode, sidebar, layout, ui-primitives]
dependency_graph:
  requires: []
  provides:
    - app/src/styles/tokens.css
    - app/src/components/layout/ThemeContext.tsx
    - app/src/components/layout/SidebarNav.tsx
    - app/src/components/layout/AppShell.tsx
    - app/src/components/ui/StatCard.tsx
    - app/src/components/ui/EmptyState.tsx
  affects:
    - app/src/main.tsx
tech_stack:
  added: []
  patterns:
    - CSS custom properties (--op-* prefix) for design tokens
    - React context + localStorage for dark-mode persistence
    - data-theme attribute on document.documentElement for CSS switching
    - Inline styles throughout (matching existing codebase pattern)
key_files:
  created:
    - app/src/styles/tokens.css
    - app/src/components/layout/ThemeContext.tsx
    - app/src/components/layout/SidebarNav.tsx
    - app/src/components/layout/AppShell.tsx
    - app/src/components/ui/StatCard.tsx
    - app/src/components/ui/EmptyState.tsx
  modified:
    - app/src/main.tsx
decisions:
  - "Used --op-* CSS variable prefix to avoid colliding with existing shadcn CSS variables"
  - "SidebarNav is tab-driven (activeId prop) not route-driven, matching OwnerDashboard's activeTab pattern"
  - "ThemeContext is self-contained; does not depend on next-themes package"
  - "AppShell renders SidebarNav + top bar but leaves brand/venue slot to topBarLeft/topBarRight props for flexibility"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 1
---

# Phase 7 Plan 01: Design System Foundation — Operator Shell

## One-liner

CSS design tokens (light + dark), dark-mode ThemeContext with localStorage persistence, collapsible 240/56px SidebarNav, AppShell wrapper, and StatCard/EmptyState UI primitives using --op-* CSS custom properties.

## What Was Built

### Task 1 — Design tokens stylesheet + global import
- `app/src/styles/tokens.css`: defines all `--op-*` CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark overrides)
- `app/src/main.tsx`: added `import './styles/tokens.css'` alongside existing `index.css` import

### Task 2 — ThemeContext + SidebarNav
- `ThemeContext.tsx`: exports `ThemeProvider` and `useTheme`. Reads `b1-operator-theme` from localStorage on mount (default `'light'`), calls `document.documentElement.setAttribute('data-theme', theme)` on every change, writes back to localStorage. `useTheme()` throws if used outside provider.
- `SidebarNav.tsx`: exports `SidebarNav`. Accepts `groups`, `activeId`, `onSelect` props. Collapsed state persisted under `b1-sidebar-collapsed`. Width transitions between 240px (expanded) and 56px (collapsed). Active item: `borderLeft: 3px solid #5E8B8B` + `background: rgba(255,255,255,0.1)`. Sidebar background: `var(--op-sidebar, #18181B)`. Collapse toggle uses ChevronLeft/ChevronRight from lucide-react.

### Task 3 — AppShell + StatCard + EmptyState
- `AppShell.tsx`: exports `AppShell`. Props: `groups`, `activeId`, `onSelect` (forwarded to SidebarNav), `topBarLeft?`, `topBarRight?`, `children`. Top bar is 56px sticky with dark-mode toggle (Sun/Moon) wired to `useTheme().toggleTheme`. Must be used inside `<ThemeProvider>`.
- `StatCard.tsx`: exports `StatCard`. Props: `label`, `value`, `delta?`, `icon?`. Uses `var(--op-card-bg)`, `var(--op-card-border)`, `var(--op-radius-card)`, `var(--op-shadow)`. Delta colored green (+) or red (-).
- `EmptyState.tsx`: exports `EmptyState`. Props: `icon?`, `title`, `description?`, `action?`. Centered column, icon in muted circle, title/description in `--op-text`/`--op-text-secondary`.

## API Reference (for downstream plans 07-02, 07-03, 07-04)

### ThemeProvider / useTheme
```tsx
import { ThemeProvider, useTheme } from '@/components/layout/ThemeContext';
// ThemeProvider: { children: ReactNode }
// useTheme(): { theme: 'light' | 'dark', toggleTheme: () => void }
```

### SidebarNav
```tsx
import { SidebarNav } from '@/components/layout/SidebarNav';
import type { SidebarNavGroup } from '@/components/layout/SidebarNav';
// SidebarNavGroup: { group: string; items: { id: string; label: string; icon: ElementType }[] }
// SidebarNav props: { groups, activeId: string, onSelect: (id: string) => void }
```

### AppShell
```tsx
import { AppShell } from '@/components/layout/AppShell';
// Props: { groups, activeId, onSelect, topBarLeft?, topBarRight?, children }
// Must be inside <ThemeProvider>
```

### StatCard
```tsx
import { StatCard } from '@/components/ui/StatCard';
// Props: { label: string, value: string | number, delta?: string, icon?: ElementType }
// delta: '+12%' → green, '-5%' → red, 'flat' → muted
```

### EmptyState
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
// Props: { icon?: ElementType, title: string, description?: string, action?: ReactNode }
```

## CSS Tokens Quick Reference

| Token | Light | Dark |
|-------|-------|------|
| `--op-bg` | `#FAFAFA` | `#111111` |
| `--op-sidebar` | `#18181B` | `#0A0A0A` |
| `--op-card-bg` | `#FFFFFF` | `#18181B` |
| `--op-card-border` | `#E4E4E7` | `#27272A` |
| `--op-accent` | `#5E8B8B` | `#5E8B8B` |
| `--op-text` | `#09090B` | `#FAFAFA` |
| `--op-text-secondary` | `#71717A` | `#A1A1AA` |
| `--op-radius-card` | `12px` | — |
| `--op-shadow` | `0 1px 3px rgba(0,0,0,0.08)...` | — |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `5746dc5` | feat(07-01): add operator design tokens CSS and global import |
| 2 | `3b1e270` | feat(07-01): add ThemeContext + collapsible SidebarNav |
| 3 | `b1b86a8` | feat(07-01): add AppShell wrapper + StatCard + EmptyState primitives |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are fully implemented.

## Self-Check: PASSED

- [x] app/src/styles/tokens.css exists and contains all required --op-* variables
- [x] app/src/components/layout/ThemeContext.tsx exports ThemeProvider + useTheme
- [x] app/src/components/layout/SidebarNav.tsx exports SidebarNav, 240/56px widths, b1-sidebar-collapsed key
- [x] app/src/components/layout/AppShell.tsx exports AppShell, composes SidebarNav, wires useTheme
- [x] app/src/components/ui/StatCard.tsx exports StatCard with --op-card-bg and --op-shadow
- [x] app/src/components/ui/EmptyState.tsx exports EmptyState with title/description/action
- [x] app/src/main.tsx imports tokens.css and still imports index.css
- [x] npx tsc --noEmit -p app/tsconfig.json: CLEAN (no errors)
- [x] All 3 tasks committed individually
