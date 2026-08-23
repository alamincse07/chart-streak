import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('stock_broadcasts')
    .select('id, stock_name, note, created_at, admin:users(name, email)')
    .order('created_at', { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ broadcasts: data });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const stockName = (body.stock_name || '').trim();
  const note = (body.note || '').trim();

  if (!stockName || !note) {
    return NextResponse.json({ error: 'stock_name and note are both required' }, { status: 400 });
  }

  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session?.user?.email)
    .single();

  const { data, error: insertErr } = await supabaseAdmin
    .from('stock_broadcasts')
    .insert({ stock_name: stockName, note, admin_id: adminUser?.id })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ broadcast: data });
}
