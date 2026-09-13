import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Deliberately does NOT insert into portfolio_transactions — this is a
// direct correction to the derived position (e.g. fixing a typo, syncing
// up with a real-world balance), not a buy/sell event. Trade history will
// not show an entry for this edit.
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
  const quantity = Number(body.quantity);
  const avgPrice = Number(body.avg_price);

  if (!stockName) {
    return NextResponse.json({ error: 'stock_name is required' }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: 'Quantity must be zero or a positive number' }, { status: 400 });
  }
  if (!Number.isFinite(avgPrice) || avgPrice < 0) {
    return NextResponse.json({ error: 'Average price must be zero or a positive number' }, { status: 400 });
  }

  // Only updates a holding the user already owns — this route can't
  // create a new holding, just correct an existing one.
  const { data, error } = await supabaseAdmin
    .from('portfolio_holdings')
    .update({ quantity, avg_price: avgPrice, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('stock_name', stockName)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Holding not found' }, { status: 404 });

  return NextResponse.json({ holding: data });
}
