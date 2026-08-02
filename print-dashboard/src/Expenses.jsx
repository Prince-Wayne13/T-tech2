import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import { friendlyError } from './utils/errors';
import PreviewModal from './components/PreviewModal';
import { AddExpenseModal, MarkPaidModal } from './components/Modals';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  expenses: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

// ── Merge note (T-Tech2 Merge 2) ──────────────────────────────────────────
// Payables.jsx has been deleted. Its filter set is reproduced exactly:
// "Outstanding" = expense.status in ['pending', 'approved', 'scheduled']
// (Payables.jsx's original three unpaid-lens statuses), with 'pending'
// relabeled "Scheduled" in the UI — preserved below, gated on active tab.
const TABS = ['Outstanding', 'All', 'Paid', 'Reimbursed'];

const TAB_STATUS_SETS = {
  Outstanding: ['pending', 'approved', 'scheduled'],
  All: null,
  Paid: ['paid'],
  Reimbursed: ['reimbursed'],
};

const mapExpense = expense => ({
  id: expense.expense_ref || `EXP-${expense.id}`,
  backendId: expense.id,
  category: expense.category || 'Other',
  title: expense.title || 'Expense',
  amount: money(expense.amount),
  amountValue: Number(expense.amount || 0),
  date: compactDate(expense.expense_date),
  expense_date: expense.expense_date,
  paid_on: expense.paid_on,
  status: expense.status || 'pending',
  submittedBy: expense.submitted_by || 'Team',
  // routes/expenses.py::serialize_expense() now joins vendor_name for
  // linked expenses. Fallback chain stays in place for legitimately
  // vendor-less expenses (utilities, fuel, in-house technician work).
  vendorName: expense.vendor_name || expense.submitted_by || 'Internal',
  vendorId: expense.vendor_id || null,
  notes: expense.notes || 'Backend expense record',
  // Item 19 follow-up: petty-cash-generated expenses are edited from the
  // Petty Cash page only - see routes/expenses.py's update_expense(),
  // which now rejects edits to these server-side too. This flag gates the
  // Edit/status buttons here so the block is visible before the click,
  // not just after a failed request.
  isPettyCashLinked: Boolean(expense.is_petty_cash_linked),
});

// Shared row renderer. `onOutstandingTab` gates the Payables-style
// relabeling (pending -> "Scheduled") and the days-overdue display that
// only made sense in the money-owed framing.
function ExpenseRow({ exp, onPreview, onStatus, onOutstandingTab, onEdit }) {
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const statusConfig = {
    pending: { label: onOutstandingTab ? 'Scheduled' : 'Pending', cls: onOutstandingTab ? 'pending' : 'pending', accent: 'var(--warning)' },
    approved: { label: 'Approved', cls: 'active', accent: 'var(--primary)' },
    rejected: { label: 'Rejected', cls: 'overdue', accent: 'var(--red)' },
    reimbursed: { label: 'Reimbursed', cls: 'paid', accent: 'var(--teal)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
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
        <div className="vendor-cat">{onOutstandingTab ? exp.vendorName : exp.category} - {exp.date}</div>
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
        {exp.isPettyCashLinked ? (
          <span title="Created from a Petty Cash entry — edit it from the Petty Cash page instead" style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '4px 8px' }}>
            From Petty Cash
          </span>
        ) : (
          <>
            <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit" onClick={() => onEdit(exp)}>
              Edit
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
            {/* Mark Paid: available once an expense is approved or reimbursed —
                i.e. it's a real, sanctioned cost, just not yet recorded as cash
                out the door. Deliberately excluded for 'pending'/'rejected': an
                unapproved or rejected expense being marked paid would mean money
                left the business for something never signed off on, which is a
                different problem (approve it first) than this button solves. */}
            {(exp.status === 'approved' || exp.status === 'reimbursed') && (
              <button
                className="filter-btn"
                style={{ padding: '4px 8px', fontSize: '9px' }}
                title="Record the date this was actually paid"
                onClick={() => setShowMarkPaid(true)}
              >
                Mark Paid
              </button>
            )}
          </>
        )}
      </div>
      <MarkPaidModal
        isOpen={showMarkPaid}
        onClose={() => setShowMarkPaid(false)}
        defaultDate={exp.paid_on || new Date().toISOString().slice(0, 10)}
        onConfirm={paidOn => {
          setShowMarkPaid(false);
          onStatus(exp, 'paid', { paid_on: paidOn || new Date().toISOString().slice(0, 10) });
        }}
      />
    </div>
  );
}

