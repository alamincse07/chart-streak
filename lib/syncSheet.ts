import { supabaseAdmin, SheetRecord } from './supabase';
import { fetchSheetAsTable } from './googleSheets';

export async function syncSingleSheet(sheet: SheetRecord): Promise<{ rows: number; snapshotId: string }> {
  const table = await fetchSheetAsTable(sheet.google_sheet_id, sheet.sheet_tab_name);

  // Create a new snapshot rather than deleting/overwriting the previous
  // one — this is what preserves prior days' data instead of losing it.
  const { data: snapshot, error: snapshotErr } = await supabaseAdmin
    .from('sheet_snapshots')
    .insert({ sheet_id: sheet.id, row_count: table.rows.length })
    .select()
    .single();

  if (snapshotErr || !snapshot) {
    throw new Error(snapshotErr?.message || 'Failed to create snapshot');
  }

  const toInsert = table.rows.map((data, i) => ({
    sheet_id: sheet.id,
    snapshot_id: snapshot.id,
    row_number: i + 1,
    data,
  }));

  if (toInsert.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { error } = await supabaseAdmin.from('sheet_rows').insert(toInsert.slice(i, i + BATCH));
      if (error) throw new Error(error.message);
    }
  }

  await supabaseAdmin
    .from('sheets')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', sheet.id);

  return { rows: toInsert.length, snapshotId: snapshot.id };
}
