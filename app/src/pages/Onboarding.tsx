import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import QRCode from 'qrcode';
import {
  ArrowLeft, ArrowRight, Check, Coffee, Loader2, Plus, X, Download, Printer,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PendingItem {
  name: string;
  price: string;
  category: 'coffee' | 'pastries' | 'bread';
}

interface AddedStaffMember {
  name: string;
  role: string;
}

interface QRCodeEntry {
  table: number;
  url: string;
  dataUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  'Create Account',
  'Venue Details',
  'Menu',
  'Invite Staff',
  'Table QR Codes',
  'Ready!',
];

const SUGGESTED_ITEMS: PendingItem[] = [
  { name: 'Flat White', price: '5.50', category: 'coffee' },
  { name: 'Long Black', price: '4.50', category: 'coffee' },
  { name: 'Cappuccino', price: '5.50', category: 'coffee' },
  { name: 'Croissant', price: '6.00', category: 'pastries' },
  { name: 'Banana Bread', price: '7.00', category: 'bread' },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-transparent border px-4 py-3 focus:outline-none';
const inputStyle = { borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' };
const labelStyle = {
  fontFamily: 'Geist Mono, monospace',
  fontSize: '0.625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#5E5E5E',
  display: 'block',
  marginBottom: '0.375rem',
};

// ─── Password Strength ────────────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#e7e5e4' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#10b981' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 2, background: '#e7e5e4', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: color, transition: 'width 0.3s, background 0.3s', borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, marginTop: 3, display: 'block' }}>{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(0);
  const [ownerToken, setOwnerToken] = useState('');
  const [venueSlug, setVenueSlug] = useState('');
  const [venueId, setVenueId] = useState(0);
  const [addedStaff, setAddedStaff] = useState<AddedStaffMember[]>([]);
  const [addedItems, setAddedItems] = useState<PendingItem[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [qrCodes, setQrCodes] = useState<QRCodeEntry[]>([]);

  // Step 1 form
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    venueName: '',
    venueSlug: '',
  });
  const [regError, setRegError] = useState('');

  // tRPC mutations
  const registerMutation = trpc.venue.register.useMutation({
    onSuccess: (data: any) => {
      const tok = data?.token ?? '';
      const slug = form.venueSlug;
      const id = data?.venueId ?? data?.id ?? 0;
      setOwnerToken(tok);
      setVenueSlug(slug);
      setVenueId(id);
      // Persist token so tRPC auth works for subsequent calls
      if (tok) localStorage.setItem('b1-owner-token', tok);
      setStep(1);
    },
    onError: (err: any) => setRegError(err.message),
  });

  const updateVenueMutation = trpc.venue.update.useMutation();
  const createMenuItemMutation = trpc.venue.createMenuItem.useMutation();
  const createStaffMutation = trpc.staffAuth.create.useMutation();

  const handleRegister = () => {
    setRegError('');
    if (!form.email || !form.password || !form.name || !form.venueName || !form.venueSlug) return;
    registerMutation.mutate(form);
  };

  // QR code generation
  const generateQRCodes = async (count: number, slug: string) => {
    const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;
    const codes = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const tableNum = i + 1;
        const url = `${appUrl}/v/${slug}?table=${tableNum}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        return { table: tableNum, url, dataUrl };
      }),
    );
    setQrCodes(codes);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>Table QR Codes</title><style>
      body { font-family: sans-serif; }
      .grid { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
      .card { text-align: center; border: 1px solid #ccc; padding: 12px; break-inside: avoid; }
      img { display: block; margin: 0 auto; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h2 style="text-align:center;padding:20px">${venueSlug} — Table QR Codes</h2>
    <div class="grid">${qrCodes.map((q) => `<div class="card"><img src="${q.dataUrl}" width="150"/><p>Table ${q.table}</p></div>`).join('')}</div>
    <button class="no-print" onclick="window.print()">Print</button>
    <script>window.onload = () => window.print();</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex-1 flex items-center gap-1.5">
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{
              background: i < step ? '#5E8B5E' : i === step ? '#181818' : 'transparent',
              color: i <= step ? '#F3F2EE' : '#5E5E5E',
              border: i <= step ? 'none' : '1px solid rgba(24,24,24,0.15)',
              fontFamily: 'Geist Mono, monospace',
              fontSize: '0.625rem',
            }}
          >
            {i < step ? <Check size={10} /> : i + 1}
          </div>
          <span
            className="hidden sm:inline truncate"
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '0.5rem',
              color: i <= step ? '#181818' : '#5E5E5E',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {s}
          </span>
        </div>
      ))}
    </div>
  );

  const cardStyle = { borderColor: 'rgba(24,24,24,0.15)' };
  const nextBtnStyle = { background: '#181818', color: '#F3F2EE', fontSize: '0.875rem' };
  const backBtnStyle = { borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.75rem' };
  const skipStyle = {
    fontFamily: 'Geist Mono, monospace',
    fontSize: '0.625rem',
    color: '#5E5E5E',
    letterSpacing: '0.08em',
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center py-8"
      style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}
    >
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-6 inline-flex items-center gap-1 hover:opacity-60 transition-opacity"
            style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none', fontFamily: 'Geist Mono, monospace' }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div
            className="w-10 h-10 flex items-center justify-center mx-auto mb-4"
            style={{ background: '#181818' }}
          >
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.75rem', fontWeight: 500, color: '#F3F2EE' }}>
              B1
            </span>
          </div>
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>
            Start Your Free Trial
          </h1>
          <p style={{ fontFamily: 'Geist Mono, monospace', marginTop: '0.5rem', color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            14 days free. No credit card required.
          </p>
        </div>

        <StepIndicator />

        {/* ── Step 0: Create Account ─────────────────────────────────────── */}
        {step === 0 && (
          <Step0
            form={form}
            setForm={setForm}
            error={regError}
            isPending={registerMutation.isPending}
            onSubmit={handleRegister}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
          />
        )}

        {/* ── Step 1: Venue Details ──────────────────────────────────────── */}
        {step === 1 && (
          <Step1
            ownerToken={ownerToken}
            updateMutation={updateVenueMutation}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
            backBtnStyle={backBtnStyle}
            skipStyle={skipStyle}
          />
        )}

        {/* ── Step 2: Menu ──────────────────────────────────────────────── */}
        {step === 2 && (
          <Step2
            ownerToken={ownerToken}
            venueId={venueId}
            createMenuItemMutation={createMenuItemMutation}
            addedItems={addedItems}
            setAddedItems={setAddedItems}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
            backBtnStyle={backBtnStyle}
            skipStyle={skipStyle}
          />
        )}

        {/* ── Step 3: Invite Staff ───────────────────────────────────────── */}
        {step === 3 && (
          <Step3
            ownerToken={ownerToken}
            createStaffMutation={createStaffMutation}
            addedStaff={addedStaff}
            setAddedStaff={setAddedStaff}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
            backBtnStyle={backBtnStyle}
          />
        )}

        {/* ── Step 4: Table QR Codes ─────────────────────────────────────── */}
        {step === 4 && (
          <Step4
            venueSlug={venueSlug}
            tableCount={tableCount}
            setTableCount={setTableCount}
            qrCodes={qrCodes}
            onGenerate={generateQRCodes}
            onPrint={handlePrint}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
            backBtnStyle={backBtnStyle}
          />
        )}

        {/* ── Step 5: Ready! ────────────────────────────────────────────── */}
        {step === 5 && (
          <Step5
            venueSlug={venueSlug}
            addedStaff={addedStaff}
            addedItems={addedItems}
            tableCount={tableCount}
            onDashboard={() => navigate('/dashboard')}
            cardStyle={cardStyle}
            nextBtnStyle={nextBtnStyle}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step 0: Create Account ───────────────────────────────────────────────────
function Step0({
  form, setForm, error, isPending, onSubmit, cardStyle, nextBtnStyle,
}: {
  form: any;
  setForm: (f: any) => void;
  error: string;
  isPending: boolean;
  onSubmit: () => void;
  cardStyle: any;
  nextBtnStyle: any;
}) {
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="border p-6 space-y-4" style={cardStyle}>
      <div>
        <label style={labelStyle}>Your Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@yourcafe.com"
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Min 6 characters"
          className={inputCls}
          style={inputStyle}
        />
        <PasswordStrengthBar password={form.password} />
      </div>
      <div>
        <label style={labelStyle}>Cafe Name</label>
        <input
          type="text"
          value={form.venueName}
          onChange={(e) => {
            const name = e.target.value;
            setForm({ ...form, venueName: name, venueSlug: slugify(name) });
          }}
          placeholder="e.g. B1 by Backhaus"
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Site URL</label>
        <div className="flex items-center border" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
          <span className="px-3 py-3" style={{ fontSize: '0.75rem', color: '#5E5E5E', background: '#E8E4DD', fontFamily: 'Geist Mono, monospace' }}>
            b1platform.com.au/v/
          </span>
          <input
            type="text"
            value={form.venueSlug}
            onChange={(e) => setForm({ ...form, venueSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="flex-1 bg-transparent px-3 py-3 focus:outline-none"
            style={{ fontSize: '0.875rem', color: '#181818' }}
          />
        </div>
      </div>
      {error && (
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#B85450' }}>{error}</p>
      )}
      <button
        onClick={onSubmit}
        disabled={!form.name || !form.email || !form.password || !form.venueName || !form.venueSlug || isPending}
        className="w-full mt-2 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-30 hover:opacity-85"
        style={nextBtnStyle}
      >
        {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <>Create Account <ArrowRight size={16} /></>}
      </button>
    </div>
  );
}

// ─── Step 1: Venue Details ────────────────────────────────────────────────────
function Step1({
  ownerToken, updateMutation, onNext, onBack, cardStyle, nextBtnStyle, backBtnStyle, skipStyle,
}: {
  ownerToken: string;
  updateMutation: any;
  onNext: () => void;
  onBack: () => void;
  cardStyle: any;
  nextBtnStyle: any;
  backBtnStyle: any;
  skipStyle: any;
}) {
  const [details, setDetails] = useState({
    address: '',
    phone: '',
    hoursWeekday: '',
    hoursSaturday: '',
    hoursSunday: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ token: ownerToken, ...details });
      setSaved(true);
      setTimeout(() => onNext(), 600);
    } catch {
      // graceful fallback — skip API and proceed
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border p-6" style={cardStyle}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1.25rem' }}>
        Venue Details
      </h2>
      <div className="space-y-4">
        <div>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={details.address}
            onChange={(e) => setDetails({ ...details, address: e.target.value })}
            placeholder="123 Coffee Lane, Melbourne VIC"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Phone Number</label>
          <input
            type="text"
            value={details.phone}
            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
            placeholder="03 9000 0000"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'hoursWeekday', label: 'Mon–Fri' },
            { key: 'hoursSaturday', label: 'Saturday' },
            { key: 'hoursSunday', label: 'Sunday' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="text"
                value={(details as any)[key]}
                onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
                placeholder="7am–5pm"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-3 font-button border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={backBtnStyle}>
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 hover:opacity-85"
          style={nextBtnStyle}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved ? <><Check size={14} /> Saved!</> : <>Save & Continue <ArrowRight size={14} /></>}
        </button>
      </div>
      <div className="mt-3 text-center">
        <button style={skipStyle} onClick={onNext}>Skip for now</button>
      </div>
    </div>
  );
}

// ─── Step 2: Menu ─────────────────────────────────────────────────────────────
function Step2({
  ownerToken: _ownerToken, venueId, createMenuItemMutation, addedItems, setAddedItems, onNext, onBack, cardStyle, nextBtnStyle, backBtnStyle, skipStyle,
}: {
  ownerToken: string;
  venueId: number;
  createMenuItemMutation: any;
  addedItems: PendingItem[];
  setAddedItems: (items: PendingItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  cardStyle: any;
  nextBtnStyle: any;
  backBtnStyle: any;
  skipStyle: any;
}) {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [customForm, setCustomForm] = useState({ name: '', price: '', category: 'coffee' as PendingItem['category'] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64);

  const toggleSuggestion = (item: PendingItem) => {
    const exists = pending.find((p) => p.name === item.name);
    if (exists) {
      setPending(pending.filter((p) => p.name !== item.name));
    } else {
      setPending([...pending, item]);
    }
  };

  const addCustom = () => {
    if (!customForm.name.trim() || !customForm.price.trim()) return;
    setPending([...pending, { ...customForm }]);
    setCustomForm({ name: '', price: '', category: 'coffee' });
  };

  const removeItem = (idx: number) => setPending(pending.filter((_, i) => i !== idx));

  const handleAddItems = async () => {
    if (pending.length === 0) { onNext(); return; }
    setSaving(true);
    setMessage('');
    let successCount = 0;
    for (const item of pending) {
      try {
        await createMenuItemMutation.mutateAsync({
          venueId,
          slug: slugify(item.name),
          name: item.name,
          price: item.price,
          category: item.category,
        });
        successCount++;
      } catch {
        // silently skip failed items
      }
    }
    setAddedItems([...addedItems, ...pending.slice(0, successCount)]);
    if (successCount > 0) {
      setMessage(`Added ${successCount} item${successCount > 1 ? 's' : ''}!`);
    }
    setSaving(false);
    setTimeout(() => onNext(), 800);
  };

  return (
    <div className="border p-6" style={cardStyle}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>
        Add Your First Menu Items
      </h2>
      <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem', color: '#5E5E5E', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
        CLICK TO ADD — EDIT ANYTIME IN DASHBOARD
      </p>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 mb-5">
        {SUGGESTED_ITEMS.map((item) => {
          const selected = !!pending.find((p) => p.name === item.name);
          return (
            <button
              key={item.name}
              onClick={() => toggleSuggestion(item)}
              className="px-3 py-2 border transition-all"
              style={{
                borderColor: selected ? '#181818' : 'rgba(24,24,24,0.15)',
                background: selected ? '#181818' : 'transparent',
                color: selected ? '#F3F2EE' : '#181818',
                fontFamily: 'Geist Mono, monospace',
                fontSize: '0.625rem',
                letterSpacing: '0.06em',
              }}
            >
              {selected && <Check size={10} className="inline mr-1" />}
              {item.name} ${item.price}
            </button>
          );
        })}
      </div>

      {/* Custom item form */}
      <div className="border p-4 mb-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <p style={labelStyle}>Add Custom Item</p>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customForm.name}
            onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
            placeholder="Item name"
            className="flex-1 bg-transparent border px-3 py-2 focus:outline-none"
            style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }}
          />
          <input
            type="text"
            value={customForm.price}
            onChange={(e) => setCustomForm({ ...customForm, price: e.target.value })}
            placeholder="$0.00"
            className="w-24 bg-transparent border px-3 py-2 focus:outline-none"
            style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }}
          />
          <select
            value={customForm.category}
            onChange={(e) => setCustomForm({ ...customForm, category: e.target.value as PendingItem['category'] })}
            className="bg-transparent border px-2 py-2 focus:outline-none"
            style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.75rem', color: '#181818' }}
          >
            <option value="coffee">Coffee</option>
            <option value="pastries">Pastries</option>
            <option value="bread">Bread</option>
          </select>
          <button
            onClick={addCustom}
            className="px-3 py-2 flex items-center gap-1 hover:opacity-85 transition-opacity"
            style={{ background: '#181818', color: '#F3F2EE', fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem' }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Pending list */}
      {pending.length > 0 && (
        <div className="mb-4 space-y-1">
          <p style={labelStyle}>Items to add ({pending.length})</p>
          {pending.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-3 py-2 border" style={{ borderColor: 'rgba(24,24,24,0.1)' }}>
              <span style={{ fontSize: '0.875rem', color: '#181818' }}>{item.name} — ${item.price}</span>
              <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#B85450', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E8B5E', marginBottom: '0.75rem' }}>{message}</p>
      )}

      <div className="flex items-center gap-3 mt-2">
        <button onClick={onBack} className="flex-1 py-3 font-button border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={backBtnStyle}>
          Back
        </button>
        <button
          onClick={handleAddItems}
          disabled={saving}
          className="flex-1 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 hover:opacity-85"
          style={nextBtnStyle}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : pending.length > 0 ? <>Add Items <ArrowRight size={14} /></> : <>Continue <ArrowRight size={14} /></>}
        </button>
      </div>
      <div className="mt-3 text-center">
        <button style={skipStyle} onClick={onNext}>Skip for now</button>
      </div>
    </div>
  );
}

// ─── Step 3: Invite Staff ──────────────────────────────────────────────────────
function Step3({
  ownerToken, createStaffMutation, addedStaff, setAddedStaff, onNext, onBack, cardStyle, nextBtnStyle, backBtnStyle,
}: {
  ownerToken: string;
  createStaffMutation: any;
  addedStaff: AddedStaffMember[];
  setAddedStaff: (s: AddedStaffMember[]) => void;
  onNext: () => void;
  onBack: () => void;
  cardStyle: any;
  nextBtnStyle: any;
  backBtnStyle: any;
}) {
  const [staffForm, setStaffForm] = useState({ name: '', username: '', password: '', role: 'staff' as 'admin' | 'manager' | 'staff' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async () => {
    if (!staffForm.name || !staffForm.username || !staffForm.password) {
      setError('All fields are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createStaffMutation.mutateAsync({
        token: ownerToken,
        name: staffForm.name,
        username: staffForm.username,
        password: staffForm.password,
        role: staffForm.role,
      });
      setAddedStaff([...addedStaff, { name: staffForm.name, role: staffForm.role }]);
      setSuccess(`${staffForm.name} added!`);
      setStaffForm({ name: '', username: '', password: '', role: 'staff' });
    } catch (e: any) {
      setError(e?.message || 'Failed to add staff.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border p-6" style={cardStyle}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1.25rem' }}>
        Invite Staff
      </h2>

      <div className="space-y-3 mb-4">
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            placeholder="Jane Smith"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={staffForm.username}
            onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
            placeholder="janesmith"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={staffForm.password}
            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
            placeholder="Temporary password"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <select
            value={staffForm.role}
            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as typeof staffForm.role })}
            className={inputCls}
            style={inputStyle}
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error && <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#B85450', marginBottom: '0.5rem' }}>{error}</p>}
      {success && <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E8B5E', marginBottom: '0.5rem' }}>{success}</p>}

      <button
        onClick={handleAdd}
        disabled={saving}
        className="w-full py-2.5 font-button flex items-center justify-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all mb-4"
        style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.75rem', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Add Staff Member
      </button>

      {/* Added staff list */}
      {addedStaff.length > 0 && (
        <div className="mb-4 space-y-1">
          <p style={labelStyle}>Added Staff</p>
          {addedStaff.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 border" style={{ borderColor: 'rgba(24,24,24,0.1)', background: '#E8E4DD' }}>
              <span style={{ fontSize: '0.875rem', color: '#181818' }}>{s.name}</span>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: '#5E5E5E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.role}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex-1 py-3 font-button border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={backBtnStyle}>
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 font-button flex items-center justify-center gap-2 hover:opacity-85 transition-opacity"
          style={nextBtnStyle}
        >
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Table QR Codes ───────────────────────────────────────────────────
function Step4({
  venueSlug, tableCount, setTableCount, qrCodes, onGenerate, onPrint, onNext, onBack, cardStyle, nextBtnStyle, backBtnStyle,
}: {
  venueSlug: string;
  tableCount: number;
  setTableCount: (n: number) => void;
  qrCodes: QRCodeEntry[];
  onGenerate: (count: number, slug: string) => Promise<void>;
  onPrint: () => void;
  onNext: () => void;
  onBack: () => void;
  cardStyle: any;
  nextBtnStyle: any;
  backBtnStyle: any;
}) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!tableCount || tableCount < 1) return;
    setGenerating(true);
    await onGenerate(tableCount, venueSlug);
    setGenerating(false);
  };

  return (
    <div className="border p-6" style={cardStyle}>
      <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1.25rem' }}>
        Table QR Codes
      </h2>

      <div className="flex items-end gap-3 mb-6">
        <div className="flex-1">
          <label style={labelStyle}>How many tables?</label>
          <input
            type="number"
            min={1}
            max={50}
            value={tableCount || ''}
            onChange={(e) => setTableCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 0)))}
            placeholder="e.g. 10"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !tableCount}
          className="py-3 px-5 font-button flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-40"
          style={nextBtnStyle}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : null}
          Generate
        </button>
      </div>

      {/* QR Code grid */}
      {qrCodes.length > 0 && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-5 max-h-64 overflow-y-auto">
            {qrCodes.map((q) => (
              <div key={q.table} className="text-center border p-2" style={{ borderColor: 'rgba(24,24,24,0.1)' }}>
                <img src={q.dataUrl} alt={`Table ${q.table}`} className="w-full" style={{ maxWidth: 100 }} />
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: '#5E5E5E', letterSpacing: '0.06em', marginTop: '4px' }}>
                  TABLE {q.table}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={onPrint}
            className="w-full py-2.5 font-button flex items-center justify-center gap-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all mb-4"
            style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.75rem' }}
          >
            <Printer size={14} /> Download All as PDF
          </button>
        </>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex-1 py-3 font-button border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={backBtnStyle}>
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 font-button flex items-center justify-center gap-2 hover:opacity-85 transition-opacity"
          style={nextBtnStyle}
        >
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: You're Ready! ────────────────────────────────────────────────────
function Step5({
  venueSlug, addedStaff, addedItems, tableCount, onDashboard, cardStyle, nextBtnStyle,
}: {
  venueSlug: string;
  addedStaff: AddedStaffMember[];
  addedItems: PendingItem[];
  tableCount: number;
  onDashboard: () => void;
  cardStyle: any;
  nextBtnStyle: any;
}) {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;
  const orderingLink = `${appUrl}/v/${venueSlug}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border p-6 text-center" style={cardStyle}>
      <div
        className="w-14 h-14 flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(94,139,94,0.12)' }}
      >
        <Check size={28} style={{ color: '#5E8B5E' }} />
      </div>
      <h2 style={{ fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>
        You're Ready!
      </h2>
      <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
        YOUR CAFE IS LIVE AND READY TO TAKE ORDERS
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-left">
        {[
          { label: 'Tables Set Up', value: tableCount > 0 ? String(tableCount) : '—' },
          { label: 'Staff Invited', value: addedStaff.length > 0 ? String(addedStaff.length) : '—' },
          { label: 'Menu Items', value: addedItems.length > 0 ? String(addedItems.length) : '—' },
        ].map((s) => (
          <div key={s.label} className="border p-3" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', color: '#5E5E5E', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{s.label}</span>
            <span style={{ fontWeight: 500, fontSize: '1.25rem', color: '#181818' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Ordering link */}
      <div className="border p-4 mb-4 text-left" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <p style={{ ...labelStyle, marginBottom: '0.5rem' }}>Your Ordering Link</p>
        <div className="flex items-center gap-2">
          <code style={{ flex: 1, fontSize: '0.75rem', color: '#181818', wordBreak: 'break-all' }}>{orderingLink}</code>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 flex items-center gap-1 hover:opacity-85 transition-opacity flex-shrink-0"
            style={{ background: '#181818', color: '#F3F2EE', fontFamily: 'Geist Mono, monospace', fontSize: '0.5625rem' }}
          >
            {copied ? <><Check size={10} /> Copied!</> : <><Download size={10} /> Copy</>}
          </button>
        </div>
      </div>

      <button
        onClick={onDashboard}
        className="w-full py-3 font-button flex items-center justify-center gap-2 hover:opacity-85 transition-opacity mb-3"
        style={nextBtnStyle}
      >
        <Coffee size={16} /> Go to Dashboard
      </button>

      <a
        href={orderingLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', letterSpacing: '0.08em', textDecoration: 'underline' }}
      >
        View your menu →
      </a>
    </div>
  );
}
