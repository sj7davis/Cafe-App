import type { IncomingMessage } from "http";
import type { ServerResponse } from "http";
import type { NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http";

export type TrpcContext = {
  req: IncomingMessage;
  res: ServerResponse;
  venueId?: number;
};

export async function createContext(
  opts: NodeHTTPCreateContextFnOptions<IncomingMessage, ServerResponse>,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req as unknown as IncomingMessage, res: opts.res };
  const venueIdHeader = opts.req.headers["x-venue-id"];
  if (venueIdHeader) {
    ctx.venueId = Number(Array.isArray(venueIdHeader) ? venueIdHeader[0] : venueIdHeader);
  }
  return ctx;
}
