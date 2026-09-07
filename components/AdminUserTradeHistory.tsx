'use client';
import { useCallback, useEffect, useState } from 'react';

type Comment = {
  id: string;
  comment: string;
  created_at: string;
};

type Transaction = {
  id: string;
  stock_name: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  transaction_date: string;
  portfolio_transaction_comments: Comment[];
};

const PAGE_SIZE = 20;

function TransactionRow({ txn, onCommented }: { txn: Transaction; onCommented: () => void }) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/portfolios/transactions/${txn.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: commentText.trim() }),
    });
    if (res.ok) {
      setCommentText('');
      onCommented();
    }
    setSubmitting(false);
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
        <span>
          <strong
            style={{
              color: txn.transaction_type === 'buy' ? '#0a5' : '#c0392b',
              textTransform: 'uppercase',
              fontSize: 12,
              marginRight: 8,
            }}
          >
            {txn.transaction_type}
          </strong>
          {txn.stock_name} · {txn.quantity} @ {Number(txn.price).toFixed(2)}
        </span>
        <span style={{ fontSize: 12, color: '#888' }}>
          {new Date(txn.transaction_date).toLocaleString()}
        </span>
      </div>

      {txn.portfolio_transaction_comments?.length > 0 && (
        <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #eee' }}>
          {txn.portfolio_transaction_comments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
              {c.comment}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          type="text"
          placeholder="Add a note on this trade…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitComment()}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button onClick={submitComment} disabled={submitting || !commentText.trim()}>
          {submitting ? 'Saving…' : 'Comment'}
        </button>
      </div>
    </div>
  );
}

export function AdminUserTradeHistory({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      const res = await fetch(`/api/admin/portfolios/${userId}?page=${targetPage}&pageSize=${PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions || []);
        setTotalCount(json.transactionsTotalCount || 0);
        setPage(json.page || 1);
      }
      setLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loading) return <p>Loading…</p>;
  if (transactions.length === 0) return <p style={{ color: '#666' }}>No trades.</p>;

  return (
    <div>
      {transactions.map((t) => (
        <TransactionRow key={t.id} txn={t} onCommented={() => load(page)} />
      ))}

      {totalCount > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <button disabled={page <= 1} onClick={() => load(page - 1)}>
            Previous
          </button>
          <span style={{ fontSize: 13 }}>
            Page {page} of {totalPages} ({totalCount} trades)
          </span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
