'use client';
import { EmailWatermark } from './EmailWatermark';

type RowDetailModalProps = {
  row: Record<string, string | number | null> | null;
  onClose: () => void;
  title?: string;
};

export function RowDetailModal({ row, onClose, title = 'Row details' }: RowDetailModalProps) {
  if (!row) return null;

  const entries = Object.entries(row);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000, // above the header (10) and watermark (9999)
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', // positioned ancestor for the watermark overlay below
          background: '#fff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 520,
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid #eee',
            position: 'sticky',
            top: 0,
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        <dl style={{ margin: 0, padding: '8px 18px 18px' }}>
          {entries.map(([field, value]) => (
            <div key={field} style={{ padding: '10px 0', borderBottom: '1px solid #f2f2f2' }}>
              <dt style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                {field === '_syncedAt' ? 'Synced at' : field}
              </dt>
              <dd style={{ margin: 0, fontSize: 14, wordBreak: 'break-word' }}>
                {field === '_syncedAt' && value
                  ? new Date(value as string).toLocaleString()
                  : value === null || value === ''
                  ? <span style={{ color: '#bbb' }}>—</span>
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>

        <div style={{ background: '#e1e6ffcc', margin: 0, padding: '8px 18px 18px' }}>
        প্রফিট প্রটেকশন রুল: প্রতিটি স্টকে ১ম টার্গেট (TP 1) অর্জিত হওয়ার সাথে সাথে মূল স্টপ-লসকে এন্ট্রি প্রাইসে (Breakeven) স্থানান্তর করুন এবং ৩০%-৪০% প্রফিট ক্যাশ করুন।
        এবং এরপর লাভ ধরে রাখতে ট্রেইলিং SL ব্যবহার করুন।
        </div>

        <EmailWatermark />
      </div>
    </div>
  );
}
