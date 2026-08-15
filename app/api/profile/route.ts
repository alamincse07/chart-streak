import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// A conservative phone check: digits, spaces, +, -, () — at least 7 digits
// total. Intentionally not tied to one country's format since sign-in is
// open to anyone.
function isPlausiblePhone(phone: string): boolean {
  const digitCount = (phone.match(/\d/g) || []).length;
  return digitCount >= 7 && /^[\d\s+\-()]+$/.test(phone);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!phone || !isPlausiblePhone(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ name, phone, phone_updated_at: new Date().toISOString() })
    .eq('email', session.user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
