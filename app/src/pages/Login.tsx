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
    padding: '11px 14px',
    border: '1px solid #E4E4E7',
    borderRadius: 8,
    fontSize: 14,
    color: '#09090B',
    background: '#FAFAFA',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '40px 24px' }}>

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Coffee size={22} color="#FAFAFA" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 14, color: '#71717A', margin: 0 }}>
            Sign in to your venue dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#09090B', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcafe.com.au"
                autoComplete="email"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#5E8B8B'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E4E4E7'; e.currentTarget.style.background = '#FAFAFA'; }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingRight: 44 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#5E8B8B'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E4E4E7'; e.currentTarget.style.background = '#FAFAFA'; }}
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
                padding: '13px',
                borderRadius: 8,
                border: 'none',
                background: loginMutation.isPending ? '#4a7070' : '#5E8B8B',
                color: '#FFFFFF',
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
              onMouseEnter={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = '#4a7070'; }}
              onMouseLeave={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = '#5E8B8B'; }}
            >
              {loginMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><LogIn size={16} /> Sign in to Dashboard</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/onboarding" style={{ fontSize: 13, color: '#5E8B8B', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3d6b6b'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5E8B8B'; }}
            >
              New cafe? Start free <ArrowRight size={13} />
            </Link>
            <Link to="/" style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#71717A'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; }}
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
