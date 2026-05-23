import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { Coffee, LogIn, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useVenueAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Owner Login — B1 Platform';
  }, []);

  const loginMutation = trpc.venue.login.useMutation({
    onSuccess: (data) => {
      login(data.token);
      navigate('/dashboard');
    },
    onError: (err) => {
      if (err.message === 'Invalid credentials' || err.data?.code === 'UNAUTHORIZED') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Unable to connect. Check your connection and try again.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F3F2EE',
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
            background: '#181818',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Coffee size={32} color="#F3F2EE" />
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#181818',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            Owner Login
          </h1>
          <p style={{
            fontSize: '14px',
            fontWeight: 400,
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(24,24,24,0.15)',
                  fontSize: '14px',
                  color: '#1c1917',
                  background: '#fafaf9',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(24,24,24,0.15)'; }}
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
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(24,24,24,0.15)',
                  fontSize: '14px',
                  color: '#1c1917',
                  background: '#fafaf9',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(24,24,24,0.15)'; }}
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
                background: '#181818',
                color: '#F3F2EE',
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
              {loginMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Onboarding link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/onboarding" style={{ fontSize: '13px', color: '#78716c', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#44403c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#78716c'; }}>
            New venue? Register here
          </Link>
        </div>

        {/* Back to home link */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#78716c',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#44403c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#78716c'; }}
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
