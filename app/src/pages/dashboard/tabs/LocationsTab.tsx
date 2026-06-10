import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Plus, X, AlertCircle,
  MapPin, Edit2, Trash2,
} from 'lucide-react';




import { DS } from '../shared';


export function LocationsTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
  const [form, setForm] = useState({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false });
  const [deleteError, setDeleteError] = useState('');
  const utils = trpc.useUtils();

  const { data: locationsList } = trpc.venue.listLocations.useQuery({ venueId: venue.id });

  const addMutation = trpc.venue.addLocation.useMutation({
    onSuccess: () => { utils.venue.listLocations.invalidate(); setMode('list'); setForm({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false }); },
  });

  const updateMutation = trpc.venue.updateLocation.useMutation({
    onSuccess: () => { utils.venue.listLocations.invalidate(); setMode('list'); },
  });

  const deleteMutation = trpc.venue.deleteLocation.useMutation({
    onSuccess: () => utils.venue.listLocations.invalidate(),
    onError: (err) => setDeleteError(err.message),
  });

  const handleEdit = (loc: any) => {
    setMode({ type: 'edit', id: loc.id });
    setForm({ name: loc.name || '', address: loc.address || '', phone: loc.phone || '', hoursWeekday: loc.hoursWeekday || '', hoursSaturday: loc.hoursSaturday || '', hoursSunday: loc.hoursSunday || '', isDefault: loc.isDefault || false });
  };

  const handleSubmit = () => {
    if (!form.name || !form.address) return;
    if (mode === 'create') {
      addMutation.mutate({ token, ...form });
    } else if (typeof mode === 'object' && mode.type === 'edit') {
      updateMutation.mutate({ token, locationId: mode.id, ...form });
    }
  };

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };

  if (mode === 'create' || (typeof mode === 'object' && mode.type === 'edit')) {
    const isEdit = typeof mode === 'object';
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>Locations</h1>
          <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>Manage your physical locations and hours.</p>
        </div>
        <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={DS.sectionTitle}>
            {isEdit ? 'Edit Location' : 'Add Location'}
          </h2>
          <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Name *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. City Centre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Address *</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 123 Main St" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Phone</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 03 9999 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Weekday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 7am — 4pm" value={form.hoursWeekday} onChange={e => setForm(f => ({ ...f, hoursWeekday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Saturday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 8am — 2pm" value={form.hoursSaturday} onChange={e => setForm(f => ({ ...f, hoursSaturday: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Sunday Hours</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 9am — 1pm or Closed" value={form.hoursSunday} onChange={e => setForm(f => ({ ...f, hoursSunday: e.target.value }))} />
          </div>
        </div>
        {(addMutation.error || updateMutation.error) && (
          <div className="flex items-center gap-2 mb-4" style={{ color: '#B85450', fontSize: '0.875rem' }}>
            <AlertCircle size={14} />
            {addMutation.error?.message || updateMutation.error?.message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.address || addMutation.isPending || updateMutation.isPending}
            className="px-6 py-3 font-button"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem', opacity: (!form.name || !form.address) ? 0.5 : 1 }}
          >
            {isEdit ? 'SAVE CHANGES' : 'ADD LOCATION'}
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 font-button border" style={{ background: 'none', color: 'var(--op-text)', fontSize: '0.75rem', borderColor: 'rgba(24,24,24,0.15)' }}>
            CANCEL
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Locations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Manage your physical locations and hours.
        </p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={DS.sectionTitle}>Locations</h2>
        <button onClick={() => { setMode('create'); setForm({ name: '', address: '', phone: '', hoursWeekday: '', hoursSaturday: '', hoursSunday: '', isDefault: false }); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.625rem', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> ADD LOCATION
        </button>
      </div>
      {deleteError && (
        <div className="flex items-center gap-2 mb-4 p-3 border" style={{ color: '#B85450', borderColor: '#B85450', fontSize: '0.875rem' }}>
          <AlertCircle size={14} /> {deleteError}
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B85450' }}><X size={14} /></button>
        </div>
      )}
      {locationsList && locationsList.length === 0 && (
        <div className="border p-8 text-center" style={{ borderColor: 'rgba(24,24,24,0.08)', color: 'var(--op-text-secondary)' }}>
          <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No locations added yet. Add your first location to enable location-based ordering.</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {locationsList?.map((loc) => (
          <div key={loc.id} className="border p-5 flex items-start justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--op-text)', marginBottom: 4 }}>{loc.name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: 2 }}>{loc.address}</div>
              {loc.phone && <div style={{ fontSize: '0.8125rem', color: 'var(--op-text-secondary)', marginBottom: 2 }}>{loc.phone}</div>}
              {loc.hoursWeekday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)', marginTop: 6 }}>Mon–Fri: {loc.hoursWeekday}</div>}
              {loc.hoursSaturday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>Sat: {loc.hoursSaturday}</div>}
              {loc.hoursSunday && <div className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>Sun: {loc.hoursSunday}</div>}
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button onClick={() => handleEdit(loc)} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)' }}>
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => { setDeleteError(''); deleteMutation.mutate({ token, locationId: loc.id }); }}
                disabled={deleteMutation.isPending}
                className="p-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all"
                style={{ borderColor: 'rgba(24,24,24,0.15)', color: 'var(--op-text)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
