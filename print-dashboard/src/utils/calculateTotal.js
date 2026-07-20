export function calculateLineTotal(item = {}) {
  const quantity = Number(item.qty ?? item.quantity ?? 1) || 0;
  const rate = Number(item.rate ?? item.unit_price ?? item.price ?? item.amount ?? 0) || 0;
  return quantity * rate;
}

export function calculateTotal(items = []) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}
