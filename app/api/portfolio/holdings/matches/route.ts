import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const STOCK_NAME_COLUMN = 'Stock Name';
const STOCK_NAME_PATH = `data->>"${STOCK_NAME_COLUMN}"`;

type Match = {
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 });
  }

  const userId = (session.user as any).id;

  const { data: holdings, error: holdingsErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('stock_name')
    .eq('user_id', userId)
    .gt('quantity', 0);

  if (holdingsErr) return NextResponse.json({ error: holdingsErr.message }, { status: 500 });
  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ matches: {} });
  }

  // Every table-type sheet is searchable — notes sheets have no Stock
  // Name column to match against, so they're excluded by type alone.
  const { data: sheets, error: sheetsErr } = await supabaseAdmin
    .from('sheets')
    .select('id, display_name')
    .eq('sheet_type', 'table');

  if (sheetsErr) return NextResponse.json({ error: sheetsErr.message }, { status: 500 });
  if (!sheets || sheets.length === 0) {
    return NextResponse.json({ matches: {} });
  }

  const variantList = Array.from(new Set(holdings.flatMap((h) => caseVariants(h.stock_name))));
  const matches: Record<string, Match[]> = {};

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
      const heldOriginal = holdings.find((h) => h.stock_name.trim().toLowerCase() === normalized);
      if (!heldOriginal) continue;

      const key = heldOriginal.stock_name;
      if (!matches[key]) matches[key] = [];
      matches[key].push({
        sheetId: sheet.id,
        sheetName: sheet.display_name,
        syncedAt: latestSnapshot.synced_at,
        row: rowData,
      });
    }
  }

  return NextResponse.json({ matches });
}
