export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const cache = new Map();
const CACHE_TTL = 30000;

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const cacheKey = `${method}:${path}`;
  if (method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return cached.data;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  const data = await response.json();
  if (method === 'GET') {
    cache.set(cacheKey, { data, time: Date.now() });
  } else {
    cache.clear();
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  dashboardReport: () => request('/reports/dashboard'),
  reports: () => request('/reports'),
  financialReport: (period = 'month') => request(`/reports/financials?period=${period}`),
  machineRevenue: () => request('/reports/machines/revenue'),
  jobs: (params = '') => request(`/jobs${params}`),
  invoices: (params = '') => request(`/invoices${params}`),
  invoiceStats: () => request('/invoices/stats'),
  invoiceDocument: (id) => request(`/invoices/${id}/document`),
  expenses: (params = '') => request(`/expenses${params}`),
  vendors: (params = '') => request(`/vendors${params}`),
  advances: (params = '') => request(`/advances${params}`),
  audit: (params = '') => request(`/audit${params}`),
  machines: (params = '') => request(`/machines${params}`),
  pricingItems: (params = '') => request(`/machines/pricing${params}`),
  createPricingItem: (payload) => request('/machines/pricing', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  exports: () => request('/exports'),
  createExport: (payload) => request('/exports', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  exportDownloadUrl: (id) => `${API_BASE_URL}/exports/${id}/download`,
  invoiceDocumentUrl: (id) => `${API_BASE_URL}/invoices/${id}/document`,
};
