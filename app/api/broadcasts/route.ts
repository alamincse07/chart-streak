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

  const { data, error } = await supabaseAdmin
    .from('stock_broadcasts')
    .select('id, stock_name, note, created_at, admin:users(name, email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ broadcasts: data });
}
