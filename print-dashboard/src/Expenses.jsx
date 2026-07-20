import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { AddExpenseModal } from './components/Modals';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  expenses: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const EXPENSE_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'Reimbursed'];

const mapExpense = expense => ({
  id: expense.expense_ref || `EXP-${expense.id}`,
  backendId: expense.id,
  category: expense.category || 'Other',
  title: expense.title || 'Expense',
  amount: money(expense.amount),
  amountValue: Number(expense.amount || 0),
  date: compactDate(expense.expense_date),
  expense_date: expense.expense_date,
  status: expense.status || 'pending',
  submittedBy: expense.submitted_by || 'Team',
  notes: expense.notes || 'Backend expense record',
});

function ExpenseRow({ exp, onPreview, onStatus }) {
  const statusConfig = {
    pending: { label: 'Pending', cls: 'pending', accent: 'var(--warning)' },
    approved: { label: 'Approved', cls: 'active', accent: 'var(--primary)' },
    rejected: { label: 'Rejected', cls: 'overdue', accent: 'var(--red)' },
    reimbursed: { label: 'Reimbursed', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[exp.status] || statusConfig.pending;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>
        {exp.category.split(' ').map(word => word[0]).join('').slice(0, 2)}
      </div>
      <div className="vendor-info">
        <div className="vendor-name">{exp.title}</div>
        <div className="vendor-cat">{exp.category} - {exp.date}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{exp.amount}</div>
        <div className="activity-time">By: {exp.submittedBy}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
       <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: exp.id, client_name: exp.category, title: exp.title, items: [{ description: exp.title, quantity: 1, unit_price: exp.amountValue }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(exp)}>
          <Icon d={D.eye} size={11} />
        </button>
        {exp.status === 'pending' && (
          <>
            <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Approve" onClick={() => onStatus(exp, 'approved')}>
              <Icon d={D.check} size={11} />
            </button>
            <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Reject" onClick={() => onStatus(exp, 'rejected')}>
              <Icon d={D.alert} size={11} />
            </button>
          </>
        )}
        {exp.status === 'approved' && (
          <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} onClick={() => onStatus(exp, 'reimbursed')}>
            Reimburse
          </button>
        )}
      </div>
    </div>
  );
}

export default function Expenses() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadExpenses = () => {
    setLoading(true);
    setError(null);
    api.expenses('?per_page=200')
      .then(data => setExpenses((data.items || []).map(mapExpense)))
      .catch(() => setError('Could not load expenses. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const filtered = expenses.filter(expense => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || expense.status === filter.toLowerCase();
    const matchesSearch = `${expense.category} ${expense.title} ${expense.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const total = filtered.reduce((sum, expense) => sum + expense.amountValue, 0);
  const pendingTotal = filtered.filter(expense => expense.status === 'pending').reduce((sum, expense) => sum + expense.amountValue, 0);
  const reimbursedTotal = filtered.filter(expense => expense.status === 'reimbursed').reduce((sum, expense) => sum + expense.amountValue, 0);
  const categoryTotals = filtered.reduce((acc, expense) => ({ ...acc, [expense.category]: (acc[expense.category] || 0) + expense.amountValue }), {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: 'Total This Month', value: money(total), sub: 'All categories', icon: D.expenses, color: 'primary' },
    { label: 'Pending Approval', value: money(pendingTotal), sub: `${filtered.filter(expense => expense.status === 'pending').length} requests`, icon: D.clock, color: 'warning' },
    { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: D.alert, color: 'secondary' },
    { label: 'Reimbursed', value: money(reimbursedTotal), sub: 'Paid back', icon: D.check, color: 'teal' },
  ];

  const handleSave = async form => {
    try {
      const saved = await api.createExpense({
        category: form.category || 'Other',
        title: form.title || 'Expense',
        amount: Number(form.amount || 0),
        expense_date: form.date || new Date().toISOString().slice(0, 10),
        status: 'pending',
        submitted_by: 'Team',
        notes: form.notes,
      });
      setShowEntry(false);
      setPreview(saved);
      notify('Expense created');
      loadExpenses();
    } catch (saveError) {
      notify(saveError.message || 'Could not save expense', 'error');
    }
  };

  const handleStatus = async (expense, status) => {
    try {
      const saved = await api.updateExpense(expense.backendId, { status });
      setPreview(saved);
      notify(`Expense marked ${status}`);
      loadExpenses();
    } catch (saveError) {
      notify(saveError.message || 'Could not update expense', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Expenses" subtitle="Track operational costs & approvals" actionLabel="New Expense" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={EXPENSE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search category, title, or ID..." />
      <RegisterCard title="Expense Log" countLabel={`${filtered.length} expense${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="EXP" emptyMessage="No expenses match your filters.">
        {filtered.map(exp => <ExpenseRow key={exp.id} exp={exp} onPreview={setPreview} onStatus={handleStatus} />)}
      </RegisterCard>
      <AddExpenseModal isOpen={showEntry} onClose={() => setShowEntry(false)} onSave={handleSave} />
      <PreviewModal title={preview ? `Expense Preview: ${preview.expense_ref || preview.id || 'Draft'}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
