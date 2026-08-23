import { supabaseAdmin } from './supabase';

export type TransactionType = 'buy' | 'sell';

export async function applyPortfolioTransaction(
  userId: string,
  stockName: string,
  type: TransactionType,
  quantity: number,
  price: number
) {
  if (!stockName.trim()) throw new Error('Stock name is required');
  if (!(quantity > 0)) throw new Error('Quantity must be greater than zero');
  if (!(price >= 0)) throw new Error('Price cannot be negative');

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', userId)
    .eq('stock_name', stockName)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);

  const currentQty = existing?.quantity ?? 0;
  const currentAvg = existing?.avg_price ?? 0;

  let newQty: number;
  let newAvg: number;

  if (type === 'buy') {
    newQty = currentQty + quantity;
    // Weighted average across the existing position and this buy.
    newAvg = newQty > 0 ? (currentQty * currentAvg + quantity * price) / newQty : 0;
  } else {
    if (quantity > currentQty) {
      throw new Error(`Cannot sell ${quantity} — only ${currentQty} currently held`);
    }
    newQty = currentQty - quantity;
    // Moving-average cost basis: a sell doesn't change the average cost of
    // what's left, it only reduces quantity. Reset to 0 once fully exited.
    newAvg = newQty > 0 ? currentAvg : 0;
  }

  const { error: upsertErr } = await supabaseAdmin.from('portfolio_holdings').upsert(
    {
      user_id: userId,
      stock_name: stockName,
      quantity: newQty,
      avg_price: newAvg,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,stock_name' }
  );
  if (upsertErr) throw new Error(upsertErr.message);

  const { data: txn, error: txnErr } = await supabaseAdmin
    .from('portfolio_transactions')
    .insert({
      user_id: userId,
      stock_name: stockName,
      transaction_type: type,
      quantity,
      price,
    })
    .select()
    .single();
  if (txnErr) throw new Error(txnErr.message);

  return { transaction: txn, holding: { stock_name: stockName, quantity: newQty, avg_price: newAvg } };
}
