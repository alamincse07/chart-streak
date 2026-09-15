'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserSummary = {
  userId: string;
  email: string;
  name: string | null;
  holdingsCount: number;
  totalInvested: number;
};

export function AdminPortfoliosView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/portfolios')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((json) => setUsers(json.users || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (users.length === 0) return <p style={{ color: '#666' }}>No users have added any holdings yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {users.map((u) => (
        <Link
          key={u.userId}
          href={`/admin/portfolios/${u.userId}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 16px',
            border: '1px solid #eee',
            borderRadius: 8,
            textDecoration: 'none',
            color: 'inherit',
            background: '#fff',
          }}
        >
          <span>
            <strong>{u.name || u.email}</strong>{' '}
            <span style={{ color: '#888', fontSize: 13 }}>{u.email}</span>
          </span>
          <span style={{ fontSize: 13, color: '#666' }}>
            {u.holdingsCount} holdings · {u.totalInvested.toFixed(2)} invested →
          </span>
        </Link>
      ))}
    </div>
  );
}
