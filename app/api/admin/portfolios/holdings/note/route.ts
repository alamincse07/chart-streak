import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const userId = body.user_id;
  const stockName = (body.stock_name || '').trim();
  const adminNote = typeof body.admin_note === 'string' ? body.admin_note.trim() : '';

  if (!userId || !stockName) {
    return NextResponse.json({ error: 'user_id and stock_name are required' }, { status: 400 });
  }

  const { data, error: updateErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .update({ admin_note: adminNote || null })
    .eq('user_id', userId)
    .eq('stock_name', stockName)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Holding not found' }, { status: 404 });

  return NextResponse.json({ holding: data });
}
