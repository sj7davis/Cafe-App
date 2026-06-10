import { useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useState } from 'react'

export default function GiftCardLanding() {
  const { code } = useParams<{ code: string }>()
  const [venueId] = useState<number>(1)
  const [orderAmount, setOrderAmount] = useState('')
  const [redeemed, setRedeemed] = useState<{ discount: number; remainingBalance: number } | null>(null)
  const [error, setError] = useState('')

  // Look up gift card balance — we need venueId, so show a small form if not set
  // In production the URL would carry the venueId too, e.g. /gift/CAFE-ABC?v=3
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const resolvedVenueId = searchParams?.get('v') ? Number(searchParams.get('v')) : venueId

  const redeemMut = trpc.venue.redeemGiftCard.useMutation()


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
      minHeight: '100dvh',
      background: '#F3F2EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', padding: '24px 16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 28px',
        width: '100%', maxWidth: 420, textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        border: '1px solid rgba(24,24,24,0.06)',
      }}>
        {/* Gift icon */}
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎁</div>

        <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A' }}>
          Digital Gift Card
        </h1>
        <p style={{ color: '#5E5E5E', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
          Present this card when ordering to apply your balance.
        </p>

        {/* Card display */}
        <div style={{
          background: 'linear-gradient(135deg, #5E8B8B 0%, #3b6b8b 100%)',
          borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(94,139,139,0.25)',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gift Card Code
          </p>
          <p style={{
            margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: 800,
            letterSpacing: '0.15em', color: '#fff'
          }}>
            {code?.toUpperCase()}
          </p>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>
            Valid at participating locations · No expiry
          </p>
        </div>

        {redeemed ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
              padding: '1.25rem', marginBottom: '1rem'
            }}>
              <p style={{ margin: '0 0 0.25rem', color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
                Redeemed!
              </p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#1A1A1A' }}>
                −${redeemed.discount.toFixed(2)}
              </p>
              <p style={{ margin: 0, color: '#5E5E5E', fontSize: '0.875rem' }}>
                Remaining balance: ${redeemed.remainingBalance.toFixed(2)}
              </p>
            </div>
            {redeemed.remainingBalance > 0 && (
              <p style={{ color: '#5E5E5E', fontSize: '0.8rem' }}>
                Save this page — your remaining balance is ${redeemed.remainingBalance.toFixed(2)}
              </p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5E5E5E', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Apply Balance
            </p>
            <p style={{ color: '#9CA3AF', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              Staff: enter order total to calculate discount
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
                  flex: 1, background: '#fff', border: '1px solid rgba(24,24,24,0.15)',
                  borderRadius: 8, padding: '10px 12px', color: '#1A1A1A',
                  fontSize: '0.9rem', outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={redeemMut.isPending}
                style={{
                  background: '#5E8B8B', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 20px', fontWeight: 600,
                  cursor: redeemMut.isPending ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', opacity: redeemMut.isPending ? 0.7 : 1,
                }}
              >
                {redeemMut.isPending ? '…' : 'Redeem'}
              </button>
            </div>
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{error}</p>
            )}
            <p style={{ color: '#9CA3AF', fontSize: '0.75rem', margin: 0 }}>
              This will deduct the gift card balance. Action cannot be undone.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
