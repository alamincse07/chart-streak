import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Fixed on purpose — this endpoint only ever searches the "Stock Name"
// column. If you need to search a different column, change this constant
// rather than making it a request parameter.
const SEARCH_COLUMN = 'Stock Name';

export async function GET(
  req: NextRequest,
  { params }: { params: { sheetId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json(
      { error: 'Your account has not been approved to view this data yet.' },
      { status: 403 }
    );
  }

  const term = req.nextUrl.searchParams.get('query');
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') || '100', 10) || 100));

  if (!term) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  // sheet_rows.synced_at is set at insert time during each sync, so it
  // effectively records which sync each row belongs to — ordering by it
  // directly means matches from the most recent sync come first, without
  // needing to join back to sheet_snapshots.
  //
  // Double-quoted because the column name contains a space — unquoted,
  // `data->>Stock Name` breaks on the space in PostgREST's path syntax.
  const jsonPath = `data->>"${SEARCH_COLUMN}"`;

  const { count, error: countErr } = await supabaseAdmin
    .from('sheet_rows')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', params.sheetId)
    .ilike(jsonPath, `%${term}%`);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  const start = (page - 1) * pageSize;
  const { data: rowsData, error: rowsErr } = await supabaseAdmin
    .from('sheet_rows')
    .select('data, synced_at')
    .eq('sheet_id', params.sheetId)
    .ilike(jsonPath, `%${term}%`)
    .order('synced_at', { ascending: false })
    .order('row_number', { ascending: true })
    .range(start, start + pageSize - 1);

  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  const rows = (rowsData || []).map((r) => ({
    ...(r.data as Record<string, string | number | null>),
    _syncedAt: r.synced_at,
  }));

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return NextResponse.json({
    columns,
    rows,
    totalRows: count ?? 0,
    page,
    pageSize,
  });
}
