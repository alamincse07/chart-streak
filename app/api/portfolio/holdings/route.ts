import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).status !== 'approved') {
    return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const { data, error } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('stock_name, quantity, avg_price, updated_at')
    .eq('user_id', userId)
    .gt('quantity', 0)
    .order('stock_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ holdings: data });
}
