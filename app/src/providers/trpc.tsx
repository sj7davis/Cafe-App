import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState, type ReactNode } from "react";
import type { AppRouter } from "../../api/router";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Extract a human-readable message from any error shape.
 * tRPC wraps server errors in a TRPCClientError — the actual message
 * is inside data.message or just error.message.
 */
function extractMessage(error: unknown): string {
  if (!error) return 'Something went wrong.';
  const e = error as { message?: string; data?: { message?: string; code?: string }; shape?: { message?: string } };
  // tRPC validation errors have a nice message in data.message
  if (e.data?.message) return e.data.message;
  if (e.shape?.message) return e.shape.message;
  if (e.message) {
    // Strip internal tRPC prefix if present
    return e.message.replace(/^TRPCClientError: /, '');
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Global toast ref — set by TRPCProvider once mounted so the MutationCache
 * can call it without needing React context (MutationCache is created once,
 * before the first render).
 */
let _globalErrorToast: ((msg: string) => void) | null = null;
export function setGlobalErrorToast(fn: (msg: string) => void) {
  _globalErrorToast = fn;
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
        // Don't show error toasts for background queries — only explicit mutations
        throwOnError: false,
      },
      mutations: {
        throwOnError: false,
      },
    },
    // Global mutation error handler — fires for every useMutation that fails
    // without its own onError, so every silent failure now surfaces a toast.
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Skip if the mutation already defines its own onError
        if (mutation.options.onError) return;
        const msg = extractMessage(error);
        if (_globalErrorToast) {
          _globalErrorToast(msg);
        } else {
          console.error('[tRPC mutation error]', msg, error);
        }
      },
    }),
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            const headers: Record<string, string> = {};
            const venueId = localStorage.getItem("b1-current-venue-id");
            if (venueId) headers["x-venue-id"] = venueId;
            return headers;
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
