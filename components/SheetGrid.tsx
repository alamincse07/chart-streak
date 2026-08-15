'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, RowClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { RowDetailModal } from './RowDetailModal';

type SheetDataResponse = {
  columns: string[];
  rows: Record<string, string | number | null>[];
  totalRows: number;
  page: number;
  pageSize: number;
  lastSyncedAt: string | null;
  snapshotId?: string;
  isLatest?: boolean;
};

type SnapshotOption = {
  id: string;
  synced_at: string;
  row_count: number;
};

const PAGE_SIZE = 100;

export function SheetGrid({ sheetId }: { sheetId: string }) {
  const [rowData, setRowData] = useState<Record<string, string | number | null>[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [meta, setMeta] = useState<{ lastSyncedAt: string | null; isLatest: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [snapshots, setSnapshots] = useState<SnapshotOption[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(''); // '' = latest

  // Fixed search on "Stock Name" only, across all history, newest sync first.
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  const [selectedRow, setSelectedRow] = useState<Record<string, string | number | null> | null>(null);

  useEffect(() => {
    fetch(`/api/sheets/${sheetId}/snapshots`)
      .then((res) => (res.ok ? res.json() : { snapshots: [] }))
      .then((json) => setSnapshots(json.snapshots || []));
  }, [sheetId]);

  const loadPage = useCallback(
    async (targetPage: number, snapshotId?: string) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      if (snapshotId) params.set('snapshotId', snapshotId);

      const res = await fetch(`/api/sheets/${sheetId}/data?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json: SheetDataResponse = await res.json();

      setColumnDefs(
        json.columns.map((col) => ({
          field: col,
          headerName: col,
          sortable: true, // client-side sort only, applies within the current page
          resizable: true,
          minWidth: 120,
        }))
      );
      setRowData(json.rows);
      setTotalRows(json.totalRows);
      setPage(json.page);
      setMeta({ lastSyncedAt: json.lastSyncedAt, isLatest: json.isLatest ?? true });
      setLoading(false);
    },
    [sheetId]
  );

  const loadSearch = useCallback(
    async (targetPage: number) => {
      if (!searchTerm) return;
      setLoading(true);
      const params = new URLSearchParams({
        query: searchTerm,
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });

      const res = await fetch(`/api/sheets/${sheetId}/search?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = await res.json();

      setColumnDefs(
        json.columns.map((col: string) => ({
          field: col,
          headerName: col === '_syncedAt' ? 'Synced at' : col,
          sortable: true,
          resizable: true,
          minWidth: col === '_syncedAt' ? 180 : 120,
          valueFormatter:
            col === '_syncedAt'
              ? (p: any) => (p.value ? new Date(p.value).toLocaleString() : '')
              : undefined,
        }))
      );
      setRowData(json.rows);
      setTotalRows(json.totalRows);
      setSearchPage(json.page);
      setLoading(false);
    },
    [sheetId, searchTerm]
  );

  const onGridReady = useCallback(
    (_e: GridReadyEvent) => {
      loadPage(1);
    },
    [loadPage]
  );

  const onRowClicked = useCallback((e: RowClickedEvent) => {
    if (e.data) setSelectedRow(e.data);
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const handleSnapshotChange = (id: string) => {
    setSelectedSnapshotId(id);
    loadPage(1, id || undefined);
  };

  const handleSearchSubmit = () => {
    if (!searchTerm) return;
    setIsSearchActive(true);
    loadSearch(1);
  };

  const clearSearch = () => {
    setIsSearchActive(false);
    setSearchTerm('');
    loadPage(1, selectedSnapshotId || undefined);
  };

  const defaultColDef = useMemo<ColDef>(() => ({ flex: 1, minWidth: 100 }), []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search Stock Name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button onClick={handleSearchSubmit} disabled={!searchTerm}>
          Search
        </button>
        {isSearchActive && <button onClick={clearSearch}>Clear</button>}

        {!isSearchActive && snapshots.length > 1 && (
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
      </div>

      {meta && !isSearchActive && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          {meta.isLatest ? 'Latest sync' : 'Viewing history'} ·{' '}
          {meta.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleString() : 'never'}
        </div>
      )}
      {isSearchActive && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Showing matches for &quot;{searchTerm}&quot; in <strong>Stock Name</strong> across all history,
          newest sync first.
        </div>
      )}

      <div className="ag-theme-quartz" style={{ height: 560, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          loading={loading}
          animateRows={false}
          rowStyle={{ cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          disabled={(isSearchActive ? searchPage : page) <= 1}
          onClick={() =>
            isSearchActive ? loadSearch(searchPage - 1) : loadPage(page - 1, selectedSnapshotId || undefined)
          }
        >
          Previous
        </button>
        <span style={{ fontSize: 13 }}>
          Page {isSearchActive ? searchPage : page} of {totalPages} ({totalRows} rows)
        </span>
        <button
          disabled={(isSearchActive ? searchPage : page) >= totalPages}
          onClick={() =>
            isSearchActive ? loadSearch(searchPage + 1) : loadPage(page + 1, selectedSnapshotId || undefined)
          }
        >
          Next
        </button>
      </div>

      <RowDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
