import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { trpc } from '@/providers/trpc';

const SCORE_LABELS: Record<number, string> = {
  0: 'Very dissatisfied', 1: 'Very dissatisfied', 2: 'Dissatisfied',
  3: 'Dissatisfied', 4: 'Below average', 5: 'Average',
  6: 'Above average', 7: 'Good', 8: 'Good', 9: 'Great', 10: 'Excellent',
};

function scoreColor(score: number): string {
  if (score >= 9) return '#16A34A';
  if (score >= 7) return '#D97706';
  return '#DC2626';
}

export default function NpsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  const venueId = Number(params.get('v') || 0);
  const venueName = params.get('name') || 'the venue';
  const orderNumber = params.get('order') || '';

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const submit = trpc.venue.submitNps.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🙏</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#09090B', margin: '0 0 10px', letterSpacing: '-0.03em' }}>Thank you!</h1>
          <p style={{ fontSize: 15, color: '#71717A', margin: 0, lineHeight: 1.6 }}>
            Your feedback helps {venueName} keep improving. We really appreciate you taking the time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>B1</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            How was your experience?
          </h1>
          <p style={{ fontSize: 14, color: '#71717A', margin: 0 }}>
            {orderNumber && `Order #${orderNumber.replace('B1-', '')} at `}{venueName}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: '32px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#09090B', margin: '0 0 20px', textAlign: 'center' }}>
            How likely are you to recommend {venueName} to a friend?
          </p>

          {/* Score grid 0–10 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 6, marginBottom: 10 }}>
            {Array.from({ length: 11 }, (_, i) => {
              const active = score === i;
              const hover = hovered === i;
              const col = scoreColor(i);
              return (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    border: `2px solid ${active ? col : hover ? col + '80' : '#E4E4E7'}`,
                    background: active ? col : hover ? col + '15' : '#FAFAF9',
                    color: active ? '#fff' : hover ? col : '#09090B',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {i}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: '#71717A' }}>Not likely</span>
            <span style={{ fontSize: 11, color: '#71717A' }}>Extremely likely</span>
          </div>

          {/* Score label */}
          {score !== null && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>
                {SCORE_LABELS[score]}
              </span>
            </div>
          )}

          {/* Comment */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#09090B', marginBottom: 8 }}>
              Anything you'd like to tell us? <span style={{ fontWeight: 400, color: '#71717A' }}>(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="What did you enjoy? What could be better?"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E4E4E7',
                borderRadius: 10,
                fontSize: 14,
                color: '#09090B',
                background: '#FAFAF9',
                resize: 'vertical' as const,
                fontFamily: 'Inter, -apple-system, sans-serif',
                boxSizing: 'border-box' as const,
                outline: 'none',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{comment.length}/500</div>
          </div>

          <button
            disabled={score === null || submit.isPending}
            onClick={() => {
              if (score === null || !orderId || !venueId) return;
              submit.mutate({ venueId, orderId: parseInt(orderId, 10), score, comment: comment || undefined });
            }}
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 10,
              border: 'none',
              background: score !== null ? '#5E8B8B' : '#E4E4E7',
              color: score !== null ? '#fff' : '#A1A1AA',
              fontSize: 15,
              fontWeight: 600,
              cursor: score !== null ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            {submit.isPending ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#A8A29E' }}>
          Takes 10 seconds · Anonymous unless you choose to add details
        </p>
      </div>
    </div>
  );
}
