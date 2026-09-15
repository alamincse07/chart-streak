import { supabaseAdmin } from './supabase';

const STOCK_NAME_COLUMN = 'Stock Name';
const STOCK_NAME_PATH = `data->>"${STOCK_NAME_COLUMN}"`;

export type SheetMatch = {
  sheetId: string;
  sheetName: string;
  syncedAt: string | null;
  row: Record<string, string | number | null>;
};

// A handful of cheap case variants so an IN query (fast, indexable) can
// still catch the common case of the user typing "abc" while the sheet
// has "ABC", without doing a full case-insensitive table scan. Final
// association back to the holding is still done case-insensitively in JS,
// but only over the small set of rows Postgres already filtered down to.
function caseVariants(name: string): string[] {
  const trimmed = name.trim();
  const title = trimmed.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return Array.from(new Set([trimmed, trimmed.toUpperCase(), trimmed.toLowerCase(), title]));
}

export async function findSheetMatchesForStocks(
  stockNames: string[]
): Promise<Record<string, SheetMatch[]>> {
  if (stockNames.length === 0) return {};

  // Every table-type sheet is searchable — notes sheets have no Stock
  // Name column to match against, so they're excluded by type alone.
  const { data: sheets, error: sheetsErr } = await supabaseAdmin
    .from('sheets')
    .select('id, display_name')
    .eq('sheet_type', 'table');

  if (sheetsErr) throw new Error(sheetsErr.message);
  if (!sheets || sheets.length === 0) return {};

  const variantList = Array.from(new Set(stockNames.flatMap((name) => caseVariants(name))));
  const matches: Record<string, SheetMatch[]> = {};

  for (const sheet of sheets) {
    const { data: latestSnapshot } = await supabaseAdmin
      .from('sheet_snapshots')
      .select('id, synced_at')
      .eq('sheet_id', sheet.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestSnapshot) continue;

    // The actual optimization: let Postgres filter by stock name via IN
    // instead of fetching every row in the snapshot and filtering in JS.
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('sheet_rows')
      .select('data')
      .eq('snapshot_id', latestSnapshot.id)
      .in(STOCK_NAME_PATH, variantList);

    if (rowsErr || !rows) continue;

    for (const r of rows) {
      const rowData = r.data as Record<string, string | number | null>;
      const stockValue = rowData[STOCK_NAME_COLUMN];
      if (stockValue === null || stockValue === undefined) continue;

      const normalized = String(stockValue).trim().toLowerCase();
      const heldOriginal = stockNames.find((name) => name.trim().toLowerCase() === normalized);
      if (!heldOriginal) continue;

      if (!matches[heldOriginal]) matches[heldOriginal] = [];
      matches[heldOriginal].push({
        sheetId: sheet.id,
        sheetName: sheet.display_name,
        syncedAt: latestSnapshot.synced_at,
        row: rowData,
      });
    }
  }

  return matches;
}
