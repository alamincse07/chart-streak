'use client';
import { useEffect, useState } from 'react';

type Broadcast = {
  id: string;
  stock_name: string;
  note: string;
  created_at: string;
  admin: { name: string | null; email: string } | null;
};

export function AdminBroadcastList({ initialStockName = '' }: { initialStockName?: string }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockName, setStockName] = useState(initialStockName);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/broadcasts');
    if (res.ok) setBroadcasts((await res.json()).broadcasts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setErrorMsg(null);
    if (!stockName.trim() || !note.trim()) {
      setErrorMsg('Stock name and note are both required.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/admin/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stockName.trim(), note: note.trim() }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to post note');
    } else {
      setStockName('');
      setNote('');
      await load();
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Post a note</h2>
        <input
          type="text"
          placeholder="Stock name"
          value={stockName}
          onChange={(e) => setStockName(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <textarea
          placeholder="Note visible to every approved user…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          style={{ width: '100%', marginBottom: 8, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
        />
        <button onClick={submit} disabled={submitting}>
          {submitting ? 'Posting…' : 'Post to all users'}
        </button>
        {errorMsg && <p style={{ color: 'crimson', fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : broadcasts.length === 0 ? (
        <p style={{ color: '#666' }}>No notes posted yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {broadcasts.map((b) => (
            <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{b.stock_name}</div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.note}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                    {b.admin?.name || b.admin?.email || 'Admin'} ·{' '}
                    {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <button disabled={deletingId === b.id} onClick={() => remove(b.id)}>
                  {deletingId === b.id ? 'Removing…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
