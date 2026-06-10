import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Coffee, LogIn, AlertCircle, ArrowLeft, Shield, KeyRound, Mail } from 'lucide-react';

// ─── Shared styles ───
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '8px',
  border: '1px solid #E4E4E7',
  fontSize: '14px',
  color: '#09090B',
  background: '#FAFAFA',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#09090B',
  marginBottom: '6px',
};

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  borderRadius: '8px',
  border: 'none',
  background: '#5E8B8B',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '6px',
};

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
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
      {msg}
    </div>
  );
}

function SuccessBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '10px',
      padding: '12px 14px',
      marginBottom: '20px',
      fontSize: '13px',
      color: '#16a34a',
    }}>
      {msg}
    </div>
  );
}

// ─── Password Strength ───
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#e7e5e4' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#10b981' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 2, background: '#e7e5e4', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: color, transition: 'width 0.3s, background 0.3s', borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, marginTop: 3, display: 'block' }}>{label}</span>
    </div>
  );
}

export default function StaffLogin() {
  const { login } = useStaffAuth();

  // ── Parse URL params ──
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset');
  const verifyToken = params.get('verify');
  const venueIdParam = params.get('venue');

  // ── Login state ──
  const [venueId, setVenueId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // ── 2FA state ──
  const [requiresTwoFa, setRequiresTwoFa] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  // ── Forgot password state ──
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  // ── Reset password state ──
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

  // ── Email verify state ──
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // ── Mutations ──
  const loginMutation = trpc.staffAuth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.requiresTwoFa) {
        setPendingToken(data.pendingToken ?? '');
        setRequiresTwoFa(true);
      } else {
        login(data.token, data.venue.id);
        window.location.href = '/staff';
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Login failed');
    },
  });

  const verifyTwoFaMutation = trpc.staffAuth.verifyTwoFa.useMutation({
    onSuccess: (data: any) => {
      login(data.token, data.venue.id);
      window.location.href = '/staff';
    },
    onError: (err: any) => {
      setOtpError(err.message || 'Invalid code');
    },
  });

  const forgotPasswordMutation = trpc.staffAuth.forgotPassword.useMutation({
    onSuccess: () => {
      setForgotMsg('Check your email for a reset link');
      setForgotError('');
      setForgotEmail('');
    },
    onError: (err: any) => {
      setForgotError(err.message || 'Failed to send reset link');
    },
  });

  const resetPasswordMutation = trpc.staffAuth.resetPasswordByToken.useMutation({
    onSuccess: () => {
      setResetMsg('Password updated! You can now log in.');
      setResetError('');
    },
    onError: (err: any) => {
      setResetError(err.message || 'Failed to reset password');
    },
  });

  const verifyEmailMutation = trpc.staffAuth.verifyEmail.useMutation({
    onSuccess: () => {
      setVerifyMsg('Email verified! You can now log in.');
    },
    onError: (err: any) => {
      setVerifyError(err.message || 'Verification failed');
    },
  });

  // Auto-verify email on mount
  useEffect(() => {
    if (verifyToken && venueIdParam) {
      verifyEmailMutation.mutate({ token: verifyToken, venueId: Number(venueIdParam) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }
    verifyTwoFaMutation.mutate({ pendingToken, code: otpCode.trim() });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    setForgotError('');
    const vid = Number(venueId);
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email');
      return;
    }
    if (!vid) {
      setForgotError('Please enter your Venue ID above first');
      return;
    }
    forgotPasswordMutation.mutate({ email: forgotEmail.trim(), venueId: vid });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetNewPw.trim()) {
      setResetError('Please enter a new password');
      return;
    }
    if (resetNewPw !== resetConfirmPw) {
      setResetError('Passwords do not match');
      return;
    }
    resetPasswordMutation.mutate({
      resetToken: resetToken!,
      venueId: Number(venueIdParam),
      newPassword: resetNewPw,
    });
  };

  // ── Determine which screen to show ──
  const isVerifyFlow = !!(verifyToken && venueIdParam);
  const isResetFlow = !!(resetToken && venueIdParam);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: '#18181B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            {requiresTwoFa ? <Shield size={28} color="#FAFAFA" /> : isResetFlow ? <KeyRound size={28} color="#FAFAFA" /> : <Coffee size={28} color="#FAFAFA" />}
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#09090B',
            margin: 0,
            letterSpacing: '-0.03em',
          }}>
            {requiresTwoFa ? 'Two-Factor Verification' : isResetFlow ? 'Reset Password' : isVerifyFlow ? 'Email Verification' : 'Staff Login'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#71717A',
            margin: '6px 0 0',
          }}>
            {requiresTwoFa
              ? 'Enter the 6-digit code sent to your email'
              : isResetFlow
              ? 'Set your new password below'
              : isVerifyFlow
              ? 'Confirming your email address…'
              : 'B1 Platform — Sign in to your venue'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E4E4E7',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        }}>

          {/* ── Email verify screen ── */}
          {isVerifyFlow && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              {verifyEmailMutation.isPending && (
                <p style={{ color: '#78716c', fontSize: '14px' }}>Verifying…</p>
              )}
              {verifyMsg && <SuccessBanner msg={verifyMsg} />}
              {verifyError && <ErrorBanner msg={verifyError} />}
              {(verifyMsg || verifyError) && (
                <a href="/staff-login" style={{ fontSize: '13px', color: '#09090B', fontWeight: 600 }}>
                  Go to Login
                </a>
              )}
            </div>
          )}

          {/* ── Reset password screen ── */}
          {isResetFlow && !isVerifyFlow && (
            <>
              {resetMsg ? (
                <div>
                  <SuccessBanner msg={resetMsg} />
                  <a href="/staff-login" style={{ fontSize: '13px', color: '#09090B', fontWeight: 600 }}>
                    Back to Login
                  </a>
                </div>
              ) : (
                <>
                  <ErrorBanner msg={resetError} />
                  <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <input
                        type="password"
                        value={resetNewPw}
                        onChange={e => setResetNewPw(e.target.value)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
                      />
                      <PasswordStrengthBar password={resetNewPw} />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Password</label>
                      <input
                        type="password"
                        value={resetConfirmPw}
                        onChange={e => setResetConfirmPw(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                      style={{
                        ...btnPrimaryStyle,
                        cursor: resetPasswordMutation.isPending ? 'not-allowed' : 'pointer',
                        opacity: resetPasswordMutation.isPending ? 0.7 : 1,
                      }}
                    >
                      <KeyRound size={18} />
                      {resetPasswordMutation.isPending ? 'Setting Password…' : 'Set New Password'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ── 2FA screen ── */}
          {!isVerifyFlow && !isResetFlow && requiresTwoFa && (
            <>
              {otpError && <ErrorBanner msg={otpError} />}
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>6-Digit Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    style={{
                      ...inputStyle,
                      textAlign: 'center',
                      letterSpacing: '6px',
                      fontSize: '22px',
                      fontWeight: 700,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifyTwoFaMutation.isPending}
                  style={{
                    ...btnPrimaryStyle,
                    cursor: verifyTwoFaMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: verifyTwoFaMutation.isPending ? 0.7 : 1,
                  }}
                >
                  <Shield size={18} />
                  {verifyTwoFaMutation.isPending ? 'Verifying…' : 'Verify'}
                </button>
              </form>
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    setRequiresTwoFa(false);
                    setPendingToken('');
                    setOtpCode('');
                    setOtpError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#71717A',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Back to login
                </button>
              </div>
            </>
          )}

          {/* ── Normal login screen ── */}
          {!isVerifyFlow && !isResetFlow && !requiresTwoFa && (
            <>
              <ErrorBanner msg={error} />
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>Venue ID</label>
                  <input
                    type="number"
                    value={venueId}
                    onChange={e => setVenueId(e.target.value)}
                    placeholder="Enter your venue ID"
                    min={1}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5E8B8B'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  style={{
                    ...btnPrimaryStyle,
                    cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: loginMutation.isPending ? 0.7 : 1,
                  }}
                >
                  <LogIn size={18} />
                  {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {/* Forgot password */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #E4E4E7', paddingTop: '16px' }}>
                <button
                  onClick={() => {
                    setShowForgotPw(v => !v);
                    setForgotMsg('');
                    setForgotError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#71717A',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>

                {showForgotPw && (
                  <div style={{ marginTop: '14px' }}>
                    {forgotMsg ? (
                      <SuccessBanner msg={forgotMsg} />
                    ) : (
                      <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {forgotError && <ErrorBanner msg={forgotError} />}
                        <div>
                          <label style={{ ...labelStyle, fontSize: '12px' }}>Your Email Address</label>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={forgotPasswordMutation.isPending}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#5E8B8B',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: forgotPasswordMutation.isPending ? 'not-allowed' : 'pointer',
                            opacity: forgotPasswordMutation.isPending ? 0.7 : 1,
                          }}
                        >
                          <Mail size={14} />
                          {forgotPasswordMutation.isPending ? 'Sending…' : 'Send Reset Link'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Back link */}
        {!isVerifyFlow && !isResetFlow && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a
              href="/#/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#71717A',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#09090B'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; }}
            >
              <ArrowLeft size={14} />
              Back to home
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
