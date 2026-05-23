# Project State

## Current Phase
Not started — defining requirements for v1.1

## Status
Defining requirements

## Last Updated
2026-05-23 — Milestone v1.1 started

## Decisions
- v1.0 complete: app is standalone, deployable to Railway
- v1.1 builds all 12 suggested features across customer, staff, loyalty, and notification domains
- Email via Resend (simple API, good free tier)
- QR codes via qrcode npm package (lightweight, no external service)
- Auto-poll every 20s for staff order notifications (WebSocket overkill for MVP)
- Image upload via direct URL input first, S3/Cloudflare later

## Blockers
(none)

## Accumulated Context
- Stack: React 19 + Hono + tRPC + Drizzle + MySQL
- Auth: JWT (jose) — three token types: owner, staff, platform admin
- All tokens in localStorage, venue ID in x-venue-id header
- DB schema already has: customerPreferences, subscriptionPasses, giftCards, reviews, cateringRequests, loyaltyAccounts, locations tables
- Seed venue: b1-backhaus (slug), venueId determined after seed
