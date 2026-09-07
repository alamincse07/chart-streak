import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { TradeHistoryView } from '@/components/TradeHistoryView';
import { EmailWatermark } from '@/components/EmailWatermark';

export default async function TradeHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/api/auth/signin');
  }

  const status = (session.user as any).status;
  if (status !== 'approved') {
    return (
      <main style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: 20 }}>
          {status === 'blocked' ? 'Access blocked' : 'Access pending approval'}
        </h1>
        <p>
          {status === 'blocked'
            ? 'An admin has blocked your access to this data.'
            : 'An admin needs to approve your account before you can view your trade history.'}
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', position: 'relative' }}>
      <Link href="/portfolio" style={{ fontSize: 13, display: 'inline-block', marginBottom: 12 }}>
        ← Back to portfolio
      </Link>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Trade History</h1>
      <TradeHistoryView />
      <EmailWatermark />
    </main>
  );
}
