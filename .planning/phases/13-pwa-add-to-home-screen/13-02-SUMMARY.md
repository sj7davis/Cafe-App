---
phase: "13"
plan: "02"
subsystem: pwa
tags: [pwa, install-prompt, ux, deferred-prompt, ios]
dependency_graph:
  requires: [13-01]
  provides: [deferred-install-prompt]
  affects: [app/src/pages/VenuePublic.tsx]
tech_stack:
  added: []
  patterns: [deferred-beforeinstallprompt, localStorage-dismissal]
key_files:
  created: []
  modified: [app/src/pages/VenuePublic.tsx]
decisions:
  - Install prompt is deferred until after placedOrderNumber is set — Google PWA best practice
  - iOS does not support beforeinstallprompt; show Share > Add to Home Screen instruction instead
  - localStorage key pwa-install-dismissed prevents repeated prompting after user dismisses
  - Banner placed inside the post-checkout panel where order confirmation is shown
metrics:
  duration: "8 minutes"
  completed: "2026-05-30"
  tasks_completed: 1
  files_changed: 1
---

# Phase 13 Plan 02: Deferred Install Prompt Summary

PWA install banner added to VenuePublic, triggered after the customer places their first order — never on page load.

## What Was Done

1. Added state: `installPrompt` (stores the deferred `BeforeInstallPromptEvent`), `showInstallBanner`, `isIOS` (navigator.userAgent detection).
2. Added `beforeinstallprompt` event listener effect — calls `e.preventDefault()` to defer the prompt, stores it in state. Runs once on mount; no-op on iOS.
3. Added order-completion effect — watches `placedOrderNumber`. When an order is confirmed and the deferred prompt (or iOS flag) is available, sets `showInstallBanner = true`, unless the user has previously dismissed via `localStorage.getItem('pwa-install-dismissed')`.
4. Rendered install banner inside the `{placedOrderNumber ? ...}` post-checkout panel:
   - Non-iOS: "Add to Home Screen" button calls `installPrompt.prompt()` and awaits `userChoice`, then clears state. "Not now" sets `pwa-install-dismissed` in localStorage.
   - iOS: shows a text hint — "Tap Share > Add to Home Screen".

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — install banner does not open new network endpoints or auth paths.

## Self-Check: PASSED

- `VenuePublic.tsx` modified with install prompt logic
- TypeScript check passed (`npx tsc --noEmit` — no errors)
- Commit b381d7d verified in git log
