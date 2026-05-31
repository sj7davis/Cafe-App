/**
 * useToken — centralised auth token access.
 *
 * Replaces the 40+ scattered `localStorage.getItem('b1-owner-token') || ''`
 * calls. When session management changes (e.g. move to httpOnly cookie),
 * update only this file.
 */
export function useOwnerToken(): string {
  return localStorage.getItem('b1-owner-token') || '';
}

export function useStaffToken(): string {
  return localStorage.getItem('b1-staff-token') || '';
}

/** Returns whichever token is present (owner preferred, then staff). */
export function useAnyToken(): string {
  return localStorage.getItem('b1-owner-token')
    || localStorage.getItem('b1-staff-token')
    || '';
}
