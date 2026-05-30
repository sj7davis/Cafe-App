---
phase: "13"
plan: "01"
subsystem: pwa
tags: [pwa, vite, service-worker, manifest, workbox]
dependency_graph:
  requires: []
  provides: [pwa-manifest, service-worker, offline-cache]
  affects: [app/vite.config.ts, app/index.html, app/public/]
tech_stack:
  added: [vite-plugin-pwa@1.3.0]
  patterns: [workbox-runtime-caching, pwa-manifest]
key_files:
  created: [app/public/icon-192.png, app/public/icon-512.png]
  modified: [app/vite.config.ts, app/index.html, app/package.json]
decisions:
  - vite-plugin-pwa 1.3.0 is the latest version and supports Vite 6.x
  - navigateFallback set to null — multi-page app, don't intercept navigation
  - /api/ and /trpc/ routes are NetworkOnly — never cached by service worker
  - Venue public pages (/v/:slug) use StaleWhileRevalidate with 5-minute TTL
  - icon-192.png and icon-512.png are minimal 1px placeholders — real branded icons must be added
metrics:
  duration: "10 minutes"
  completed: "2026-05-30"
  tasks_completed: 1
  files_changed: 5
---

# Phase 13 Plan 01: PWA Manifest + Workbox Configuration Summary

vite-plugin-pwa installed and configured with B1 Order manifest, Workbox NetworkOnly rules for API routes, and iOS meta tags.

## What Was Done

1. Installed `vite-plugin-pwa@1.3.0` (compatible with Vite 6.3.5).
2. Updated `app/vite.config.ts` to include VitePWA plugin with:
   - Web App Manifest: name "B1 Platform — Order", `standalone` display, teal theme color `#F8F6F2`
   - Workbox runtime caching: `NetworkOnly` for `/api/` and `/trpc/`, `StaleWhileRevalidate` (5 min TTL) for `/v/:slug` venue pages
   - `navigateFallback: null` — prevents service worker from intercepting multi-page navigation
3. Created minimal PNG placeholders at `app/public/icon-192.png` and `app/public/icon-512.png`.
4. Updated `app/index.html`:
   - Linked `manifest.webmanifest` (generated at build time by the plugin)
   - Added `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
   - Added `apple-touch-icon` pointing to `/icon-192.png`

## Known Stubs

| File | Item | Reason |
|------|------|--------|
| `app/public/icon-192.png` | 1x1 px placeholder | Real branded 192x192 icon must be created and placed here |
| `app/public/icon-512.png` | 1x1 px placeholder | Real branded 512x512 icon must be created and placed here |

Real icons are required for the PWA to pass Lighthouse PWA audit and for store listings.

## Deviations from Plan

None — plan executed exactly as written. `theme_color` in manifest uses `#F8F6F2` (background cream) as specified; `app/index.html` already had some iOS tags that were replaced with the correct set.

## Self-Check: PASSED

- `app/vite.config.ts` updated with VitePWA plugin
- `app/index.html` updated with iOS meta tags
- `app/public/icon-192.png` and `icon-512.png` created
- Commit f57b1dd verified in git log
