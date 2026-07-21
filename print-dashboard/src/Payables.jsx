// path: src/Payables.jsx

import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  ap: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const PAYABLE_STATUSES = ['All', 'Due', 'Overdue', 'Scheduled', 'Paid'];

function amountNumber(value) {
  return Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
}

function PayableRow({ pay, onPreview }) {
  const statusConfig = {
    due: { label: 'Due', cls: 'current', accent: 'var(--secondary)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    scheduled: { label: 'Scheduled', cls: 'pending', accent: 'var(--warning)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[pay.status] || statusConfig.due;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{String(pay.id).split('-')[1] || 'PAY'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{pay.title}</div>
        <div className="vendor-cat">{pay.vendor} - Due: {pay.due || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{pay.amount}</div>
        <div className="activity-time" style={{ color: pay.days < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
          {pay.days < 0 ? `${Math.abs(pay.days)}d overdue` : pay.days > 0 ? `${pay.days}d left` : 'Due today'}
        </div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: pay.id, client_name: pay.vendor, title: pay.title, items: [{ description: pay.title, quantity: 1, unit_price: pay.amount }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(pay)}>
          <Icon d={D.eye} size={11} />
        </button>
      </div>
    </div>
  );
}

export default function Payables() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [payables, setPayables] = useState([]);
  const [paidThisMonth, setPaidThisMonth] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Single source of truth: unpaid Expense rows linked to a Vendor via vendor_id.
    // Vendor.balance is deprecated as of this change — it was a manually-typed field
    // with no link to Expense and risked double-counting the same debt. Not reading it here.
    api.expenses('?per_page=200')
      .then(expenseResponse => {
        const expenseRows = (expenseResponse.items || [])
          .filter(expense => ['pending', 'approved', 'scheduled'].includes(expense.status))
          .map(expense => ({
            id: expense.expense_ref,
            vendor: expense.vendor_name || expense.submitted_by || 'Internal',
            title: expense.title,
            amount: money(expense.amount),
            due: compactDate(expense.expense_date),
            days: 0,
            status: expense.status === 'pending' ? 'scheduled' : 'due',
            contact: expense.category,
            notes: expense.notes || 'Backend expense payable',
          }));
        setPayables(expenseRows);
      })
      .catch(() => setError('Could not load payables. Check the backend connection and try again.'))
      .finally(() => setLoading(false));

    // Separate call for "Paid This Month" — deliberately unfiltered by the search/status
    // toolbar, since it's a fixed calendar-month stat, not a view of the filtered list.
    api.expenses('?per_page=500&status=paid')
      .then(response => setPaidThisMonth(response.items || []))
      .catch(() => {});
  }, []);

  const filtered = payables.filter(payable => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || payable.status === filter.toLowerCase();
    const matchesSearch = `${payable.vendor} ${payable.title} ${payable.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const total = filtered.reduce((sum, payable) => sum + amountNumber(payable.amount), 0);
  const overdue = filtered.filter(payable => payable.status === 'overdue');
  const due = filtered.filter(payable => payable.status === 'due');

  const now = new Date();
  const paidThisMonthTotal = paidThisMonth
    .filter(expense => {
      if (!expense.paid_on) return false;
      const paidDate = new Date(expense.paid_on);
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + amountNumber(expense.amount), 0);

  const stats = [
    { label: 'Total Payable', value: money(total), sub: 'Unpaid bills', icon: D.ap, color: 'warning' },
    { label: 'Overdue Amount', value: money(overdue.reduce((sum, payable) => sum + amountNumber(payable.amount), 0)), sub: `${overdue.length} past due`, icon: D.alert, color: 'red' },
    { label: 'Due This Week', value: money(due.reduce((sum, payable) => sum + amountNumber(payable.amount), 0)), sub: `${due.length} bills`, icon: D.clock, color: 'secondary' },
    { label: 'Paid This Month', value: money(paidThisMonthTotal), sub: `${paidThisMonth.length} expenses paid`, icon: D.check, color: 'teal' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Payables" subtitle="Track money your business owes" actionLabel={null} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={PAYABLE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search vendor, title, or ID..." />
      <RegisterCard title="Outstanding Payables" countLabel={`${filtered.length} payable${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="PAY" emptyMessage="No payables match your filters.">
        {filtered.map(pay => <PayableRow key={pay.id} pay={pay} onPreview={setPreview} />)}
      </RegisterCard>
      <PreviewModal title={preview ? `Payable Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
    </main>
  );
}