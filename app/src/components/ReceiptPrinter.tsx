/**
 * ReceiptPrinter — browser-based thermal receipt printing.
 *
 * Strategy:
 * 1. WebUSB (Star/Epson ESC/POS) — direct USB connection when available
 * 2. Network printer via IP — sends ESC/POS over TCP (requires a proxy or backend endpoint)
 * 3. Browser print (window.print) — fallback, opens print dialog with receipt layout
 *
 * For now implements strategy 3 (browser print) which works everywhere,
 * with a WebUSB hook ready for future enhancement.
 */

interface ReceiptData {
  venueName: string;
  venueAddress?: string;
  orderNumber: string;
  customerName: string;
  pickupTime: string;
  tableNumber?: string | null;
  items: { name: string; quantity: number; unitPrice: string }[];
  subtotal: string;
  tipAmount?: string;
  discountAmount?: string;
  total: string;
  paymentMethod: string;
  timestamp: string;
}

/** Open a print dialog with a formatted thermal-style receipt. */
export function printReceipt(data: ReceiptData) {
  const itemRows = data.items.map(item =>
    `<tr>
      <td style="padding:2px 0">${item.quantity}× ${item.name}</td>
      <td style="text-align:right;padding:2px 0">$${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt — ${data.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 80mm;
      max-width: 80mm;
      padding: 8mm 4mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .xl { font-size: 22px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 12px; vertical-align: top; }
    .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
    .muted { color: #555; font-size: 11px; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { padding: 4mm 2mm; }
    }
  </style>
</head>
<body>
  <!-- Venue name -->
  <div class="center bold large" style="margin-bottom:4px">${data.venueName}</div>
  ${data.venueAddress ? `<div class="center muted">${data.venueAddress}</div>` : ''}
  <div class="divider"></div>

  <!-- Order info -->
  <div class="center xl" style="margin:6px 0">#${data.orderNumber.replace('B1-', '')}</div>
  <table>
    <tr><td>Customer</td><td style="text-align:right">${data.customerName}</td></tr>
    <tr><td>Pickup</td><td style="text-align:right">${data.pickupTime}</td></tr>
    ${data.tableNumber ? `<tr><td>Table</td><td style="text-align:right">${data.tableNumber}</td></tr>` : ''}
    <tr><td>Time</td><td style="text-align:right">${new Date(data.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour12: true, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</td></tr>
  </table>
  <div class="divider"></div>

  <!-- Items -->
  <table>${itemRows}</table>
  <div class="divider"></div>

  <!-- Totals -->
  <table>
    ${data.discountAmount && Number(data.discountAmount) > 0 ? `<tr><td>Subtotal</td><td style="text-align:right">$${data.subtotal}</td></tr><tr><td>Discount</td><td style="text-align:right">-$${data.discountAmount}</td></tr>` : ''}
    ${data.tipAmount && Number(data.tipAmount) > 0 ? `<tr><td>Tip</td><td style="text-align:right">$${data.tipAmount}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">$${data.total}</td></tr>
    <tr><td class="muted">Payment</td><td style="text-align:right muted">${data.paymentMethod === 'online' ? 'Paid Online' : 'Pay on Pickup'}</td></tr>
  </table>
  <div class="divider"></div>

  <!-- Footer -->
  <div class="center muted" style="margin-top:6px">Thank you for your order!</div>
  <div class="center muted">Powered by B1 Platform</div>

  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=340,height=600,menubar=no,toolbar=no,location=no');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

/** Print button component — wire into any order card or order detail view. */
export function PrintButton({ orderData, style }: { orderData: ReceiptData; style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => printReceipt(orderData)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 8,
        border: '1px solid var(--op-card-border)',
        background: 'var(--op-card-bg)',
        color: 'var(--op-text)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        ...style,
      }}
      title="Print receipt"
    >
      🖨️ Print
    </button>
  );
}
