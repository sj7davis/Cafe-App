import { useState } from 'react'
import { useParams } from 'react-router'
import { trpc } from '@/providers/trpc'

const TEAL = '#5E8B8B' // fallback; primaryColor used below once venue loads
const TODAY = new Date().toISOString().slice(0, 10)

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let h = 8; h <= 15; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 15 || true) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots.filter(s => s <= '15:30')
})()

function formatSlot(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m === 0 ? `${display}${suffix}` : `${display}:${String(m).padStart(2, '0')}${suffix}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()

  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [partySize, setPartySize] = useState(2)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: venue, isLoading: venueLoading, isError: venueError } = trpc.venue.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  )
  const venueId = venue?.id
  const primaryColor = venue?.primaryColor || '#5E8B8B'

  const { data: availabilityData } = trpc.reservations.getAvailability.useQuery(
    { venueId: venueId!, date: selectedDate },
    { enabled: !!selectedDate && !!venueId }
  )

  const bookingCounts: Record<string, number> = {}
  if (availabilityData) {
    ;(availabilityData as { time: string; count: number }[]).forEach(({ time, count }) => {
      bookingCounts[time] = count
    })
  }

  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setConfirmed(true)
      setFormError('')
    },
    onError: (err) => {
      setFormError(err.message || 'Something went wrong. Please try again.')
    },
  })

  const handleBook = () => {
    setFormError('')
    if (!customerName.trim()) { setFormError('Please enter your name.'); return }
    if (!customerPhone.trim()) { setFormError('Please enter your phone number.'); return }
    if (!selectedTime) { setFormError('Please select a time slot.'); return }
    if (!venueId) return

    createReservation.mutate({
      venueId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      partySize,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
      notes: notes.trim() || undefined,
    })
  }

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (venueLoading) {
    return (
      <div style={{ maxWidth: 512, margin: '0 auto', padding: 24, minHeight: '100vh', background: '#fff', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${primaryColor}30`, borderTopColor: primaryColor, animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, color: '#5E5E5E' }}>Loading booking page…</p>
        </div>
      </div>
    )
  }

  if (venueError || (slug && !venueLoading && !venue)) {
    return (
      <div style={{ maxWidth: 512, margin: '0 auto', padding: 24, minHeight: '100vh', background: '#fff', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#181818', marginBottom: 8 }}>Venue not found</h2>
          <p style={{ fontSize: 14, color: '#5E5E5E' }}>This booking page isn't available. Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 512, margin: '0 auto', padding: 24, minHeight: '100vh', background: '#fff', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        {venue?.name && (
          <div style={{ fontSize: 13, fontWeight: 600, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {venue.name}
          </div>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#181818', margin: 0 }}>Make a Reservation</h1>
      </div>

      {confirmed ? (
        /* ── Confirmation Card ── */
        <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(94,139,139,0.08)', borderRadius: 12, border: `1px solid ${TEAL}30` }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#181818', marginBottom: 8 }}>Reservation Confirmed!</h2>
          <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 4 }}>
            <strong>{formatDate(selectedDate)}</strong> at <strong>{formatSlot(selectedTime!)}</strong>
          </p>
          <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 16 }}>Party of {partySize}</p>
          <p style={{ fontSize: 13, color: TEAL }}>You'll receive an SMS confirmation shortly.</p>
          <button
            onClick={() => { setConfirmed(false); setSelectedTime(null); setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setNotes(''); }}
            style={{ marginTop: 20, padding: '8px 20px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Make Another Reservation
          </button>
        </div>
      ) : (
        <>
          {/* ── Date picker ── */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={TODAY}
              onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null) }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>

          {/* ── Time slots ── */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Time
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TIME_SLOTS.map(slot => {
                const count = bookingCounts[slot] ?? 0
                const isSelected = selectedTime === slot
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '8px 4px', borderRadius: 8, border: isSelected ? 'none' : '1px solid rgba(24,24,24,0.15)',
                      background: isSelected ? primaryColor : '#fff',
                      color: isSelected ? '#fff' : '#181818',
                      fontSize: 12, fontWeight: isSelected ? 600 : 400, cursor: 'pointer',
                      textAlign: 'center', lineHeight: 1.3,
                      transition: 'all 0.15s',
                    }}
                  >
                    {formatSlot(slot)}
                    {count > 0 && (
                      <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>
                        {count} booking{count > 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Reservation form (shown after time selected) ── */}
          {selectedTime && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${TEAL}12`, border: `1px solid ${TEAL}30`, fontSize: 13, color: TEAL, fontWeight: 500 }}>
                📅 {formatDate(selectedDate)} at {formatSlot(selectedTime)}
              </div>

              {/* Party size */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#181818', marginBottom: 4 }}>Party Size</label>
                <select
                  value={partySize}
                  onChange={e => setPartySize(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff', boxSizing: 'border-box' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="Full name *"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff' }}
              />
              <input
                type="tel"
                placeholder="Phone number *"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff' }}
              />
              <input
                type="email"
                placeholder="Email address (optional)"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff' }}
              />
              <textarea
                placeholder="Special requests (optional)"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.15)', fontSize: 14, color: '#181818', background: '#fff', resize: 'vertical' }}
              />

              {formError && (
                <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{formError}</p>
              )}

              <button
                onClick={handleBook}
                disabled={createReservation.isPending}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 8, border: 'none',
                  background: primaryColor, color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: createReservation.isPending ? 'not-allowed' : 'pointer',
                  opacity: createReservation.isPending ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {createReservation.isPending ? 'Booking…' : 'Book Table'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Embed code (hidden inside iframe) ── */}
      {!isInIframe && (
        <div style={{ marginTop: 48, padding: 16, background: '#f8f8f7', borderRadius: 8, border: '1px solid rgba(24,24,24,0.08)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#5E5E5E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Embed this booking form</p>
          <code style={{ display: 'block', fontSize: 11, color: '#181818', background: '#fff', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(24,24,24,0.1)', wordBreak: 'break-all', userSelect: 'all', lineHeight: 1.5 }}>
            {`<iframe src="${currentUrl}" width="100%" height="600" frameborder="0"></iframe>`}
          </code>
        </div>
      )}
    </div>
  )
}
