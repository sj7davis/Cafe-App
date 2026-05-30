---
phase: 14
plan: "02"
subsystem: owner-dashboard-ui
tags: [ui, toggles, automation, integrations-tab, trpc]
requirements: [AUTO-04]
key-files:
  modified:
    - app/api/venue-router.ts
    - app/src/pages/OwnerDashboard.tsx
decisions:
  - Automation section placed in IntegrationsTab (before QR Code section) as a standalone card
  - Toggle UI uses inline button with CSS transition — no external toggle library needed
  - getAutomationSettings returns defaults (all true) when no settingsJson.automation key exists
  - updateAutomationSettings writes the full automation object as a shallow merge into settingsJson
metrics:
  completed: "2026-05-30"
---

# Phase 14 Plan 02: Automation Toggle UI + Venue Settings Endpoints Summary

**Backend** — Two new procedures in `venue-router.ts`:

- `venue.getAutomationSettings` — reads `settingsJson.automation`, returns `{ reEngagement, birthday, passExpiry }` with all defaulting to `true` when absent
- `venue.updateAutomationSettings` — accepts all three booleans, merges into `settingsJson.automation`

**Frontend** — New "Automation Triggers" section in `IntegrationsTab`:

- Teal Bell icon header card (max-width 560px)
- Three toggle rows: Re-engagement / Birthday Greeting / Pass Expiry Nudge
- Each toggle is a CSS-animated pill button; green = enabled, grey = disabled
- Clicking calls `updateAutomationSettings` mutation; shows toast on success/error
- Note: "Triggers only send to customers with marketing opt-in enabled"

Square OAuth and sync was already fully implemented in Phase 13 — `squareRouter.syncMenu`, `syncInventory`, `status`, `getOAuthUrl`, and `disconnect` are all present and working.

## Deviations from Plan

None — plan executed exactly as described.
