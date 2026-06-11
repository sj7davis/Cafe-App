import { useState } from 'react';
import { trpc } from '@/providers/trpc';


import {
  Plus,
  Loader2,
} from 'lucide-react';

// ─── Role-based tab definitions ───

export function TrainingTab({ venueId: _venueId, token, role }: { venueId: number; token: string; role: string }) {
  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const [teamView, setTeamView] = useState<'my' | 'team'>('my');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskRole, setNewTaskRole] = useState('all');
  const [addTaskMsg, setAddTaskMsg] = useState('');

  const utils = trpc.useUtils();

  const myProgressQuery = trpc.training.getMyProgress.useQuery(
    { token },
    { enabled: !!token }
  );

  const teamProgressQuery = trpc.training.getTeamProgress.useQuery(
    { token },
    { enabled: !!token && isManagerOrAdmin && teamView === 'team' }
  );

  const completeTask = trpc.training.completeTask.useMutation({
    onSuccess: () => utils.training.getMyProgress.invalidate(),
  });

  const signOff = trpc.training.signOff.useMutation({
    onSuccess: () => {
      utils.training.getTeamProgress.invalidate();
      utils.training.getMyProgress.invalidate();
    },
  });

  const createTask = trpc.training.createTask.useMutation({
    onSuccess: () => {
      setAddTaskMsg('Task created!');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskRole('all');
      setShowAddTask(false);
      utils.training.getMyProgress.invalidate();
      utils.training.getTeamProgress.invalidate();
      setTimeout(() => setAddTaskMsg(''), 3000);
    },
    onError: (e) => setAddTaskMsg(`Error: ${e.message}`),
  });

  const myData = myProgressQuery.data as {
    tasks: { id: number; title: string; description?: string | null; completionId?: number | null; completedAt?: string | null; signedOffAt?: string | null }[];
    completed: number;
    total: number;
  } | undefined;

  const teamData = teamProgressQuery.data as {
    members: {
      staffId: number;
      name: string;
      role: string;
      completed: number;
      total: number;
      pendingSignOffs: { completionId: number; taskTitle: string }[];
    }[];
  } | undefined;

  const pct = myData && myData.total > 0 ? Math.round((myData.completed / myData.total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 }}>Training</h2>
        {isManagerOrAdmin && (
          <button
            onClick={() => setShowAddTask(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#1c1917', color: '#fafaf9', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Add Task
          </button>
        )}
      </div>

      {/* Add Task form */}
      {showAddTask && isManagerOrAdmin && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>New Training Task</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Title *</label>
              <input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Coffee machine cleaning"
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="Optional details or instructions…"
                rows={3}
                style={{ width: '100%', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '4px' }}>Required Role</label>
              <select
                value={newTaskRole}
                onChange={e => setNewTaskRole(e.target.value)}
                style={{ border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', background: '#fff', color: '#1c1917' }}
              >
                <option value="all">All Staff</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={!newTaskTitle.trim() || createTask.isPending}
                onClick={() => {
                  if (!newTaskTitle.trim()) return;
                  createTask.mutate({ token, title: newTaskTitle.trim(), description: newTaskDesc.trim() || undefined, requiredRole: newTaskRole === 'all' ? undefined : newTaskRole as 'manager' | 'admin' | 'staff' });
                }}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: '#1c1917', color: '#fafaf9', fontSize: '13px', fontWeight: 600,
                  cursor: !newTaskTitle.trim() ? 'not-allowed' : 'pointer',
                  opacity: !newTaskTitle.trim() ? 0.5 : 1,
                }}
              >
                {createTask.isPending ? '…' : 'Create'}
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e7e5e4', background: '#fafaf9', color: '#57534e', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              {addTaskMsg && <span style={{ fontSize: '13px', color: addTaskMsg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{addTaskMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab toggle for manager/admin */}
      {isManagerOrAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '20px' }}>
          {(['my', 'team'] as const).map(v => (
            <button
              key={v}
              onClick={() => setTeamView(v)}
              style={{
                padding: '7px 18px', borderRadius: '20px', border: 'none', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
                background: teamView === v ? '#1c1917' : '#e7e5e4',
                color: teamView === v ? '#fafaf9' : '#57534e',
              }}
            >
              {v === 'my' ? 'My Tasks' : 'Team Progress'}
            </button>
          ))}
        </div>
      )}

      {/* My Tasks view */}
      {(!isManagerOrAdmin || teamView === 'my') && (
        <div>
          {myProgressQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>
              <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          ) : myProgressQuery.error ? (
            <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '13px' }}>
              {myProgressQuery.error.message}
            </div>
          ) : (
            <div>
              {/* Progress bar */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>My Progress</span>
                  <span style={{ fontSize: '13px', color: '#78716c' }}>{myData?.completed ?? 0} / {myData?.total ?? 0} tasks ({pct}%)</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: '#e7e5e4', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: pct === 100 ? '#16a34a' : '#5E8B8B', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Task checklist */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
                {!myData || myData.tasks.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No training tasks assigned yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {myData.tasks.map((task, idx) => {
                      const isCompleted = !!task.completionId;
                      const isSignedOff = !!task.signedOffAt;
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
                            borderBottom: idx < myData.tasks.length - 1 ? '1px solid #f5f5f4' : 'none',
                            background: isSignedOff ? '#f0fdf4' : isCompleted ? '#fffbeb' : '#fff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            disabled={isCompleted || completeTask.isPending}
                            onChange={() => {
                              if (!isCompleted) completeTask.mutate({ token, taskId: task.id });
                            }}
                            style={{ width: 18, height: 18, accentColor: '#16a34a', marginTop: 2, cursor: isCompleted ? 'default' : 'pointer', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                                {task.title}
                              </span>
                              {isCompleted && !isSignedOff && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#d97706' }}>
                                  Pending sign-off
                                </span>
                              )}
                              {isSignedOff && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a' }}>
                                  Signed off ✓
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#78716c', lineHeight: 1.4 }}>{task.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Progress view */}
      {isManagerOrAdmin && teamView === 'team' && (
        <div>
          {teamProgressQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>
              <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '14px' }}>Loading…</p>
            </div>
          ) : teamProgressQuery.error ? (
            <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '13px' }}>
              {teamProgressQuery.error.message}
            </div>
          ) : !teamData || teamData.members.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '32px', textAlign: 'center', color: '#78716c', fontSize: '14px' }}>
              No staff members found
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#57534e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sign-offs</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.members.map(member => {
                    const memberPct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
                    return (
                      <tr key={member.staffId} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1c1917' }}>{member.name}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                            textTransform: 'uppercase',
                            background: member.role === 'admin' ? '#fee2e2' : member.role === 'manager' ? '#fed7aa' : '#f3f4f6',
                            color: member.role === 'admin' ? '#dc2626' : member.role === 'manager' ? '#ea580c' : '#6b7280',
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e7e5e4', overflow: 'hidden', minWidth: 80 }}>
                              <div style={{ height: '100%', borderRadius: 4, background: memberPct === 100 ? '#16a34a' : '#5E8B8B', width: `${memberPct}%` }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#78716c', flexShrink: 0 }}>
                              {member.completed}/{member.total} ({memberPct}%)
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {member.pendingSignOffs.length === 0 ? (
                            <span style={{ fontSize: '12px', color: '#a8a29e' }}>None pending</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {member.pendingSignOffs.map(sf => (
                                <div key={sf.completionId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: '12px', color: '#78716c' }}>{sf.taskTitle}</span>
                                  <button
                                    disabled={signOff.isPending}
                                    onClick={() => signOff.mutate({ token, completionId: sf.completionId })}
                                    style={{
                                      padding: '2px 8px', borderRadius: '4px', border: 'none',
                                      background: '#dcfce7', color: '#16a34a', fontSize: '11px',
                                      fontWeight: 700, cursor: 'pointer',
                                    }}
                                  >
                                    Sign Off
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
