'use client';
import { useEffect, useState } from 'react';

type Broadcast = {
  id: string;
  stock_name: string;
  note: string;
  created_at: string;
  admin: { name: string | null; email: string } | null;
};

export function BroadcastsView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/broadcasts')
      .then((res) => (res.ok ? res.json() : { broadcasts: [] }))
      .then((json) => setBroadcasts(json.broadcasts || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (broadcasts.length === 0) {
    return <p style={{ color: '#666' }}>No admin messages yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {broadcasts.map((b) => (
        <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{b.stock_name}</div>
          <div style={{ fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{b.note}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {b.admin?.name || b.admin?.email || 'Admin'} · {new Date(b.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
