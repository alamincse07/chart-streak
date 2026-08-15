import { supabaseAdmin } from './supabase';

const DEFAULT_RETENTION_DAYS = 90;

export async function pruneOldSnapshots(
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<{ sheetId: string; deleted: number }[]> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: sheets, error: sheetsErr } = await supabaseAdmin.from('sheets').select('id');
  if (sheetsErr) throw new Error(sheetsErr.message);

  const results: { sheetId: string; deleted: number }[] = [];

  for (const sheet of sheets || []) {
    const { data: snapshots, error: snapErr } = await supabaseAdmin
      .from('sheet_snapshots')
      .select('id, synced_at')
      .eq('sheet_id', sheet.id)
      .order('synced_at', { ascending: false });

    if (snapErr || !snapshots || snapshots.length <= 1) {
      results.push({ sheetId: sheet.id, deleted: 0 });
      continue;
    }

    // Always keep the single most recent snapshot, even if it's older than
    // the retention window — a sheet should never end up with zero data.
    // Everything else older than the cutoff is eligible for deletion.
    const toDelete = snapshots.slice(1).filter((s) => s.synced_at < cutoff).map((s) => s.id);

    if (toDelete.length > 0) {
      // Deleting from sheet_snapshots cascades to sheet_rows via the FK.
      const { error: delErr } = await supabaseAdmin.from('sheet_snapshots').delete().in('id', toDelete);
      if (delErr) throw new Error(delErr.message);
    }

    results.push({ sheetId: sheet.id, deleted: toDelete.length });
  }

  return results;
}
