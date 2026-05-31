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


export function BundlesTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: bundles, isLoading } = trpc.venue.listBundles.useQuery({ venueId }, { enabled: !!venueId });
  const createBundle = trpc.venue.createBundle.useMutation({ onSuccess: () => { utils.venue.listBundles.invalidate(); setShowForm(false); resetForm(); } });
  const updateBundle = trpc.venue.updateBundle.useMutation({ onSuccess: () => { utils.venue.listBundles.invalidate(); setEditId(null); } });
  const deleteBundle = trpc.venue.deleteBundle.useMutation({ onSuccess: () => utils.venue.listBundles.invalidate() });

  const emptyForm = { name: '', description: '', itemSlugs: '', bundlePrice: '', isActive: true };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const resetForm = () => setForm(emptyForm);

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%' };
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Bundles
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Combo deals and bundle pricing.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex justify-between items-center">
        <h2 style={DS.sectionTitle}>Bundles</h2>
        <button onClick={() => { setShowForm(true); resetForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <Plus size={14} /> New Bundle
        </button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

      {showForm && (
        <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 12 }}>New Bundle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Breakfast Combo" /></div>
            <div><label style={labelStyle}>Bundle Price ($) *</label><input type="number" min="0" step="0.01" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} style={inputStyle} placeholder="e.g. 12.00" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Item Slugs (comma-separated)</label><input value={form.itemSlugs} onChange={e => setForm({ ...form, itemSlugs: e.target.value })} style={inputStyle} placeholder="flat-white,croissant" /><p style={{ fontSize: 11, color: 'var(--op-text-secondary)', marginTop: 3, fontFamily: 'Geist Mono' }}>Enter the slugs of menu items to include, separated by commas.</p></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="bundle-active-new" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ accentColor: '#181818' }} />
            <label htmlFor="bundle-active-new" style={{ fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}>Active</label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { if (!form.name || !form.bundlePrice) { setMsg('Error: Name and price required'); return; } setMsg(''); createBundle.mutate({ venueId, name: form.name, description: form.description || undefined, itemSlugs: form.itemSlugs.split(',').map(s => s.trim()).filter(Boolean), bundlePrice: form.bundlePrice, isActive: form.isActive }); }} disabled={createBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
              {createBundle.isPending ? 'Saving…' : 'Create Bundle'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
      {!isLoading && (!bundles || (bundles as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No bundles yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(bundles as any[] | undefined)?.map((b) => (
          <div key={b.id} className="border p-4" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            {editId === b.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={labelStyle}>Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bundle Price ($)</label><input type="number" min="0" step="0.01" value={editForm.bundlePrice} onChange={e => setEditForm({ ...editForm, bundlePrice: e.target.value })} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Item Slugs</label><input value={editForm.itemSlugs} onChange={e => setEditForm({ ...editForm, itemSlugs: e.target.value })} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" id={`bundle-active-${b.id}`} checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} style={{ accentColor: '#181818' }} />
                  <label htmlFor={`bundle-active-${b.id}`} style={{ fontSize: '0.8125rem', color: 'var(--op-text)', cursor: 'pointer' }}>Active</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { updateBundle.mutate({ bundleId: b.id, name: editForm.name, description: editForm.description || undefined, itemSlugs: editForm.itemSlugs.split(',').map((s: string) => s.trim()).filter(Boolean), bundlePrice: editForm.bundlePrice, isActive: editForm.isActive }); }} disabled={updateBundle.isPending} style={{ background: '#181818', color: '#F3F2EE', border: 'none', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>{b.name}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 11, padding: '1px 6px', background: b.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: b.isActive ? '#5E8B5E' : '#B85450' }}>{b.isActive ? 'ACTIVE' : 'OFF'}</span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: 'var(--op-text)' }}>${Number(b.bundlePrice).toFixed(2)}</span>
                  </div>
                  {b.description && <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 4 }}>{b.description}</p>}
                  <p style={{ fontSize: 11, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Items: {Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || '').slice(0, 60)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(b.id); setEditForm({ name: b.name, description: b.description || '', itemSlugs: Array.isArray(b.itemSlugs) ? (b.itemSlugs as string[]).join(', ') : String(b.itemSlugs || ''), bundlePrice: String(b.bundlePrice), isActive: !!b.isActive }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Edit2 size={14} /></button>
                  {deleteConfirm === b.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { deleteBundle.mutate({ bundleId: b.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid rgba(24,24,24,0.15)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(b.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)', background: 'transparent' }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
