import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const stockName = (body.stock_name || '').trim();
  const note = (body.note || '').trim();

  if (!stockName || !note) {
    return NextResponse.json({ error: 'stock_name and note are both required' }, { status: 400 });
  }

  const { data, error: updateErr } = await supabaseAdmin
    .from('stock_broadcasts')
    .update({ stock_name: stockName, note, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, stock_name, note, created_at, updated_at, admin:users(name, email)')
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });

  return NextResponse.json({ broadcast: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { error: delErr } = await supabaseAdmin.from('stock_broadcasts').delete().eq('id', params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
