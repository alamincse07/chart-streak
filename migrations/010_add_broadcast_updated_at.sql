alter table stock_broadcasts add column updated_at timestamptz;
update stock_broadcasts set updated_at = created_at where updated_at is null;
alter table stock_broadcasts alter column updated_at set default now();
alter table stock_broadcasts alter column updated_at set not null;
