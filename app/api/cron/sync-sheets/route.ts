import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, SheetRecord } from '@/lib/supabase';
import { syncSingleSheet } from '@/lib/syncSheet';
import { pruneOldSnapshots } from '@/lib/pruneSnapshots';

// Runs once daily at 00:00 UTC via vercel.json's cron schedule. Vercel
// sends a GET request with `Authorization: Bearer $CRON_SECRET` automatically
// when CRON_SECRET is set as an env var.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: sheets, error } = await supabaseAdmin
    .from('sheets')
    .select('*')
    .returns<SheetRecord[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const syncResults: { sheetId: string; status: string; rows?: number }[] = [];

  for (const sheet of sheets || []) {
    try {
      const { rows } = await syncSingleSheet(sheet);
      syncResults.push({ sheetId: sheet.id, status: 'synced', rows });
    } catch (err) {
      syncResults.push({ sheetId: sheet.id, status: `error: ${(err as Error).message}` });
    }
  }

  let pruneResults: { sheetId: string; deleted: number }[] = [];
  let pruneError: string | null = null;
  try {
    // Keeps history for 90 days per sheet, always preserving at least the
    // most recent snapshot regardless of age.
    pruneResults = await pruneOldSnapshots(90);
  } catch (err) {
    pruneError = (err as Error).message;
  }

  return NextResponse.json({ syncResults, pruneResults, pruneError });
}
