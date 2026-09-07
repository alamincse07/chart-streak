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

export function TradeHistoryView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    const res = await fetch(`/api/portfolio/transactions?page=${targetPage}&pageSize=${PAGE_SIZE}`);
    if (res.ok) {
      const json = await res.json();
      setTransactions(json.transactions);
      setTotalCount(json.totalCount);
      setPage(json.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loading) return <p>Loading…</p>;
  if (transactions.length === 0) return <p style={{ color: '#666' }}>No trades yet.</p>;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {transactions.map((t) => (
          <div key={t.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <span>
                <strong
                  style={{
                    color: t.transaction_type === 'buy' ? '#0a5' : '#c0392b',
                    textTransform: 'uppercase',
                    fontSize: 12,
                    marginRight: 8,
                  }}
                >
                  {t.transaction_type}
                </strong>
                {t.stock_name} · {t.quantity} @ {Number(t.price).toFixed(2)}
              </span>
              <span style={{ fontSize: 12, color: '#888' }}>
                {new Date(t.transaction_date).toLocaleString()}
              </span>
            </div>
            {t.portfolio_transaction_comments?.length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #eee' }}>
                {t.portfolio_transaction_comments.map((c) => (
                  <div key={c.id} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                    <span style={{ color: '#888' }}>Admin note:</span> {c.comment}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalCount > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
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
