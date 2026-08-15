import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin, SheetRecord } from '@/lib/supabase';
import { parseQueryParams } from '@/lib/tableQuery';

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

  const { data: sheet, error: sheetErr } = await supabaseAdmin
    .from('sheets')
    .select('*')
    .eq('id', params.sheetId)
    .single<SheetRecord>();

  if (sheetErr || !sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }

  // Find the requested snapshot — either an explicit ?snapshotId= for
  // viewing history, or the most recent one by default. Older snapshots
  // stay in the database (pruned only by the 90-day cron job), so this is
  // what lets past syncs be viewed on demand.
  const requestedSnapshotId = req.nextUrl.searchParams.get('snapshotId');

  let latestSnapshot: { id: string; synced_at: string; row_count: number } | null = null;

  if (requestedSnapshotId) {
    const { data, error: snapshotErr } = await supabaseAdmin
      .from('sheet_snapshots')
      .select('id, synced_at, row_count')
      .eq('id', requestedSnapshotId)
      .eq('sheet_id', sheet.id) // guard against requesting a snapshot from a different sheet
      .maybeSingle();
    if (snapshotErr) return NextResponse.json({ error: snapshotErr.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    latestSnapshot = data;
  } else {
    const { data, error: snapshotErr } = await supabaseAdmin
      .from('sheet_snapshots')
      .select('id, synced_at, row_count')
      .eq('sheet_id', sheet.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapshotErr) return NextResponse.json({ error: snapshotErr.message }, { status: 500 });
    latestSnapshot = data;
  }

  if (!latestSnapshot) {
    return NextResponse.json({
      columns: [],
      rows: [],
      totalRows: 0,
      page: 1,
      pageSize: 0,
      lastSyncedAt: null,
    });
  }

  const query = parseQueryParams(req.nextUrl.searchParams);

  let totalRows = latestSnapshot.row_count;
  if (query.filter) {
    const { count, error: countErr } = await supabaseAdmin
      .from('sheet_rows')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_id', latestSnapshot.id)
      .ilike('data::text', `%${query.filter}%`);
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
    totalRows = count ?? 0;
  }

  let dbQuery = supabaseAdmin
    .from('sheet_rows')
    .select('data')
    .eq('snapshot_id', latestSnapshot.id)
    .order('row_number', { ascending: true });

  if (query.filter) {
    // Substring search across the jsonb blob as text. Fine for small/medium
    // sheets; for very large sheets, add generated columns + btree indexes
    // per filterable field instead of scanning jsonb as text.
    dbQuery = dbQuery.ilike('data::text', `%${query.filter}%`);
  }

  const start = (query.page - 1) * query.pageSize;
  const { data: rowsData, error: rowsErr } = await dbQuery.range(start, start + query.pageSize - 1);

  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 });
  }

  const rows = (rowsData || []).map((r) => r.data as Record<string, string | number | null>);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return NextResponse.json({
    columns,
    rows,
    totalRows,
    page: query.page,
    pageSize: query.pageSize,
    lastSyncedAt: latestSnapshot.synced_at,
    snapshotId: latestSnapshot.id,
    isLatest: !requestedSnapshotId,
  });
}
