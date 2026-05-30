/**
 * B1 Platform — Branded Email Templates
 * Table-based HTML, inline styles, mobile-responsive.
 * All templates accept typed props and return { subject, html, text }.
 */

// ─── Shared design tokens ─────────────────────────────────────────────────────
const T = {
  bg: '#F8F6F2',
  surface: '#FFFFFF',
  border: '#E4E4E7',
  accent: '#5E8B8B',
  accentDark: '#4a7070',
  text: '#09090B',
  muted: '#71717A',
  font: 'Inter, -apple-system, Arial, Helvetica, sans-serif',
};

// ─── Shell wrapper ────────────────────────────────────────────────────────────
function shell(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>B1 Platform</title>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:${T.bg};font-family:${T.font};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.bg}">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${T.text};border-radius:10px;padding:8px 14px;">
                    <span style="font-family:${T.font};font-size:15px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;">B1</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${T.surface};border-radius:12px;border:1px solid ${T.border};padding:36px 36px 28px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="font-family:${T.font};font-size:12px;color:${T.muted};margin:0;line-height:1.6;">
                Powered by <a href="https://b1platform.com" style="color:${T.accent};text-decoration:none;">B1 Platform</a> &middot;
                This email was sent because you interacted with a B1 venue.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:${T.font};font-size:22px;font-weight:700;color:${T.text};margin:0 0 8px;letter-spacing:-0.03em;line-height:1.2;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<p style="font-family:${T.font};font-size:14px;color:${T.muted};margin:0 0 24px;line-height:1.5;">${text}</p>`;
}

function para(text: string, mt = 0): string {
  return `<p style="font-family:${T.font};font-size:15px;color:${T.text};margin:${mt}px 0 0;line-height:1.65;">${text}</p>`;
}

function btn(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr>
      <td style="background-color:${T.accent};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${T.font};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="border-top:1px solid ${T.border};font-size:0;">&nbsp;</td></tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="font-family:${T.font};font-size:13px;color:${T.muted};padding:8px 0 8px;border-bottom:1px solid ${T.border};width:40%;">${label}</td>
    <td style="font-family:${T.font};font-size:13px;color:${T.text};font-weight:600;padding:8px 0 8px;border-bottom:1px solid ${T.border};">${value}</td>
  </tr>`;
}

function itemRow(name: string, qty: number, price?: string): string {
  return `<tr>
    <td style="font-family:${T.font};font-size:13px;color:${T.text};padding:8px 0;border-bottom:1px solid ${T.border};">${name}</td>
    <td align="right" style="font-family:${T.font};font-size:13px;color:${T.muted};padding:8px 0;border-bottom:1px solid ${T.border};">×${qty}${price ? ` <span style="color:${T.text};font-weight:600;margin-left:8px;">$${price}</span>` : ''}</td>
  </tr>`;
}

