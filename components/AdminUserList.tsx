'use client';
import { useEffect, useState } from 'react';

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: 'pending' | 'approved' | 'blocked';
  is_admin: boolean;
  last_login_at: string | null;
  status_updated_at: string | null;
};

export function AdminUserList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (userId: string, status: AdminUser['status']) => {
    setUpdatingId(userId);
    setErrorMsg(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to update status');
    } else {
      await load();
    }
    setUpdatingId(null);
  };

  if (loading) return <p>Loading users…</p>;

  return (
    <div>
      {errorMsg && <p style={{ color: 'crimson', marginBottom: 8 }}>{errorMsg}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>User</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Last login</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div>{u.name || u.email}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{u.email}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{u.phone || 'No phone on file'}</div>
                {u.is_admin && <span style={{ fontSize: 11, color: '#0a5' }}>Admin</span>}
              </td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <StatusBadge status={u.status} />
              </td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}
              </td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <button
                  disabled={updatingId === u.id || u.status === 'approved'}
                  onClick={() => updateStatus(u.id, 'approved')}
                  style={{ marginRight: 6 }}
                >
                  Approve
                </button>
                <button
                  disabled={updatingId === u.id || u.status === 'blocked'}
                  onClick={() => updateStatus(u.id, 'blocked')}
                >
                  Block
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const colors: Record<AdminUser['status'], string> = {
    approved: '#0a5',
    pending: '#b8860b',
    blocked: '#c0392b',
  };
  return <span style={{ color: colors[status], fontWeight: 500 }}>{status}</span>;
}
