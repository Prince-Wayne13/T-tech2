export const money = (value, currency = 'MWK') =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const shortDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export const compactDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
};

export const number = (value) =>
  new Intl.NumberFormat('en-MW', { maximumFractionDigits: 0 }).format(Number(value || 0));

export const percent = (value) =>
  `${new Intl.NumberFormat('en-MW', { maximumFractionDigits: 1 }).format(Number(value || 0))}%`;
