import { useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useState } from 'react'

export default function GiftCardLanding() {
  const { code } = useParams<{ code: string }>()
  const [venueId, setVenueId] = useState<number>(1)
  const [orderAmount, setOrderAmount] = useState('')
  const [redeemed, setRedeemed] = useState<{ discount: number; remainingBalance: number } | null>(null)
  const [error, setError] = useState('')

  // Look up gift card balance — we need venueId, so show a small form if not set
  // In production the URL would carry the venueId too, e.g. /gift/CAFE-ABC?v=3
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const resolvedVenueId = searchParams?.get('v') ? Number(searchParams.get('v')) : venueId

  const redeemMut = trpc.venue.redeemGiftCard.useMutation()

  // For display: fetch balance without redeeming
  const balanceQuery = trpc.venue.redeemGiftCard.useMutation()

  async function handleRedeem() {
    setError('')
    const amt = Number(orderAmount)
    if (!amt || amt <= 0) { setError('Enter a valid order amount'); return }
    try {
      const result = await redeemMut.mutateAsync({
        venueId: resolvedVenueId,
        code: code!.toUpperCase(),
        orderTotal: amt,
      })
      setRedeemed(result)
    } catch (e: any) {
      setError(e.message ?? 'Could not redeem gift card')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '1rem',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: '2.5rem',
        width: '100%', maxWidth: 420, color: '#f8fafc', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* Gift icon */}
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎁</div>

        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>
          Digital Gift Card
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Present this card when ordering to apply your balance.
        </p>

        {/* Card display */}
        <div style={{
          background: 'linear-gradient(135deg, #5E8B8B 0%, #3b6b8b 100%)',
          borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem',
          boxShadow: '0 10px 25px rgba(94,139,139,0.3)',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>
            GIFT CARD CODE
          </p>
          <p style={{
            margin: '0 0 1rem', fontSize: '2rem', fontWeight: 800,
            letterSpacing: '0.15em', color: '#fff'
          }}>
            {code?.toUpperCase()}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            Valid at participating locations · No expiry
          </p>
        </div>

        {redeemed ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: '#065f46', border: '1px solid #10b981', borderRadius: 10,
              padding: '1.25rem', marginBottom: '1rem'
            }}>
              <p style={{ margin: '0 0 0.25rem', color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>
                ✅ Redeemed!
              </p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 800 }}>
                −${redeemed.discount.toFixed(2)}
              </p>
              <p style={{ margin: 0, color: '#6ee7b7', fontSize: '0.875rem' }}>
                Remaining balance: ${redeemed.remainingBalance.toFixed(2)}
              </p>
            </div>
            {redeemed.remainingBalance > 0 && (
              <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Save this page — your remaining balance is ${redeemed.remainingBalance.toFixed(2)}
              </p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              Staff: enter order total to apply discount
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Order total ($)"
                value={orderAmount}
                onChange={e => setOrderAmount(e.target.value)}
                style={{
                  flex: 1, background: '#0f172a', border: '1px solid #334155',
                  borderRadius: 8, padding: '0.6rem 0.75rem', color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={redeemMut.isPending}
                style={{
                  background: '#5E8B8B', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600,
                  cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                {redeemMut.isPending ? '…' : 'Redeem'}
              </button>
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{error}</p>
            )}
            <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>
              This will deduct the gift card balance. Action cannot be undone.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
