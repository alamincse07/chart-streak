import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PortfolioView } from '@/components/PortfolioView';

export default async function AdminUserPortfolioPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');
  if (!(session.user as any).isAdmin) {
    return (
      <main style={{ padding: '1rem' }}>
        <h1 style={{ fontSize: 20 }}>Not authorized</h1>
        <p>Your account doesn&apos;t have admin access.</p>
      </main>
    );
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', params.userId)
    .single();

  if (!user) {
    notFound();
  }

  return (
    <main style={{ padding: '1rem' }}>
      <Link href="/admin/portfolios" style={{ fontSize: 13, display: 'inline-block', marginBottom: 12 }}>
        ← Back to portfolios
      </Link>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{user.name || user.email}</h1>
        <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{user.email}</p>
      </div>
      <PortfolioView mode="admin" userId={params.userId} />
    </main>
  );
}
