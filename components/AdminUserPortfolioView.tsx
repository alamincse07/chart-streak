'use client';
import { useCallback, useEffect, useState } from 'react';
import { RowDetailModal } from './RowDetailModal';
import { formatCompact } from '@/lib/formatNumber';

type Holding = {
  stock_name: string;
  quantity: number;
  avg_price: number;
  note: string | null;
  admin_note: string | null;
  budget: number | null;
};

type SheetMatch = {
  sheetId: string;
  sheetName: string;
  syncedAt: string | null;
  row: Record<string, string | number | null>;
};

export function AdminUserPortfolioView({ userId }: { userId: string }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetMatches, setSheetMatches] = useState<Record<string, SheetMatch[]>>({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<SheetMatch | null>(null);

  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/portfolios/${userId}?page=1&pageSize=1`);
    if (res.ok) {
      const json = await res.json();
      const h: Holding[] = json.holdings || [];
      setHoldings(h);
      setAdminNoteDrafts(Object.fromEntries(h.map((x) => [x.stock_name, x.admin_note || ''])));
    }
    // Holdings render immediately — the cross-sheet match lookup below can
    // populate in the background, same as the user's own portfolio page.
    setLoading(false);

    fetch(`/api/admin/portfolios/${userId}/matches`)
      .then((res) => (res.ok ? res.json() : { matches: {} }))
      .then((json) => setSheetMatches(json.matches || {}))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAdminNote = async (stockName: string) => {
    setSavingNote(stockName);
    const res = await fetch('/api/admin/portfolios/holdings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, stock_name: stockName, admin_note: adminNoteDrafts[stockName] || '' }),
    });
    if (res.ok) {
      setHoldings((prev) =>
        prev.map((h) =>
          h.stock_name === stockName ? { ...h, admin_note: adminNoteDrafts[stockName] || null } : h
        )
      );
    }
    setSavingNote(null);
  };

  if (loading) return <p>Loading…</p>;
  if (holdings.length === 0) return <p style={{ color: '#666' }}>No holdings.</p>;

  return (
    <div>
      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Stock</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Quantity</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Avg price</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Total cost</th>
            <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>Budget</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Sheet references</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>User&apos;s note</th>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Admin note</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const matches = sheetMatches[h.stock_name] || [];
            const invested = h.quantity * h.avg_price;
            const remaining = h.budget != null ? h.budget - invested : null;
            const percentRemaining = remaining != null && h.budget! > 0 ? (remaining / h.budget!) * 100 : null;
            const noteDirty = (adminNoteDrafts[h.stock_name] ?? '') !== (h.admin_note ?? '');

            return (
              <tr key={h.stock_name}>
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
                  {invested.toFixed(2)}
                </td>
                <td
                  data-label="Budget"
                  style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}
                >
                  {h.budget == null ? (
                    <span style={{ color: '#bbb' }}>—</span>
                  ) : (
                    <>
                      <div>{formatCompact(h.budget)}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color:
                            remaining !== null && remaining < 0
                              ? '#c0392b'
                              : percentRemaining !== null && percentRemaining <= 20
                              ? '#b8860b'
                              : '#0a5',
                        }}
                      >
                        {remaining !== null && remaining < 0
                          ? `Over by ${formatCompact(Math.abs(remaining))}`
                          : remaining !== null
                          ? `${formatCompact(remaining)}${
                              percentRemaining !== null ? ` (${Math.round(percentRemaining)}%)` : ''
                            } left`
                          : null}
                      </div>
                    </>
                  )}
                </td>
                <td data-label="Sheet references" style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  {matches.length === 0 ? (
                    <span style={{ color: '#bbb', fontSize: 13 }}>{matchesLoading ? 'Checking…' : '—'}</span>
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
                <td data-label="User's note" style={{ padding: 8, borderBottom: '1px solid #f2f2f2', maxWidth: 200 }}>
                  {h.note ? (
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{h.note}</div>
                  ) : (
                    <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
                  )}
                </td>
                <td data-label="Admin note" style={{ padding: 8, borderBottom: '1px solid #f2f2f2', minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <textarea
                      value={adminNoteDrafts[h.stock_name] ?? ''}
                      onChange={(e) =>
                        setAdminNoteDrafts((prev) => ({ ...prev, [h.stock_name]: e.target.value }))
                      }
                      placeholder="Add an admin note…"
                      rows={2}
                      style={{ flex: 1, fontSize: 13, fontFamily: 'inherit', padding: '6px 8px', resize: 'vertical' }}
                    />
                    {noteDirty && (
                      <button
                        onClick={() => saveAdminNote(h.stock_name)}
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
