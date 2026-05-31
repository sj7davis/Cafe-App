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


export function SettingsTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [form, setForm] = useState({ name: venue.name || '', address: venue.address || '', phone: venue.phone || '', description: venue.description || '', hoursWeekday: venue.hoursWeekday || '', hoursSaturday: venue.hoursSaturday || '', hoursSunday: venue.hoursSunday || '' });
  const [saveMessage, setSaveMessage] = useState('');
  const updateMutation = trpc.venue.update.useMutation({ onSuccess: () => setSaveMessage('Settings saved!') });
  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

  // Happy Hour state
  const { data: hhData } = trpc.venue.getHappyHour.useQuery({ venueId: venue.id }, { enabled: !!venue.id });
  const setHappyHour = trpc.venue.setHappyHour.useMutation();
  const [hhForm, setHhForm] = useState({ enabled: false, startTime: '', endTime: '', discountPercent: '', label: '' });
  const [hhMsg, setHhMsg] = useState('');
  const [hhLoaded, setHhLoaded] = useState(false);
  if (hhData && !hhLoaded) {
    setHhLoaded(true);
    setHhForm({
      enabled: !!(hhData as any).enabled,
      startTime: (hhData as any).startTime || '',
      endTime: (hhData as any).endTime || '',
      discountPercent: String((hhData as any).discountPercent ?? ''),
      label: (hhData as any).label || '',
    });
  }

  // Xero state
  const { data: xeroConn, refetch: refetchXero } = trpc.xero.getConnection.useQuery();
  const { data: xeroAuthUrl } = trpc.xero.getAuthUrl.useQuery();
  const xeroDisconnect = trpc.xero.disconnect.useMutation({ onSuccess: () => refetchXero() });
  const xeroSync = trpc.xero.syncRevenue.useMutation();
  const [xeroSyncFrom, setXeroSyncFrom] = useState('');
  const [xeroSyncTo, setXeroSyncTo] = useState('');
  const [xeroMsg, setXeroMsg] = useState('');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Venue Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Update your venue details, hours, and configuration.
        </p>
      </div>
      <div className="space-y-6">
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={DS.sectionTitle}>Venue Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Cafe Name', key: 'name', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'Mon-Fri Hours', key: 'hoursWeekday', type: 'text' },
            { label: 'Saturday Hours', key: 'hoursSaturday', type: 'text' },
            { label: 'Sunday Hours', key: 'hoursSunday', type: 'text' },
          ].map((f) => (
            <div key={f.key}>
              <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputCls} style={inputStyle} />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => { setSaveMessage(''); updateMutation.mutate({ token, data: form }); }} disabled={updateMutation.isPending} className="px-6 py-3 font-button flex items-center gap-2" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
            {updateMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
          </button>
          {saveMessage && <span className="font-data" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>{saveMessage}</span>}
        </div>
      </div>

      {/* Tablet POS PIN */}
      <TabletPinSection venue={venue} token={token} inputCls={inputCls} inputStyle={inputStyle} />

      {/* Happy Hour */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1rem' }}>Happy Hour</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="hh-enabled" checked={hhForm.enabled} onChange={e => setHhForm({ ...hhForm, enabled: e.target.checked })} style={{ accentColor: '#181818', width: 16, height: 16 }} />
            <label htmlFor="hh-enabled" className="font-data" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text)', cursor: 'pointer' }}>Enable Happy Hour</label>
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Start Time (HH:MM)</label>
            <input type="time" value={hhForm.startTime} onChange={e => setHhForm({ ...hhForm, startTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>End Time (HH:MM)</label>
            <input type="time" value={hhForm.endTime} onChange={e => setHhForm({ ...hhForm, endTime: e.target.value })} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Discount Percent (0–100)</label>
            <input type="number" min={0} max={100} value={hhForm.discountPercent} onChange={e => setHhForm({ ...hhForm, discountPercent: e.target.value })} className={inputCls} style={inputStyle} placeholder="e.g. 20" />
          </div>
          <div>
            <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Label</label>
            <input type="text" value={hhForm.label} onChange={e => setHhForm({ ...hhForm, label: e.target.value })} className={inputCls} style={inputStyle} placeholder="Happy Hour — 20% off!" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            disabled={setHappyHour.isPending}
            onClick={() => {
              setHhMsg('');
              setHappyHour.mutate({ venueId: venue.id, enabled: hhForm.enabled, startTime: hhForm.startTime, endTime: hhForm.endTime, discountPercent: Number(hhForm.discountPercent) || 0, label: hhForm.label }, {
                onSuccess: () => setHhMsg('Happy hour saved!'),
                onError: (e) => setHhMsg(e.message),
              });
            }}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            {setHappyHour.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Happy Hour</>}
          </button>
          {hhMsg && <span className="font-data" style={{ fontSize: '0.625rem', color: hhMsg.includes('saved') ? '#5E8B5E' : '#B85450' }}>{hhMsg}</span>}
        </div>
      </div>

      {/* Xero Integration */}
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: '#13B5EA' }}>
            <Link2 size={20} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '0.25rem' }}>Xero Accounting</h3>
            <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              Connect your Xero account to automatically sync daily revenue.
            </p>
            {(xeroConn as any)?.connected ? (
              <div>
                <p className="font-data mb-2" style={{ fontSize: '0.625rem', color: '#5E8B5E' }}>
                  <Check size={10} className="inline mr-1" /> Connected
                  {(xeroConn as any).lastSyncAt && <span style={{ color: 'var(--op-text-secondary)', marginLeft: 8 }}>Last sync: {new Date((xeroConn as any).lastSyncAt).toLocaleDateString()}</span>}
                </p>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <input type="date" value={xeroSyncFrom} onChange={e => setXeroSyncFrom(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)' }}>to</span>
                  <input type="date" value={xeroSyncTo} onChange={e => setXeroSyncTo(e.target.value)} className="border px-3 py-2 focus:outline-none" style={{ fontFamily: 'Inter', fontSize: '0.8125rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)', background: 'transparent' }} />
                  <button
                    disabled={xeroSync.isPending || !xeroSyncFrom || !xeroSyncTo}
                    onClick={() => {
                      setXeroMsg('');
                      xeroSync.mutate({ from: xeroSyncFrom, to: xeroSyncTo }, {
                        onSuccess: () => setXeroMsg('Revenue synced to Xero!'),
                        onError: (e) => setXeroMsg(e.message),
                      });
                    }}
                    className="px-4 py-2 font-button flex items-center gap-2"
                    style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!xeroSyncFrom || !xeroSyncTo) ? 0.5 : 1 }}
                  >
                    {xeroSync.isPending ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                    Sync Revenue
                  </button>
                  <button
                    disabled={xeroDisconnect.isPending}
                    onClick={() => { if (window.confirm('Disconnect Xero?')) xeroDisconnect.mutate(); }}
                    className="px-4 py-2 font-data border"
                    style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#B85450', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
                  >
                    Disconnect
                  </button>
                </div>
                {xeroMsg && <p className="font-data" style={{ fontSize: '0.625rem', color: xeroMsg.includes('synced') ? '#5E8B5E' : '#B85450' }}>{xeroMsg}</p>}
              </div>
            ) : (
              <div>
                {xeroAuthUrl?.configured ? (
                  <button
                    onClick={() => { if (xeroAuthUrl.url) window.open(xeroAuthUrl.url, '_blank'); }}
                    disabled={!xeroAuthUrl.url}
                    className="px-4 py-2 font-button flex items-center gap-2"
                    style={{ background: '#13B5EA', color: '#fff', fontSize: '0.75rem', opacity: !xeroAuthUrl.url ? 0.5 : 1 }}
                  >
                    <Link2 size={14} /> Connect Xero
                  </button>
                ) : (
                  <p className="font-data" style={{ fontSize: '0.625rem', color: '#B85450' }}>
                    <AlertCircle size={10} className="inline mr-1" /> Xero credentials not configured in environment.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
