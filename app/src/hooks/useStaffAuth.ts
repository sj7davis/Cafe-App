import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/providers/trpc';

interface StaffMember {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'staff';
}

interface StaffVenue {
  id: number;
  name: string;
  slug: string;
}

export function useStaffAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('b1-staff-token') || '');
  const [venueId, setVenueId] = useState(() => {
    const v = localStorage.getItem('b1-staff-venue-id');
    return v ? Number(v) : 0;
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.staffAuth.me.useQuery(
    token ? { token } : undefined,
    { enabled: !!token, retry: false }
  );

  const staff: StaffMember | null = data?.staff || null;
  const venue: StaffVenue | null = data?.venue || null;

  // Sync venue ID when staff data loads
  useEffect(() => {
    if (venue?.id) {
      localStorage.setItem('b1-staff-venue-id', String(venue.id));
      localStorage.setItem('b1-current-venue-id', String(venue.id));
      setVenueId(venue.id);
    }
  }, [venue?.id]);

  const isAdmin = staff?.role === 'admin';
  const isManager = staff?.role === 'manager' || staff?.role === 'admin';

  const logout = useCallback(() => {
    localStorage.removeItem('b1-staff-token');
    localStorage.removeItem('b1-staff-venue-id');
    setToken('');
    setVenueId(0);
    utils.staffAuth.me.invalidate();
    window.location.href = '/staff-login';
  }, [utils]);

  const login = useCallback((newToken: string, newVenueId: number) => {
    localStorage.setItem('b1-staff-token', newToken);
    localStorage.setItem('b1-staff-venue-id', String(newVenueId));
    localStorage.setItem('b1-current-venue-id', String(newVenueId));
    setToken(newToken);
    setVenueId(newVenueId);
  }, []);

  return {
    staff,
    venue,
    token,
    venueId,
    loading: isLoading,
    isAdmin,
    isManager,
    login,
    logout,
  };
}
