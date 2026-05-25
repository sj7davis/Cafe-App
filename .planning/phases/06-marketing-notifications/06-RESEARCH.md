# Phase 6: Marketing & Notifications - Research

**Researched:** 2026-05-25
**Domain:** QR code generation (client-side), transactional email (Resend), schema extension
**Confidence:** HIGH

## Summary

Phase 6 adds two independent features: a client-side QR code generator for the owner dashboard, and server-side transactional email via Resend. Neither requires a new DB table, but email does require one new column (`customerEmail` on the `orders` table) plus a Drizzle migration.

QR codes are generated entirely in the browser using the `qrcode` npm package's `toDataURL` method. This produces a base64 PNG data URL that can be rendered as an `<img>` and downloaded via a programmatic `<a href=download>` click. No server involvement, no redirect service, no internet required at scan time — the full URL is baked into the QR code.

Email is sent server-side via the `resend` npm package. Triggers are: (1) `createOrder` — send confirmation to customer and alert to venue owner; (2) `updateOrderStatus` to `completed` — send review request to customer. All sends are wrapped in a try/catch with a `RESEND_API_KEY` guard: if the key is absent, the email block is skipped silently. The server never throws on email failure.

**Primary recommendation:** Add `resend` and `qrcode` + `@types/qrcode` to `app/package.json`. Add `customerEmail` (nullable varchar 320) to the orders schema and generate a Drizzle migration. Extend `createOrder` and `updateOrderStatus` with non-throwing email side-effects via a shared `lib/email.ts` module.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QR-01 | Owner dashboard generates QR code linking to venue's public ordering page | `qrcode` toDataURL called with `https://domain.com/v/:slug`; rendered in IntegrationsTab |
| QR-02 | QR code is downloadable as PNG | `<a href={dataUrl} download="qr.png">` pattern; no server needed |
| QR-03 | QR code works offline — full URL encoded, no redirect | `qrcode.toDataURL(fullUrl)` bakes URL directly into QR matrix |
| EMAIL-01 | Customer receives order confirmation email after placing order | `resend.emails.send()` fired inside `createOrder`, guarded by RESEND_API_KEY check; requires customerEmail stored on order |
| EMAIL-02 | Venue owner receives email alert when new order placed | `resend.emails.send()` to owner email (looked up via venueOwners WHERE venueId); fired in same `createOrder` block |
| EMAIL-03 | Customer receives review request email when order marked completed | `resend.emails.send()` fired inside `updateOrderStatus` when new status is `completed`; requires customerEmail stored |
| EMAIL-04 | Email sending is configurable via RESEND_API_KEY and gracefully skipped if not set | `env.resendApiKey` optional field in env.ts; helper returns early when key is empty |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | 6.12.3 | Transactional email via Resend API | Official SDK; simple `new Resend(key).emails.send()` API; excellent TypeScript types |
| qrcode | 1.5.4 | QR code generation | Zero-dependency; produces data URLs client-side; maintained; used in thousands of projects |
| @types/qrcode | 1.5.6 | TypeScript types for qrcode | Needed since qrcode ships no bundled types |

### Supporting
None required — `crypto` (for order number generation) is already used; no additional packages needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| resend | nodemailer + SMTP | nodemailer needs SMTP credentials, more config; Resend is REST-based, simpler |
| qrcode | react-qrcode-logo | react-qrcode-logo is larger, adds logo support we don't need; qrcode is lighter |
| qrcode (toDataURL) | qrcode.react | qrcode.react is React-specific component, harder to trigger programmatic download |

**Installation:**
```bash
cd app && npm install resend qrcode @types/qrcode
```

**Version verification:** Verified against npm registry on 2026-05-25.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   ├── lib/
│   │   ├── env.ts          # Add resendApiKey field
│   │   └── email.ts        # NEW: Resend helper (sendEmail function)
│   └── venue-router.ts     # Extend createOrder + updateOrderStatus
├── db/
│   └── schema.ts           # Add customerEmail to orders table
└── src/
    └── pages/
        └── OwnerDashboard.tsx  # Extend IntegrationsTab with QR section
