'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export function UserMenuDropdown() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const approvalStatus = (session?.user as any)?.status;
  const email = session?.user?.email || '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!session?.user?.email) return null;

  const itemStyle = (href: string): React.CSSProperties => ({
    display: 'block',
    padding: '10px 14px',
    fontSize: 14,
    color: pathname === href ? '#1d6fd6' : '#222',
    fontWeight: pathname === href ? 600 : 400,
    textDecoration: 'none',
  });

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#cbd5e1',
          padding: '6px 10px',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: 220,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: 200,
            zIndex: 20,
            overflow: 'hidden',
          }}
        >
          {approvalStatus === 'approved' && (
            <>
              <Link href="/portfolio" style={itemStyle('/portfolio')}>
                Portfolio
              </Link>
              <Link href="/broadcasts" style={itemStyle('/broadcasts')}>
                Admin Messages
              </Link>
            </>
          )}
          <button
            onClick={() => signOut()}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              fontSize: 14,
              color: '#c0392b',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid #f2f2f2',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
