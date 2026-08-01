// path: src/api/client.js

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
  updateJobProgress: (id, payload) => request(`/jobs/${id}/progress`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  recordJobPayment: (id, payload) => request(`/jobs/${id}/payments`, {
    method: 'POST',
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
  proposals: (params = '') => request(`/proposals${params}`),
  createProposal: (payload) => request('/proposals', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateProposal: (id, payload) => request(`/proposals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  acceptProposal: (id) => request(`/proposals/${id}/accept`, {
    method: 'POST',
  }),
  expenses: (params = '') => request(`/expenses${params}`),
  createExpense: (payload) => request('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateExpense: (id, payload) => request(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  clients: (params = '') => request(`/clients${params}`),
  createClient: (payload) => request('/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateClient: (id, payload) => request(`/clients/${id}`, {
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
  // Materials/inventory - full UI on the Materials page (Materials.jsx) plus
  // a read-only month-end reconciliation view under Reports > Analytics.
  materials: (params = '') => request(`/materials${params}`),
  materialsSummary: () => request('/materials/summary'),
  getMaterial: (id) => request(`/materials/${id}`),
  createMaterial: (payload) => request('/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateMaterial: (id, payload) => request(`/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteMaterial: (id) => request(`/materials/${id}`, { method: 'DELETE' }),
  materialTransactions: (materialId, params = '') => request(`/materials/${materialId}/transactions${params}`),
  createMaterialTransaction: (materialId, payload) => request(`/materials/${materialId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateMaterialTransaction: (id, payload) => request(`/materials/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteMaterialTransaction: (id) => request(`/materials/transactions/${id}`, { method: 'DELETE' }),
  materialReconciliation: (materialId, params = '') => request(`/materials/${materialId}/reconciliation${params}`),
  materialsReconciliationReport: (month) => request(`/reports/materials${month ? `?month=${month}` : ''}`),
  materialsWasteReport: (month) => request(`/reports/materials/waste${month ? `?month=${month}` : ''}`),
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
  // Build decision #5: given a capability_id, returns every compatible
  // machine (still available for a "more than one? show which" view)
  // PLUS auto_assigned_machine -- the single machine the backend picks
  // for you (available + least busy -- see services/machines.py's
  // auto_assign_machine()). null if nothing compatible is available.
  compatibleMachines: (capabilityId) => request(`/machines/compatible?capability_id=${capabilityId}`),
  pricingItems: (params = '') => request(`/machines/pricing${params}`),
  createPricingItem: (payload) => request('/machines/pricing', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updatePricingItem: (id, payload) => request(`/machines/pricing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deletePricingItem: (id) => request(`/machines/pricing/${id}`, {
    method: 'DELETE',
  }),
  exports: () => request('/exports'),
  createExport: (payload) => request('/exports', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  exportDownloadUrl: (id) => `${API_BASE_URL}/exports/${id}/download`,
  invoiceDocumentUrl: (id) => `${API_BASE_URL}/invoices/${id}/document`,
  sales: (params = '') => request(`/sales${params}`),
  createSale: (payload) => request('/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateSale: (id, payload) => request(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  pettyCash: (params = '') => request(`/petty-cash${params}`),
  pettyCashBalance: () => request('/petty-cash/balance'),
  createPettyCashEntry: (payload) => request('/petty-cash', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deletePettyCashEntry: (id) => request(`/petty-cash/${id}`, {
    method: 'DELETE',
  }),
  staff: (params = '') => request(`/staff${params}`),
  createStaff: (payload) => request('/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  expenseCategories: (params = '') => request(`/expenses/categories${params}`),
  analyticsVendors: () => request('/reports/analytics/vendors'),
  analyticsClients: () => request('/reports/analytics/clients'),
  analyticsProjections: () => request('/reports/analytics/projections'),
  analyticsSalesVsExpenses: () => request('/reports/analytics/sales-vs-expenses'),
  analyticsMachineRevenue: (params = '') => request(`/reports/analytics/machine-category-revenue${params}`),
  analyticsQuantityProduced: () => request('/reports/analytics/quantity-produced'),
  analyticsJobThroughput: () => request('/reports/analytics/job-throughput'),
  backupStatus: () => request('/backup/status'),
  runBackupNow: () => request('/backup/run-now', { method: 'POST' }),
  deviceIdentity: () => request('/system/device-identity'),
  availableBackups: () => request('/backup/available'),
  mergePreview: (pathA, pathB) =>
    request(`/backup/merge-preview?path_a=${encodeURIComponent(pathA)}&path_b=${encodeURIComponent(pathB)}`),
  mergeApply: (pathB, dryRun = false) =>
    request('/backup/merge-apply', {
      method: 'POST',
      body: JSON.stringify({ path_b: pathB, dry_run: dryRun }),
    }),
  reportsBackupStatus: () => request('/reports-backup/status'),
  sendReportsNow: () => request('/reports-backup/send-now', { method: 'POST' }),
};