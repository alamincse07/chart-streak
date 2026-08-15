-- Each sync now creates a new snapshot instead of wiping and reinserting
-- into the same rows. Previous days' data is preserved indefinitely (see
-- the optional retention note at the bottom).

create table sheet_snapshots (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references sheets(id) on delete cascade,
  synced_at timestamptz not null default now(),
  row_count int not null default 0
);
create index idx_sheet_snapshots_sheet_id on sheet_snapshots(sheet_id, synced_at desc);

-- sheet_rows now belongs to a specific snapshot rather than being
-- overwritten in place. sheet_id is kept alongside snapshot_id purely to
-- avoid a join on the hot read path.
alter table sheet_rows
  add column snapshot_id uuid references sheet_snapshots(id) on delete cascade;

alter table sheet_rows
  drop constraint if exists sheet_rows_sheet_id_row_number_key;

create unique index if not exists idx_sheet_rows_snapshot_row
  on sheet_rows(snapshot_id, row_number);

create index if not exists idx_sheet_rows_sheet_id_2
  on sheet_rows(sheet_id);

-- Optional: if you don't want snapshots to accumulate forever, periodically
-- run something like the statement below (e.g. from a cron route) to drop
-- snapshots older than N days, keeping at least the most recent one per sheet:
--
-- delete from sheet_snapshots
-- where synced_at < now() - interval '90 days'
--   and id not in (
--     select distinct on (sheet_id) id from sheet_snapshots
--     order by sheet_id, synced_at desc
--   );
