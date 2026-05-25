---
phase: 06-marketing-notifications
plan: 03
subsystem: ui
tags: [react, qrcode, lucide-react, typescript, trpc]

# Dependency graph
requires:
  - phase: 06-marketing-notifications/06-01
    provides: qrcode npm package already installed, createOrder tRPC mutation with customerEmail field wired server-side
  - phase: 06-marketing-notifications/06-02
    provides: server-side email sending via Resend; createOrder accepts customerEmail param
provides:
  - QR code generator in IntegrationsTab with download button (owner-facing)
  - Optional email input at checkout in VenuePublic with customerEmail passed to createOrder mutation
affects: [06-marketing-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useEffect for async QRCode.toDataURL generation with [venue?.slug] dependency array
    - Programmatic anchor click for file download (data URL pattern)
    - checkoutEmail || undefined coercion to avoid sending empty string to email validator

key-files:
  created: []
  modified:
    - app/src/pages/OwnerDashboard.tsx
    - app/src/pages/VenuePublic.tsx

key-decisions:
  - "IntegrationsTab accepts venue as { slug, name } | null — minimal prop type matching only fields needed"
  - "QRCode.toDataURL called inside useEffect with [venue?.slug] dependency — not in render body"
  - "Download handler creates anchor element programmatically and calls .click() — no DOM ref needed"
  - "checkoutEmail || undefined coercion ensures empty string is not passed to server z.string().email() validator"
  - "Email input added between phone and pickup time fields — natural contact info grouping"

patterns-established:
  - "useEffect + async QRCode.toDataURL pattern for QR generation in React"
  - "Programmatic <a download> pattern for data URL file downloads"

requirements-completed: [QR-01, QR-02, QR-03, EMAIL-01]

# Metrics
duration: 8min
completed: 2026-05-25
---

# Phase 06 Plan 03: QR Code Generator and Checkout Email Summary

**QR code generator in IntegrationsTab (via qrcode library) and optional email input at VenuePublic checkout — both wired end-to-end to complete Phase 6 UI features**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-25T01:45:00Z
- **Completed:** 2026-05-25T01:53:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- IntegrationsTab now accepts venue prop and generates QR code via `QRCode.toDataURL` pointing to `window.location.origin/v/:slug`
- QR image rendered as `<img>` with Download PNG button that triggers programmatic anchor download, filename `{slug}-qr.png`
- VenuePublic checkout form has optional email input (type=email) labelled clearly as optional for order confirmation
- `customerEmail: checkoutEmail || undefined` passed to createOrder.mutate — empty string coerced to undefined to avoid server-side validation failure
- Build succeeds with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add QR code generator to IntegrationsTab in OwnerDashboard.tsx** - `3043869` (feat)
2. **Task 2: Add optional email field to checkout form in VenuePublic.tsx** - `26d3094` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/src/pages/OwnerDashboard.tsx` - Added QRCode import, QrCode/Download lucide icons, venue prop on IntegrationsTab, useEffect QR generation, download handler, QR code JSX block
- `app/src/pages/VenuePublic.tsx` - Added checkoutEmail state, email input field after phone, customerEmail in createOrder.mutate

## Decisions Made
- Used minimal prop type `{ slug: string; name: string } | null` for IntegrationsTab — sufficient since only `slug` is needed for QR URL and download filename
- QRCode.toDataURL called inside useEffect with `[venue?.slug]` dependency array to prevent regeneration on unrelated re-renders
- Email input placed between phone number and pickup time — natural grouping with other contact info fields
- `checkoutEmail || undefined` coercion used (not explicit `.trim()` check) per plan instruction — consistent with existing pattern for optional fields

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. RESEND_API_KEY must be set in production for email delivery to function (documented in Phase 06-01 setup).

## Next Phase Readiness
- Phase 6 UI features complete: QR code generator and checkout email field are both wired to their respective backend procedures from Plans 01 and 02
- All QR requirements (QR-01, QR-02, QR-03) and EMAIL-01 satisfied
- Manual verification needed: scan QR code with phone to confirm it lands on /v/:slug; place order with email to confirm Resend delivery (requires RESEND_API_KEY)

---
*Phase: 06-marketing-notifications*
*Completed: 2026-05-25*
