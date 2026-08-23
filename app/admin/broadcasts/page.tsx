import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminBroadcastList } from '@/components/AdminBroadcastList';

export default async function AdminBroadcastsPage({
  searchParams,
}: {
  searchParams: { stock?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');
  if (!(session.user as any).isAdmin) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: 20 }}>Not authorized</h1>
        <p>Your account doesn&apos;t have admin access.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Broadcast notes</h1>
      <AdminBroadcastList initialStockName={searchParams.stock || ''} />
    </main>
  );
}
