import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('user_id, stock_name, quantity, avg_price, users(email, name)')
    .gt('quantity', 0)
    .order('user_id');

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Group flat holding rows into one entry per user for the admin list view.
  const byUser = new Map<
    string,
    { userId: string; email: string; name: string | null; holdingsCount: number; totalInvested: number }
  >();

  for (const row of data || []) {
    const userInfo = row.users as unknown as { email: string; name: string | null } | null;
    const existing = byUser.get(row.user_id);
    const invested = Number(row.quantity) * Number(row.avg_price);
    if (existing) {
      existing.holdingsCount += 1;
      existing.totalInvested += invested;
    } else {
      byUser.set(row.user_id, {
        userId: row.user_id,
        email: userInfo?.email || '',
        name: userInfo?.name ?? null,
        holdingsCount: 1,
        totalInvested: invested,
      });
    }
  }

  return NextResponse.json({ users: Array.from(byUser.values()) });
}
