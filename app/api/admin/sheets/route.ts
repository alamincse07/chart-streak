import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('sheets')
    .select('id, display_name, google_sheet_id, sheet_tab_name, sheet_type, last_synced_at')
    .order('display_name', { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ sheets: data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { display_name, google_sheet_id, sheet_tab_name, sheet_type } = body;

  if (!display_name || !google_sheet_id || !sheet_tab_name) {
    return NextResponse.json(
      { error: 'display_name, google_sheet_id, and sheet_tab_name are all required' },
      { status: 400 }
    );
  }

  const resolvedType = sheet_type === 'notes' ? 'notes' : 'table';

  const { data, error: insertErr } = await supabaseAdmin
    .from('sheets')
    .insert({ display_name, google_sheet_id, sheet_tab_name, sheet_type: resolvedType })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ sheet: data });
}

