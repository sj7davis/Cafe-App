// Leaf components used by VenuePublic (menu cards, modifier modal, split bill...).
import { trpc } from '@/providers/trpc';
import { useState, useEffect } from 'react';
import {
  Coffee, Loader2, Plus, Minus, X,
} from 'lucide-react';

// ─── Hours parsing helpers ───────────────────────────────────────────────────
import { formatCountdown } from './helpers';

export function OrderAgainRow({
  order,
  venueId,
  menuItems,
  onOrderAgain,
}: {
  order: { id: number; orderNumber: string; customerName: string | null; status: string; totalAmount: string | number; createdAt: string };
  venueId: number;
  menuItems: { id: number; name: string; price: string }[];
  onOrderAgain: (items: { id: number; name: string; price: number }[]) => void;
}) {
  const orderItemsQuery = trpc.venue.getOrderItemsByOrderId.useQuery(
    { orderId: order.id, venueId },
    { enabled: false }
  );

  const handleOrderAgain = async () => {
    const result = await orderItemsQuery.refetch();
    if (!result.data) return;
    const items = result.data.flatMap(oi => {
      const mi = menuItems.find(m => m.id === oi.menuItemId);
      if (!mi) return [];
      return [{ id: mi.id, name: mi.name, price: Number(mi.price) }];
    });
    onOrderAgain(items);
  };

  const date = new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const total = Number(order.totalAmount).toFixed(2);

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      border: '1px solid rgba(24,24,24,0.08)',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#181818' }}>#{order.orderNumber}</div>
        <div style={{ fontSize: 11, color: '#5E5E5E' }}>{date} · ${total}</div>
        <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'capitalize' }}>{order.status}</div>
      </div>
      <button
        onClick={handleOrderAgain}
        disabled={orderItemsQuery.isFetching}
        style={{
          padding: '6px 12px', borderRadius: 6, border: 'none',
          background: '#181818', color: '#F3F2EE', fontSize: 12, fontWeight: 600,
          cursor: orderItemsQuery.isFetching ? 'not-allowed' : 'pointer',
          opacity: orderItemsQuery.isFetching ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {orderItemsQuery.isFetching ? '…' : 'Order Again'}
      </button>
    </div>
  );
}

// ─── ModifierModal ───────────────────────────────────────────────────────────
export type ModifierGroup = { id: number; name: string; options: { name: string; priceAdj: number }[]; required: boolean };

