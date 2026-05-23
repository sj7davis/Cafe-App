import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  venueId?: number;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  const venueIdHeader = opts.req.headers.get("x-venue-id");
  if (venueIdHeader) {
    ctx.venueId = Number(venueIdHeader);
  }
  return ctx;
}
