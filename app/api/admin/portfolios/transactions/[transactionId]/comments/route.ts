import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { transactionId: string } }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const comment = (body.comment || '').trim();
  if (!comment) {
    return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
  }

  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session?.user?.email)
    .single();

  const { data, error: insertErr } = await supabaseAdmin
    .from('portfolio_transaction_comments')
    .insert({
      transaction_id: params.transactionId,
      admin_id: adminUser?.id,
      comment,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ comment: data });
}
