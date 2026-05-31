import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send, Tag,
  DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp, CalendarDays,
  Clock, Shield, Building2, Percent, MessageSquare, QrCode, Link2, CreditCard,
  MapPin, Briefcase, Edit2, Trash2, GripVertical, Download, ChevronDown,
  ChevronUp, Monitor, Smartphone, RefreshCw, Bell, Eye, EyeOff, CheckCircle,
  Users, PieChart as PieChartIcon, Circle,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import QRCode from 'qrcode';
import { SetupChecklist } from '@/components/SetupChecklist';
import { DS, getMonday, addWeekDays, WEEK_DAYS, TemplatePreviewCard, ImageUpload, SortableMenuRow, TabletPinSection } from '../shared';


export function GiftCardsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';

  // ── Queries & mutations ─────────────────────────────────
  const { data: cards, refetch: refetchCards } = trpc.venue.listGiftCards.useQuery(
    { token },
    { enabled: !!token }
  );

  const [form, setForm] = useState({
    amount: '',
    senderName: '',
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    message: '',
  });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const createCard = trpc.venue.createGiftCard.useMutation({
    onSuccess: (data) => {
      setNewCode(data.code);
      setForm({ amount: '', senderName: '', recipientName: '', recipientPhone: '', recipientEmail: '', message: '' });
      refetchCards();
    },
    onError: (err) => setFormError(err.message),
  });

  const handleCreate = () => {
    setFormError('');
    setNewCode(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Amount must be a positive number');
      return;
    }
    createCard.mutate({
      token,
      amount,
      senderName: form.senderName || undefined,
      recipientName: form.recipientName || undefined,
      recipientPhone: form.recipientPhone || undefined,
      recipientEmail: form.recipientEmail || undefined,
      message: form.message || undefined,
    });
  };

  const inputStyle = {
    padding: '8px 12px', borderRadius: 'var(--op-radius-input)', border: '1px solid var(--op-card-border)',
    fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%',
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: 'var(--op-text-muted)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Gift Cards
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Active gift cards and balances.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Create Card Form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>
          Create Gift Card
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Amount ($) *</label>
            <input type="number" min="1" step="0.01" placeholder="e.g. 25.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Sender Name</label>
            <input type="text" placeholder="e.g. Jane" value={form.senderName}
              onChange={e => setForm({ ...form, senderName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Recipient Name</label>
            <input type="text" placeholder="e.g. John" value={form.recipientName}
              onChange={e => setForm({ ...form, recipientName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Recipient Phone</label>
            <input type="tel" placeholder="e.g. 0412345678" value={form.recipientPhone}
              onChange={e => setForm({ ...form, recipientPhone: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Recipient Email (sends digital card)</label>
            <input type="email" placeholder="e.g. jane@example.com" value={form.recipientEmail}
              onChange={e => setForm({ ...form, recipientEmail: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Message (optional)</label>
          <textarea rows={2} placeholder="A personal message..." value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        {formError && (
          <p style={{ color: '#B85450', fontSize: 13, marginBottom: 8 }}>{formError}</p>
        )}
        <button onClick={handleCreate} disabled={createCard.isPending}
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: createCard.isPending ? 0.7 : 1 }}>
          {createCard.isPending ? 'Creating...' : 'Create Gift Card'}
        </button>

        {/* Show generated code prominently after creation */}
        {newCode && (
          <div style={{ marginTop: 16, padding: 16, background: '#E8F5E9', borderRadius: 8, border: '1px solid #A5D6A7' }}>
            <p style={{ fontSize: 12, color: '#388E3C', marginBottom: 4, fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Gift Card Created — Share this code:
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', letterSpacing: 4, fontFamily: 'Geist Mono' }}>
              {newCode}
            </p>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 16 }}>
          All Gift Cards
        </h2>
        {!cards || cards.length === 0 ? (
          <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No gift cards yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24,24,24,0.1)' }}>
                  {['Code', 'Amount', 'Balance', 'Recipient', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'Geist Mono', fontWeight: 700, letterSpacing: 2 }}>{card.code}</td>
                    <td style={{ padding: '10px 12px' }}>${Number(card.amount).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: Number(card.balance) > 0 ? '#16a34a' : '#5E5E5E' }}>
                      ${Number(card.balance).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--op-text-secondary)' }}>{card.recipientName || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: '0.625rem' }}>
                      {new Date(card.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
