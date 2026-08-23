import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PortfolioView } from '@/components/PortfolioView';
import { EmailWatermark } from '@/components/EmailWatermark';

export default async function PortfolioPage() {
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
            : 'An admin needs to approve your account before you can use your portfolio.'}
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', position: 'relative' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>My Portfolio</h1>
      <PortfolioView />
      <EmailWatermark />
    </main>
  );
}
