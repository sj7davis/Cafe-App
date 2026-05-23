import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { authenticateRequest } from "./kimi/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: { id: number; unionId: string; name: string | null; email: string | null; avatar: string | null; role: string };
  venueId?: number;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers) as any;
  } catch {
    // Authentication is optional here
  }
  const venueIdHeader = opts.req.headers.get("x-venue-id");
  if (venueIdHeader) {
    ctx.venueId = Number(venueIdHeader);
  }
  return ctx;
}
