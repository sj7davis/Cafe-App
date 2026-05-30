/**
 * SSE client store — uses Web Streams API (ReadableStreamDefaultController)
 * so the Hono route can return a proper Response<ReadableStream> instead of
 * writing directly to the raw Node.js ServerResponse (which breaks Hono's
 * context-finalization contract and causes ERR_HTTP_HEADERS_SENT).
 */

type SseController = ReadableStreamDefaultController<Uint8Array>;

const clients = new Map<number, Set<SseController>>();
const encoder = new TextEncoder();

export function addSseClient(venueId: number, ctrl: SseController): void {
  if (!clients.has(venueId)) clients.set(venueId, new Set());
  clients.get(venueId)!.add(ctrl);
}

export function removeSseClient(venueId: number, ctrl: SseController): void {
  clients.get(venueId)?.delete(ctrl);
  // Clean up empty sets
  if (clients.get(venueId)?.size === 0) clients.delete(venueId);
}

export function broadcastToVenue(
  venueId: number,
  event: string,
  data: unknown,
): void {
  const set = clients.get(venueId);
  if (!set || set.size === 0) return;
  const msg = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const ctrl of set) {
    try {
      ctrl.enqueue(msg);
    } catch {
      // Controller is closed — remove dead client
      set.delete(ctrl);
    }
  }
}
