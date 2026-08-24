'use client';
import { useCallback, useEffect, useState } from 'react';
import { RowDetailModal } from './RowDetailModal';
import { StockNameInput } from './StockNameInput';

type Holding = {
  stock_name: string;
  quantity: number;
  avg_price: number;
  note: string | null;
  updated_at: string;
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

type SheetMatch = {
  sheetId: string;
  sheetName: string;
  syncedAt: string | null;
  row: Record<string, string | number | null>;
};

const TXN_PAGE_SIZE = 20;

export function PortfolioView() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotalCount, setTxnTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);
  const [sheetMatches, setSheetMatches] = useState<Record<string, SheetMatch[]>>({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<SheetMatch | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const [stockName, setStockName] = useState('');
  const [txnType, setTxnType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTransactions = useCallback(async (page: number) => {
    setTxnLoading(true);
    const res = await fetch(`/api/portfolio/transactions?page=${page}&pageSize=${TXN_PAGE_SIZE}`);
    if (res.ok) {
      const json = await res.json();
      setTransactions(json.transactions);
      setTxnTotalCount(json.totalCount);
      setTxnPage(json.page);
    }
    setTxnLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const holdingsRes = await fetch('/api/portfolio/holdings');
    if (holdingsRes.ok) {
      const json = await holdingsRes.json();
      setHoldings(json.holdings);
      setNoteDrafts(
        Object.fromEntries((json.holdings as Holding[]).map((h) => [h.stock_name, h.note || '']))
      );
    }
    // Holdings are shown as soon as they're back — don't make the user
    // wait on the slower cross-sheet match lookup below.
    setLoading(false);

    loadTransactions(1);

    fetch('/api/portfolio/holdings/matches')
      .then((res) => (res.ok ? res.json() : { matches: {} }))
      .then((json) => setSheetMatches(json.matches || {}))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, [loadTransactions]);

  const saveNote = async (stockName: string) => {
    setSavingNote(stockName);
    const res = await fetch('/api/portfolio/holdings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stockName, note: noteDrafts[stockName] || '' }),
    });
    if (res.ok) {
      setHoldings((prev) =>
        prev.map((h) => (h.stock_name === stockName ? { ...h, note: noteDrafts[stockName] || null } : h))
      );
    }
    setSavingNote(null);
  };

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const qty = Number(quantity);
    const prc = Number(price);
    if (!stockName.trim() || !(qty > 0) || !(prc >= 0)) {
      setErrorMsg('Enter a stock name, a positive quantity, and a valid price.');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/portfolio/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stockName.trim(), transaction_type: txnType, quantity: qty, price: prc }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to record transaction');
    } else {
      setStockName('');
      setQuantity('');
      setPrice('');
      await load();
    }
    setSubmitting(false);
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <section
        style={{
          border: '1px solid #eee',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>Add a trade</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StockNameInput value={stockName} onChange={setStockName} />
          <select
            value={txnType}
            onChange={(e) => setTxnType(e.target.value as 'buy' | 'sell')}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 110 }}
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: 110 }}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add'}
          </button>
        </form>
        {errorMsg && <p style={{ color: 'crimson', fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Adding the same stock again adjusts your quantity and average
          price automatically — buys re-average your cost basis, sells
          reduce quantity without changing the average.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Holdings</h2>
        {holdings.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>No holdings yet — add a trade above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Stock</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Quantity</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Avg price</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Total cost</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Trade references</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const matches = sheetMatches[h.stock_name] || [];
                return (
                  <tr key={h.stock_name}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{h.stock_name}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>
                      {h.quantity}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>
                      {h.avg_price.toFixed(2)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>
                      {(h.quantity * h.avg_price).toFixed(2)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                      {matches.length === 0 ? (
                        <span style={{ color: '#bbb', fontSize: 13 }}>
                          {matchesLoading ? 'Checking…' : '—'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {matches.map((m) => (
                            <button
                              key={m.sheetId}
                              onClick={() => setActiveMatch(m)}
                              style={{
                                fontSize: 12,
                                padding: '3px 8px',
                                borderRadius: 999,
                                border: '1px solid #cbd5e1',
                                background: '#f7f9fc',
                                cursor: 'pointer',
                              }}
                            >
                              {m.sheetName}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <textarea
                          value={noteDrafts[h.stock_name] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                          }
                          placeholder="Add a note. Ex: Trade type, %of entry etc "
                          rows={2}
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontFamily: 'inherit',
                            padding: '6px 8px',
                            resize: 'vertical',
                          }}
                        />
                        {(noteDrafts[h.stock_name] ?? '') !== (h.note ?? '') && (
                          <button
                            onClick={() => saveNote(h.stock_name)}
                            disabled={savingNote === h.stock_name}
                            style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                          >
                            {savingNote === h.stock_name ? 'Saving…' : 'Save'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Trade history</h2>
        {transactions.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>No trades yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: txnLoading ? 0.6 : 1 }}>
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
        )}

        {txnTotalCount > TXN_PAGE_SIZE && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <button disabled={txnLoading || txnPage <= 1} onClick={() => loadTransactions(txnPage - 1)}>
              Previous
            </button>
            <span style={{ fontSize: 13 }}>
              Page {txnPage} of {Math.max(1, Math.ceil(txnTotalCount / TXN_PAGE_SIZE))} ({txnTotalCount} trades)
            </span>
            <button
              disabled={txnLoading || txnPage >= Math.ceil(txnTotalCount / TXN_PAGE_SIZE)}
              onClick={() => loadTransactions(txnPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {activeMatch && (
        <RowDetailModal
          row={{ ...activeMatch.row, _syncedAt: activeMatch.syncedAt }}
          onClose={() => setActiveMatch(null)}
          title={`${activeMatch.sheetName} — latest entry`}
        />
      )}
    </div>
  );
}
