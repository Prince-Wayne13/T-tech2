export function calculateLineTotal(item = {}) {
  const quantity = Number(item.qty ?? item.quantity ?? 1) || 0;
  const rate = Number(item.rate ?? item.unit_price ?? item.price ?? item.amount ?? 0) || 0;
  return quantity * rate;
}

export function calculateTotal(items = []) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

// Flat, overall-total discount (not per-line-item, not a percentage) — subtracted
// from the line-item subtotal, floored at 0 so a discount can never push the total
// negative. Kept as a separate helper (rather than changing calculateTotal's
// signature) so existing call sites that don't deal with discounts are unaffected.
export function calculateDiscountedTotal(items = [], discount = 0) {
  const subtotal = calculateTotal(items);
  return Math.max(subtotal - Number(discount || 0), 0);
}