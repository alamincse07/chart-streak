import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';
import { findSheetMatchesForStocks } from '@/lib/portfolioMatches';

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data: holdings, error: holdingsErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('stock_name')
    .eq('user_id', params.userId)
    .gt('quantity', 0);

  if (holdingsErr) return NextResponse.json({ error: holdingsErr.message }, { status: 500 });
  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ matches: {} });
  }

  try {
    const matches = await findSheetMatchesForStocks(holdings.map((h) => h.stock_name));
    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
