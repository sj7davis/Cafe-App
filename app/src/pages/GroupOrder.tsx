import { useParams, useSearchParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Users, Loader2, ShoppingBag, AlertTriangle } from 'lucide-react'

const TEAL = '#5E8B8B'

export default function GroupOrder() {
  const { code } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const venueIdParam = searchParams.get('v')

  const { data: session, isLoading, error } = trpc.venue.getGroupSession.useQuery(
    { sessionCode: code || '' },
    { enabled: !!code }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin" style={{ color: TEAL }} />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#181818', marginBottom: 8 }}>Session Not Found</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20 }}>
            This group order session doesn't exist or has expired.
          </p>
          {venueIdParam && (
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // The API returns { session, participants } with items stored as JSON per participant.
  const s = {
    sessionCode: session.session.sessionCode,
    hostName: session.session.hostName,
    venueId: session.session.venueId,
    status: session.session.status as string | undefined,
    totalAmount: session.session.totalAmount != null ? Number(session.session.totalAmount) : undefined,
    participants: session.participants.map(p => {
      let items: { name: string; qty: number }[] = []
      try {
        const parsed = JSON.parse(p.itemsJson)
        if (Array.isArray(parsed)) {
          items = parsed.map((it: any) => ({
            name: String(it.name ?? it.itemName ?? 'Item'),
            qty: Number(it.qty ?? it.quantity ?? 1),
          }))
        }
      } catch { /* malformed itemsJson — show participant with no items */ }
      return { name: p.participantName, items }
    }),
  }

  const addMyItemsUrl = venueIdParam
    ? `/v/${venueIdParam}?group=${s.sessionCode}`
    : undefined

  const participants = s.participants ?? []
  const grandTotal = s.totalAmount ?? 0

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ background: TEAL, color: '#fff', padding: '16px 20px' }}>
        <div className="max-w-md mx-auto flex items-center gap-12">
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Group Order</h1>
            <p style={{ fontSize: 12, margin: '2px 0 0', opacity: 0.8 }}>Hosted by {s.hostName}</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Session Code */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: 6 }}>SESSION CODE</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#181818', letterSpacing: 6 }}>{s.sessionCode}</div>
          {s.status && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: s.status === 'active' ? '#10b981' : '#9ca3af', textTransform: 'capitalize' }}>
              {s.status === 'active' ? '🟢 ' : '⚪ '}{s.status}
            </div>
          )}
        </div>

        {/* Participants */}
        {participants.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 12 }}>
              Participants ({participants.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {participants.map((p, i) => (
                <div key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 4 }}>{p.name}</div>
                  {p.items.map((item, j) => (
                    <div key={j} style={{ fontSize: 12, color: '#5E5E5E', display: 'flex', gap: 6 }}>
                      <span>{item.qty}×</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {grandTotal > 0 && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#181818' }}>
                <span>Group Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center', color: '#9ca3af' }}>
            <ShoppingBag size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>No items added yet</p>
          </div>
        )}

        {/* Add my items */}
        {addMyItemsUrl && (
          <button
            onClick={() => navigate(addMyItemsUrl)}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#181818', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            + Add My Items
          </button>
        )}
      </div>
    </div>
  )
}
