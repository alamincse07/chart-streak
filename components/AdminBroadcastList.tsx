'use client';
import { useEffect, useRef, useState } from 'react';

type Broadcast = {
  id: string;
  stock_name: string;
  note: string;
  created_at: string;
  updated_at: string;
  admin: { name: string | null; email: string } | null;
};

const PAGE_SIZE = 10;

export function AdminBroadcastList({ initialStockName = '' }: { initialStockName?: string }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [stockName, setStockName] = useState(initialStockName);
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const load = async (targetPage: number = page) => {
    setLoading(true);
    const res = await fetch(`/api/admin/broadcasts?page=${targetPage}&pageSize=${PAGE_SIZE}`);
    if (res.ok) {
      const json = await res.json();
      setBroadcasts(json.broadcasts);
      setTotalCount(json.totalCount);
      setPage(json.page);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setStockName('');
    setNote('');
    setEditingId(null);
  };

  const startEdit = (b: Broadcast) => {
    setEditingId(b.id);
    setStockName(b.stock_name);
    setNote(b.note);
    setErrorMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    setErrorMsg(null);
    if (!stockName.trim() || !note.trim()) {
      setErrorMsg('Stock name and note are both required.');
      return;
    }
    setSubmitting(true);

    const res = editingId
      ? await fetch(`/api/admin/broadcasts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock_name: stockName.trim(), note: note.trim() }),
        })
      : await fetch('/api/admin/broadcasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock_name: stockName.trim(), note: note.trim() }),
        });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to save note');
    } else {
      resetForm();
      // Editing stays on the same page; posting new goes back to page 1
      // since it's newest-first.
      await load(editingId ? page : 1);
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === id) resetForm();
      await load(page);
    }
    setDeletingId(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div ref={formRef} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>{editingId ? 'Edit note' : 'Post a note'}</h2>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update note' : 'Post to all users'}
          </button>
          {editingId && (
            <button onClick={resetForm} disabled={submitting}>
              Cancel edit
            </button>
          )}
        </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{b.stock_name}</div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.note}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                    {b.admin?.name || b.admin?.email || 'Admin'} ·{' '}
                    {new Date(b.created_at).toLocaleString()}
                    {b.updated_at && b.updated_at !== b.created_at && (
                      <> · edited {new Date(b.updated_at).toLocaleString()}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => startEdit(b)}>Edit</button>
                  <button disabled={deletingId === b.id} onClick={() => remove(b.id)}>
                    {deletingId === b.id ? 'Removing…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
          <button disabled={loading || page <= 1} onClick={() => load(page - 1)}>
            Previous
          </button>
          <span style={{ fontSize: 13 }}>
            Page {page} of {totalPages} ({totalCount} notes)
          </span>
          <button disabled={loading || page >= totalPages} onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
