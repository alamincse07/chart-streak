import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service role key, which bypasses RLS —
// this file must never be imported from a 'use client' component.
// All browser access to sheet data goes through our own API routes instead.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

export type SheetRow = {
  id: string;
  sheet_id: string;
  row_number: number;
  data: Record<string, string | number | null>;
  synced_at: string;
};

export type SheetSnapshot = {
  id: string;
  sheet_id: string;
  synced_at: string;
  row_count: number;
};

export type SheetRecord = {
  id: string;
  google_sheet_id: string;
  sheet_tab_name: string;
  display_name: string;
  sheet_type: 'table' | 'notes';
  last_synced_at: string | null;
};