```

### Pattern 1: Resend Email Helper (lib/email.ts)

**What:** A single exported `sendEmail` function that guards on `RESEND_API_KEY`, wraps send in try/catch, and never throws. Called from within tRPC mutations.

**When to use:** Every email send in this phase. Centralises the guard so callers don't repeat it.

```typescript
// app/api/lib/email.ts
import { Resend } from "resend";
import { env } from "./env";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!env.resendApiKey) return;   // EMAIL-04: graceful skip
  try {
    const resend = new Resend(env.resendApiKey);
    await resend.emails.send({
      from: "B1 Platform <noreply@b1platform.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    // Never crash the server on email failure — log and continue
    console.error("[email] send failed:", err);
  }
}
```

### Pattern 2: QR Code Generation (client-side)

**What:** Call `QRCode.toDataURL(url)` in a `useEffect` or button handler; store result in state; render as `<img>`; download via programmatic anchor click.

```typescript
// In IntegrationsTab — QR section
import QRCode from "qrcode";

const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

useEffect(() => {
  if (!venue?.slug) return;
  const url = `${window.location.origin}/v/${venue.slug}`;
  QRCode.toDataURL(url, { width: 300, margin: 2 })
    .then(setQrDataUrl)
    .catch(console.error);
}, [venue?.slug]);

// Download handler
function handleDownload() {
  if (!qrDataUrl) return;
  const a = document.createElement("a");
  a.href = qrDataUrl;
  a.download = `${venue.slug}-qr.png`;
  a.click();
}
```

### Pattern 3: env.ts Extension

**What:** Add optional `resendApiKey` to env.ts. Use `process.env.RESEND_API_KEY || ""` — no `required()` call, so missing key returns empty string (not a throw).

```typescript
// app/api/lib/env.ts addition
resendApiKey: process.env.RESEND_API_KEY || "",
```

### Pattern 4: Schema Extension (customerEmail on orders)

**What:** Add nullable `customerEmail` varchar(320) to the orders table. Existing orders are unaffected (NULL). New orders optionally store the email if the customer provides one at checkout.

```typescript
// app/db/schema.ts — inside orders table definition
customerEmail: varchar("customer_email", { length: 320 }),
```

After editing schema.ts, run:
```bash
cd app && npm run db:generate
```
This creates a new migration file. Then apply with:
```bash
npm run db:migrate
```

### Pattern 5: Email in createOrder

After inserting the order and order items, look up the owner's email from `venueOwners` and fire two sends. Both are non-blocking (no `await`-and-fail propagation):

```typescript
// After order + items inserted, near end of createOrder
const ownerResults = await db
  .select({ email: venueOwners.email, name: venueOwners.name })
  .from(venueOwners)
  .where(eq(venueOwners.venueId, input.venueId))
  .limit(1);
const ownerEmail = ownerResults[0]?.email;

// EMAIL-01: customer confirmation (only if email provided)
if (input.customerEmail) {
  sendEmail({
    to: input.customerEmail,
    subject: `Order confirmed — ${orderNumber}`,
    html: buildOrderConfirmationHtml({ orderNumber, customerName: input.customerName, pickupTime: input.pickupTime, items: itemDetails }),
  });
}

// EMAIL-02: owner alert (always attempt if owner email found)
if (ownerEmail) {
  sendEmail({
    to: ownerEmail,
    subject: `New order — ${orderNumber}`,
    html: buildNewOrderAlertHtml({ orderNumber, customerName: input.customerName, pickupTime: input.pickupTime, totalAmount }),
  });
}
```

### Pattern 6: Email in updateOrderStatus

After updating status to `completed`, look up order row for customerEmail and send review request:

```typescript
// In updateOrderStatus, after db.update(orders)...
if (input.status === "completed") {
  const updatedOrder = await db
    .select({ customerEmail: orders.customerEmail, customerName: orders.customerName,
               orderNumber: orders.orderNumber, id: orders.id })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  const o = updatedOrder[0];
  if (o?.customerEmail) {
    const reviewUrl = `${process.env.APP_URL || "https://b1platform.com"}/review/${o.id}`;
    sendEmail({
      to: o.customerEmail,
      subject: "How was your order?",
      html: buildReviewRequestHtml({ customerName: o.customerName, orderNumber: o.orderNumber, reviewUrl }),
    });
  }
}
```

### Anti-Patterns to Avoid
- **Throwing on email failure:** Never `throw` from within `sendEmail`. Order creation must succeed even when email fails.
- **Requiring customerEmail:** The field is optional at checkout. Many customers won't have email set.
- **Client-side email sending:** All Resend calls happen server-side in tRPC mutations. The API key must never reach the browser.
- **Using a redirect service for QR:** The URL must be encoded directly in the QR code (QR-03).
- **Making RESEND_API_KEY required:** env.ts already `throw`s for missing required vars in production. Use `|| ""` not `required()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code PNG generation | Manual QR matrix calculation | `qrcode` npm package | Reed-Solomon error correction, masking, and format versions are complex; qrcode handles all of it |
| Email HTML rendering | Full template engine | Inline HTML strings | Simple transactional emails with inline styles are sufficient; no template engine overhead |
| Email deliverability | Direct SMTP | Resend | SPF/DKIM/DMARC handled by Resend's sending infrastructure |

## Common Pitfalls

### Pitfall 1: RESEND_API_KEY treated as required
**What goes wrong:** If env.ts uses `required("RESEND_API_KEY")`, the server crashes on startup in any environment without the key configured.
**Why it happens:** Cargo-culting the pattern used for DATABASE_URL.
**How to avoid:** Use `process.env.RESEND_API_KEY || ""` (no `required()` call). The empty string is falsy, so the `if (!env.resendApiKey)` guard in `sendEmail` fires and skips the send.
**Warning signs:** Server crash on startup with "Missing required environment variable: RESEND_API_KEY".

### Pitfall 2: Email failure propagates as tRPC error
**What goes wrong:** `await resend.emails.send(...)` throws a network/auth error; the tRPC mutation rejects; the customer sees "Order failed" even though the order was created.
**Why it happens:** Forgetting to wrap the send in try/catch.
**How to avoid:** All Resend calls inside `sendEmail` helper are wrapped in try/catch that logs and returns. Callers use fire-and-forget (don't await propagation of the error).

### Pitfall 3: QR code generated before venue slug is available
**What goes wrong:** `QRCode.toDataURL` called with undefined/empty URL produces an invalid or empty QR code.
**Why it happens:** `useEffect` runs before async venue data resolves, or venue prop is null.
**How to avoid:** Guard with `if (!venue?.slug) return;` inside the effect. The `venue` prop in `IntegrationsTab` must flow from the dashboard's `venue` state.

### Pitfall 4: customerEmail not in createOrder input
**What goes wrong:** EMAIL-01 and EMAIL-03 can never work because there's no email address stored against orders.
**Why it happens:** Orders schema only has customerPhone. Forgetting to add the column and migrate.
**How to avoid:** Add `customerEmail: varchar("customer_email", { length: 320 })` to schema, generate and apply migration, add optional `customerEmail` to createOrder input and to the db.insert values.

### Pitfall 5: IntegrationsTab doesn't receive venue prop
**What goes wrong:** QR code has no slug to encode.
**Why it happens:** `IntegrationsTab` currently takes no props — it reads Square status independently.
**How to avoid:** Pass `venue` as a prop to `IntegrationsTab`. OwnerDashboard already has `venue` in scope.

### Pitfall 6: Download filename missing slug
**What goes wrong:** All downloaded QR files called "qr.png" — confusing for multi-venue operators.
**How to avoid:** Use `a.download = \`${venue.slug}-qr.png\`` for a descriptive filename.

## Code Examples

### QR Code toDataURL (verified: qrcode v1.5.4 API)
```typescript
import QRCode from "qrcode";

QRCode.toDataURL("https://example.com/v/my-cafe", { width: 300, margin: 2 })
  .then((dataUrl: string) => {
    // dataUrl is "data:image/png;base64,..."
    setQrDataUrl(dataUrl);
  });
```

### Resend send (verified: resend v6.x API)
```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: "Sender <noreply@example.com>",
  to: "customer@example.com",
  subject: "Your order",
  html: "<p>Order confirmed</p>",
});
```

### PNG Download from Data URL
```typescript
function downloadQr(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nodemailer + SMTP | Resend REST API | 2022+ | No SMTP config, better deliverability |
| QR server-side PNG generation | Client-side data URL via qrcode | Evergreen | No server round-trip, works offline |

## Open Questions

1. **APP_URL for review links in EMAIL-03**
   - What we know: The review URL must be absolute (`/review/:orderId` won't work in email clients)
   - What's unclear: Is there an `APP_URL` env var, or should we derive from the request?
   - Recommendation: Add `appUrl: process.env.APP_URL || "https://b1platform.com"` to env.ts; executor can adjust as needed.

2. **From address domain**
   - What we know: Resend requires a verified sending domain
   - What's unclear: Whether the team has verified a domain with Resend
   - Recommendation: Use `noreply@b1platform.com` as the from address in the plan; executor should update to the verified domain if different.

## Validation Architecture

No automated test framework is configured for this project (no jest.config, vitest.config, or test/ directory found). Validation is manual TypeScript compilation + build check.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | None |
| Quick run command | `npm run typecheck` (in app/) |
| Full suite command | `npm run build` (in app/) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QR-01 | QR code renders in IntegrationsTab | manual | grep QRCode app/src/pages/OwnerDashboard.tsx | ❌ |
| QR-02 | Download button produces PNG file | manual | - | ❌ |
| QR-03 | QR encodes full URL | manual (scan with phone) | - | ❌ |
| EMAIL-01 | Customer confirmation email sent | manual (check inbox) | - | ❌ |
| EMAIL-02 | Owner alert email sent | manual (check inbox) | - | ❌ |
| EMAIL-03 | Review request email sent on completion | manual (check inbox) | - | ❌ |
| EMAIL-04 | No crash when RESEND_API_KEY absent | automated | npm run build (no throws) | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `app/api/lib/env.ts` must NOT use `required("RESEND_API_KEY")` — verify after Plan 01

## Sources

### Primary (HIGH confidence)
- npm registry (npm view resend version, npm view qrcode version) — verified 2026-05-25
- resend SDK GitHub (oficial) — `new Resend(key).emails.send({from, to, subject, html})`
- qrcode npm package README — `QRCode.toDataURL(url, opts)` returns Promise<string>

### Secondary (MEDIUM confidence)
- Project schema.ts — direct inspection confirmed no customerEmail column on orders
- venue-router.ts — direct inspection confirmed createOrder/updateOrderStatus mutation shapes
- OwnerDashboard.tsx — direct inspection confirmed IntegrationsTab component and venue state availability

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified
- Architecture: HIGH — patterns derived from direct source inspection
- Pitfalls: HIGH — schema gap (no customerEmail) discovered by direct inspection; env pattern derived from existing env.ts

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable libraries, slow-moving)
