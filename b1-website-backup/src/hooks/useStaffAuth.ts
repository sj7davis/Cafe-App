import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/providers/trpc';

interface StaffUser {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'staff';
}

const DEMO_USER: StaffUser = { id: 1, name: 'Store Manager', username: 'admin', role: 'admin' };
const DEMO_TOKEN = 'demo-token-12345';

export function isDemoMode(): boolean {
  return localStorage.getItem('b1-demo-mode') === 'true';
}

export function enableDemoMode() {
  localStorage.setItem('b1-demo-mode', 'true');
  localStorage.setItem('b1-staff-token', DEMO_TOKEN);
  window.location.reload();
}

export function disableDemoMode() {
  localStorage.removeItem('b1-demo-mode');
  localStorage.removeItem('b1-staff-token');
  window.location.reload();
}

export function useStaffAuth() {
  const demo = isDemoMode();
  const [staff, setStaff] = useState<StaffUser | null>(demo ? DEMO_USER : null);
  const [token, setToken] = useState<string>(() => {
    if (demo) return DEMO_TOKEN;
    return localStorage.getItem('b1-staff-token') || '';
  });

  const { data, isLoading, isError, error } = trpc.staffAuth.me.useQuery(
    token ? { token } : undefined,
    { enabled: !!token && !demo, retry: false }
  );

  // In demo mode, skip all API loading
  const loading = demo ? false : (!!token && isLoading);

  useEffect(() => {
    if (demo) return; // Demo mode is already set
    if (data) {
      setStaff(data);
    } else if (data === null || isError) {
      setStaff(null);
      if (token) {
        setToken('');
        localStorage.removeItem('b1-staff-token');
      }
    }
  }, [data, isError, token, demo]);

  const login = useCallback((newToken: string, user: StaffUser) => {
    localStorage.setItem('b1-staff-token', newToken);
    setToken(newToken);
    setStaff(user);
  }, []);

  const logout = useCallback(() => {
    disableDemoMode();
  }, []);

  const isAdmin = staff?.role === 'admin';
  const isManager = staff?.role === 'manager' || staff?.role === 'admin';
  const isStaff = !!staff;

  return {
    staff,
    token,
    loading,
    isDemo: demo,
    error: (!demo && isError) ? (error?.message || 'Auth error') : null,
    login,
    logout,
    isAdmin,
    isManager,
    isStaff,
  };
}
