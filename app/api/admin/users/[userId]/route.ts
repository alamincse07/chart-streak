import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const nextStatus = body.status;
  if (!['approved', 'blocked', 'pending'].includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Prevent an admin from locking themselves out by blocking their own account.
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', params.userId)
    .single();

  if (target?.email === session?.user?.email && nextStatus !== 'approved') {
    return NextResponse.json({ error: "You can't change your own access status." }, { status: 400 });
  }

  const { data: actingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session?.user?.email)
    .single();

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update({
      status: nextStatus,
      status_updated_at: new Date().toISOString(),
      status_updated_by: actingUser?.id,
    })
    .eq('id', params.userId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
