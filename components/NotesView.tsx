'use client';
import { useCallback, useEffect, useState } from 'react';

import { EmailWatermark } from '@/components/EmailWatermark';
type NotesDataResponse = {
  columns: string[];
  rows: Record<string, string | number | null>[];
  lastSyncedAt: string | null;
  isLatest?: boolean;
};

type SnapshotOption = {
  id: string;
  synced_at: string;
  row_count: number;
};

// Only matches a plain URL that clearly points at an image file. Sheets
// with images inserted via =IMAGE("url") or "Insert image in cell" won't
// come through values.get as usable text at all — see the README note on
// this — so this only ever catches plain URLs typed directly into a cell.
const IMAGE_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i;

function FieldValue({ value }: { value: string | number | null }) {
  if (value === null || value === '') {
    return <span style={{ color: '#bbb' }}>—</span>;
  }
  const str = String(value);

  if (IMAGE_URL_RE.test(str.trim())) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={str.trim()}
        alt=""
        style={{ maxWidth: '100%', borderRadius: 6, marginTop: 6, display: 'block' }}
      />
    );
  }

  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 15 }}>{str}</div>
  );
}

export function NotesView({ sheetId }: { sheetId: string }) {
  const [rows, setRows] = useState<Record<string, string | number | null>[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLatest, setIsLatest] = useState(true);
  const [loading, setLoading] = useState(true);

  const [snapshots, setSnapshots] = useState<SnapshotOption[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(''); // '' = latest

  useEffect(() => {
    fetch(`/api/sheets/${sheetId}/snapshots`)
      .then((res) => (res.ok ? res.json() : { snapshots: [] }))
      .then((json) => setSnapshots(json.snapshots || []));
  }, [sheetId]);

  const load = useCallback(
    async (snapshotId?: string) => {
      setLoading(true);
      // Notes sheets are expected to be small (a handful of entries), so a
      // single large page covers it without needing pagination controls.
      const params = new URLSearchParams({ page: '1', pageSize: '200' });
      if (snapshotId) params.set('snapshotId', snapshotId);

      const res = await fetch(`/api/sheets/${sheetId}/data?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json: NotesDataResponse = await res.json();
      setRows(json.rows);
      setLastSyncedAt(json.lastSyncedAt);
      setIsLatest(json.isLatest ?? true);
      setLoading(false);
    },
    [sheetId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSnapshotChange = (id: string) => {
    setSelectedSnapshotId(id);
    load(id || undefined);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {snapshots.length > 1 && (
          <select
            value={selectedSnapshotId}
            onChange={(e) => handleSnapshotChange(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">Latest</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.synced_at).toLocaleString()} ({s.row_count} rows)
              </option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 12, color: '#666' }}>
          {isLatest ? 'Latest sync' : 'Viewing history'} ·{' '}
          {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'}
        </span>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: '#666' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((row, i) => (
            <article
              key={i}
              style={{
                border: '1px solid #eee',
                borderRadius: 10,
                padding: '18px 20px',
                background: '#fff',
              }}
            >
              {Object.entries(row).map(([field, value]) => (
                <div key={field} style={{ marginBottom: 14, color:'#000fffe8' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 600 }}>
                    {field}
                  </div>
                  <FieldValue value={value} />
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

<EmailWatermark />
    </div>
  );
}
