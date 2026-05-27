import type { ServerResponse } from "http";

const clients = new Map<number, Set<ServerResponse>>();

export function addSseClient(venueId: number, res: ServerResponse): void {
  if (!clients.has(venueId)) clients.set(venueId, new Set());
  clients.get(venueId)!.add(res);
}

export function removeSseClient(venueId: number, res: ServerResponse): void {
  clients.get(venueId)?.delete(res);
}

export function broadcastToVenue(venueId: number, event: string, data: unknown): void {
  const set = clients.get(venueId);
  if (!set || set.size === 0) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      set.delete(res);
    }
  }
}
