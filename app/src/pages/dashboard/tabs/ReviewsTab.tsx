import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Star,
} from 'lucide-react';




import { DS } from '../shared';


export function ReviewsTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: reviewsList, isLoading } = trpc.venue.listReviews.useQuery(
    { venueId, limit: 100 },
    { enabled: !!venueId }
  );

  const pageHeader = (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
        Reviews
      </h1>
      <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
        Customer ratings and feedback.
      </p>
    </div>
  );

  if (isLoading) return <div>{pageHeader}<p style={DS.emptyState}>Loading reviews…</p></div>;
  if (!reviewsList || reviewsList.length === 0) {
    return (
      <div>
        {pageHeader}
        <div style={{ textAlign: 'center', padding: '56px 24px', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⭐</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--op-text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            No reviews yet
          </h3>
          <p style={{ fontSize: 14, color: 'var(--op-text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Reviews come in automatically after customers complete their orders. Share your venue link to get your first orders rolling in.
          </p>
          <button
            onClick={() => {
              const url = window.location.origin + '/v/' + (window as any).__venueSlug;
              navigator.clipboard?.writeText(url).catch(() => {});
            }}
            style={{ ...DS.btnPrimary, padding: '10px 24px', fontSize: 13, marginTop: 8 }}
          >
            Copy venue link
          </button>
        </div>
      </div>
    );
  }

  const avg = reviewsList.reduce((s, r) => s + r.rating, 0) / reviewsList.length;

  return (
    <div>
      {pageHeader}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Star size={20} fill="#F5B400" color="#F5B400" />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--op-text)' }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: 14, color: 'var(--op-text-secondary)' }}>across {reviewsList.length} reviews</span>
      </div>
      {reviewsList.map((r) => (
        <div key={r.id} style={{
          background: 'var(--op-card-bg)',
          borderRadius: 'var(--op-radius-card)',
          padding: 16,
          border: '1px solid var(--op-card-border)',
          boxShadow: 'var(--op-shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14}
                  fill={i <= r.rating ? '#F5B400' : '#D1D1D1'}
                  color={i <= r.rating ? '#F5B400' : '#D1D1D1'} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.customerName}</span>
            <span style={{ fontSize: 12, color: 'var(--op-text-secondary)', marginLeft: 'auto' }}>
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, color: 'var(--op-text-secondary)', margin: 0 }}>{r.comment}</p>
          )}
          {(r as any).ownerReply ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(24,24,24,0.04)', border: '1px solid var(--op-border-soft)', borderRadius: 6 }}>
              <span style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: 4 }}>Owner reply:</span>
              <p style={{ fontSize: 13, color: 'var(--op-text)', margin: 0 }}>{(r as any).ownerReply}</p>
            </div>
          ) : (
            <ReviewReplyForm
              reviewId={r.id}
              onSuccess={() => utils.venue.listReviews.invalidate()}
            />
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
function ReviewReplyForm({ reviewId, onSuccess }: { reviewId: number; onSuccess: () => void }) {
  const token = localStorage.getItem('b1-owner-token') || '';
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);

  const replyMutation = trpc.venue.replyToReview.useMutation({
    onSuccess: () => {
      setReply('');
      setOpen(false);
      onSuccess();
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--op-text-secondary)', background: 'none', border: '1px solid var(--op-border-mid)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
      >
        Reply to this review
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(24,24,24,0.03)', border: '1px solid var(--op-border-soft)' }}>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        placeholder="Write your reply…"
        style={{ width: '100%', fontSize: 13, color: 'var(--op-text)', background: 'transparent', border: '1px solid var(--op-border-strong)', padding: '8px 10px', resize: 'vertical', fontFamily: 'Inter', boxSizing: 'border-box' as const }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => replyMutation.mutate({ token, reviewId, reply })}
          disabled={replyMutation.isPending || !reply.trim()}
          style={{ fontSize: '0.625rem', background: 'var(--op-btn-bg)', color: 'var(--op-btn-text)', border: 'none', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const, opacity: replyMutation.isPending || !reply.trim() ? 0.6 : 1 }}
        >
          {replyMutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
        <button
          onClick={() => { setOpen(false); setReply(''); }}
          style={{ fontSize: '0.625rem', background: 'none', color: 'var(--op-text-secondary)', border: '1px solid var(--op-border-strong)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Geist Mono', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
        >
          Cancel
        </button>
      </div>
      {replyMutation.isError && (
        <p style={{ fontSize: 12, color: '#B85450', marginTop: 6 }}>{replyMutation.error?.message}</p>
      )}
    </div>
  );
}
