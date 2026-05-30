/**
 * B1 Platform — Email sending via Resend
 *
 * Pattern: SDK returns { data, error } — NEVER throws. Check error explicitly.
 * Idempotency: pass a key to prevent duplicate sends on retry.
 * From address: update FROM_ADDRESS once your domain is verified in Resend.
 */

import { Resend } from "resend";
import { env } from "./env";

// Update this once you verify a domain in your Resend account.
// Until then, onboarding@resend.dev only delivers to your Resend account email (sandbox).
const FROM_ADDRESS = "B1 Platform <onboarding@resend.dev>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!_resend) _resend = new Resend(env.resendApiKey);
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Idempotency key — prevents duplicate sends on retry. Format: `<event>/<entity-id>` */
  idempotencyKey?: string;
  /** Reply-to address (e.g. venue owner email for catering quotes) */
  replyTo?: string;
  /** Optional tags for analytics/filtering in Resend dashboard */
  tags?: { name: string; value: string }[];
}

/**
 * Send a transactional email via Resend.
 * Never throws — always returns { ok, emailId?, error? }.
 * Silently skips if RESEND_API_KEY is not configured (EMAIL-04).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{
  ok: boolean;
  emailId?: string;
  error?: string;
}> {
  const resend = getResend();
  if (!resend) {
    // EMAIL-04: gracefully skip when RESEND_API_KEY not configured
    return { ok: true };
  }

  const sendOpts: any = {
    from: FROM_ADDRESS,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    ...(opts.tags?.length ? { tags: opts.tags } : {}),
  };

  // idempotencyKey prevents duplicate sends when callers retry on timeout
  const idempotencyOpts = opts.idempotencyKey
    ? { idempotencyKey: opts.idempotencyKey }
    : undefined;

  const { data, error } = await resend.emails.send(sendOpts, idempotencyOpts);

  if (error) {
    // Log but never rethrow — callers (createOrder, webhooks) must not fail due to email errors
    console.error("[email] send failed:", error.message, {
      to: opts.to,
      subject: opts.subject,
      idempotencyKey: opts.idempotencyKey,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true, emailId: data?.id };
}

// ─── Convenience typed senders ────────────────────────────────────────────────
// Import templates only when needed (keeps module lightweight when email is unused).

export async function sendOrderConfirmation(p: {
  to: string;
  customerName: string;
  orderNumber: string;
  venueName: string;
  pickupTime: string;
  items: { name: string; quantity: number; unitPrice: string }[];
  totalAmount: string;
  orderStatusUrl: string;
  venueAddress?: string;
}) {
  const { orderConfirmation } = await import("./email-templates");
  const tpl = orderConfirmation(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `order-confirm/${p.orderNumber}`,
    tags: [{ name: "type", value: "order_confirmation" }],
  });
}

export async function sendNewOrderAlert(p: {
  to: string;
  ownerName: string;
  venueName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupTime: string;
  items: { name: string; quantity: number }[];
  totalAmount: string;
  dashboardUrl: string;
}) {
  const { newOrderAlert } = await import("./email-templates");
  const tpl = newOrderAlert(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `order-alert/${p.orderNumber}`,
    tags: [{ name: "type", value: "new_order_alert" }],
  });
}

export async function sendOrderReady(p: {
  to: string;
  customerName: string;
  orderNumber: string;
  venueName: string;
  venueAddress?: string;
}) {
  const { orderReady } = await import("./email-templates");
  const tpl = orderReady(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `order-ready/${p.orderNumber}`,
    tags: [{ name: "type", value: "order_ready" }],
  });
}

export async function sendReviewRequest(p: {
  to: string;
  customerName: string;
  venueName: string;
  orderNumber: string;
  reviewUrl: string;
}) {
  const { reviewRequest } = await import("./email-templates");
  const tpl = reviewRequest(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `review-request/${p.orderNumber}`,
    tags: [{ name: "type", value: "review_request" }],
  });
}

export async function sendGiftCardEmail(p: {
  to: string;
  recipientName?: string;
  senderName?: string;
  venueName: string;
  amount: string;
  code: string;
  venueUrl: string;
  message?: string;
}) {
  const { giftCard } = await import("./email-templates");
  const tpl = giftCard(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `gift-card/${p.code}`,
    tags: [{ name: "type", value: "gift_card" }],
  });
}

export async function sendBirthdayGreeting(p: {
  to: string;
  customerName: string;
  venueName: string;
  venueUrl: string;
  discountCode?: string;
  discountAmount?: string;
}) {
  const { birthdayGreeting } = await import("./email-templates");
  const tpl = birthdayGreeting(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `birthday/${p.to}/${new Date().getFullYear()}`,
    tags: [{ name: "type", value: "birthday" }],
  });
}

export async function sendReEngagement(p: {
  to: string;
  customerName: string;
  venueName: string;
  venueUrl: string;
  daysSinceLastOrder?: number;
  discountCode?: string;
  discountAmount?: string;
}) {
  const { reEngagement } = await import("./email-templates");
  const tpl = reEngagement(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    // Key includes month so it can re-send next month if still lapsed
    idempotencyKey: `re-engagement/${p.to}/${new Date().toISOString().slice(0, 7)}`,
    tags: [{ name: "type", value: "re_engagement" }],
  });
}

export async function sendPassExpiryNudge(p: {
  to: string;
  customerName: string;
  venueName: string;
  remainingCredits: number;
  venueUrl: string;
}) {
  const { passExpiryNudge } = await import("./email-templates");
  const tpl = passExpiryNudge(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `pass-expiry/${p.to}/${new Date().toISOString().slice(0, 10)}`,
    tags: [{ name: "type", value: "pass_expiry" }],
  });
}

export async function sendAbandonedCart(p: {
  to: string;
  customerName?: string;
  venueName: string;
  items: string[];
  venueUrl: string;
  cartId: string;
}) {
  const { abandonedCart } = await import("./email-templates");
  const tpl = abandonedCart(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `abandoned-cart/${p.cartId}`,
    tags: [{ name: "type", value: "abandoned_cart" }],
  });
}

export async function sendDailySummary(p: {
  to: string;
  ownerName: string;
  venueName: string;
  date: string;
  orderCount: number;
  completedCount: number;
  totalRevenue: string;
  topItems: { name: string; qty: number }[];
  dashboardUrl: string;
}) {
  const { dailySummary } = await import("./email-templates");
  const tpl = dailySummary(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    idempotencyKey: `daily-summary/${p.to}/${p.date}`,
    tags: [{ name: "type", value: "daily_summary" }],
  });
}

export async function sendCateringQuote(p: {
  to: string;
  customerName: string;
  venueName: string;
  eventDate: string;
  guestCount: number;
  quoteAmount?: string;
  message?: string;
  replyEmail: string;
}) {
  const { cateringQuote } = await import("./email-templates");
  const tpl = cateringQuote(p);
  return sendEmail({
    to: p.to,
    ...tpl,
    replyTo: p.replyEmail,
    tags: [{ name: "type", value: "catering_quote" }],
  });
}
