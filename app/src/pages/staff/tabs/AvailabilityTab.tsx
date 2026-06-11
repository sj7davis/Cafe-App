import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Loader2,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function AvailabilityTab({ venueId, token }: { venueId: number; token: string }) {
  const utils = trpc.useUtils();

  const { data: menuItemsData, isLoading: menuLoading } = trpc.venue.listMenu.useQuery({ venueId });
  const { data: inventoryRows, isLoading: invLoading } = trpc.venue.getInventory.useQuery({ venueId });

  const toggleItem = trpc.venue.toggleInventoryItem.useMutation({
    onSuccess: () => {
      utils.venue.getInventory.invalidate();
    },
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'soldout'>('all');

  // Build map: menuItemId -> isAvailable
  const invMap: Record<number, boolean> = {};
  if (inventoryRows) {
    for (const row of inventoryRows as any[]) {
      invMap[row.menuItemId] = row.isAvailable;
    }
  }

  const allItems = (menuItemsData ?? []) as any[];
  const items = allItems
    .filter(i => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !(i.category ?? '').toLowerCase().includes(q)) return false;
      }
      const avail = invMap[i.id] !== false; // default available if no inventory row
      if (filter === 'available' && !avail) return false;
      if (filter === 'soldout' && avail) return false;
      return true;
    });

  const soldOutCount = allItems.filter(i => invMap[i.id] === false).length;

  const isLoading = menuLoading || invLoading;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: '0 0 4px' }}>86 List — Item Availability</h2>
        <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
          Toggle items on/off. Sold-out items are hidden on the ordering page in real-time.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 18px', background: soldOutCount > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${soldOutCount > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold Out</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: soldOutCount > 0 ? '#DC2626' : '#16A34A' }}>{soldOutCount}</div>
        </div>
        <div style={{ padding: '10px 18px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1c1917' }}>{allItems.length - soldOutCount}</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 13, color: '#1c1917' }}
        />
        {(['all', 'available', 'soldout'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${filter === f ? '#1c1917' : '#e7e5e4'}`,
              background: filter === f ? '#1c1917' : '#fff', color: filter === f ? '#fafaf9' : '#78716c',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{f === 'soldout' ? 'Sold Out' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#78716c', fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p style={{ color: '#78716c', fontSize: 14 }}>No items found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item: any) => {
          const isAvailable = invMap[item.id] !== false;
          const isPending = toggleItem.isPending && (toggleItem.variables as any)?.menuItemId === item.id;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                minHeight: 56, padding: '10px 16px',
                background: isAvailable ? '#fff' : '#FEF2F2',
                border: `1px solid ${isAvailable ? '#e7e5e4' : '#FECACA'}`,
                borderRadius: 10,
                transition: 'all 0.15s',
              }}
            >
              {/* Item info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1c1917' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#78716c', marginTop: 1 }}>
                  {item.category && <span style={{ textTransform: 'capitalize' }}>{item.category}</span>}
                  {item.price && <span style={{ marginLeft: 8 }}>${parseFloat(item.price).toFixed(2)}</span>}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: isAvailable ? '#D1FAE5' : '#FEE2E2',
                color: isAvailable ? '#065F46' : '#DC2626',
              }}>
                {isAvailable ? '✅ Available' : '❌ Sold Out'}
              </span>

              {/* Toggle */}
              <button
                disabled={isPending}
                onClick={() => {
                  toggleItem.mutate({ token, venueId, menuItemId: item.id, isAvailable: !isAvailable });
                }}
                style={{
                  position: 'relative', width: 52, height: 28, borderRadius: 14,
                  border: 'none', cursor: isPending ? 'wait' : 'pointer',
                  background: isAvailable ? '#16A34A' : '#D1D5DB',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  padding: 0,
                }}
                title={isAvailable ? 'Mark as Sold Out' : 'Mark as Available'}
              >
                <span style={{
                  position: 'absolute', top: 3, left: isAvailable ? 26 : 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
