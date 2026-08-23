'use client';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { SheetsNavDropdown } from './SheetsNavDropdown';
import { AdminMenuDropdown } from './AdminMenuDropdown';
import { UserMenuDropdown } from './UserMenuDropdown';

const NAVY = '#0f172a';

export function Header() {
  const { data: session, status: sessionStatus } = useSession();

  const isAdmin = (session?.user as any)?.isAdmin;
  const approvalStatus = (session?.user as any)?.status;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        padding: '10px 16px',
        background: NAVY,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <nav style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ fontWeight: 600, marginRight: 12, textDecoration: 'none', color: '#fff' }}>
          Chart Streak
        </Link>
        {session && approvalStatus === 'approved' && <SheetsNavDropdown />}
        {isAdmin && <AdminMenuDropdown />}
      </nav>

      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
        {sessionStatus === 'loading' && <span style={{ color: '#94a3b8' }}>Loading…</span>}
        {sessionStatus === 'unauthenticated' && (
          <button onClick={() => signIn('google')}>Sign in</button>
        )}
        {session?.user?.email && <UserMenuDropdown />}
      </div>
    </header>
  );
}
