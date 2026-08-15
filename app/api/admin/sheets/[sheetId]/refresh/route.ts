import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin, SheetRecord } from '@/lib/supabase';
import { syncSingleSheet } from '@/lib/syncSheet';

export async function POST(_req: Request, { params }: { params: { sheetId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data: sheet, error: sheetErr } = await supabaseAdmin
    .from('sheets')
    .select('*')
    .eq('id', params.sheetId)
    .single<SheetRecord>();

  if (sheetErr || !sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }

  try {
    const { rows } = await syncSingleSheet(sheet);
    return NextResponse.json({ ok: true, rows, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
