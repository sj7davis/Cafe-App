import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { Coffee, LogIn, AlertCircle, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';

// ─── Design tokens (match Landing + VenuePublic warm aesthetic) ───────────────
const T = {
  bg:       '#F8F6F2',
  surface:  '#FFFFFF',
  border:   '#E4E4E7',
  text:     '#09090B',
  subtle:   '#71717A',
  accent:   '#5E8B8B',
  accentHover: '#4a7070',
  inputBg:  '#FAFAF9',
  errorBg:  '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#dc2626',
  font:     'Inter, -apple-system, Helvetica Neue, Arial, sans-serif',
} as const;

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
    padding: '12px 14px',
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    fontSize: 15,
    color: T.text,
    background: T.inputBg,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: T.font,
    transition: 'border-color 0.15s, background 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.font,
      padding: '40px 24px',
    }}>

      {/* Back to home — top-left nav feel */}
      <div style={{ width: '100%', maxWidth: 440, marginBottom: 8 }}>
        <Link
          to="/"
          style={{ fontSize: 13, color: T.subtle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.color = T.text; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.subtle; }}
        >
          ← Back to home
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo mark + headline */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: T.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Coffee size={20} color={T.bg} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: '0 0 6px', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: T.subtle, margin: 0, lineHeight: 1.5 }}>
            Sign in to your venue dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: T.surface,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          padding: '32px 32px 28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        }}>

          {error && (
            <div style={{
              background: T.errorBg,
              border: `1px solid ${T.errorBorder}`,
              borderRadius: 8,
              padding: '11px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: T.errorText,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 7, letterSpacing: '-0.01em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcafe.com.au"
                autoComplete="email"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.inputBg; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 7, letterSpacing: '-0.01em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingRight: 46 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.inputBg; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B4B0AA', display: 'flex', alignItems: 'center', padding: 0 }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 10,
                border: 'none',
                background: loginMutation.isPending ? T.accentHover : T.accent,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 2,
                transition: 'background 0.15s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = T.accentHover; }}
              onMouseLeave={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = T.accent; }}
            >
              {loginMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><LogIn size={16} /> Sign in to dashboard</>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/onboarding"
              style={{ fontSize: 13, color: T.accent, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = T.accentHover; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.accent; }}
            >
              New cafe? Start free <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Sub-footer */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#A8A29E' }}>
          By signing in you agree to our{' '}
          <span style={{ color: T.subtle, cursor: 'default' }}>Terms of Service</span>
          {' & '}
          <span style={{ color: T.subtle, cursor: 'default' }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
