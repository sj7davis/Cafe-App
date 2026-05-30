---
phase: 14
plan: "01"
subsystem: automated-marketing
tags: [cron, email, sms, re-engagement, birthday, pass-expiry, automation]
requirements: [AUTO-01, AUTO-02, AUTO-03]
key-files:
  modified:
    - app/api/boot.ts
decisions:
  - Used node-cron (already imported) for daily scheduling
  - Default automation is ON per venue; owners opt-out via settingsJson.automation.*
  - Re-engagement queries customerAccounts (marketingOptIn=true) against orders table to detect 30-day inactivity
  - Pass expiry SMS only (no email) because subscriptionPasses only stores phone
  - Birthday cron at 9:30am (distinct from loyalty birthday at 9:00am to avoid double-run confusion)
metrics:
  completed: "2026-05-30"
---

# Phase 14 Plan 01: Automated Marketing Trigger Engine Summary

Three daily cron jobs added to `app/api/boot.ts` implementing AUTO-01 through AUTO-03:

**AUTO-01 — Re-engagement (10:00 AM daily)**
Finds `customerAccounts` with `marketingOptIn=true` for each active venue. Skips any customer who has an order in the last 30 days. Sends "we miss you" email (preferred) or SMS. Respects `venues.settingsJson.automation.reEngagement` (default: enabled).

**AUTO-02 — Birthday greeting (9:30 AM daily)**
Finds `customerAccounts` with `birthday === MM-DD` (today) and `marketingOptIn=true`, scoped per venue. Sends birthday email or SMS. Respects `venues.settingsJson.automation.birthday` (default: enabled). This is separate from the loyalty birthday bonus (9:00 AM).

**AUTO-03 — Pass expiry nudge (11:00 AM daily)**
Finds active `subscriptionPasses` with `remainingCredits === 1` per venue. Sends SMS to `pass.phone`. Respects `venues.settingsJson.automation.passExpiry` (default: enabled).

## Deviations from Plan

None — plan executed exactly as described. All three triggers implemented with venue-level opt-out flags and existing sendEmail/sendSms helpers.
