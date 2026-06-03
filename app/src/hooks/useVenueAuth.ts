import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/providers/trpc';

interface VenueOwner {
  id: number;
  name: string | null;
  email: string;
  role: string | null;
}

interface Venue {
  id: number;
  slug: string;
  name: string;
  subdomain: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  squareEnabled: boolean | null;
}

export function useVenueAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('b1-owner-token') || '');

  const { data, isLoading } = trpc.venue.me.useQuery(
    token ? { token } : undefined,
    { enabled: !!token, retry: false, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const owner: VenueOwner | null = data?.owner || null;
  const venue: Venue | null = data?.venue || null;

  // Sync venue ID to localStorage for tRPC headers
  useEffect(() => {
    if (venue?.id) {
      localStorage.setItem('b1-current-venue-id', String(venue.id));
    } else {
      localStorage.removeItem('b1-current-venue-id');
    }
  }, [venue?.id]);

  const logout = useCallback(() => {
    localStorage.removeItem('b1-owner-token');
    localStorage.removeItem('b1-current-venue-id');
    setToken('');
    window.location.reload();
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem('b1-owner-token', newToken);
    setToken(newToken);
  }, []);

  return { owner, venue, token, loading: isLoading, login, logout };
}
