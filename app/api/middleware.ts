import { initTRPC } from "@trpc/server";
import { type TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();

export const createRouter = t.router;
export const publicQuery = t.procedure;