export function ModifierModal({
  item,
  onClose,
  onConfirm,
}: {
  item: { id: number; name: string };
  onClose: () => void;
  onConfirm: (modifiers: { group: string; option: string; priceAdj: number }[]) => void;
}) {
  const { data: groups, isLoading } = trpc.venue.listMenuModifiersPublic.useQuery(
    { menuItemId: item.id },
    { enabled: true }
  );

  const [selections, setSelections] = useState<Record<string, { option: string; priceAdj: number }>>({});

  const hasLoaded = !isLoading && groups !== undefined;
  const hasModifiers = groups && groups.length > 0;

  useEffect(() => {
    if (hasLoaded && !hasModifiers) {
      onConfirm([]);
    }
  }, [hasLoaded, hasModifiers, onConfirm]);

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#F3F2EE' }} />
      </div>
    );
  }

  if (!hasModifiers) return null;

  const requiredGroups = (groups as ModifierGroup[]).filter(g => g.required);
  const allRequiredSelected = requiredGroups.every(g => selections[g.name]);

  const handleConfirm = () => {
    const mods = Object.entries(selections).map(([group, { option, priceAdj }]) => ({ group, option, priceAdj }));
    onConfirm(mods);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#F3F2EE', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 480,
          padding: 24, maxHeight: '80dvh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#181818', margin: 0 }}>
            Customise — {item.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#5E5E5E" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(groups as ModifierGroup[]).map(group => (
            <div key={group.id}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 8 }}>
                {group.name}
                {group.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.options.map(opt => (
                  <label key={opt.name} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#181818' }}>
                    <input
                      type="radio"
                      name={`mod-${group.id}`}
                      checked={selections[group.name]?.option === opt.name}
                      onChange={() => setSelections(prev => ({ ...prev, [group.name]: { option: opt.name, priceAdj: opt.priceAdj } }))}
                      style={{ accentColor: '#181818' }}
                    />
                    <span>{opt.name}</span>
                    {opt.priceAdj !== 0 && (
                      <span style={{ fontSize: 12, color: '#5E5E5E', marginLeft: 'auto' }}>
                        {opt.priceAdj > 0 ? `+$${opt.priceAdj.toFixed(2)}` : `-$${Math.abs(opt.priceAdj).toFixed(2)}`}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 8,
              border: '1px solid rgba(24,24,24,0.15)', background: 'none',
              fontSize: 14, cursor: 'pointer', color: '#5E5E5E',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allRequiredSelected}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 8, border: 'none',
              background: '#181818', color: '#F3F2EE',
              fontSize: 14, fontWeight: 600,
              cursor: allRequiredSelected ? 'pointer' : 'not-allowed',
              opacity: allRequiredSelected ? 1 : 0.5,
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SplitBillPanel ─────────────────────────────────────────────────────────
export function SplitBillPanel({
  orderTotal,
  splitCount,
  setSplitCount,
  onClose,
  slug,
  tableNumber,
}: {
  orderTotal: number;
  splitCount: number;
  setSplitCount: (n: number) => void;
  onClose: () => void;
  slug: string;
  tableNumber: string | null;
}) {
  const shareAmount = orderTotal / splitCount;
  const splitUrl = `${window.location.origin}/v/${slug}${tableNumber ? `?table=${tableNumber}` : ''}?split=${splitCount}&total=${orderTotal.toFixed(2)}`;

  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(splitUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }

  return (
    <div style={{ background: 'rgba(94,139,139,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(94,139,139,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#181818' }}>💳 Split Bill</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5E5E' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: '#181818', flexShrink: 0 }}>How many people?</label>
        <input
          type="number"
          min={2}
          max={10}
          value={splitCount}
          onChange={e => setSplitCount(Math.min(10, Math.max(2, Number(e.target.value))))}
          style={{
            width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)',
            fontSize: 15, fontWeight: 700, textAlign: 'center', background: '#fff', color: '#181818',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: splitCount }, (_, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: '#fff', borderRadius: 8,
            border: '1px solid rgba(24,24,24,0.08)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>Person {i + 1}</div>
              <div style={{ fontSize: 12, color: '#5E5E5E' }}>1 / {splitCount} of ${orderTotal.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#5E8B8B' }}>${shareAmount.toFixed(2)}</span>
              <a
                href={`/v/${slug}?split_pay=1&amount=${shareAmount.toFixed(2)}&person=${i + 1}`}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none',
                  background: '#181818', color: '#F3F2EE', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                }}
              >
                Pay My Share
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleCopy}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8,
          border: '1px solid rgba(94,139,139,0.35)', background: copiedLink ? '#f0fdf4' : '#fff',
          color: copiedLink ? '#16a34a' : '#5E8B8B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {copiedLink ? '✓ Link Copied!' : '🔗 Copy Split Link'}
      </button>
      <p style={{ fontSize: 11, color: '#5E5E5E', margin: '8px 0 0', textAlign: 'center' }}>
        Share this link so each person can pay their share of ${shareAmount.toFixed(2)}
      </p>
    </div>
  );
}

export const DIETARY_EMOJI: Record<string, string> = {
  vegan: '🌱',
  'gluten-free': '🌾',
  'dairy-free': '🥛',
  'nut-free': '🥜',
  vegetarian: '🥦',
};

export type MenuItemWithExtras = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  dietary?: string | null;
  isLimitedTime?: boolean | null;
  limitedTimeLabel?: string | null;
  activeTo?: string | Date | null;
};

export function MenuCard({
  item,
  accentColor,
  onAdd,
  cartQty,
  onRemove,
  nowMs,
  isAvailable,
}: {
  item: MenuItemWithExtras;
  accentColor: string;
  onAdd: () => void;
  cartQty: number;
  onRemove: () => void;
  nowMs: number;
  isAvailable?: boolean;
}) {
  const soldOut = isAvailable === false;
  const dietaryTags = item.dietary ? item.dietary.split(',').map(d => d.trim()).filter(Boolean) : [];

  const countdown = item.activeTo && new Date(item.activeTo).getTime() > nowMs
    ? formatCountdown(String(item.activeTo))
    : null;

  return (
    <div style={{
      border: '1px solid rgba(24,24,24,0.08)', borderRadius: 8,
      background: 'white', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      opacity: soldOut ? 0.75 : 1,
      transition: 'box-shadow 0.15s',
    }}>
      {soldOut && (
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', zIndex: 1 }}>
          Sold Out
        </div>
      )}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: '100%', aspectRatio: '16 / 9', background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}06 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Coffee size={28} style={{ color: `${accentColor}50` }} />
        </div>
      )}
      <div style={{
        padding: 16, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#181818' }}>{item.name}</div>
            {item.isLimitedTime && item.limitedTimeLabel && (
              <span style={{
                fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px',
                background: 'rgba(249,115,22,0.12)', color: '#ea580c',
              }}>
                {item.limitedTimeLabel}
              </span>
            )}
          </div>
          {countdown && (
            <div style={{ fontSize: 10, color: '#ea580c', marginBottom: 4, fontWeight: 500 }}>
              ⏳ Ends in {countdown}
            </div>
          )}
          {item.description && (
            <div style={{ fontSize: 12, color: '#5E5E5E', marginBottom: 8, lineHeight: 1.4 }}>{item.description}</div>
          )}
          {((item as any).dietaryTags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
              {((item as any).dietaryTags as string[]).map(tag => (
                <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {((item as any).allergens || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginRight: 2 }}>Contains:</span>
              {((item as any).allergens as string[]).map(a => (
                <span key={a} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 500 }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, color: accentColor, marginBottom: dietaryTags.length > 0 ? 6 : 0, marginTop: 6 }}>
            ${Number(item.price).toFixed(2)}
          </div>
          {dietaryTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {dietaryTags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, fontWeight: 500,
                  background: 'rgba(94,139,139,0.1)', color: '#5E8B8B',
                  borderRadius: 99, padding: '2px 7px',
                }}>
                  {DIETARY_EMOJI[tag] ?? ''} {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {cartQty > 0 && !soldOut && (
            <>
              <button
                onClick={onRemove}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(24,24,24,0.15)',
                  background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: 600, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{cartQty}</span>
            </>
          )}
          <button
            onClick={onAdd}
            disabled={soldOut}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: soldOut ? '#d1d5db' : '#181818', color: '#F3F2EE',
              cursor: soldOut ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
