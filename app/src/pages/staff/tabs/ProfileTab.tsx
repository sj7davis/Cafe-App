import React, { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  KeyRound,
  UserCircle,
  Shield,
  Lock,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { PasswordStrengthBar } from '../shared';

export function ProfileTab({ token, staff }: { token: string; staff: { id: number; name: string; username: string; role: string; email?: string | null; twoFaEnabled?: boolean } }) {
  const utils = trpc.useUtils();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: staff.name ?? '',
    email: (staff as any).email ?? '',
    phone: (staff as any).phone ?? '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // 2FA
  const [twoFaMsg, setTwoFaMsg] = useState('');
  const [twoFaError, setTwoFaError] = useState('');

  // Clock PIN
  const [pinValue, setPinValue] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

  const updateProfile = trpc.staffAuth.updateMyProfile.useMutation({
    onSuccess: () => {
      setProfileMsg('Profile updated!');
      setProfileError('');
      setTimeout(() => setProfileMsg(''), 3000);
    },
    onError: (e: any) => { setProfileError(e.message); },
  });

  const changePassword = trpc.staffAuth.changePassword.useMutation({
    onSuccess: () => {
      setPwMsg('Password changed!');
      setPwError('');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 3000);
    },
    onError: (e: any) => { setPwError(e.message); },
  });

  const enable2FA = trpc.staffAuth.enable2FA.useMutation({
    onSuccess: () => {
      setTwoFaMsg('Two-factor authentication enabled.');
      setTwoFaError('');
      utils.staffAuth.me.invalidate();
    },
    onError: (e: any) => { setTwoFaError(e.message); },
  });

  const disable2FA = trpc.staffAuth.disable2FA.useMutation({
    onSuccess: () => {
      setTwoFaMsg('Two-factor authentication disabled.');
      setTwoFaError('');
      utils.staffAuth.me.invalidate();
    },
    onError: (e: any) => { setTwoFaError(e.message); },
  });

  const setPin = trpc.staffAuth.setClockPin.useMutation({
    onSuccess: () => {
      setPinMsg('PIN set!');
      setPinError('');
      setPinValue('');
      setTimeout(() => setPinMsg(''), 3000);
    },
    onError: (e: any) => { setPinError(e.message); },
  });

  const clearPin = trpc.staffAuth.clearClockPin.useMutation({
    onSuccess: () => {
      setPinMsg('PIN cleared.');
      setPinError('');
      setTimeout(() => setPinMsg(''), 3000);
    },
    onError: (e: any) => { setPinError(e.message); },
  });

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7e5e4',
    padding: '24px',
    marginBottom: '16px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e7e5e4',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const labelSt: React.CSSProperties = {
    fontSize: '11px',
    color: '#78716c',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
  };

  const saveBtnSt: React.CSSProperties = {
    padding: '9px 20px',
    background: '#1c1917',
    color: '#fafaf9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  };

  const twoFaEnabled = (staff as any).twoFaEnabled ?? false;

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>My Profile</h2>

      {/* ── Staff Info ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCircle size={18} color="#5E8B8B" /> Personal Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelSt}>Full Name</label>
            <input
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>Username</label>
            <input
              value={staff.username}
              disabled
              style={{ ...inputStyle, background: '#f5f5f4', color: '#78716c' }}
            />
          </div>
          <div>
            <label style={labelSt}>Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>Phone</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+61 4xx xxx xxx"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <button
            onClick={() => {
              setProfileError('');
              updateProfile.mutate({ token, name: profileForm.name, email: profileForm.email || undefined, phone: profileForm.phone || undefined });
            }}
            disabled={updateProfile.isPending}
            style={{ ...saveBtnSt, opacity: updateProfile.isPending ? 0.7 : 1 }}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save Profile'}
          </button>
          {profileMsg && <span style={{ fontSize: '13px', color: '#16a34a' }}>{profileMsg}</span>}
          {profileError && <span style={{ fontSize: '13px', color: '#dc2626' }}>{profileError}</span>}
        </div>
      </div>

      {/* ── Change Password ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={18} color="#5E8B8B" /> Change Password
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <div>
            <label style={labelSt}>Current Password</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              autoComplete="current-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
          <div>
            <label style={labelSt}>New Password</label>
            <input
              type="password"
              value={pwForm.newPw}
              onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
            <PasswordStrengthBar password={pwForm.newPw} />
          </div>
          <div>
            <label style={labelSt}>Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              setPwError('');
              if (!pwForm.current || !pwForm.newPw) { setPwError('All fields are required'); return; }
              if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
              changePassword.mutate({ token, currentPassword: pwForm.current, newPassword: pwForm.newPw });
            }}
            disabled={changePassword.isPending}
            style={{ ...saveBtnSt, opacity: changePassword.isPending ? 0.7 : 1 }}
          >
            {changePassword.isPending ? 'Changing…' : 'Change Password'}
          </button>
          {pwMsg && <span style={{ fontSize: '13px', color: '#16a34a' }}>{pwMsg}</span>}
          {pwError && <span style={{ fontSize: '13px', color: '#dc2626' }}>{pwError}</span>}
        </div>
      </div>

      {/* ── Security / 2FA ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="#5E8B8B" /> Security
        </h3>

        {/* 2FA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f5f5f4' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Two-Factor Authentication</div>
            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
              {twoFaEnabled ? 'Enabled — your account is protected by email 2FA' : 'Disabled — enable to require an email code on login'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
              background: twoFaEnabled ? '#dcfce7' : '#f3f4f6',
              color: twoFaEnabled ? '#16a34a' : '#6b7280',
            }}>
              {twoFaEnabled ? 'ON' : 'OFF'}
            </span>
            {twoFaEnabled ? (
              <button
                onClick={() => { setTwoFaError(''); setTwoFaMsg(''); disable2FA.mutate({ token }); }}
                disabled={disable2FA.isPending}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {disable2FA.isPending ? '…' : 'Disable 2FA'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setTwoFaError('');
                  setTwoFaMsg('');
                  if (!profileForm.email && !(staff as any).email) {
                    setTwoFaError('Add an email address to your profile first');
                    return;
                  }
                  enable2FA.mutate({ token });
                }}
                disabled={enable2FA.isPending}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {enable2FA.isPending ? '…' : 'Enable 2FA'}
              </button>
            )}
          </div>
        </div>

        {/* Email verification status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c1917' }}>Email Address</div>
            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
              {profileForm.email || (staff as any).email || 'No email set'}
            </div>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            background: (staff as any).emailVerifiedAt ? '#dcfce7' : '#fef3c7',
            color: (staff as any).emailVerifiedAt ? '#16a34a' : '#d97706',
          }}>
            {(staff as any).emailVerifiedAt ? 'Verified' : 'Not verified'}
          </span>
        </div>

        {(twoFaMsg || twoFaError) && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: twoFaError ? '#dc2626' : '#16a34a' }}>
            {twoFaError || twoFaMsg}
          </div>
        )}
      </div>

      {/* ── Clock-In PIN ── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={18} color="#5E8B8B" /> Clock-In PIN
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelSt}>PIN (4–8 digits)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            pattern="\d{4,8}"
            placeholder="Enter 4–8 digit PIN"
            value={pinValue}
            onChange={e => { setPinError(''); setPinValue(e.target.value.replace(/\D/g, '')); }}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#a8a29e'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
          />
        </div>
        <button
          style={{ ...saveBtnSt, opacity: (pinValue.length < 4 || setPin.isPending) ? 0.6 : 1, cursor: (pinValue.length < 4 || setPin.isPending) ? 'not-allowed' : 'pointer' }}
          disabled={pinValue.length < 4 || setPin.isPending}
          onClick={() => setPin.mutate({ token, pin: pinValue })}
        >
          {setPin.isPending ? 'Saving…' : 'Set PIN'}
        </button>
        <div style={{ marginTop: '8px' }}>
          <button
            style={{ background: 'none', border: 'none', color: '#78716c', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            onClick={() => clearPin.mutate({ token })}
            disabled={clearPin.isPending}
          >
            {clearPin.isPending ? 'Clearing…' : 'Clear PIN'}
          </button>
        </div>
        {(pinMsg || pinError) && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: pinError ? '#dc2626' : '#16a34a' }}>
            {pinError || pinMsg}
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#a8a29e' }}>
          Staff enter this PIN on the shared clock-in tablet to clock in or out.
        </div>
      </div>
    </div>
  );
}
