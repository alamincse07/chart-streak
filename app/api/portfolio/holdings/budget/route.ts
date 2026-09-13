import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const stockName = (body.stock_name || '').trim();
  const rawBudget = body.budget;

  if (!stockName) {
    return NextResponse.json({ error: 'stock_name is required' }, { status: 400 });
  }

  // An empty/null budget clears it (no cap set) — anything else must be a
  // non-negative number.
  let budget: number | null = null;
  if (rawBudget !== null && rawBudget !== undefined && rawBudget !== '') {
    const num = Number(rawBudget);
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ error: 'Budget must be zero or a positive number' }, { status: 400 });
    }
    budget = num;
  }

  const { data, error } = await supabaseAdmin
    .from('portfolio_holdings')
    .update({ budget })
    .eq('user_id', userId)
    .eq('stock_name', stockName)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Holding not found' }, { status: 404 });

  return NextResponse.json({ holding: data });
}
