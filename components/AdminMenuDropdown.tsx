'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Manage Users' },
  { href: '/admin/sheets', label: 'Manage Sheets' },
  { href: '/admin/portfolios', label: 'Portfolios' },
  { href: '/admin/holdings', label: 'Holdings' },
  { href: '/admin/broadcasts', label: 'Manage Broadcasts' },
];

export function AdminMenuDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isOnAdminPage = pathname.startsWith('/admin');

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

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: isOnAdminPage ? '#1d6fd6' : 'transparent',
          border: 'none',
          borderRadius: 6,
          color: isOnAdminPage ? '#fff' : '#cbd5e1',
          padding: '6px 10px',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        Admin <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
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
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: '10px 14px',
                fontSize: 14,
                color: pathname === link.href ? '#1d6fd6' : '#222',
                fontWeight: pathname === link.href ? 600 : 400,
                textDecoration: 'none',
                borderBottom: '1px solid #f2f2f2',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