// ─── 1. Order Confirmation (customer) ─────────────────────────────────────────
export function orderConfirmation(p: {
  customerName: string;
  orderNumber: string;
  venueName: string;
  pickupTime: string;
  items: { name: string; quantity: number; unitPrice: string }[];
  totalAmount: string;
  orderStatusUrl: string;
  venueAddress?: string;
}) {
  const itemRows = p.items.map(i => itemRow(i.name, i.quantity, i.unitPrice)).join('');
  const content = `
    ${heading(`Order confirmed ✓`)}
    ${subheading(`Thanks, ${p.customerName}! Your order at ${p.venueName} is confirmed.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${infoRow('Order number', p.orderNumber)}
      ${infoRow('Pickup time', p.pickupTime)}
      ${p.venueAddress ? infoRow('Location', p.venueAddress) : ''}
    </table>
    ${divider()}
    <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Your order</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${itemRows}
      <tr>
        <td style="font-family:${T.font};font-size:14px;font-weight:700;color:${T.text};padding-top:12px;">Total</td>
        <td align="right" style="font-family:${T.font};font-size:14px;font-weight:700;color:${T.accent};padding-top:12px;">$${p.totalAmount}</td>
      </tr>
    </table>
    ${btn('Track Your Order', p.orderStatusUrl)}
  `;

  return {
    subject: `Order confirmed — ${p.orderNumber} at ${p.venueName}`,
    html: shell(content, `Your order ${p.orderNumber} is confirmed — pick up at ${p.pickupTime}`),
    text: `Order confirmed!\n\nHi ${p.customerName},\n\nYour order ${p.orderNumber} at ${p.venueName} is confirmed.\nPickup: ${p.pickupTime}\n\nItems: ${p.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}\nTotal: $${p.totalAmount}\n\nTrack: ${p.orderStatusUrl}`,
  };
}

// ─── 2. New Order Alert (owner) ───────────────────────────────────────────────
export function newOrderAlert(p: {
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
  const itemList = p.items.map(i => `${i.name} ×${i.quantity}`).join('<br>');
  const content = `
    ${heading(`New order — ${p.orderNumber}`)}
    ${subheading(`A new order just came in at ${p.venueName}.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${infoRow('Customer', p.customerName)}
      ${infoRow('Phone', p.customerPhone)}
      ${infoRow('Pickup', p.pickupTime)}
      ${infoRow('Total', `$${p.totalAmount}`)}
    </table>
    ${divider()}
    <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Items</p>
    <p style="font-family:${T.font};font-size:14px;color:${T.text};margin:0;line-height:1.7;">${itemList}</p>
    ${btn('View in Dashboard', p.dashboardUrl)}
  `;

  return {
    subject: `New order #${p.orderNumber} — ${p.venueName}`,
    html: shell(content, `${p.customerName} placed an order — pick up at ${p.pickupTime}`),
    text: `New order!\n\n${p.customerName} ordered at ${p.venueName}.\nOrder: ${p.orderNumber}\nPickup: ${p.pickupTime}\nTotal: $${p.totalAmount}\n\nItems: ${p.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}\n\nDashboard: ${p.dashboardUrl}`,
  };
}

// ─── 3. Order Ready ───────────────────────────────────────────────────────────
export function orderReady(p: {
  customerName: string;
  orderNumber: string;
  venueName: string;
  venueAddress?: string;
}) {
  const content = `
    ${heading(`Your order is ready! ☕`)}
    ${subheading(`Come and collect your order — it's waiting for you.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${infoRow('Order number', p.orderNumber)}
      ${infoRow('Venue', p.venueName)}
      ${p.venueAddress ? infoRow('Address', p.venueAddress) : ''}
    </table>
    ${para(`See you soon, ${p.customerName}! ☕`, 24)}
  `;

  return {
    subject: `Your order is ready — ${p.venueName}`,
    html: shell(content, `${p.orderNumber} is ready for collection`),
    text: `Your order is ready!\n\nHi ${p.customerName},\n\nYour order ${p.orderNumber} at ${p.venueName} is ready for collection.\n\nSee you soon!`,
  };
}

// ─── 4. Review Request ────────────────────────────────────────────────────────
export function reviewRequest(p: {
  customerName: string;
  venueName: string;
  orderNumber: string;
  reviewUrl: string;
}) {
  const stars = `<span style="font-size:22px;letter-spacing:4px;">★★★★★</span>`;
  const content = `
    ${heading(`How was your visit?`)}
    ${subheading(`We'd love to know what you thought of ${p.venueName}.`)}
    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0;">
      <tr><td align="center">${stars}</td></tr>
    </table>
    ${para(`Your feedback helps ${p.venueName} improve and helps other customers know what to expect.`, 20)}
    ${btn('Leave a Review', p.reviewUrl)}
    ${para(`Takes 30 seconds. We appreciate it!`, 16)}
  `;

  return {
    subject: `How was your order at ${p.venueName}?`,
    html: shell(content, `Share your experience — takes 30 seconds`),
    text: `How was your visit?\n\nHi ${p.customerName},\n\nWe'd love to know what you thought of your recent order at ${p.venueName}.\n\nLeave a review: ${p.reviewUrl}\n\nThanks!`,
  };
}

// ─── 5. Gift Card ─────────────────────────────────────────────────────────────
export function giftCard(p: {
  recipientName?: string;
  senderName?: string;
  venueName: string;
  amount: string;
  code: string;
  venueUrl: string;
  message?: string;
}) {
  const recipient = p.recipientName || 'there';
  const content = `
    ${heading(`You've received a gift card! 🎁`)}
    ${subheading(`${p.senderName ? `${p.senderName} sent you` : 'Someone sent you'} a $${p.amount} gift card for ${p.venueName}.`)}
    ${p.message ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td style="background-color:${T.bg};border-radius:8px;border-left:3px solid ${T.accent};padding:14px 16px;"><p style="font-family:${T.font};font-size:14px;color:${T.text};margin:0;font-style:italic;">"${p.message}"</p></td></tr></table>` : ''}
    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 24px;">
      <tr>
        <td style="background-color:${T.bg};border:2px dashed ${T.accent};border-radius:10px;padding:18px 32px;text-align:center;">
          <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">Your code</p>
          <p style="font-family:monospace;font-size:22px;font-weight:700;color:${T.text};letter-spacing:0.12em;margin:0;">${p.code}</p>
          <p style="font-family:${T.font};font-size:13px;color:${T.accent};font-weight:600;margin:6px 0 0;">$${p.amount} value</p>
        </td>
      </tr>
    </table>
    ${para(`Enter this code at checkout on ${p.venueName}'s ordering page.`)}
    ${btn(`Order at ${p.venueName}`, p.venueUrl)}
  `;

  return {
    subject: `🎁 You've received a $${p.amount} gift card for ${p.venueName}!`,
    html: shell(content, `$${p.amount} gift card inside — code: ${p.code}`),
    text: `You've got a gift card!\n\nHi ${recipient},\n\nYou've received a $${p.amount} gift card for ${p.venueName}.\n\nYour code: ${p.code}\n\nUse it at: ${p.venueUrl}`,
  };
}

// ─── 6. Birthday Greeting ─────────────────────────────────────────────────────
export function birthdayGreeting(p: {
  customerName: string;
  venueName: string;
  venueUrl: string;
  discountCode?: string;
  discountAmount?: string;
}) {
  const content = `
    ${heading(`Happy Birthday, ${p.customerName}! 🎂`)}
    ${subheading(`The team at ${p.venueName} is wishing you a wonderful day.`)}
    ${p.discountCode && p.discountAmount ? `
    <p style="font-family:${T.font};font-size:15px;color:${T.text};margin:0 0 16px;line-height:1.6;">
      To celebrate, here's a <strong>$${p.discountAmount} off</strong> your next order — our treat! 🎉
    </p>
    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 24px;">
      <tr>
        <td style="background-color:${T.bg};border:2px dashed ${T.accent};border-radius:10px;padding:16px 28px;text-align:center;">
          <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">Your birthday code</p>
          <p style="font-family:monospace;font-size:20px;font-weight:700;color:${T.text};letter-spacing:0.1em;margin:0;">${p.discountCode}</p>
        </td>
      </tr>
    </table>
    ` : `${para(`Come in and celebrate with us — coffee is always better on your birthday. ☕`, 0)}`}
    ${btn('Order Now', p.venueUrl)}
  `;

  return {
    subject: `Happy Birthday from ${p.venueName}! 🎂`,
    html: shell(content, `Wishing you a brilliant birthday!`),
    text: `Happy Birthday, ${p.customerName}!\n\nThe team at ${p.venueName} wishes you a wonderful day.\n${p.discountCode ? `\nUse code ${p.discountCode} for $${p.discountAmount} off your next order.\n` : ''}\nOrder: ${p.venueUrl}`,
  };
}

// ─── 7. Re-engagement ────────────────────────────────────────────────────────
export function reEngagement(p: {
  customerName: string;
  venueName: string;
  venueUrl: string;
  daysSinceLastOrder?: number;
  discountCode?: string;
  discountAmount?: string;
}) {
  const days = p.daysSinceLastOrder ?? 30;
  const content = `
    ${heading(`We miss you, ${p.customerName}! ☕`)}
    ${subheading(`It's been a while since your last visit to ${p.venueName}.`)}
    ${para(`It's been${days > 0 ? ` over ${days} days` : ' a while'} — we'd love to see you again. Your next coffee is waiting.`)}
    ${p.discountCode && p.discountAmount ? `
    ${divider()}
    <p style="font-family:${T.font};font-size:15px;color:${T.text};margin:0 0 16px;">Here's a little something to welcome you back:</p>
    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr>
        <td style="background-color:${T.bg};border:2px dashed ${T.accent};border-radius:10px;padding:16px 28px;text-align:center;">
          <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">$${p.discountAmount} off your next order</p>
          <p style="font-family:monospace;font-size:20px;font-weight:700;color:${T.text};letter-spacing:0.1em;margin:0;">${p.discountCode}</p>
        </td>
      </tr>
    </table>
    ` : ''}
    ${btn('Order Now', p.venueUrl)}
  `;

  return {
    subject: `We miss you at ${p.venueName}! ☕`,
    html: shell(content, `Come back — your coffee is waiting`),
    text: `We miss you!\n\nHi ${p.customerName},\n\nIt's been a while since your last visit to ${p.venueName}. We'd love to see you again!\n${p.discountCode ? `\nUse code ${p.discountCode} for $${p.discountAmount} off.\n` : ''}\nOrder: ${p.venueUrl}`,
  };
}

// ─── 8. Pass Expiry Nudge ────────────────────────────────────────────────────
export function passExpiryNudge(p: {
  customerName: string;
  venueName: string;
  remainingCredits: number;
  venueUrl: string;
}) {
  const content = `
    ${heading(`1 coffee left on your pass`)}
    ${subheading(`Don't let your ${p.venueName} coffee pass go to waste.`)}
    ${para(`You have <strong>${p.remainingCredits} credit</strong> remaining on your coffee pass. Use it before it expires, then top up for more.`)}
    ${btn('Use My Credit Now', p.venueUrl)}
    ${para(`Already finished? You can buy a new pass from the ordering page.`, 16)}
  `;

  return {
    subject: `1 coffee left on your ${p.venueName} pass`,
    html: shell(content, `${p.remainingCredits} credit remaining — use it before it expires`),
    text: `Your pass is almost empty!\n\nHi ${p.customerName},\n\nYou have ${p.remainingCredits} credit left on your ${p.venueName} coffee pass. Use it soon!\n\nOrder: ${p.venueUrl}`,
  };
}

// ─── 9. Abandoned Cart ───────────────────────────────────────────────────────
export function abandonedCart(p: {
  customerName?: string;
  venueName: string;
  items: string[];
  venueUrl: string;
}) {
  const itemList = p.items.slice(0, 3).map(i => `<li style="font-family:${T.font};font-size:14px;color:${T.text};padding:4px 0;">${i}</li>`).join('');
  const more = p.items.length > 3 ? `<li style="font-family:${T.font};font-size:13px;color:${T.muted};padding:4px 0;">+ ${p.items.length - 3} more</li>` : '';
  const content = `
    ${heading(`You left something behind ☕`)}
    ${subheading(`Your cart at ${p.venueName} is still waiting.`)}
    <ul style="margin:0 0 20px;padding-left:20px;">
      ${itemList}${more}
    </ul>
    ${para(`Ready when you are. Just pick up where you left off.`)}
    ${btn('Complete Your Order', p.venueUrl)}
  `;

  return {
    subject: `You left something behind at ${p.venueName}!`,
    html: shell(content, `Your cart is still waiting — complete your order`),
    text: `You left your cart!\n\n${p.customerName ? `Hi ${p.customerName},\n\n` : ''}Your cart at ${p.venueName} still has items.\n\nItems: ${p.items.join(', ')}\n\nComplete your order: ${p.venueUrl}`,
  };
}

// ─── 10. Daily Summary (owner) ───────────────────────────────────────────────
export function dailySummary(p: {
  ownerName: string;
  venueName: string;
  date: string;
  orderCount: number;
  completedCount: number;
  totalRevenue: string;
  topItems: { name: string; qty: number }[];
  dashboardUrl: string;
}) {
  const topItemRows = p.topItems.slice(0, 5).map((item, i) =>
    `<tr><td style="font-family:${T.font};font-size:13px;color:${T.text};padding:6px 0;border-bottom:1px solid ${T.border};">${i + 1}. ${item.name}</td><td align="right" style="font-family:${T.font};font-size:13px;color:${T.muted};padding:6px 0;border-bottom:1px solid ${T.border};">${item.qty} sold</td></tr>`
  ).join('');

  const content = `
    ${heading(`Daily Summary`)}
    ${subheading(`${p.venueName} — ${p.date}`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td width="33%" align="center" style="background-color:${T.bg};border-radius:8px;padding:16px 8px;text-align:center;">
          <p style="font-family:${T.font};font-size:24px;font-weight:700;color:${T.accent};margin:0;letter-spacing:-0.03em;">${p.orderCount}</p>
          <p style="font-family:${T.font};font-size:11px;color:${T.muted};margin:4px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Orders</p>
        </td>
        <td width="4%"></td>
        <td width="33%" align="center" style="background-color:${T.bg};border-radius:8px;padding:16px 8px;text-align:center;">
          <p style="font-family:${T.font};font-size:24px;font-weight:700;color:#059669;margin:0;letter-spacing:-0.03em;">${p.completedCount}</p>
          <p style="font-family:${T.font};font-size:11px;color:${T.muted};margin:4px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Completed</p>
        </td>
        <td width="4%"></td>
        <td width="33%" align="center" style="background-color:${T.bg};border-radius:8px;padding:16px 8px;text-align:center;">
          <p style="font-family:${T.font};font-size:24px;font-weight:700;color:#7C3AED;margin:0;letter-spacing:-0.03em;">$${p.totalRevenue}</p>
          <p style="font-family:${T.font};font-size:11px;color:${T.muted};margin:4px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Revenue</p>
        </td>
      </tr>
    </table>
    ${p.topItems.length > 0 ? `
    <p style="font-family:${T.font};font-size:11px;font-weight:700;color:${T.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Top Items Today</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      ${topItemRows}
    </table>` : ''}
    ${btn('View Dashboard', p.dashboardUrl)}
  `;

  return {
    subject: `${p.venueName} — Daily Summary ${p.date}`,
    html: shell(content, `${p.orderCount} orders · $${p.totalRevenue} revenue`),
    text: `Daily Summary — ${p.venueName} — ${p.date}\n\nOrders: ${p.orderCount}\nCompleted: ${p.completedCount}\nRevenue: $${p.totalRevenue}\n\nTop items:\n${p.topItems.map((i, n) => `${n + 1}. ${i.name} (${i.qty} sold)`).join('\n')}\n\nDashboard: ${p.dashboardUrl}`,
  };
}

// ─── 11. Catering Quote ──────────────────────────────────────────────────────
export function cateringQuote(p: {
  customerName: string;
  venueName: string;
  eventDate: string;
  guestCount: number;
  quoteAmount?: string;
  message?: string;
  replyEmail: string;
}) {
  const content = `
    ${heading(`Your catering quote from ${p.venueName}`)}
    ${subheading(`Thanks for your enquiry, ${p.customerName}. Here's our response.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${infoRow('Event date', p.eventDate)}
      ${infoRow('Guests', String(p.guestCount))}
      ${p.quoteAmount ? infoRow('Quote', `$${p.quoteAmount}`) : ''}
    </table>
    ${p.message ? `${divider()}<p style="font-family:${T.font};font-size:15px;color:${T.text};margin:0;line-height:1.7;">${p.message}</p>` : ''}
    ${divider()}
    ${para(`Reply to this email or contact <a href="mailto:${p.replyEmail}" style="color:${T.accent};text-decoration:none;">${p.replyEmail}</a> if you have any questions.`)}
  `;

  return {
    subject: `Your catering quote from ${p.venueName}`,
    html: shell(content, `Catering quote for ${p.eventDate} — ${p.guestCount} guests`),
    text: `Catering Quote — ${p.venueName}\n\nHi ${p.customerName},\n\nEvent: ${p.eventDate}\nGuests: ${p.guestCount}${p.quoteAmount ? `\nQuote: $${p.quoteAmount}` : ''}\n\n${p.message || ''}\n\nContact: ${p.replyEmail}`,
  };
}
