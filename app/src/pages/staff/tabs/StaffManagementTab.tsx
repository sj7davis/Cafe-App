import React, { useState } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { trpc } from '@/providers/trpc';


import {
  UserPlus,
  KeyRound,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function StaffManagementTab({ venueId: _venueId, isAdmin }: { venueId: number; isAdmin: boolean }) {
  const { staff } = useStaffAuth();
  const [showForm, setShowForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'staff' as const });
  const [error, setError] = useState('');
  const utils = trpc.useUtils();

  const staffToken = staff ? localStorage.getItem('b1-staff-token') || '' : '';
  const { data: staffList } = trpc.staffAuth.list.useQuery(
    { token: staffToken },
    { enabled: !!staff && !!staffToken }
  );

  const createStaff = trpc.staffAuth.create.useMutation({
    onSuccess: () => {
      utils.staffAuth.list.invalidate();
      setShowForm(false);
      setNewStaff({ name: '', username: '', password: '', role: 'staff' });
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const updateStaff = trpc.staffAuth.update.useMutation({
    onSuccess: () => utils.staffAuth.list.invalidate(),
  });

  const resetPassword = trpc.staffAuth.resetPassword.useMutation({
    onSuccess: () => alert('Password reset successfully'),
    onError: (err) => alert(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newStaff.name || !newStaff.username || !newStaff.password) {
      setError('All fields are required');
      return;
    }
    createStaff.mutate({
      token: staffToken,
      name: newStaff.name,
      username: newStaff.username,
      password: newStaff.password,
      role: newStaff.role,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Staff Management</h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              background: showForm ? '#57534e' : '#1c1917',
              color: '#fafaf9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={16} /> {showForm ? 'Cancel' : 'Add Staff'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4',
          padding: '24px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create Staff Account</h3>
          {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              placeholder="Full Name"
              value={newStaff.name}
              onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <input
              placeholder="Username"
              value={newStaff.username}
              onChange={e => setNewStaff({ ...newStaff, username: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={newStaff.password}
              onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none' }}
            />
            <select
              value={newStaff.role}
              onChange={e => setNewStaff({ ...newStaff, role: e.target.value as any })}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', outline: 'none', background: '#fafaf9' }}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={createStaff.isPending}
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                background: '#1c1917',
                color: '#fafaf9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: createStaff.isPending ? 'not-allowed' : 'pointer',
                opacity: createStaff.isPending ? 0.7 : 1,
              }}
            >
              {createStaff.isPending ? 'Creating...' : 'Create Staff Account'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Login</th>
              {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {staffList?.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{s.name}</td>
                <td style={{ padding: '14px 16px', color: '#78716c' }}>{s.username}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: s.role === 'admin' ? '#fef2f2' : s.role === 'manager' ? '#fff7ed' : '#f5f5f4',
                    color: s.role === 'admin' ? '#dc2626' : s.role === 'manager' ? '#ea580c' : '#57534e',
                  }}>
                    {s.role}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: s.isActive ? '#22c55e' : '#d6d3d1',
                    }} />
                    <span style={{ fontSize: '12px', color: s.isActive ? '#16a34a' : '#a8a29e' }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: '#78716c', fontSize: '12px' }}>
                  {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                {isAdmin && (
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select
                        value={s.role}
                        onChange={(e) => updateStaff.mutate({ token: staffToken, staffId: s.id, role: e.target.value as any })}
                        style={{
                          padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e5e4',
                          fontSize: '11px', background: '#fafaf9', cursor: 'pointer',
                        }}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        title="Reset Password"
                        onClick={() => {
                          const newPw = prompt('Enter new password:');
                          if (newPw) resetPassword.mutate({ token: staffToken, staffId: s.id, newPassword: newPw });
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#a8a29e', padding: '4px', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        title={s.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => updateStaff.mutate({ token: staffToken, staffId: s.id, isActive: !s.isActive })}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: s.isActive ? '#dc2626' : '#16a34a', padding: '4px',
                          display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        {s.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )) ?? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: '#78716c' }}>
                  No staff members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