export default function Expenses() {
  // Default tab is "Outstanding" (Option C) — matches the owner's daily
  // use pattern: checking what's owed, not browsing full expense history.
  const [tab, setTab] = useState('Outstanding');
  const [search, setSearch] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [paidThisMonthExpenses, setPaidThisMonthExpenses] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
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

    // Separate call carried over from Payables.jsx for the "Paid This Month"
    // stat — deliberately unfiltered by the tab/search toolbar since it's a
    // fixed calendar-month figure, not a view of the currently filtered list.
    api.expenses('?per_page=500&status=paid')
      .then(response => setPaidThisMonthExpenses(response.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const statusSet = TAB_STATUS_SETS[tab];
  const filtered = expenses.filter(expense => {
    const query = search.toLowerCase();
    const matchesTab = !statusSet || statusSet.includes(expense.status);
    const matchesSearch = `${expense.category} ${expense.title} ${expense.id}`.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const onOutstandingTab = tab === 'Outstanding';

  const now = new Date();
  const paidThisMonthTotal = paidThisMonthExpenses
    .filter(expense => {
      if (!expense.paid_on) return false;
      const paidDate = new Date(expense.paid_on);
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const outstandingList = expenses.filter(e => ['pending', 'approved', 'scheduled'].includes(e.status));
  const outstandingTotal = outstandingList.reduce((sum, e) => sum + e.amountValue, 0);
  const pendingTotal = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amountValue, 0);
  const reimbursedTotal = expenses.filter(e => e.status === 'reimbursed').reduce((sum, e) => sum + e.amountValue, 0);
  const paidTotal = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amountValue, 0);
  const allTotal = expenses.reduce((sum, e) => sum + e.amountValue, 0);
  const categoryTotals = filtered.reduce((acc, expense) => ({ ...acc, [expense.category]: (acc[expense.category] || 0) + expense.amountValue }), {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // Stats reflect the ACTIVE tab. "Paid This Month" only shows prominently
  // on Outstanding/Paid tabs (per spec) — it isn't relevant framing on
  // Reimbursed (a different money flow) or All (mixed statuses).
  const statsByTab = {
    Outstanding: [
      { label: 'Total Outstanding', value: money(outstandingTotal), sub: 'Unpaid bills', icon: D.expenses, color: 'warning' },
      { label: 'Pending Approval', value: money(pendingTotal), sub: `${expenses.filter(e => e.status === 'pending').length} requests`, icon: D.clock, color: 'secondary' },
      { label: 'Outstanding Count', value: String(outstandingList.length), sub: 'Awaiting payment', icon: D.alert, color: 'red' },
      { label: 'Paid This Month', value: money(paidThisMonthTotal), sub: `${paidThisMonthExpenses.length} expenses paid`, icon: D.check, color: 'teal' },
    ],
    All: [
      { label: 'Total This Month', value: money(allTotal), sub: 'All categories', icon: D.expenses, color: 'primary' },
      { label: 'Outstanding', value: money(outstandingTotal), sub: 'Unpaid bills', icon: D.clock, color: 'warning' },
      { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: D.alert, color: 'secondary' },
      { label: 'Expense Count', value: String(expenses.length), sub: 'All records', icon: D.expenses, color: 'teal' },
    ],
    Paid: [
      { label: 'Total Paid', value: money(paidTotal), sub: 'Marked paid', icon: D.check, color: 'teal' },
      { label: 'Paid This Month', value: money(paidThisMonthTotal), sub: `${paidThisMonthExpenses.length} expenses paid`, icon: D.check, color: 'teal' },
      { label: 'Paid Count', value: String(filtered.length), sub: 'Settled expenses', icon: D.expenses, color: 'primary' },
      { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: D.alert, color: 'secondary' },
    ],
    Reimbursed: [
      { label: 'Total Reimbursed', value: money(reimbursedTotal), sub: 'Paid back to staff', icon: D.check, color: 'teal' },
      { label: 'Reimbursed Count', value: String(filtered.length), sub: 'Settled reimbursements', icon: D.expenses, color: 'primary' },
      { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: D.alert, color: 'secondary' },
      { label: 'Total This Month', value: money(allTotal), sub: 'All categories', icon: D.expenses, color: 'warning' },
    ],
  };
  const stats = statsByTab[tab];

  const handleSave = async form => {
    try {
      const payload = {
        category: form.category || 'Other',
        title: form.title || 'Expense',
        amount: Number(form.amount || 0),
        expense_date: form.date || new Date().toISOString().slice(0, 10),
        status: editRecord?.status || 'pending',
        submitted_by: editRecord?.submittedBy || 'Team',
        notes: form.notes,
        // Prompt 6 item 4: only sent when the category was vendor-related and
        // a vendor was actually picked; null explicitly clears any prior link
        // (e.g. user switched away from a vendor-related category).
        vendor_id: form.vendor_id || null,
      };
      const saved = editRecord?.backendId
        ? await api.updateExpense(editRecord.backendId, payload)
        : await api.createExpense(payload);
      setShowEntry(false);
      setEditRecord(null);
      setPreview(saved);
      notify(editRecord ? 'Expense updated' : 'Expense created');
      loadExpenses();
    } catch (saveError) {
      notify(friendlyError(saveError, 'Could not save expense'), 'error');
    }
  };

  // Extended to accept an `extra` payload alongside status — needed for
  // "Mark Paid", which must set paid_on in the same call as status: 'paid'.
  // Reports.jsx's Cash Flow report reads Expense.paid_on directly (see
  // services/reports.py, build_financial_report's expenses_by_month) - a
  // status-only update would flip the badge to "Paid" but leave the expense
  // invisible to that report, since paid_on would stay null. Existing callers
  // (Approve/Reject/Reimburse) are unaffected — they simply don't pass extra.
  const handleStatus = async (expense, status, extra = {}) => {
    try {
      const saved = await api.updateExpense(expense.backendId, { status, ...extra });
      setPreview(saved);
      notify(`Expense marked ${status}`);
      loadExpenses();
    } catch (saveError) {
      notify(friendlyError(saveError, 'Could not update expense'), 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Expenses" subtitle="Track operational costs & approvals" actionLabel="New Expense" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={TABS} filter={tab} setFilter={setTab} search={search} setSearch={setSearch} placeholder="Search category, title, or ID..." />
      <RegisterCard title="Expense Log" countLabel={`${filtered.length} expense${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="EXP" emptyMessage="No expenses match your filters.">
        {filtered.map(exp => <ExpenseRow key={exp.id} exp={exp} onPreview={setPreview} onStatus={handleStatus} onOutstandingTab={onOutstandingTab} onEdit={setEditRecord} />)}
      </RegisterCard>
      <AddExpenseModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PreviewModal title={preview ? `Expense Preview: ${preview.expense_ref || preview.id || 'Draft'}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}