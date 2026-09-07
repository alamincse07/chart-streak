'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

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
  note: string | null;
  admin_note: string | null;
};

function HoldingRow({
  holding,
  userId,
  onSaved,
}: {
  holding: Holding;
  userId: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(holding.admin_note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(holding.admin_note || '');
  }, [holding.admin_note]);

  const dirty = draft !== (holding.admin_note || '');

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/portfolios/holdings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, stock_name: holding.stock_name, admin_note: draft }),
    });
    if (res.ok) onSaved();
    setSaving(false);
  };

  return (
    <tr>
      <td style={{ padding: 6 }}>{holding.stock_name}</td>
      <td style={{ padding: 6, textAlign: 'right' }}>{holding.quantity}</td>
      <td style={{ padding: 6, textAlign: 'right' }}>{holding.avg_price.toFixed(2)}</td>
      <td style={{ padding: 6, maxWidth: 200 }}>
        {holding.note ? holding.note : <span style={{ color: '#bbb' }}>—</span>}
      </td>
      <td style={{ padding: 6, minWidth: 200 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an admin note…"
            rows={2}
            style={{ flex: 1, fontSize: 12, fontFamily: 'inherit', padding: '4px 6px', resize: 'vertical' }}
          />
          {dirty && (
            <button onClick={save} disabled={saving} style={{ fontSize: 11, padding: '4px 8px', whiteSpace: 'nowrap' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AdminPortfoliosView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/portfolios')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((json) => setUsers(json.users || []))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    // pageSize=1 for transactions — this view only needs holdings; the
    // full trade history lives on its own page now.
    const res = await fetch(`/api/admin/portfolios/${userId}?page=1&pageSize=1`);
    if (res.ok) {
      const json = await res.json();
      setHoldings(json.holdings || []);
    }
    setDetailLoading(false);
  }, []);

  const toggleUser = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    loadDetail(userId);
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 14, margin: 0 }}>Holdings</h3>
                    <Link href={`/admin/portfolios/${u.userId}/trades`} style={{ fontSize: 13 }}>
                      View trade history →
                    </Link>
                  </div>
                  {holdings.length === 0 ? (
                    <p style={{ color: '#666', fontSize: 13 }}>No holdings.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: 6 }}>Stock</th>
                          <th style={{ textAlign: 'right', padding: 6 }}>Quantity</th>
                          <th style={{ textAlign: 'right', padding: 6 }}>Avg price</th>
                          <th style={{ textAlign: 'left', padding: 6 }}>User&apos;s note</th>
                          <th style={{ textAlign: 'left', padding: 6 }}>Admin note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => (
                          <HoldingRow
                            key={h.stock_name}
                            holding={h}
                            userId={u.userId}
                            onSaved={() => loadDetail(u.userId)}
                          />
                        ))}
                      </tbody>
                    </table>
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
