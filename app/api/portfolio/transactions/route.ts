import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { applyPortfolioTransaction } from '@/lib/portfolio';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') || '20', 10) || 20));
  const start = (page - 1) * pageSize;

  const { data, error, count } = await supabaseAdmin
    .from('portfolio_transactions')
    .select('*, portfolio_transaction_comments(id, comment, created_at)', { count: 'exact' })
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transactions: data, totalCount: count ?? 0, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { stock_name, transaction_type, quantity, price } = body;

  if (!stock_name || !['buy', 'sell'].includes(transaction_type)) {
    return NextResponse.json({ error: 'stock_name and a valid transaction_type are required' }, { status: 400 });
  }

  const qty = Number(quantity);
  const prc = Number(price);
  if (!Number.isFinite(qty) || !Number.isFinite(prc)) {
    return NextResponse.json({ error: 'quantity and price must be numbers' }, { status: 400 });
  }

  try {
    const result = await applyPortfolioTransaction(userId, stock_name.trim(), transaction_type, qty, prc);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
