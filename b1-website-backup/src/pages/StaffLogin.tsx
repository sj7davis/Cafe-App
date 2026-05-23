import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useStaffAuth, enableDemoMode } from '@/hooks/useStaffAuth';
import { Lock, User, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { staff, token, loading: authLoading } = useStaffAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // CRITICAL: Redirect to dashboard if already authenticated (demo mode OR real login)
  useEffect(() => {
    if (!authLoading && staff && token) {
      navigate('/staff');
    }
  }, [authLoading, staff, token, navigate]);

  const loginMutation = trpc.staffAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('b1-staff-token', data.token);
      window.location.hash = '/staff';
      window.location.reload();
    },
    onError: (err) => {
      setError(err.message || 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) return;
    loginMutation.mutate({ username, password });
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#181818' }} />
          <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>
            CHECKING SESSION...
          </p>
        </div>
      </div>
    );
  }

  // If already authenticated, this return won't render because of the redirect above
  // But include as safety net
  if (staff && token) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-10">
          <img src="/images/b1-logo-dark.png" alt="B1" className="h-16 w-auto mx-auto mb-4" />
          <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2rem)', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>
            STAFF LOGIN
          </h1>
          <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', marginTop: '0.75rem' }}>
            B1 BY BACKHAUS — EAST KEILOR
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border p-8" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
          {error && (
            <div className="mb-4 p-3 border" style={{ background: 'rgba(184,84,80,0.08)', borderColor: '#B85450' }}>
              <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B85450' }}>{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>USERNAME</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5E5E5E' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="YOUR USERNAME"
                required
                className="w-full bg-transparent border pl-10 pr-4 py-3 focus:outline-none transition-colors"
                style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', lineHeight: 1.5, color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }}
              />
            </div>
          </div>

          <div className="mb-6">
            <label style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>PASSWORD</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5E5E5E' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="YOUR PASSWORD"
                required
                className="w-full bg-transparent border pl-10 pr-4 py-3 focus:outline-none transition-colors"
                style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', lineHeight: 1.5, color: '#181818', borderColor: 'rgba(24,24,24,0.15)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-4 flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase', background: '#181818', color: '#F3F2EE' }}
          >
            {loginMutation.isPending ? 'SIGNING IN...' : <>SIGN IN<ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Demo Mode */}
        <div className="mt-4 text-center">
          <button
            onClick={enableDemoMode}
            className="w-full py-4 flex items-center justify-center gap-2 border transition-all hover:bg-[#5E8B8B] hover:text-[#F3F2EE] hover:border-[#5E8B8B]"
            style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: '#5E8B8B', color: '#5E8B8B' }}
          >
            <Zap size={16} /> TRY DEMO MODE
          </button>
          <p className="mt-2" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E5E5E' }}>
            No login required — browse all features
          </p>
        </div>

        <div className="mt-6 text-center space-y-2">
          <a href="#/" className="block transition-colors hover:text-[#181818]" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', textDecoration: 'none' }}>
            &larr; BACK TO CUSTOMER SITE
          </a>
          <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>
            DEFAULT: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
