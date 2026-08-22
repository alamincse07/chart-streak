'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';
import { SheetsNavDropdown } from './SheetsNavDropdown';

const NAVY = '#0f172a';
const ACCENT = '#1d6fd6';

export function Header() {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();

  const isAdmin = (session?.user as any)?.isAdmin;
  const approvalStatus = (session?.user as any)?.status;

  const linkStyle = (href: string): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: 6,
    textDecoration: 'none',
    color: pathname === href ? '#fff' : '#cbd5e1',
    background: pathname === href ? ACCENT : 'transparent',
    fontSize: 14,
  });

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
        {isAdmin && (
          <>
            <Link href="/admin" style={linkStyle('/admin')}>
              Manage Users
            </Link>
            <Link href="/admin/sheets" style={linkStyle('/admin/sheets')}>
              Manage Sheets
            </Link>
          </>
        )}
      </nav>

      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {sessionStatus === 'loading' && <span style={{ color: '#94a3b8' }}>Loading…</span>}
        {sessionStatus === 'unauthenticated' && (
          <button onClick={() => signIn('google')}>Sign in</button>
        )}
        {session?.user?.email && (
          <>
            <span
              style={{
                color: '#cbd5e1',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session.user.email}
            </span>
            <button onClick={() => signOut()}>Sign out</button>
          </>
        )}
      </div>
    </header>
  );
}
