import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('stock_name, quantity, avg_price, updated_at, users(id, email, name)')
    .gt('quantity', 0)
    .order('stock_name', { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const holdings = (data || []).map((row) => {
    const user = row.users as unknown as { id: string; email: string; name: string | null } | null;
    return {
      stockName: row.stock_name,
      quantity: Number(row.quantity),
      avgPrice: Number(row.avg_price),
      updatedAt: row.updated_at,
      userId: user?.id || '',
      userEmail: user?.email || '',
      userName: user?.name ?? null,
    };
  });

  return NextResponse.json({ holdings });
}
