'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Holding = {
  stockName: string;
  quantity: number;
  avgPrice: number;
  updatedAt: string;
  userId: string;
  userEmail: string;
  userName: string | null;
};

type StockSummary = {
  stockName: string;
  holderCount: number;
  totalQuantity: number;
  totalInvested: number;
};

const PAGE_SIZE = 10;

export function AdminHoldingsView() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/holdings')
      .then((res) => (res.ok ? res.json() : { holdings: [] }))
      .then((json) => setHoldings(json.holdings || []))
      .finally(() => setLoading(false));
  }, []);

  // Reset to page 1 whenever the search term changes, so a new search
  // doesn't leave you stranded on a page number that no longer applies.
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Group into one summary per stock — this is the "how many users hold
  // ABC" view — ranked by holder count so the most widely-held stocks
  // surface first by default, before any search is typed.
  const allSummaries = useMemo(() => {
    const map = new Map<string, { holders: Set<string>; totalQuantity: number; totalInvested: number }>();
    for (const h of holdings) {
      const entry = map.get(h.stockName) || { holders: new Set<string>(), totalQuantity: 0, totalInvested: 0 };
      entry.holders.add(h.userId);
      entry.totalQuantity += h.quantity;
      entry.totalInvested += h.quantity * h.avgPrice;
      map.set(h.stockName, entry);
    }
    const summaries: StockSummary[] = Array.from(map.entries()).map(([stockName, v]) => ({
      stockName,
      holderCount: v.holders.size,
      totalQuantity: v.totalQuantity,
      totalInvested: v.totalInvested,
    }));
    return summaries.sort((a, b) => b.holderCount - a.holderCount);
  }, [holdings]);

  const filteredSummaries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allSummaries;
    return allSummaries.filter((s) => s.stockName.toLowerCase().includes(needle));
  }, [allSummaries, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / PAGE_SIZE));
  const pageSummaries = filteredSummaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const holdersForStock = (stockName: string) => holdings.filter((h) => h.stockName === stockName);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search stock name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 320, marginBottom: 8 }}
      />
      <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        {search
          ? `${filteredSummaries.length} matching stock${filteredSummaries.length === 1 ? '' : 's'}`
          : `Showing top ${Math.min(PAGE_SIZE, filteredSummaries.length)} of ${filteredSummaries.length} stocks by holder count · search or page through the rest below`}
      </p>

      {pageSummaries.length === 0 ? (
        <p style={{ color: '#666' }}>
          {holdings.length === 0 ? 'No holdings recorded yet.' : 'No holdings match that search.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {pageSummaries.map((s) => (
            <div
              key={s.stockName}
              style={{
                border: '1px solid #e5e9f0',
                background: '#f7f9fc',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => setExpandedStock(expandedStock === s.stockName ? null : s.stockName)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                  }}
                >
                  {expandedStock === s.stockName ? '▾' : '▸'} <strong>{s.stockName}</strong> —{' '}
                  {s.holderCount} user{s.holderCount === 1 ? '' : 's'} holding · {s.totalQuantity} total
                  quantity · {s.totalInvested.toFixed(2)} total invested
                </button>
                <Link
                  href={`/admin/broadcasts?stock=${encodeURIComponent(s.stockName)}`}
                  style={{
                    fontSize: 13,
                    padding: '5px 10px',
                    borderRadius: 6,
                    background: '#1d6fd6',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  Broadcast a note on {s.stockName}
                </Link>
              </div>

              {expandedStock === s.stockName && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 6, borderTop: '1px solid #e5e9f0' }}>User</th>
                      <th style={{ textAlign: 'right', padding: 6, borderTop: '1px solid #e5e9f0' }}>Quantity</th>
                      <th style={{ textAlign: 'right', padding: 6, borderTop: '1px solid #e5e9f0' }}>Avg price</th>
                      <th style={{ textAlign: 'right', padding: 6, borderTop: '1px solid #e5e9f0' }}>Total cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdersForStock(s.stockName).map((h) => (
                      <tr key={h.userId}>
                        <td style={{ padding: 6 }}>
                          {h.userName || h.userEmail}
                          <div style={{ fontSize: 11, color: '#888' }}>{h.userEmail}</div>
                        </td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{h.quantity}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{h.avgPrice.toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>
                          {(h.quantity * h.avgPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredSummaries.length > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span style={{ fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
