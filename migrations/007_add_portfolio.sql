-- Individual buy/sell events, as entered by the user. This is the source
-- of truth; portfolio_holdings below is a derived/cached aggregate kept in
-- sync whenever a transaction is added (see lib/portfolio.ts).
create table portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stock_name text not null,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price >= 0),
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_portfolio_transactions_user on portfolio_transactions(user_id, stock_name);
create index idx_portfolio_transactions_stock on portfolio_transactions(stock_name);

-- Current position per user per stock. Quantity and avg_price are
-- recalculated on every transaction using moving-average cost: a buy
-- re-averages the cost basis across old + new quantity; a sell reduces
-- quantity but leaves avg_price unchanged (standard moving-average method).
create table portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stock_name text not null,
  quantity numeric not null default 0,
  avg_price numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, stock_name)
);

-- Admin feedback tied to one specific buy/sell entry (not the aggregate
-- holding), so it reads like "on this trade, here's my note."
create table portfolio_transaction_comments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references portfolio_transactions(id) on delete cascade,
  admin_id uuid references users(id),
  comment text not null,
  created_at timestamptz not null default now()
);
create index idx_portfolio_comments_txn on portfolio_transaction_comments(transaction_id);

-- Admin notes on a stock symbol, visible to every approved user regardless
-- of whether they hold that stock — not tied to any one user's portfolio.
create table stock_broadcasts (
  id uuid primary key default gen_random_uuid(),
  stock_name text not null,
  admin_id uuid references users(id),
  note text not null,
  created_at timestamptz not null default now()
);
create index idx_stock_broadcasts_stock on stock_broadcasts(stock_name, created_at desc);
