'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StockList } from '@/lib/stockList';

const MAX_RESULTS = 30;

export function StockNameInput({
  value,
  onChange,
  placeholder = 'Stock name',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const needle = value.trim().toUpperCase();
    const pool = needle
      ? StockList.filter((s) => s.toUpperCase().includes(needle))
      : StockList;
    return pool.slice(0, MAX_RESULTS);
  }, [value]);

  const select = (symbol: string) => {
    onChange(symbol);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 180px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        style={{ width: '100%' }}
        autoComplete="off"
      />

      {open && matches.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 30,
          }}
        >
          {matches.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => select(symbol)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 14,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #f2f2f2',
                cursor: 'pointer',
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
