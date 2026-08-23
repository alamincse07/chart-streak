import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') || '20', 10) || 20));
  const start = (page - 1) * pageSize;

  const [{ data: holdings, error: holdingsErr }, { data: transactions, error: txnErr, count }] = await Promise.all([
    supabaseAdmin
      .from('portfolio_holdings')
      .select('stock_name, quantity, avg_price, updated_at')
      .eq('user_id', params.userId)
      .gt('quantity', 0)
      .order('stock_name', { ascending: true }),
    supabaseAdmin
      .from('portfolio_transactions')
      .select('*, portfolio_transaction_comments(id, comment, created_at)', { count: 'exact' })
      .eq('user_id', params.userId)
      .order('transaction_date', { ascending: false })
      .range(start, start + pageSize - 1),
  ]);

  if (holdingsErr) return NextResponse.json({ error: holdingsErr.message }, { status: 500 });
  if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 });

  return NextResponse.json({
    holdings,
    transactions,
    transactionsTotalCount: count ?? 0,
    page,
    pageSize,
  });
}
