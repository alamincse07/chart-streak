alter table sheets
  add column sheet_type text not null default 'table'
    check (sheet_type in ('table', 'notes'));
