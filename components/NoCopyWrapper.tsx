'use client';

// Lightweight deterrent, not real DLP — someone can still screenshot, use
// browser devtools, or view-source. This just stops the casual "select
// all → copy → paste elsewhere" path for admin-visible data (user emails,
// phone numbers, sheet IDs, etc).
export function NoCopyWrapper({ children }: { children: React.ReactNode }) {
  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}
