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


export function PromoTab({ venueId: _venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();

  const codesQuery = trpc.promo.listDiscountCodes.useQuery({ token }, { enabled: !!token });
  const createMut = trpc.promo.createDiscountCode.useMutation({
    onSuccess: () => {
      utils.promo.listDiscountCodes.invalidate();
      setForm({ code: '', type: 'percentage', value: '', minOrderAmount: '', maxUses: '', expiresAt: '' });
      setMsg('✅ Code created');
    },
    onError: (e: any) => setMsg(`❌ ${e.message}`),
  });
  const toggleMut = trpc.promo.toggleDiscountCode.useMutation({
    onSuccess: () => utils.promo.listDiscountCodes.invalidate(),
  });
  const deleteMut = trpc.promo.deleteDiscountCode.useMutation({
    onSuccess: () => utils.promo.listDiscountCodes.invalidate(),
  });

  const [form, setForm] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed',
    value: '', minOrderAmount: '', maxUses: '', expiresAt: '',
  });
  const [msg, setMsg] = useState('');

  const inputStyle = {
    padding: '8px 12px', borderRadius: 'var(--op-radius-input)', border: '1px solid var(--op-card-border)',
    fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%', boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    color: 'var(--op-text-muted)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4,
  };

  function handleCreate() {
    setMsg('');
    const v = Number(form.value);
    if (!form.code || !v) { setMsg('Code and value are required'); return; }
    createMut.mutate({
      token,
      code: form.code,
      type: form.type,
      value: v,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      expiresAt: form.expiresAt || undefined,
    });
  }

  const codes = codesQuery.data ?? [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Promotions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Discount codes and promotional offers.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create form */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>
          New Discount Code
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Code *</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. WELCOME10" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
              style={inputStyle}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Value *</label>
            <input type="number" min="0.01" step="0.01"
              placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
              value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Min Order ($)</label>
            <input type="number" min="0" step="0.01" placeholder="No minimum"
              value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max Uses</label>
            <input type="number" min="1" step="1" placeholder="Unlimited"
              value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Expires At</label>
            <input type="datetime-local" value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              style={inputStyle} />
          </div>
        </div>
        {msg && <p style={{ fontSize: 13, marginBottom: 8, color: msg.startsWith('✅') ? '#16a34a' : '#B85450' }}>{msg}</p>}
        <button onClick={handleCreate} disabled={createMut.isPending}
          style={{ padding: '10px 20px', background: '#181818', color: '#F3F2EE', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          {createMut.isPending ? 'Creating…' : 'Create Code'}
        </button>
      </div>

      {/* Codes list */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 16 }}>
          All Codes ({codes.length})
        </h2>
        {codes.length === 0 ? (
          <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No discount codes yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Discount</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Used</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Limit</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Expires</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Status</th>
                <th style={{ padding: '8px 4px' }} />
              </tr>
            </thead>
            <tbody>
              {codes.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(24,24,24,0.04)' }}>
                  <td style={{ padding: '10px 4px', fontFamily: 'Geist Mono', fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: '10px 4px' }}>
                    {c.type === 'percentage' ? `${c.value}% off` : `$${Number(c.value).toFixed(2)} off`}
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>{c.usedCount}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--op-text-secondary)' }}>{c.maxUses ?? '∞'}</td>
                  <td style={{ padding: '10px 4px', color: 'var(--op-text-secondary)', fontSize: 12 }}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11, fontFamily: 'Geist Mono', padding: '2px 8px', borderRadius: 99,
                      background: c.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)',
                      color: c.isActive ? '#5E8B5E' : '#B85450',
                    }}>
                      {c.isActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => toggleMut.mutate({ token, id: c.id, isActive: !c.isActive })}
                      style={{ fontSize: 12, background: 'none', border: '1px solid rgba(24,24,24,0.15)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: 'var(--op-text)' }}>
                      {c.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this code?')) deleteMut.mutate({ token, id: c.id }); }}
                      style={{ fontSize: 12, background: 'none', border: '1px solid rgba(184,84,80,0.3)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#B85450' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}
