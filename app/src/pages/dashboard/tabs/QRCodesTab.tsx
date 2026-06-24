import { useState, useEffect } from 'react';
import {
  Loader2, QrCode, Download,
} from 'lucide-react';




import QRCode from 'qrcode';


export function QRCodesTab({ venue }: { venue: any }) {
  const slug = venue?.slug ?? '';
  const origin = window.location.origin;

  // Table QR state
  const [tableCount, setTableCount] = useState(10);
  const [tableQRs, setTableQRs] = useState<{ table: number; url: string; dataUrl: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  // Single QR states (generated on mount)
  const [menuQR, setMenuQR] = useState('');
  const [kioskQR, setKioskQR] = useState('');

  const qrLabelStyle = {
    fontFamily: 'Geist Mono, monospace',
    fontSize: '0.625rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--op-text-secondary)',
    display: 'block',
    marginBottom: '0.375rem',
  };

  // Generate single QRs on mount
  useEffect(() => {
    if (!slug) return;
    QRCode.toDataURL(`${origin}/v/${slug}`, { width: 250, margin: 1 }).then(setMenuQR).catch(() => {});
    QRCode.toDataURL(`${origin}/kiosk/${slug}`, { width: 250, margin: 1 }).then(setKioskQR).catch(() => {});
  }, [slug, origin]);

  const generateTableQRs = async () => {
    if (!tableCount || tableCount < 1) return;
    setGenerating(true);
    const codes = await Promise.all(
      Array.from({ length: tableCount }, async (_, i) => {
        const tableNum = i + 1;
        const url = `${origin}/v/${slug}?table=${tableNum}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        return { table: tableNum, url, dataUrl };
      }),
    );
    setTableQRs(codes);
    setGenerating(false);
  };

  const printTableQRs = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>Table QR Codes — ${slug}</title><style>
      body { font-family: sans-serif; }
      .grid { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
      .card { text-align: center; border: 1px solid #ccc; padding: 12px; break-inside: avoid; }
      img { display: block; margin: 0 auto; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h2 style="text-align:center;padding:20px">${slug} — Table QR Codes</h2>
    <div class="grid">${tableQRs.map((q) => `<div class="card"><img src="${q.dataUrl}" width="150"/><p>Table ${q.table}</p></div>`).join('')}</div>
    <button class="no-print" onclick="window.print()">Print</button>
    <script>window.onload = () => window.print();</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printSingle = (dataUrl: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
      body { font-family: sans-serif; text-align: center; padding: 40px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h2>${title}</h2>
    <img src="${dataUrl}" width="250" style="display:block;margin:20px auto"/>
    <button class="no-print" onclick="window.print()">Print</button>
    <script>window.onload = () => window.print();</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadQR = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const qrSectionStyle = { borderColor: 'var(--op-border-soft)' };
  const qrBtnPrimary = { background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.75rem' };
  const qrBtnSecondary = { borderColor: 'var(--op-border-strong)', color: 'var(--op-text)', fontSize: '0.75rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          QR Codes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Generate and download QR codes for your venue.
        </p>
      </div>
      <div className="space-y-6">
      {/* Table QR Codes */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Table QR Codes
        </h2>
        <div className="flex items-end gap-3 mb-5">
          <div className="flex-1">
            <label style={qrLabelStyle}>Number of Tables</label>
            <input
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={(e) => setTableCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-transparent border px-4 py-3 focus:outline-none"
              style={{ borderColor: 'var(--op-border-strong)', fontSize: '0.875rem', color: 'var(--op-text)' }}
            />
          </div>
          <button
            onClick={generateTableQRs}
            disabled={generating}
            className="py-3 px-6 font-button flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-40"
            style={qrBtnPrimary}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
            Generate
          </button>
        </div>

        {tableQRs.length > 0 && (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-4 max-h-96 overflow-y-auto">
              {tableQRs.map((q) => (
                <div key={q.table} className="text-center border p-2 group relative" style={{ borderColor: 'var(--op-border-mid)' }}>
                  <img src={q.dataUrl} alt={`Table ${q.table}`} className="w-full" />
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: 'var(--op-text-secondary)', marginTop: '4px' }}>
                    T{q.table}
                  </p>
                  <button
                    onClick={() => downloadQR(q.dataUrl, `table-${q.table}-qr.png`)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)' }}
                    title="Download"
                  >
                    <Download size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={printTableQRs}
                className="px-5 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print All
              </button>
            </div>
          </>
        )}
      </div>

      {/* Menu QR */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Menu QR Code
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          {origin}/v/{slug}
        </p>
        {menuQR ? (
          <div className="flex items-start gap-6">
            <img src={menuQR} alt="Menu QR" width={150} height={150} />
            <div className="flex flex-col gap-2 justify-start pt-2">
              <button
                onClick={() => downloadQR(menuQR, `${slug}-menu-qr.png`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 hover:opacity-85 transition-opacity"
                style={qrBtnPrimary}
              >
                <Download size={14} /> Download
              </button>
              <button
                onClick={() => printSingle(menuQR, `${slug} — Menu QR Code`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
      </div>

      {/* Kiosk Mode QR */}
      <div className="border p-6" style={qrSectionStyle}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>
          Kiosk Mode QR
        </h2>
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          {origin}/kiosk/{slug}
        </p>
        {kioskQR ? (
          <div className="flex items-start gap-6">
            <img src={kioskQR} alt="Kiosk QR" width={150} height={150} />
            <div className="flex flex-col gap-2 justify-start pt-2">
              <button
                onClick={() => downloadQR(kioskQR, `${slug}-kiosk-qr.png`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 hover:opacity-85 transition-opacity"
                style={qrBtnPrimary}
              >
                <Download size={14} /> Download
              </button>
              <button
                onClick={() => printSingle(kioskQR, `${slug} — Kiosk Mode QR Code`)}
                className="px-4 py-2.5 font-button flex items-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all"
                style={qrBtnSecondary}
              >
                Print
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} /></div>
        )}
      </div>
      </div>
    </div>
  );
}
