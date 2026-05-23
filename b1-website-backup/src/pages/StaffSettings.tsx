import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useStaffAuth, isDemoMode } from '@/hooks/useStaffAuth';
import { ArrowLeft, Users, Plus, Shield, User, Save, Loader2 } from 'lucide-react';

const DEMO_STAFF = [
  { id: 1, name: 'Store Manager', username: 'admin', role: 'admin' as const, isActive: true, lastLoginAt: new Date(), createdAt: new Date('2024-01-01') },
  { id: 2, name: 'Shift Lead', username: 'maria', role: 'manager' as const, isActive: true, lastLoginAt: new Date(Date.now() - 86400000), createdAt: new Date('2024-02-15') },
  { id: 3, name: 'Barista', username: 'alex', role: 'staff' as const, isActive: true, lastLoginAt: new Date(Date.now() - 172800000), createdAt: new Date('2024-03-01') },
];

export default function StaffSettings() {
  const navigate = useNavigate();
  const { token, loading: authLoading, error: authError, isAdmin, logout, staff } = useStaffAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'staff' as 'admin' | 'manager' | 'staff' });
  const [resetPwd, setResetPwd] = useState<{ id: number; pwd: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const demo = isDemoMode();

  const { data: apiStaffList, refetch } = trpc.staffAuth.list.useQuery(
    { token: token || '' },
    { enabled: isAdmin && !!token && !demo }
  );

  const staffList = demo ? DEMO_STAFF : apiStaffList;

  const createStaff = trpc.staffAuth.create.useMutation({
    onSuccess: () => { setShowAddForm(false); setNewStaff({ name: '', username: '', password: '', role: 'staff' }); refetch(); },
  });

  const updateRole = trpc.staffAuth.updateRole.useMutation({ onSuccess: () => refetch() });
  const resetPassword = trpc.staffAuth.resetPassword.useMutation({ onSuccess: () => { setResetPwd(null); refetch(); } });

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      navigate('/staff');
    } else {
      setAuthChecked(true);
    }
  }, [authLoading, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#181818' }} />
          <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (authError && !isAdmin && !demo) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center max-w-sm mx-4">
          <Shield size={40} className="mx-auto mb-4" style={{ color: '#B85450' }} />
          <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>AUTH FAILED</h1>
          <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: '1.5rem' }}>{authError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>RETRY</button>
        </div>
      </div>
    );
  }

  if (!authChecked || !isAdmin) return null;

  const input = "w-full bg-transparent border px-4 py-3 focus:outline-none transition-colors";
  const inputStyle = { fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontSize: '0.875rem', color: '#181818', borderColor: 'rgba(24,24,24,0.15)' };
  const roleColors: Record<string, string> = { admin: '#B85450', manager: '#C4953A', staff: '#5E8B8B' };

  return (
    <div className="min-h-[100dvh]" style={{ background: '#F3F2EE' }}>
      {demo && (
        <div className="fixed top-0 left-0 right-0 z-[300] py-2 px-6 flex items-center justify-center gap-2" style={{ background: '#5E8B8B' }}>
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F3F2EE' }}>
            DEMO MODE — Changes are not saved
          </span>
        </div>
      )}

      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#F3F2EE', marginTop: demo ? '28px' : 0 }}>
        <div className="content-container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/staff')} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>STAFF SETTINGS</h1>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>MANAGE TEAM</span>
          </div>
        </div>
      </header>

      <div className="content-container py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>TEAM MEMBERS</h2>
          <button onClick={() => { if (demo) { alert('[DEMO] Cannot create staff in demo mode'); return; } setShowAddForm(!showAddForm); }} className="flex items-center gap-2 px-4 py-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
            <Plus size={14} /> ADD STAFF
          </button>
        </div>

        {showAddForm && (
          <div className="border p-5 mb-6" style={{ borderColor: 'rgba(24,24,24,0.15)', background: '#E8E4DD' }}>
            <h3 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>NEW STAFF MEMBER</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="FULL NAME" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className={input} style={inputStyle} />
              <input type="text" placeholder="USERNAME" value={newStaff.username} onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })} className={input} style={inputStyle} />
              <input type="password" placeholder="PASSWORD" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className={input} style={inputStyle} />
              <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as 'admin' | 'manager' | 'staff' })} className={input} style={inputStyle}>
                <option value="staff">STAFF</option>
                <option value="manager">MANAGER</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createStaff.mutate({ ...newStaff, adminToken: token || '' })} disabled={createStaff.isPending || demo} className="px-4 py-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all disabled:opacity-50" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
                <Save size={14} className="inline mr-1" /> {createStaff.isPending ? 'CREATING...' : 'CREATE'}
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#5E5E5E' }}>CANCEL</button>
            </div>
            {createStaff.isError && <p className="mt-2" style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#B85450' }}>{createStaff.error?.message}</p>}
          </div>
        )}

        {!staffList || staffList.length === 0 ? (
          <div className="py-16 text-center border" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
            <Users size={32} style={{ color: '#5E5E5E' }} className="mx-auto mb-4" />
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>NO STAFF ACCOUNTS</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staffList.map((s: any) => (
              <div key={s.id} className="border p-4 flex items-center justify-between" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center" style={{ background: `${roleColors[s.role]}20` }}>
                    <User size={14} style={{ color: roleColors[s.role] }} />
                  </div>
                  <div>
                    <span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: '#181818', display: 'block' }}>{s.name}</span>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>@{s.username} &middot; </span>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: roleColors[s.role] }}>{s.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.role}
                    onChange={(e) => { if (demo) { alert('[DEMO] Role changes not saved'); return; } updateRole.mutate({ staffId: s.id, role: e.target.value as 'admin' | 'manager' | 'staff', token: token || '' }); }}
                    className="bg-transparent border px-2 py-1 text-xs"
                    style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}
                  >
                    <option value="staff">STAFF</option>
                    <option value="manager">MANAGER</option>
                    <option value="admin">ADMIN</option>
                  </select>
                  <button onClick={() => { if (demo) { alert('[DEMO] Password reset not available'); return; } setResetPwd(resetPwd?.id === s.id ? null : { id: s.id, pwd: '' }); }} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }} title="Reset Password">
                    <Shield size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {resetPwd && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(24,24,24,0.55)' }}>
            <div className="w-full max-w-sm mx-4 border p-6" style={{ background: '#F3F2EE', borderColor: 'rgba(24,24,24,0.15)' }}>
              <h3 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>RESET PASSWORD</h3>
              <input type="password" placeholder="NEW PASSWORD" value={resetPwd.pwd} onChange={(e) => setResetPwd({ ...resetPwd, pwd: e.target.value })} className={input} style={inputStyle} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => resetPassword.mutate({ staffId: resetPwd.id, newPassword: resetPwd.pwd, token: token || '' })} disabled={resetPassword.isPending || resetPwd.pwd.length < 6} className="px-4 py-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all disabled:opacity-50" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
                  {resetPassword.isPending ? 'SAVING...' : 'RESET'}
                </button>
                <button onClick={() => setResetPwd(null)} className="px-4 py-2 border hover:bg-[#B85450] hover:text-[#F3F2EE] hover:border-[#B85450] transition-all" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#5E5E5E' }}>CANCEL</button>
              </div>
              {resetPassword.isError && <p className="mt-2" style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#B85450' }}>{resetPassword.error?.message}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
