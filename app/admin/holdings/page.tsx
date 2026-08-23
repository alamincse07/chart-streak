import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminHoldingsView } from '@/components/AdminHoldingsView';

export default async function AdminHoldingsPage() {
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
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Search holdings</h1>
      <AdminHoldingsView />
    </main>
  );
}
