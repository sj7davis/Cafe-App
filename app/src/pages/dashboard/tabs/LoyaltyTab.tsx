import { useState, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Plus, Edit2, Trash2,
} from 'lucide-react';




import { DS, useFeatureGate, UpgradeGate } from '../shared';


export function LoyaltyTab({ venueId: _venueId, onUpgrade }: { venueId: number; onUpgrade?: () => void }) {
  const utils = trpc.useUtils();
  const loyaltyToken = localStorage.getItem('b1-owner-token') || '';
  const gate = useFeatureGate('loyalty');
  const { data: accounts, isLoading: accsLoading } = trpc.loyalty.listAccounts.useQuery({ token: loyaltyToken }, { enabled: !!loyaltyToken && gate.allowed });
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const { data: rewards, isLoading: rewardsLoading } = trpc.loyaltyRewards.listAll.useQuery({ token: loyaltyToken }, { enabled: !!loyaltyToken && gate.allowed });
  const createReward = trpc.loyaltyRewards.create.useMutation({ onSuccess: () => { utils.loyaltyRewards.listAll.invalidate(); setShowRewardForm(false); resetRewardForm(); } });
  const updateReward = trpc.loyaltyRewards.update.useMutation({ onSuccess: () => { utils.loyaltyRewards.listAll.invalidate(); setEditRewardId(null); } });
  const deleteReward = trpc.loyaltyRewards.delete.useMutation({ onSuccess: () => utils.loyaltyRewards.listAll.invalidate() });

  const emptyReward = { name: '', description: '', pointsCost: '', rewardType: 'free_item' as string, rewardValue: '', menuItemSlug: '', sortOrder: '' };
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [editRewardId, setEditRewardId] = useState<number | null>(null);
  const [editRewardForm, setEditRewardForm] = useState(emptyReward);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const resetRewardForm = () => setRewardForm(emptyReward);

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%' };
  const labelStyle: CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', display: 'block', marginBottom: 4 };

  const rewardTypeOpts = [
    { value: 'free_item', label: 'Free Item' },
    { value: 'discount_percent', label: 'Discount %' },
    { value: 'discount_fixed', label: 'Discount Fixed ($)' },
    { value: 'custom', label: 'Custom' },
  ];

  if (gate.locked) {
    return (
      <UpgradeGate
        title="Loyalty is a Pro feature"
        description={`Your ${gate.planLabel} plan doesn't include the loyalty program. Upgrade to reward repeat customers with points and redeemable rewards.`}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Loyalty Program
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Points configuration and customer balances.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Loyalty Accounts */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <h2 style={DS.sectionTitle}>Loyalty Accounts</h2>
        {/* Tier legend card with multipliers */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Bronze', bg: '#FEF9C3', color: '#713F12', border: '#CD7F32', threshold: '< 500 pts', multiplier: '1× pts/$1', emoji: '🥉' },
            { label: 'Silver', bg: '#F3F4F6', color: '#374151', border: '#C0C0C0', threshold: '500–1,999 pts', multiplier: '1.5× pts/$1', emoji: '🥈' },
            { label: 'Gold',   bg: '#FEF3C7', color: '#92400E', border: '#D4AF37', threshold: '2,000+ pts', multiplier: '2× pts/$1', emoji: '🥇' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 8, minWidth: 160 }}>
              <span style={{ fontSize: 16 }}>{t.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: t.color }}>{t.label}</div>
                <div style={{ fontSize: 11, color: t.color, opacity: 0.85 }}>{t.threshold}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.multiplier}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search by phone..."
            value={loyaltySearch}
            onChange={e => setLoyaltySearch(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--op-card-border)', borderRadius: 'var(--op-radius-input)', fontSize: 13, background: 'var(--op-bg)', color: 'var(--op-text)', width: '100%', maxWidth: 280 }}
          />
        </div>
        {accsLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!accsLoading && (!accounts || (accounts as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No loyalty accounts yet.</p>}
        {(accounts as any[] | undefined) && (accounts as any[]).length > 0 && (() => {
          const getTier = (pts: number) => pts >= 2000 ? { label: 'Gold', bg: '#FEF3C7', color: '#92400E' }
            : pts >= 500 ? { label: 'Silver', bg: '#F3F4F6', color: 'var(--op-text)' }
            : { label: 'Bronze', bg: '#FEF9C3', color: '#713F12' };
          const filtered = loyaltySearch
            ? (accounts as any[]).filter(a => a.phone?.includes(loyaltySearch))
            : (accounts as any[]);
          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--op-border-mid)' }}>
                    {['Phone', 'Points', 'Lifetime Pts', 'Tier', 'Joined'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--op-text-secondary)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a: any) => {
                    const tier = getTier(a.totalLifetimePoints ?? 0);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--op-border-soft)' }}>
                        <td style={{ padding: '10px 10px', fontFamily: 'Geist Mono', fontSize: 12, color: 'var(--op-text)' }}>{a.phone || '—'}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--op-text)' }}>{a.pointsBalance ?? 0}</td>
                        <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)' }}>{a.totalLifetimePoints ?? 0}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: tier.bg, color: tier.color, fontSize: 11, fontWeight: 600 }}>{tier.label}</span>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono', fontSize: 11 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Rewards Catalogue */}
      <div className="border p-6" style={{ borderColor: 'var(--op-border-soft)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--op-text)' }}>Rewards Catalogue</h2>
          <button onClick={() => { setShowRewardForm(true); resetRewardForm(); setMsg(''); }} className="flex items-center gap-2 px-4 py-2 font-button" style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', fontSize: '0.75rem' }}>
            <Plus size={14} /> New Reward
          </button>
        </div>

        {msg && <p style={{ fontSize: 13, marginBottom: 8, color: msg.startsWith('Error') ? '#B85450' : '#5E8B5E' }}>{msg}</p>}

        {showRewardForm && (
          <div className="border p-4 mb-4" style={{ borderColor: 'var(--op-border-mid)', background: 'var(--op-card-hover)' }}>
            <h3 style={{ fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--op-text)', marginBottom: 12 }}>New Reward</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={labelStyle}>Name *</label><input value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} style={inputStyle} placeholder="e.g. Free Coffee" /></div>
              <div><label style={labelStyle}>Points Cost *</label><input type="number" min="1" value={rewardForm.pointsCost} onChange={e => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} style={inputStyle} placeholder="e.g. 100" /></div>
              <div>
                <label style={labelStyle}>Reward Type</label>
                <select value={rewardForm.rewardType} onChange={e => setRewardForm({ ...rewardForm, rewardType: e.target.value })} style={inputStyle}>
                  {rewardTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Reward Value</label><input value={rewardForm.rewardValue} onChange={e => setRewardForm({ ...rewardForm, rewardValue: e.target.value })} style={inputStyle} placeholder="e.g. flat-white or 20%" /></div>
              <div><label style={labelStyle}>Menu Item Slug (optional)</label><input value={rewardForm.menuItemSlug} onChange={e => setRewardForm({ ...rewardForm, menuItemSlug: e.target.value })} style={inputStyle} placeholder="e.g. flat-white" /></div>
              <div><label style={labelStyle}>Sort Order</label><input type="number" min="0" value={rewardForm.sortOrder} onChange={e => setRewardForm({ ...rewardForm, sortOrder: e.target.value })} style={inputStyle} placeholder="0" /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Description</label><textarea rows={2} value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>
            <div className="flex gap-3">
              <button
                disabled={createReward.isPending}
                onClick={() => {
                  if (!rewardForm.name || !rewardForm.pointsCost) { setMsg('Error: Name and points cost required'); return; }
                  setMsg('');
                  createReward.mutate({ token: loyaltyToken, name: rewardForm.name, description: rewardForm.description || undefined, pointsCost: Number(rewardForm.pointsCost), rewardType: rewardForm.rewardType as 'free_item' | 'discount_percent' | 'discount_fixed' | 'custom', rewardValue: rewardForm.rewardValue || undefined, menuItemSlug: rewardForm.menuItemSlug || undefined, sortOrder: rewardForm.sortOrder ? Number(rewardForm.sortOrder) : undefined });
                }}
                style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
              >{createReward.isPending ? 'Saving…' : 'Create Reward'}</button>
              <button onClick={() => { setShowRewardForm(false); resetRewardForm(); }} style={{ background: 'none', border: '1px solid var(--op-border-strong)', padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
            </div>
          </div>
        )}

        {rewardsLoading && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--op-text-secondary)' }} />}
        {!rewardsLoading && (!rewards || (rewards as any[]).length === 0) && <p style={{ color: 'var(--op-text-secondary)', fontSize: 14 }}>No rewards yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(rewards as any[] | undefined)?.map((r) => (
            <div key={r.id} className="border p-4" style={{ borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' }}>
              {editRewardId === r.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={labelStyle}>Name</label><input value={editRewardForm.name} onChange={e => setEditRewardForm({ ...editRewardForm, name: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Points Cost</label><input type="number" min="1" value={editRewardForm.pointsCost} onChange={e => setEditRewardForm({ ...editRewardForm, pointsCost: e.target.value })} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Reward Type</label>
                      <select value={editRewardForm.rewardType} onChange={e => setEditRewardForm({ ...editRewardForm, rewardType: e.target.value })} style={inputStyle}>
                        {rewardTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Reward Value</label><input value={editRewardForm.rewardValue} onChange={e => setEditRewardForm({ ...editRewardForm, rewardValue: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Menu Item Slug</label><input value={editRewardForm.menuItemSlug} onChange={e => setEditRewardForm({ ...editRewardForm, menuItemSlug: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Sort Order</label><input type="number" min="0" value={editRewardForm.sortOrder} onChange={e => setEditRewardForm({ ...editRewardForm, sortOrder: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={updateReward.isPending} onClick={() => { updateReward.mutate({ token: loyaltyToken, id: r.id, name: editRewardForm.name, pointsCost: Number(editRewardForm.pointsCost), rewardType: editRewardForm.rewardType as 'free_item' | 'discount_percent' | 'discount_fixed' | 'custom', rewardValue: editRewardForm.rewardValue || undefined, menuItemSlug: editRewardForm.menuItemSlug || undefined, sortOrder: editRewardForm.sortOrder ? Number(editRewardForm.sortOrder) : undefined }); }} style={{ background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditRewardId(null)} style={{ background: 'none', border: '1px solid var(--op-border-strong)', padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--op-text)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--op-text)' }}>{r.name}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'rgba(94,139,139,0.12)', color: '#5E8B8B' }}>{r.pointsCost} PTS</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: 'var(--op-border-soft)', color: 'var(--op-text-secondary)', textTransform: 'uppercase' as const }}>{r.rewardType?.replace('_', ' ')}</span>
                      <span style={{ fontFamily: 'Geist Mono', fontSize: 10, padding: '1px 6px', background: r.isActive ? 'rgba(94,139,94,0.12)' : 'rgba(184,84,80,0.10)', color: r.isActive ? '#5E8B5E' : '#B85450' }}>{r.isActive ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                    {r.description && <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', marginBottom: 2 }}>{r.description}</p>}
                    {r.rewardValue && <p style={{ fontSize: 12, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Value: {r.rewardValue}</p>}
                    {r.menuItemSlug && <p style={{ fontSize: 12, color: 'var(--op-text-secondary)', fontFamily: 'Geist Mono' }}>Item: {r.menuItemSlug}</p>}
                    {r.sortOrder != null && <p style={{ fontSize: 11, color: 'var(--op-text-secondary)' }}>Sort: {r.sortOrder}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditRewardId(r.id); setEditRewardForm({ name: r.name, description: r.description || '', pointsCost: String(r.pointsCost), rewardType: r.rewardType || 'free_item', rewardValue: r.rewardValue || '', menuItemSlug: r.menuItemSlug || '', sortOrder: r.sortOrder != null ? String(r.sortOrder) : '' }); }} className="p-2 border hover:bg-[color:var(--op-btn-bg)] hover:text-[color:var(--op-btn-text)] transition-all" style={{ borderColor: 'var(--op-border-strong)', color: 'var(--op-text)', background: 'transparent' }}><Edit2 size={14} /></button>
                    {deleteConfirm === r.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => { deleteReward.mutate({ token: loyaltyToken, id: r.id }); setDeleteConfirm(null); }} style={{ background: '#B85450', color: '#F3F2EE', border: 'none', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: '1px solid var(--op-border-strong)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-2 border hover:bg-[#B85450] hover:text-[#F85450] hover:border-[#B85450] transition-all" style={{ borderColor: 'var(--op-border-strong)', color: 'var(--op-text)', background: 'transparent' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
