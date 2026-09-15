'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RowDetailModal } from './RowDetailModal';
import { StockNameInput } from './StockNameInput';
import { formatCompact } from '@/lib/formatNumber';
import { formatPrice } from '@/lib/helper';

type Holding = {
  stock_name: string;
  quantity: number;
  avg_price: number;
  note: string | null;
  admin_note: string | null;
  budget: number | null;
  updated_at?: string;
};

type SheetMatch = {
  sheetId: string;
  sheetName: string;
  syncedAt: string | null;
  row: Record<string, string | number | null>;
};

type PortfolioViewProps = {
  /** 'user' (default): the signed-in user's own portfolio, fully editable
   *  except admin_note. 'admin': viewing someone else's portfolio — every
   *  field is read-only except the admin note. */
  mode?: 'user' | 'admin';
  /** Required when mode="admin" — whose portfolio is being viewed. */
  userId?: string;
};

export function PortfolioView({ mode = 'user', userId }: PortfolioViewProps) {
  const isAdminView = mode === 'admin';

  const holdingsEndpoint = isAdminView
    ? `/api/admin/portfolios/${userId}?page=1&pageSize=1`
    : '/api/portfolio/holdings';
  const matchesEndpoint = isAdminView
    ? `/api/admin/portfolios/${userId}/matches`
    : '/api/portfolio/holdings/matches';
  const tradeHistoryHref = isAdminView ? `/admin/portfolios/${userId}/trades` : '/portfolio/history';

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetMatches, setSheetMatches] = useState<Record<string, SheetMatch[]>>({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<SheetMatch | null>(null);

  // User-editable drafts (own note, quantity/avg price direct edit, budget).
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [avgPriceDrafts, setAvgPriceDrafts] = useState<Record<string, string>>({});
  const [savingHolding, setSavingHolding] = useState<string | null>(null);
  const [holdingErrors, setHoldingErrors] = useState<Record<string, string>>({});
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState<string | null>(null);
  const [budgetErrors, setBudgetErrors] = useState<Record<string, string>>({});

  // Admin-editable draft (admin note only).
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});
  const [savingAdminNote, setSavingAdminNote] = useState<string | null>(null);

  // "Add a trade" form state — user mode only.
  const [stockName, setStockName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(holdingsEndpoint);
    if (res.ok) {
      const json = await res.json();
      const h: Holding[] = json.holdings || [];
      setHoldings(h);
      setNoteDrafts(Object.fromEntries(h.map((x) => [x.stock_name, x.note || ''])));
      setQtyDrafts(Object.fromEntries(h.map((x) => [x.stock_name, String(x.quantity)])));
      setAvgPriceDrafts(Object.fromEntries(h.map((x) => [x.stock_name, String(x.avg_price)])));
      setBudgetDrafts(Object.fromEntries(h.map((x) => [x.stock_name, x.budget != null ? String(x.budget) : ''])));
      setAdminNoteDrafts(Object.fromEntries(h.map((x) => [x.stock_name, x.admin_note || ''])));
    }
    // Holdings render immediately — the cross-sheet match lookup can
    // populate in the background rather than blocking the page.
    setLoading(false);

    fetch(matchesEndpoint)
      .then((res) => (res.ok ? res.json() : { matches: {} }))
      .then((json) => setSheetMatches(json.matches || {}))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, [holdingsEndpoint, matchesEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNote = async (stock: string) => {
    setSavingNote(stock);
    const res = await fetch('/api/portfolio/holdings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stock, note: noteDrafts[stock] || '' }),
    });
    if (res.ok) {
      setHoldings((prev) => prev.map((h) => (h.stock_name === stock ? { ...h, note: noteDrafts[stock] || null } : h)));
    }
    setSavingNote(null);
  };

  const saveAdminNote = async (stock: string) => {
    setSavingAdminNote(stock);
    const res = await fetch('/api/admin/portfolios/holdings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, stock_name: stock, admin_note: adminNoteDrafts[stock] || '' }),
    });
    if (res.ok) {
      setHoldings((prev) =>
        prev.map((h) => (h.stock_name === stock ? { ...h, admin_note: adminNoteDrafts[stock] || null } : h))
      );
    }
    setSavingAdminNote(null);
  };

  const saveHoldingEdit = async (stock: string) => {
    setHoldingErrors((prev) => ({ ...prev, [stock]: '' }));

    const qty = Number(qtyDrafts[stock]);
    const avg = Number(avgPriceDrafts[stock]);
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(avg) || avg < 0) {
      setHoldingErrors((prev) => ({ ...prev, [stock]: 'Enter valid non-negative numbers.' }));
      return;
    }

    setSavingHolding(stock);
    const res = await fetch('/api/portfolio/holdings/edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stock, quantity: qty, avg_price: avg }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setHoldingErrors((prev) => ({ ...prev, [stock]: json.error || 'Failed to save' }));
    } else {
      setHoldings((prev) =>
        prev
          .map((h) => (h.stock_name === stock ? { ...h, quantity: qty, avg_price: avg } : h))
          .filter((h) => h.quantity > 0) // matches the API's own gt(quantity, 0) filter
      );
    }
    setSavingHolding(null);
  };

  const saveBudget = async (stock: string) => {
    setBudgetErrors((prev) => ({ ...prev, [stock]: '' }));

    const draft = budgetDrafts[stock] ?? '';
    let budgetValue: number | null = null;
    if (draft !== '') {
      budgetValue = Number(draft);
      if (!Number.isFinite(budgetValue) || budgetValue < 0) {
        setBudgetErrors((prev) => ({ ...prev, [stock]: 'Enter a valid non-negative number.' }));
        return;
      }
    }

    setSavingBudget(stock);
    const res = await fetch('/api/portfolio/holdings/budget', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_name: stock, budget: budgetValue }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setBudgetErrors((prev) => ({ ...prev, [stock]: json.error || 'Failed to save' }));
    } else {
      setHoldings((prev) => prev.map((h) => (h.stock_name === stock ? { ...h, budget: budgetValue } : h)));
    }
    setSavingBudget(null);
  };

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
      {!isAdminView && (
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
      )}

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Holdings</h2>
          <Link href={tradeHistoryHref} style={{ fontSize: 13 }}>
            View trade history →
          </Link>
        </div>
        {holdings.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>
            {isAdminView ? 'No holdings.' : 'No holdings yet — add a trade above.'}
          </p>
        ) : (
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Stock</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Sheet references</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Quantity</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Avg price</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Total cost</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Budget</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Note</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Admin note</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const matches = sheetMatches[h.stock_name] || [];

                const qtyDraft = qtyDrafts[h.stock_name] ?? String(h.quantity);
                const avgDraft = avgPriceDrafts[h.stock_name] ?? String(h.avg_price);
                const isDirty = qtyDraft !== String(h.quantity) || avgDraft !== String(h.avg_price);
                const qtyNum = Number(qtyDraft);
                const avgNum = Number(avgDraft);
                const previewTotal = Number.isFinite(qtyNum) && Number.isFinite(avgNum) ? qtyNum * avgNum : NaN;
                const invested = h.quantity * h.avg_price;

                const budgetDraft = budgetDrafts[h.stock_name] ?? (h.budget != null ? String(h.budget) : '');
                const budgetIsDirty = budgetDraft !== (h.budget != null ? String(h.budget) : '');
                const remaining = h.budget != null ? h.budget - invested : null;
                const percentRemaining = remaining != null && h.budget! > 0 ? (remaining / h.budget!) * 100 : null;

                const adminNoteDirty = (adminNoteDrafts[h.stock_name] ?? '') !== (h.admin_note ?? '');

                return (
                  <tr className='card mobile-grid-row' key={h.stock_name}>
                    <td data-label="Stock" style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                      {h.stock_name}
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

                    <td
                      data-label="Quantity"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {isAdminView ? (
                        h.quantity
                      ) : (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={qtyDraft}
                          onChange={(e) => setQtyDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))}
                          style={{ width: 90, textAlign: 'right' }}
                        />
                      )}
                    </td>

                    <td
                      data-label="Avg price"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {isAdminView ? (
                        h.avg_price.toFixed(2)
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={avgDraft}
                              onChange={(e) =>
                                setAvgPriceDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                              }
                              style={{ width: 90, textAlign: 'right' }}
                            />
                            {isDirty && (
                              <button
                                onClick={() => saveHoldingEdit(h.stock_name)}
                                disabled={savingHolding === h.stock_name}
                                style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                              >
                                {savingHolding === h.stock_name ? 'Saving…' : 'Save'}
                              </button>
                            )}
                          </div>
                          {holdingErrors[h.stock_name] && (
                            <div style={{ color: 'crimson', fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                              {holdingErrors[h.stock_name]}
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    <td
                      data-label="Total cost"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {isAdminView ? formatPrice(invested) : Number.isFinite(previewTotal) ? formatPrice(previewTotal) : '—'}

                      {h.budget != null && remaining != null && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: 4,
                            textAlign: 'right',
                            color:
                              remaining < 0
                                ? '#c0392b'
                                : percentRemaining !== null && percentRemaining <= 20
                                ? '#b8860b'
                                : '#0a5',
                          }}
                        >
                          {remaining < 0
                            ? `Over by ${formatCompact(Math.abs(remaining))}`
                            : `${formatCompact(remaining)}${
                                percentRemaining !== null ? ` (${Math.round(percentRemaining)}%)` : ''
                              } left`}
                        </span>
                      )}
                    </td>

                    <td
                      data-label="Budget"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                    >
                      {isAdminView ? (
                        h.budget == null ? (
                          <span style={{ color: '#bbb' }}>—</span>
                        ) : (
                          <div>{formatPrice(h.budget)}</div>
                        )
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Set budget"
                            value={budgetDraft}
                            onChange={(e) =>
                              setBudgetDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                            }
                            style={{ width: 100, textAlign: 'right' }}
                          />
                          {budgetIsDirty && (
                            <button
                              onClick={() => saveBudget(h.stock_name)}
                              disabled={savingBudget === h.stock_name}
                              style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                            >
                              {savingBudget === h.stock_name ? 'Saving…' : 'Save'}
                            </button>
                          )}
                        </div>
                      )}
                      {!isAdminView && budgetErrors[h.stock_name] && (
                        <div style={{ color: 'crimson', fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                          {budgetErrors[h.stock_name]}
                        </div>
                      )}
                      
                    </td>

                

                    <td data-label="Note" style={{ padding: 8, borderBottom: '1px solid #f2f2f2', minWidth: 200 }}>
                      {isAdminView ? (
                        h.note ? (
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{h.note}</div>
                        ) : (
                          <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
                        )
                      ) : (
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
                      )}
                    </td>

                    <td
                      data-label="Admin note"
                      style={{ padding: 8, borderBottom: '1px solid #f2f2f2', maxWidth: 200, minWidth: isAdminView ? 200 : undefined }}
                    >
                      {isAdminView ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <textarea
                            value={adminNoteDrafts[h.stock_name] ?? ''}
                            onChange={(e) =>
                              setAdminNoteDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                            }
                            placeholder="Add an admin note…"
                            rows={2}
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontFamily: 'inherit',
                              padding: '6px 8px',
                              resize: 'vertical',
                            }}
                          />
                          {adminNoteDirty && (
                            <button
                              onClick={() => saveAdminNote(h.stock_name)}
                              disabled={savingAdminNote === h.stock_name}
                              style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                            >
                              {savingAdminNote === h.stock_name ? 'Saving…' : 'Save'}
                            </button>
                          )}
                        </div>
                      ) : h.admin_note ? (
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
