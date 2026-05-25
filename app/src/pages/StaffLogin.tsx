import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Coffee, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';

export default function StaffLogin() {
  const { login } = useStaffAuth();
  const [venueId, setVenueId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = trpc.staffAuth.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.venue.id);
      window.location.href = '/staff';
    },
    onError: (err) => {
      setError(err.message || 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const vid = Number(venueId);
    if (!vid || !username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    loginMutation.mutate({ venueId: vid, username: username.trim(), password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f4',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#1c1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Coffee size={32} color="#fafaf9" />
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1c1917',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            Staff Login
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#78716c',
            margin: '6px 0 0',
          }}>
            B1 Platform — Sign in to your venue
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#dc2626',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#44403c',
                marginBottom: '6px',
              }}>
                Venue ID
              </label>
              <input
                type="number"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                placeholder="Enter your venue ID"
                min={1}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e7e5e4',
                  fontSize: '14px',
                  color: '#1c1917',
                  background: '#fafaf9',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#44403c',
                marginBottom: '6px',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e7e5e4',
                  fontSize: '14px',
                  color: '#1c1917',
                  background: '#fafaf9',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#44403c',
                marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e7e5e4',
                  fontSize: '14px',
                  color: '#1c1917',
                  background: '#fafaf9',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: '#1c1917',
                color: '#fafaf9',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: loginMutation.isPending ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              <LogIn size={18} />
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a
            href="/#/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#78716c',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#44403c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#78716c'; }}
          >
            <ArrowLeft size={14} />
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
