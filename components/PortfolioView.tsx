'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RowDetailModal } from './RowDetailModal';
import { StockNameInput } from './StockNameInput';
import { formatPrice } from '@/lib/helper';

type Holding = {
  stock_name: string;
  quantity: number;
  avg_price: number;
  note: string | null;
  admin_note: string | null;
  updated_at: string;
};

type SheetMatch = {
  sheetId: string;
  sheetName: string;
  syncedAt: string | null;
  row: Record<string, string | number | null>;
};

export function PortfolioView() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetMatches, setSheetMatches] = useState<Record<string, SheetMatch[]>>({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<SheetMatch | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const [stockName, setStockName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    fetch('/api/portfolio/holdings/matches')
      .then((res) => (res.ok ? res.json() : { matches: {} }))
      .then((json) => setSheetMatches(json.matches || {}))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, []);

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

  const handleSubmit = async (type: 'buy' | 'sell') => {
    setErrorMsg(null);

    const qty = Number(quantity);
    const prc = Number(price);
    if (!stockName.trim() || !(qty > 0) || !(prc >= 0) || (prc > 990)) {
      setErrorMsg('Enter a stock name, a positive quantity, and a valid price.');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/portfolio/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stockName.trim(), transaction_type: type, quantity: qty, price: prc }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to record transaction');
    } else {
      setStockName('');
      setQuantity('');
      setPrice('');
     alert('Refresh to see the portfolio changes!');
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
          padding: '10px',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>Add a trade</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <StockNameInput value={stockName} onChange={setStockName} />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 70 }}
          />
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: 70 }}
          />
          </div>
          <div style={{ display: 'flex', gap: 12, padding:16, flexWrap: 'wrap', alignItems: 'center' }}>
          
          <button
            onClick={() => handleSubmit('buy')}
            disabled={submitting}
            style={{ background: '#0a5', width:130, color: '#fff', border: 'none' }}
          >
            {submitting ? 'Saving…' : 'Buy'}
          </button>
          <button
            onClick={() => handleSubmit('sell')}
            disabled={submitting}
            style={{ background: '#c0392b', width:130, color: '#fff',  border: 'none' }}
          >
            {submitting ? 'Saving…' : 'Sell'}
          </button>
        </div>
        {errorMsg && <p style={{ color: 'crimson', fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
        <p style={{ fontSize: 12, color: '#708cbf', marginTop: 8 }}>
          Adding the same stock again adjusts your quantity and average
          price automatically.
        </p>
          </div>
         
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Holdings</h2>
          <Link href="/portfolio/history" style={{ fontSize: 13 }}>
            View trade history →
          </Link>
        </div>
        {holdings.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>No holdings yet — add a trade above.</p>
        ) : (
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Stock</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Quantity</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Avg price</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Total cost</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Sheet references</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Note</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Admin note</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const matches = sheetMatches[h.stock_name] || [];
                return (
                  <tr className='card' key={h.stock_name}>
                    <td data-label="Stock" style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                      {h.stock_name}
                    </td>
                    <td
                      data-label="Quantity"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {h.quantity}
                    </td>
                    <td
                      data-label="Avg price"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {h.avg_price.toFixed(2)}
                    </td>
                    <td
                      data-label="Total cost"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {formatPrice(h.quantity * h.avg_price)}
                    </td>
                    <td data-label="Sheet references" style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
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
                    <td data-label="Note" style={{ padding: 8, borderBottom: '1px solid #f2f2f2', minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <textarea
                          value={noteDrafts[h.stock_name] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                          }
                          placeholder="Add a note…"
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
                    <td
                      data-label="Admin note"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', maxWidth: 200 }}
                    >
                      {h.admin_note ? (
                        <div style={{ fontSize: 13, color: '#555', whiteSpace: 'pre-wrap' }}>{h.admin_note}</div>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
