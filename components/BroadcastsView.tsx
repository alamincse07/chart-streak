'use client';
import { useEffect, useState } from 'react';

type Broadcast = {
  id: string;
  stock_name: string;
  note: string;
  created_at: string;
  updated_at: string;
  admin: { name: string | null; email: string } | null;
};

const PAGE_SIZE = 10;

export function BroadcastsView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = async (targetPage: number) => {
    setLoading(true);
    const res = await fetch(`/api/broadcasts?page=${targetPage}&pageSize=${PAGE_SIZE}`);
    if (res.ok) {
      const json = await res.json();
      setBroadcasts(json.broadcasts || []);
      setTotalCount(json.totalCount || 0);
      setPage(json.page || 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loading) return <p>Loading…</p>;
  if (broadcasts.length === 0) {
    return <p style={{ color: '#666' }}>No admin messages yet.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {broadcasts.map((b) => (
          <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{b.stock_name}</div>
            <div style={{ fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{b.note}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              {b.admin?.name || b.admin?.email || 'Admin'} · {new Date(b.created_at).toLocaleString()}
              {b.updated_at && b.updated_at !== b.created_at && (
                <> · edited {new Date(b.updated_at).toLocaleString()}</>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalCount > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
          <button disabled={loading || page <= 1} onClick={() => load(page - 1)}>
            Previous
          </button>
          <span style={{ fontSize: 13 }}>
            Page {page} of {totalPages} ({totalCount} messages)
          </span>
          <button disabled={loading || page >= totalPages} onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
