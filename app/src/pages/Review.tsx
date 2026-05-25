import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Star, CheckCircle } from 'lucide-react';

export default function Review() {
  const { orderId } = useParams<{ orderId: string }>();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitReview = trpc.venue.submitReview.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    if (!rating || !orderId) return;
    submitReview.mutate({
      orderId: parseInt(orderId, 10),
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const isAlreadyReviewed = submitReview.error?.data?.code === 'CONFLICT';

  // Thank-you panel — shown after successful submission
  if (submitted) {
    return (
      <div style={{ background: '#F3F2EE', minHeight: '100dvh', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: '32px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 32px',
            border: '1px solid rgba(24,24,24,0.06)',
            textAlign: 'center',
          }}>
            <CheckCircle size={56} style={{ color: '#16a34a', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#181818', marginBottom: 12 }}>
              Thanks for your review!
            </h1>
            <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 28 }}>
              Your feedback helps other customers and the cafe team.
            </p>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#181818',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already-reviewed panel — shown when backend returns CONFLICT
  if (isAlreadyReviewed) {
    return (
      <div style={{ background: '#F3F2EE', minHeight: '100dvh', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: '32px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 32px',
            border: '1px solid rgba(24,24,24,0.06)',
            textAlign: 'center',
          }}>
            <Star size={48} style={{ color: '#F5B400', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#181818', marginBottom: 12 }}>
              You've already reviewed this order
            </h1>
            <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 28 }}>
              Only one review is allowed per order. Thank you for your feedback!
            </p>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#181818',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#F3F2EE', minHeight: '100dvh', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#5E5E5E', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Review</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#181818', margin: '4px 0 0' }}>Leave a Review</h1>
        </div>

        {/* Review form card */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          border: '1px solid rgba(24,24,24,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#181818', marginBottom: 8 }}>
            How was your order?
          </h2>
          <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 24 }}>
            Select a star rating and leave an optional comment.
          </p>

          {/* Star picker row */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(i)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
              >
                <Star
                  size={32}
                  fill={i <= (hoveredRating || rating) ? '#F5B400' : '#D1D1D1'}
                  color={i <= (hoveredRating || rating) ? '#F5B400' : '#D1D1D1'}
                />
              </button>
            ))}
          </div>

          {/* Comment textarea */}
          <textarea
            rows={4}
            placeholder="Tell us more (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(24,24,24,0.12)',
              fontSize: 14,
              fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
              color: '#181818',
              background: '#fff',
              resize: 'vertical',
              boxSizing: 'border-box',
              marginBottom: 20,
            }}
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitReview.isPending}
            style={{
              background: '#181818',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: rating === 0 || submitReview.isPending ? 'not-allowed' : 'pointer',
              opacity: rating === 0 || submitReview.isPending ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {submitReview.isPending ? 'Submitting…' : 'Submit Review'}
          </button>

          {/* Generic error (non-CONFLICT) */}
          {submitReview.error && !isAlreadyReviewed && (
            <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>
              {submitReview.error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
