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


export function MenuTab({ venue }: { venue: any }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.venue.listMenu.useQuery({ venueId: venue.id });
  const { data: inventoryLevels, refetch: refetchInventory } = trpc.venue.getInventoryLevels.useQuery(undefined, { enabled: !!venue.id });
  const setInventoryQty = trpc.venue.setInventoryQuantity.useMutation({ onSuccess: () => { refetchInventory(); } });
  const [stockFormOpen, setStockFormOpen] = useState<number | null>(null);
  const [stockForm, setStockForm] = useState({ quantity: '', quantityAlert: '' });

  const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
  const [openModifiers, setOpenModifiers] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'coffee' as 'coffee' | 'pastries' | 'bread',
    dietary: '',
    image: '',
  });
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formDietaryTags, setFormDietaryTags] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const inputCls = "w-full bg-transparent border px-4 py-3 focus:outline-none";
  const inputStyle = { fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--op-text)', borderColor: 'rgba(24,24,24,0.15)' };
  const labelStyle = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)' };

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64);

  const showSaved = () => {
    setSaveMessage('Saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const createMutation = trpc.venue.createMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setMode('list');
      showSaved();
    },
  });

  const updateMutation = trpc.venue.updateMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setMode('list');
      showSaved();
    },
  });

  const deleteMutation = trpc.venue.deleteMenuItem.useMutation({
    onSuccess: () => {
      utils.venue.listMenu.invalidate();
      setDeleteConfirm(null);
      showSaved();
    },
    onError: (err) => {
      setDeleteError(err.message);
      setDeleteConfirm(null);
    },
  });

  // Local ordered list — kept in sync with server; used for optimistic drag reorder
  const [localItems, setLocalItems] = useState<any[]>([]);
  useEffect(() => {
    if (items) setLocalItems(items as any[]);
  }, [items]);

  const reorderMutation = trpc.venue.reorderMenuItems.useMutation({
    onSuccess: () => utils.venue.listMenu.invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      // Persist new sortOrder values
      reorderMutation.mutate({
        token,
        venueId: venue.id,
        items: next.map((item, idx) => ({ id: item.id, sortOrder: idx })),
      });
      return next;
    });
  };

  const startCreate = () => {
    setForm({ name: '', description: '', price: '', category: 'coffee', dietary: '', image: '' });
    setFormAllergens([]);
    setFormDietaryTags([]);
    setDeleteError('');
    setMode('create');
  };

  const startEdit = (item: any) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category: item.category || 'coffee',
      dietary: item.dietary || '',
      image: item.image || '',
    });
    setFormAllergens(Array.isArray(item.allergens) ? item.allergens : (item.allergens ? String(item.allergens).split(',').map((s: string) => s.trim()).filter(Boolean) : []));
    setFormDietaryTags(Array.isArray(item.dietaryTags) ? item.dietaryTags : (item.dietaryTags ? String(item.dietaryTags).split(',').map((s: string) => s.trim()).filter(Boolean) : []));
    setDeleteError('');
    setMode({ type: 'edit', id: item.id });
  };

  const handleDiscard = () => {
    setMode('list');
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price.trim()) return;
    if (mode === 'create') {
      createMutation.mutate({
        venueId: venue.id,
        slug: slugify(form.name),
        name: form.name.trim(),
        description: form.description || undefined,
        price: form.price,
        category: form.category,
        dietary: form.dietary || undefined,
        image: form.image || undefined,
        allergens: formAllergens.length > 0 ? formAllergens : undefined,
        dietaryTags: formDietaryTags.length > 0 ? formDietaryTags : undefined,
      });
    } else if (typeof mode === 'object' && mode.type === 'edit') {
      updateMutation.mutate({
        token,
        menuItemId: mode.id,
        data: {
          name: form.name.trim(),
          description: form.description || undefined,
          price: form.price,
          category: form.category,
          dietary: form.dietary || undefined,
          image: form.image || undefined,
          allergens: formAllergens.length > 0 ? formAllergens : undefined,
          dietaryTags: formDietaryTags.length > 0 ? formDietaryTags : undefined,
        },
      });
    }
  };

  const isFormMode = mode === 'create' || (typeof mode === 'object' && mode.type === 'edit');
  const isEditMode = typeof mode === 'object' && mode.type === 'edit';
  const isPending = createMutation.isPending || updateMutation.isPending;

  const categoryLabel = (cat: string) => {
    if (cat === 'coffee') return 'Coffee';
    if (cat === 'pastries') return 'Pastries';
    if (cat === 'bread') return 'Bread';
    return cat;
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Menu
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Create and manage your menu items.
        </p>
      </div>
      <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <h2 style={DS.sectionTitle}>Menu Management</h2>
        {!isFormMode && (
          <button
            onClick={startCreate}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className="mb-4">
          <span className="font-data" style={{ fontSize: '0.75rem', color: '#5E8B5E', fontFamily: 'Geist Mono' }}>{saveMessage}</span>
        </div>
      )}

      {/* Delete error banner */}
      {deleteError && (
        <div className="mb-4 flex items-start gap-2 p-3 border" style={{ borderColor: '#B85450', background: 'rgba(184,84,80,0.06)' }}>
          <AlertCircle size={14} style={{ color: '#B85450', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.8125rem', color: '#B85450' }}>
            This item has existing orders and cannot be deleted. View your order history for details.
          </span>
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B85450' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items?.length === 0 && !isFormMode && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Coffee size={40} style={{ color: 'var(--op-text-secondary)', marginBottom: 16 }} />
          <h3 style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--op-text)', marginBottom: 8 }}>No menu items yet</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--op-text-secondary)', marginBottom: 24 }}>Add your first item to start building your menu.</p>
          <button
            onClick={startCreate}
            className="px-6 py-3 font-button flex items-center gap-2"
            style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      )}

      {/* Item list — grouped by category, drag-to-reorder */}
      {!isLoading && localItems.length > 0 && (() => {
        const CAT_ORDER = ['coffee', 'pastries', 'bread'];
        const allCats = [...new Set(localItems.map((i: any) => i.category as string))];
        const sortedCats = [
          ...CAT_ORDER.filter(c => allCats.includes(c)),
          ...allCats.filter(c => !CAT_ORDER.includes(c)),
        ];
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-6 mb-6">
            {sortedCats.map(cat => {
              const catItems = localItems.filter((i: any) => i.category === cat);
              return (
                <div key={cat}>
                  {/* Category section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--op-text-secondary)' }}>
                      {categoryLabel(cat)}
                    </span>
                    <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', color: 'var(--op-text-muted)' }}>({catItems.length})</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(24,24,24,0.08)' }} />
                  </div>
                  <SortableContext items={catItems.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {catItems.map((item: any) => (
                        <SortableMenuRow
                          key={item.id}
                          item={item}
                          venue={venue}
                          token={token}
                          inventoryLevels={inventoryLevels as any[] || []}
                          stockFormOpen={stockFormOpen}
                          stockForm={stockForm}
                          setStockFormOpen={setStockFormOpen}
                          setStockForm={setStockForm}
                          setInventoryQty={setInventoryQty}
                          openModifiers={openModifiers}
                          setOpenModifiers={setOpenModifiers}
                          deleteConfirm={deleteConfirm}
                          setDeleteConfirm={(id) => { setDeleteConfirm(id); if (id !== null) setDeleteError(''); }}
                          deleteMutation={deleteMutation}
                          startEdit={startEdit}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          </DndContext>
        );
      })()}

      {/* Create / Edit Form */}
      {isFormMode && (
        <div className="border p-6 mt-2" style={{ borderColor: 'rgba(24,24,24,0.12)', background: 'var(--op-card-hover)' }}>
          <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: '1.25rem' }}>
            {isEditMode ? 'Edit Item' : 'New Menu Item'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="Flat White"
              />
            </div>

            {/* Price */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Price</label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="4.50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as 'coffee' | 'pastries' | 'bread' })}
                className={inputCls}
                style={inputStyle}
              >
                <option value="coffee">Coffee</option>
                <option value="pastries">Pastries</option>
                <option value="bread">Bread</option>
              </select>
            </div>

            {/* Dietary */}
            <div>
              <label className="font-data block mb-1.5" style={labelStyle}>Dietary Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                {[
                  { tag: 'vegan', label: 'Vegan' },
                  { tag: 'gluten-free', label: 'GF' },
                  { tag: 'dairy-free', label: 'Dairy-free' },
                  { tag: 'nut-free', label: 'Nut-free' },
                  { tag: 'vegetarian', label: 'Vegetarian' },
                ].map(({ tag, label }) => {
                  const tags = form.dietary ? form.dietary.split(',').map((t) => t.trim()).filter(Boolean) : [];
                  const checked = tags.includes(tag);
                  return (
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--op-text)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = form.dietary ? form.dietary.split(',').map((t) => t.trim()).filter(Boolean) : [];
                          const next = e.target.checked
                            ? [...current, tag]
                            : current.filter((t) => t !== tag);
                          setForm({ ...form, dietary: next.join(', ') });
                        }}
                        style={{ accentColor: '#181818' }}
                      />
                      <span className="font-data" style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Description — full width */}
            <div className="md:col-span-2">
              <label className="font-data block mb-1.5" style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={inputCls}
                style={inputStyle}
                placeholder="A short description of the item…"
              />
            </div>

            {/* Photo upload — full width */}
            <div className="md:col-span-2">
              <ImageUpload
                label="Item Photo"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
              />
              <p className="font-data mt-1" style={{ fontSize: '0.5625rem', color: 'var(--op-text-secondary)', letterSpacing: '0.06em' }}>
                Leave blank to hide image on your public menu.
              </p>
            </div>

            {/* Allergens */}
            <div className="md:col-span-2" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Allergens</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'sesame', 'shellfish', 'fish', 'sulphites'].map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '4px 8px', border: `1px solid ${formAllergens.includes(a) ? '#DC2626' : '#E5E7EB'}`, borderRadius: 5, background: formAllergens.includes(a) ? '#FEF2F2' : '#fff', color: formAllergens.includes(a) ? '#DC2626' : '#374151' }}>
                    <input type="checkbox" checked={formAllergens.includes(a)}
                      onChange={e => setFormAllergens(prev => e.target.checked ? [...prev, a] : prev.filter(x => x !== a))}
                      style={{ display: 'none' }} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* Dietary tags */}
            <div className="md:col-span-2" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Dietary</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'paleo', 'keto'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '4px 8px', border: `1px solid ${formDietaryTags.includes(t) ? '#16A34A' : '#E5E7EB'}`, borderRadius: 5, background: formDietaryTags.includes(t) ? '#F0FDF4' : '#fff', color: formDietaryTags.includes(t) ? '#16A34A' : '#374151' }}>
                    <input type="checkbox" checked={formDietaryTags.includes(t)}
                      onChange={e => setFormDietaryTags(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                      style={{ display: 'none' }} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || !form.price.trim()}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
            <button
              onClick={handleDiscard}
              className="px-6 py-3 font-button flex items-center gap-2"
              style={{ background: 'transparent', color: 'var(--op-text)', fontSize: '0.75rem', border: '1px solid rgba(24,24,24,0.15)' }}
            >
              <X size={14} /> Discard Changes
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
