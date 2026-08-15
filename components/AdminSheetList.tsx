'use client';
import { useEffect, useState } from 'react';

type AdminSheet = {
  id: string;
  display_name: string;
  google_sheet_id: string;
  sheet_tab_name: string;
  sheet_type: 'table' | 'notes';
  last_synced_at: string | null;
};

export function AdminSheetList() {
  const [sheets, setSheets] = useState<AdminSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [tabName, setTabName] = useState('');
  const [sheetType, setSheetType] = useState<'table' | 'notes'>('table');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/sheets');
    if (res.ok) {
      const json = await res.json();
      setSheets(json.sheets);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addSheet = async () => {
    setErrorMsg(null);
    if (!displayName || !sheetId || !tabName) {
      setErrorMsg('All fields are required.');
      return;
    }
    setAdding(true);
    const res = await fetch('/api/admin/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        google_sheet_id: sheetId,
        sheet_tab_name: tabName,
        sheet_type: sheetType,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Failed to add sheet');
    } else {
      setDisplayName('');
      setSheetId('');
      setTabName('');
      setSheetType('table');
      await load();
    }
    setAdding(false);
  };

  const refreshSheet = async (id: string) => {
    setRefreshingId(id);
    setErrorMsg(null);
    const res = await fetch(`/api/admin/sheets/${id}/refresh`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Refresh failed');
    } else {
      await load();
    }
    setRefreshingId(null);
  };

  return (
    <div>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Add a sheet</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Display name (e.g. Q3 Revenue)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <input
            type="text"
            placeholder="Google Sheet ID (from the URL)"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            style={{ flex: '1 1 260px' }}
          />
          <input
            type="text"
            placeholder="Tab name (e.g. Sheet1)"
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            style={{ flex: '1 1 160px' }}
          />
          <select
            value={sheetType}
            onChange={(e) => setSheetType(e.target.value as 'table' | 'notes')}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="table">Table (grid view)</option>
            <option value="notes">Notes (long text / paragraphs)</option>
          </select>
        </div>
        <button onClick={addSheet} disabled={adding}>
          {adding ? 'Adding…' : 'Add sheet'}
        </button>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Make sure the sheet has already been shared with your service account&apos;s
          email (Viewer access) before adding it here.
        </p>
      </div>

      {errorMsg && <p style={{ color: 'crimson', marginBottom: 8 }}>{errorMsg}</p>}

      {loading ? (
        <p>Loading sheets…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Sheet</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Last synced</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sheets.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <div>{s.display_name}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>
                    {s.google_sheet_id} · {s.sheet_tab_name} ·{' '}
                    <span style={{ textTransform: 'capitalize' }}>{s.sheet_type}</span>
                  </div>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : 'never'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <button disabled={refreshingId === s.id} onClick={() => refreshSheet(s.id)}>
                    {refreshingId === s.id ? 'Refreshing…' : 'Refresh now'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
