// Compact formatting for currency-ish amounts, e.g. 75000 -> "75K",
// 300000 -> "3L" (lakh, i.e. 100,000). Trims trailing zeros so 250000
// shows as "2.5L" rather than "2.50L".
export function formatCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 100000) {
    const lakhs = abs / 100000;
    const formatted = Number.isInteger(lakhs) ? lakhs.toString() : trimTrailingZeros(lakhs.toFixed(2));
    return `${sign}${formatted}L`;
  }
  if (abs >= 1000) {
    const thousands = abs / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toString() : trimTrailingZeros(thousands.toFixed(1));
    return `${sign}${formatted}K`;
  }
  return `${sign}${Math.round(abs)}`;
}

function trimTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}
