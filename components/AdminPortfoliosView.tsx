'use client';
import { useCallback, useEffect, useState } from 'react';

type UserSummary = {
  userId: string;
  email: string;
  name: string | null;
  holdingsCount: number;
  totalInvested: number;
};

type Holding = {
  stock_name: string;
  quantity: number;
  avg_price: number;
};

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

const TXN_PAGE_SIZE = 20;

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

export function AdminPortfoliosView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotalCount, setTxnTotalCount] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/portfolios')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((json) => setUsers(json.users || []))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (userId: string, page: number = 1) => {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/portfolios/${userId}?page=${page}&pageSize=${TXN_PAGE_SIZE}`);
    if (res.ok) {
      const json = await res.json();
      setHoldings(json.holdings || []);
      setTransactions(json.transactions || []);
      setTxnTotalCount(json.transactionsTotalCount || 0);
      setTxnPage(json.page || 1);
    }
    setDetailLoading(false);
  }, []);

  const toggleUser = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    loadDetail(userId, 1);
  };

  if (loading) return <p>Loading…</p>;
  if (users.length === 0) return <p style={{ color: '#666' }}>No users have added any holdings yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {users.map((u) => (
        <div key={u.userId} style={{ border: '1px solid #eee', borderRadius: 8 }}>
          <button
            onClick={() => toggleUser(u.userId)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: expandedUserId === u.userId ? '#f7f9fc' : '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <strong>{u.name || u.email}</strong>{' '}
              <span style={{ color: '#888', fontSize: 13 }}>{u.email}</span>
            </span>
            <span style={{ fontSize: 13, color: '#666' }}>
              {u.holdingsCount} holdings · {u.totalInvested.toFixed(2)} invested
            </span>
          </button>

          {expandedUserId === u.userId && (
            <div style={{ padding: '0 16px 16px' }}>
              {detailLoading ? (
                <p>Loading…</p>
              ) : (
                <>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>Holdings</h3>
                  {holdings.length === 0 ? (
                    <p style={{ color: '#666', fontSize: 13 }}>No holdings.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: 6 }}>Stock</th>
                          <th style={{ textAlign: 'right', padding: 6 }}>Quantity</th>
                          <th style={{ textAlign: 'right', padding: 6 }}>Avg price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => (
                          <tr key={h.stock_name}>
                            <td style={{ padding: 6 }}>{h.stock_name}</td>
                            <td style={{ padding: 6, textAlign: 'right' }}>{h.quantity}</td>
                            <td style={{ padding: 6, textAlign: 'right' }}>{h.avg_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>Trades</h3>
                  {transactions.length === 0 ? (
                    <p style={{ color: '#666', fontSize: 13 }}>No trades.</p>
                  ) : (
                    <>
                      {transactions.map((t) => (
                        <TransactionRow
                          key={t.id}
                          txn={t}
                          onCommented={() => loadDetail(u.userId, txnPage)}
                        />
                      ))}
                      {txnTotalCount > TXN_PAGE_SIZE && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                          <button
                            disabled={detailLoading || txnPage <= 1}
                            onClick={() => loadDetail(u.userId, txnPage - 1)}
                          >
                            Previous
                          </button>
                          <span style={{ fontSize: 13 }}>
                            Page {txnPage} of {Math.max(1, Math.ceil(txnTotalCount / TXN_PAGE_SIZE))} (
                            {txnTotalCount} trades)
                          </span>
                          <button
                            disabled={detailLoading || txnPage >= Math.ceil(txnTotalCount / TXN_PAGE_SIZE)}
                            onClick={() => loadDetail(u.userId, txnPage + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
