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
  createJob: (payload) => request('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateJob: (id, payload) => request(`/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  invoices: (params = '') => request(`/invoices${params}`),
  createInvoice: (payload) => request('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateInvoice: (id, payload) => request(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  invoiceStats: () => request('/invoices/stats'),
  invoiceDocument: (id) => request(`/invoices/${id}/document`),
  expenses: (params = '') => request(`/expenses${params}`),
  createExpense: (payload) => request('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateExpense: (id, payload) => request(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  vendors: (params = '') => request(`/vendors${params}`),
  createVendor: (payload) => request('/vendors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateVendor: (id, payload) => request(`/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  advances: (params = '') => request(`/advances${params}`),
  createAdvance: (payload) => request('/advances', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  audit: (params = '') => request(`/audit${params}`),
  search: (query) => request(`/search?q=${encodeURIComponent(query)}`),
  machines: (params = '') => request(`/machines${params}`),
  createMachine: (payload) => request('/machines', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
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
