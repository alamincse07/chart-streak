import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { AdminUserPortfolioView } from '@/components/AdminUserPortfolioView';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>{user.name || user.email}</h1>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{user.email}</p>
        </div>
        <Link href={`/admin/portfolios/${params.userId}/trades`} style={{ fontSize: 13 }}>
          View trade history →
        </Link>
      </div>
      <AdminUserPortfolioView userId={params.userId} />
    </main>
  );
}
