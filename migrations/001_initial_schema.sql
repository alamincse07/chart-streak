-- Run this first, before 002_add_user_access_control.sql

create table users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique not null,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table sheets (
  id uuid primary key default gen_random_uuid(),
  google_sheet_id text not null,       -- the Sheets API spreadsheetId
  sheet_tab_name text not null,        -- which tab/range within it
  display_name text not null,
  sync_mode text not null check (sync_mode in ('live','cached')) default 'cached',
  sync_interval_minutes int default 15,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table sheet_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references sheets(id) on delete cascade,
  row_number int not null,
  data jsonb not null,
  synced_at timestamptz not null default now(),
  unique (sheet_id, row_number)
);
create index idx_sheet_rows_sheet_id on sheet_rows(sheet_id);
create index idx_sheet_rows_data_gin on sheet_rows using gin (data);
