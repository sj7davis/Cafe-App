import { useEffect, useRef, useState } from 'react'

interface UseVenueSSEParams {
  venueId: number | null
  token: string | null
  events: string[]
  onEvent: (eventName: string) => void
}

interface UseVenueSSEResult {
  connected: boolean
}

export function useVenueSSE({
  venueId,
  token,
  events,
  onEvent,
}: UseVenueSSEParams): UseVenueSSEResult {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)

  // Keep the ref up to date without re-creating EventSource on callback changes
  useEffect(() => {
    onEventRef.current = onEvent
  })

  useEffect(() => {
    if (!venueId || !token) {
      setConnected(false)
      return
    }

    const url = `/api/sse/orders/${venueId}?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.onopen = () => setConnected(true)

    es.onerror = () => setConnected(false)

    for (const name of events) {
      es.addEventListener(name, () => onEventRef.current(name))
    }

    return () => {
      es.close()
      setConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, token])

  return { connected }
}
