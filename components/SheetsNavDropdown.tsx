'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SheetOption = {
  id: string;
  display_name: string;
};

export function SheetsNavDropdown() {
  const [sheets, setSheets] = useState<SheetOption[]>([
    
      {
          "id": "1c3bfd7a-096a-4360-a8aa-7e640807e660",
          "display_name": "Next Entry"
      },
      {
          "id": "5e7090a9-2b1f-43f1-a1ac-6b2558748605",
          "display_name": "Notes",
         
      },
      {
          "id": "dd9ad404-c555-4f7a-9f65-18718d3d20fb",
          "display_name": "Watch List",
          
      }
  ]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the dropdown automatically whenever navigation happens (e.g. a
  // sheet link was clicked), not just on outside click.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#cbd5e1',
          padding: '6px 10px',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        Sheets <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
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
            minWidth: 220,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          {!loaded && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#888' }}>Loading…</div>
          )}
          {loaded && sheets.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#888' }}>
              No sheets available yet.
            </div>
          )}
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/sheets/${sheet.id}`}
              style={{
                display: 'block',
                padding: '10px 14px',
                fontSize: 14,
                color: pathname === `/sheets/${sheet.id}` ? '#1d6fd6' : '#222',
                fontWeight: pathname === `/sheets/${sheet.id}` ? 600 : 400,
                textDecoration: 'none',
                borderBottom: '1px solid #f2f2f2',
              }}
            >
              {sheet.display_name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
