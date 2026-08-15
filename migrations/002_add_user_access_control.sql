-- Run this after the original schema (users, sheets, sheet_rows) is in place.

alter table users
  add column status text not null default 'pending'
    check (status in ('pending','approved','blocked')),
  add column is_admin boolean not null default false,
  add column status_updated_at timestamptz,
  add column status_updated_by uuid references users(id);
