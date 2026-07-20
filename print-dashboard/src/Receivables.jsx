import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { shareText } from './utils/downloads';
import { calculateTotal } from './utils/calculateTotal';

const D = {
  ...STANDARD_ICONS,
  ar: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const RECEIVABLE_STATUSES = ['All', 'Due', 'Overdue', 'Partial', 'Paid'];

function ReceivableRow({ rec, onPreview }) {
  const statusConfig = {
    due: { label: 'Due', cls: 'current', accent: 'var(--secondary)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    partial: { label: 'Partial', cls: 'pending', accent: 'var(--warning)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[rec.status] || statusConfig.due;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>{String(rec.id).split('-')[1] || 'REC'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{rec.title}</div>
        <div className="vendor-cat">{rec.client} - Due: {rec.due || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{rec.amount}</div>
        <div className="activity-time" style={{ color: rec.days < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
          {rec.days < 0 ? `${Math.abs(rec.days)}d overdue` : rec.days > 0 ? `${rec.days}d left` : 'Due today'}
        </div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
       <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: rec.id, client_name: rec.client, title: rec.title, items: [{ description: rec.title, quantity: 1, unit_price: rec.amount }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(rec)}><Icon d={D.eye} size={11} /></button>
        {rec.status !== 'paid' && <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Send Reminder" onClick={() => shareText(`Payment reminder ${rec.id}`, `${rec.client} owes ${rec.amount} for ${rec.title}. Due ${rec.due}.`)}><Icon d={D.send} size={11} /></button>}
      </div>
    </div>
  );
}

export default function Receivables() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [receivables, setReceivables] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.invoices('?per_page=200'), api.invoiceStats()])
      .then(([invoiceResponse, statsResponse]) => {
        const today = new Date();
        setReceivables((invoiceResponse.items || [])
          .filter(invoice => ['sent', 'overdue', 'paid'].includes(invoice.status))
          .map(invoice => {
            const dueDate = invoice.due_on ? new Date(invoice.due_on) : null;
            const days = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : 0;
            return {
              id: invoice.invoice_ref,
              client: invoice.client_name,
              title: invoice.title,
              amount: money(calculateTotal(invoice.line_items || []), invoice.currency || 'MWK'),
              due: compactDate(invoice.due_on),
              days,
              status: invoice.status === 'sent' ? 'due' : invoice.status,
              contact: invoice.client_name,
              notes: invoice.notes || invoice.payment_terms || 'Backend invoice receivable',
            };
          }));
        setInvoiceStats(statsResponse);
      })
      .catch(() => setError('Could not load receivables. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = receivables.filter(rec => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || rec.status === filter.toLowerCase();
    const matchesSearch = `${rec.client} ${rec.title} ${rec.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total Outstanding', value: money(invoiceStats?.outstanding), sub: 'Unpaid invoices', icon: D.ar, color: 'warning' },
    { label: 'Overdue Amount', value: String(invoiceStats?.overdue_count || 0), sub: 'Past due invoices', icon: D.alert, color: 'red' },
    { label: 'Avg. Collection', value: '18 days', sub: 'Last 30 days', icon: D.clock, color: 'teal' },
    { label: 'Collected This Month', value: money(invoiceStats?.paid), sub: 'Backend payments', icon: D.check, color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Receivables" subtitle="Track money owed to your business" actionLabel={null} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={RECEIVABLE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Outstanding Receivables" countLabel={`${filtered.length} receivable${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="REC" emptyMessage="No receivables match your filters.">
        {filtered.map(rec => <ReceivableRow key={rec.id} rec={rec} onPreview={setPreview} />)}
      </RegisterCard>
      <PreviewModal title={preview ? `Receivable Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
    </main>
  );
}
