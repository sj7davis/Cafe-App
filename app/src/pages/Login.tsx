import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { Coffee, LogIn, AlertCircle, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useVenueAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError('Invalid email or password.');
      } else {
        setError('Unable to connect. Please try again.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    border: '1px solid #e5e2de',
    borderRadius: 10,
    fontSize: 14,
    color: '#1c1917',
    background: '#fafaf9',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(160deg, #1c1917 0%, #292524 50%, #3D2B1F 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="hidden md:flex"
      >
        {/* Background pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={20} color="#1c1917" />
            </div>
            <div>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>B1 Platform</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>Venue Management</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Run your cafe<br />
            <span style={{ color: '#C4953A' }}>smarter.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
            Orders, loyalty, staff, analytics, and bookings — all in one place built for Australian cafes.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
            {['Online Ordering', 'Loyalty Points', 'Staff Management', 'Real-time KDS', 'Booking System', 'Analytics'].map(f => (
              <span key={f} style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.05)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © 2026 B1 Platform · Built for Australian cafes
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F6F3',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ display: 'none', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1c1917', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={22} color="#F3F2EE" />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1c1917', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: '#78716c', margin: 0 }}>
              Sign in to your venue dashboard
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#dc2626',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#44403c', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcafe.com.au"
                autoComplete="email"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e2de'; e.currentTarget.style.background = '#fafaf9'; }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#44403c' }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingRight: 44 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#a8a29e'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e2de'; e.currentTarget.style.background = '#fafaf9'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', display: 'flex', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: loginMutation.isPending ? '#57534e' : '#1c1917',
                color: '#F3F2EE',
                fontSize: 14,
                fontWeight: 600,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                transition: 'background 0.15s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = '#292524'; }}
              onMouseLeave={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = '#1c1917'; }}
            >
              {loginMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><LogIn size={16} /> Sign in to Dashboard</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e8e5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/onboarding" style={{ fontSize: 13, color: '#5E8B8B', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3d6b6b'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5E8B8B'; }}
            >
              New venue? Register <ArrowRight size={13} />
            </Link>
            <Link to="/" style={{ fontSize: 13, color: '#a8a29e', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#57534e'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#a8a29e'; }}
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
