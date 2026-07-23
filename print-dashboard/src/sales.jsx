import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  sales: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
};

// Payment status comes straight from the backend's serialize_sale(), which
// computes it from the same paid/total split invoice_totals() already uses
// (services/sales.py) — not re-derived here, so there's only one definition
// of "full/partial/unpaid" across the whole app.
const SALE_STATUSES = ['All', 'Full', 'Partial', 'Unpaid'];

function mapSale(sale) {
  const status = sale.payment_status || 'unpaid';
  return {
    id: sale.sale_ref || `SALE-${sale.id}`,
    backendId: sale.id,
    client: sale.client_name || 'Walk-in Client',
    jobRef: sale.job_ref,
    description: sale.description || 'Print job sale',
    notes: sale.notes,
    amount: money(sale.amount),
    amountValue: Number(sale.amount || 0),
    date: compactDate(sale.created_at),
    status,
  };
}

function SaleRow({ sale }) {
  const statusConfig = {
    full: { label: 'Full', cls: 'paid', accent: 'var(--teal)' },
    partial: { label: 'Partial', cls: 'pending', accent: 'var(--warning)' },
    unpaid: { label: 'Unpaid', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[sale.status] || statusConfig.unpaid;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
        {String(sale.id).split('-')[1] || 'SL'}
      </div>
      <div className="vendor-info">
        <div className="vendor-name">{sale.description}</div>
        <div className="vendor-cat">{sale.client} - {sale.jobRef || '-'} - {sale.date || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{sale.amount}</div>
        <div className="activity-time">Derived from job</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
    </div>
  );
}

export default function Sales() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSales = () => {
    setLoading(true);
    setError(null);
    api.sales('?per_page=200')
      .then(data => setSales((data.items || []).map(mapSale)))
      .catch(() => setError('Could not load sales. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filtered = sales.filter(sale => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || sale.status === filter.toLowerCase();
    const matchesSearch = `${sale.client} ${sale.description} ${sale.id} ${sale.jobRef || ''}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const total = filtered.reduce((sum, sale) => sum + sale.amountValue, 0);
  const fullCount = sales.filter(sale => sale.status === 'full').length;
  const partialCount = sales.filter(sale => sale.status === 'partial').length;
  const unpaidCount = sales.filter(sale => sale.status === 'unpaid').length;

  const stats = [
    { label: 'Total Sales', value: money(total), sub: 'Filtered view', icon: D.sales, color: 'primary' },
    { label: 'Fully Paid', value: String(fullCount), sub: 'Complete sales', icon: D.check, color: 'teal' },
    { label: 'Partial', value: String(partialCount), sub: 'Partially collected', icon: D.clock, color: 'warning' },
    { label: 'Unpaid', value: String(unpaidCount), sub: 'No cash collected yet', icon: D.alert, color: 'red' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Sales" subtitle="Derived from job payment status" />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={SALE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, description, or job ref..." />
      <RegisterCard title="Sales Register" countLabel={`${filtered.length} sale${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="SALE" emptyMessage="No sales match your filters.">
        {filtered.map(sale => <SaleRow key={sale.id} sale={sale} />)}
      </RegisterCard>
    </main>
  );
}