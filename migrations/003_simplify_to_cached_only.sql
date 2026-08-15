-- Run after 001 and 002. The app no longer supports a 'live' fetch-per-request
-- mode — every sheet is always served from the Postgres cache, refreshed by
-- the daily cron job or an admin's manual "Refresh now" click.

alter table sheets
  drop column if exists sync_mode,
  drop column if exists sync_interval_minutes;
