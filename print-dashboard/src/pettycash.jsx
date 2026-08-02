import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money, shortDate } from './utils/format';
import { friendlyError } from './utils/errors';
import ActionModal from './components/ActionModal';
import { ConfirmModal } from './components/Modals';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  cash: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
};

// Entry types match PettyCash.ENTRY_TYPES exactly (services/petty_cash.py):
// top_up increases the running balance, staff_expense decreases it,
// sales_cash_used does not touch the balance (mirrored Expense row instead).
const ENTRY_TYPES = [
  { value: 'top_up', label: 'Top-up', accent: 'var(--teal)', cls: 'paid' },
  { value: 'staff_expense', label: 'Staff Expense', accent: 'var(--warning)', cls: 'pending' },
  { value: 'sales_cash_used', label: 'Sales Cash Used', accent: 'var(--secondary)', cls: 'current' },
];

const FILTER_TYPES = ['All', 'Top-up', 'Staff Expense', 'Sales Cash Used'];

function typeConfig(type) {
  return ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[1];
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month) {
  if (!month || month === 'All') return 'All Months';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function mapEntry(entry) {
  return {
    id: entry.entry_ref || `PC-${entry.id}`,
    backendId: entry.id,
    type: entry.entry_type,
    amount: money(entry.amount),
    amountValue: Number(entry.amount || 0),
    date: compactDate(entry.created_at),
    monthKey: monthKey(entry.created_at),
    staffName: entry.staff_name || '-',
    linkedExpenseRef: entry.linked_expense_ref,
    notes: entry.notes || '-',
  };
}

function EntryRow({ entry, onDelete }) {
  const cfg = typeConfig(entry.type);
  const isNegative = entry.type === 'staff_expense';
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--bg-canvas)', color: 'var(--text-body)', fontSize: '9px' }}>{cfg.label.slice(0, 2).toUpperCase()}</div>
      <div className="vendor-info">
        <div className="vendor-name">{entry.notes !== '-' ? entry.notes : cfg.label}</div>
        <div className="vendor-cat">
          {entry.staffName !== '-' ? `Staff: ${entry.staffName} - ` : ''}{entry.date || '-'}
          {entry.linkedExpenseRef && ` - Linked: ${entry.linkedExpenseRef}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount" style={{ color: isNegative ? 'var(--red)' : 'var(--text-head)' }}>
          {isNegative ? '-' : entry.type === 'top_up' ? '+' : ''}{entry.amount}
        </div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px', color: 'var(--red)' }} title="Delete entry" onClick={() => onDelete(entry)}>
        Delete
      </button>
    </div>
  );
}

export function AddPettyCashModal({ isOpen, onClose, onSave, staffList, defaultType = 'top_up' }) {
  const [form, setForm] = useState({ entry_type: defaultType, amount: '', staff_id: '', notes: '', category: '', title: '' });

  useEffect(() => {
    if (isOpen) setForm({ entry_type: defaultType, amount: '', staff_id: '', notes: '', category: '', title: '' });
  }, [isOpen, defaultType]);

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Petty Cash Entry"
      buttons={[
        { label: 'Cancel', onClick: onClose },
        { label: 'Save Entry', variant: 'primary', onClick: () => onSave(form) },
      ]}
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Entry Type</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ENTRY_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setForm(prev => ({ ...prev, entry_type: t.value }))}
                style={{
                  padding: '6px 10px', borderRadius: '50px', border: 'none', fontSize: '10px',
                  fontWeight: form.entry_type === t.value ? 700 : 500, cursor: 'pointer',
                  background: form.entry_type === t.value ? t.accent : 'var(--bg-canvas)',
                  color: form.entry_type === t.value ? '#fff' : 'var(--text-body)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Amount (MK)</label>
          <input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        {form.entry_type === 'staff_expense' && (
          <div>
            <label style={labelStyle}>Staff Member</label>
            <select style={inputStyle} value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })}>
              <option value="">— None / Unspecified —</option>
              {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
        )}
        {form.entry_type === 'sales_cash_used' && (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-canvas)', padding: '8px', borderRadius: '6px' }}>
              This will auto-create a linked Expense record (category "Petty Cash") and will not
              change the petty cash balance, since the cash was already logged as a Sale.
            </div>
            <div>
              <label style={labelStyle}>Expense Title</label>
              <input style={inputStyle} placeholder="Sales cash used for..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
          </>
        )}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </ActionModal>
  );
}

export default function PettyCash() {
  const [filter, setFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  // In-app delete confirmation, replacing window.confirm() (build decisions
  // item 15) - null means no delete is pending.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.pettyCash('?per_page=300'), api.pettyCashBalance(), api.staff('?active=true')])
      .then(([entryData, balanceData, staffData]) => {
        setEntries((entryData.items || []).map(mapEntry));
        setBalance(Number(balanceData.balance || 0));
        setStaffList(staffData.items || []);
      })
      .catch(() => setError('Could not load petty cash. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const monthOptions = ['All', ...new Set(entries.map(e => e.monthKey).filter(Boolean))].sort((a, b) => (a === 'All' ? -1 : b < a ? -1 : 1));

  const filtered = entries.filter(entry => {
    const matchesType = filter === 'All' || typeConfig(entry.type).label === filter;
    const matchesMonth = monthFilter === 'All' || entry.monthKey === monthFilter;
    return matchesType && matchesMonth;
  });

  const topUps = entries.filter(e => e.type === 'top_up').reduce((sum, e) => sum + e.amountValue, 0);
  const staffExpenses = entries.filter(e => e.type === 'staff_expense').reduce((sum, e) => sum + e.amountValue, 0);
  const salesCashUsed = entries.filter(e => e.type === 'sales_cash_used').reduce((sum, e) => sum + e.amountValue, 0);

  const stats = [
    { label: 'Current Balance', value: money(balance), sub: 'Available petty cash', icon: D.cash, color: 'primary' },
    { label: 'Total Top-ups', value: money(topUps), sub: 'All time', icon: D.check, color: 'teal' },
    { label: 'Staff Expenses', value: money(staffExpenses), sub: 'Deducted from balance', icon: D.alert, color: 'warning' },
    { label: 'Sales Cash Used', value: money(salesCashUsed), sub: 'Balance-neutral', icon: D.clock, color: 'secondary' },
  ];

  const handleSave = async form => {
    if (!form.amount || Number(form.amount) <= 0) {
      notify('Enter a valid amount', 'error');
      return;
    }
    try {
      await api.createPettyCashEntry({
        entry_type: form.entry_type,
        amount: Number(form.amount),
        staff_id: form.staff_id || null,
        notes: form.notes,
        title: form.title,
        submitted_by: form.staff_id ? staffList.find(s => String(s.id) === String(form.staff_id))?.name : undefined,
      });
      setShowEntry(false);
      notify('Petty cash entry recorded');
      loadData();
    } catch (saveError) {
      notify(friendlyError(saveError, 'Could not save entry'), 'error');
    }
  };

  const handleDelete = entry => setDeleteTarget(entry);

  const confirmDelete = async () => {
    const entry = deleteTarget;
    setDeleteTarget(null);
    if (!entry) return;
    try {
      const result = await api.deletePettyCashEntry(entry.backendId);
      setBalance(Number(result.balance || 0));
      notify('Petty cash entry deleted');
      loadData();
    } catch (deleteError) {
      notify(friendlyError(deleteError, 'Could not delete entry'), 'error');
    }
  };

  const downloadPettyCashLog = () => {
    // HTML print-dialog export, matching Audit Log's existing look/approach
    // rather than a real PDF renderer, per this session's confirmed choice.
    const htmlContent = `<div class="top"><div><h1>T-Tech Petty Cash Log</h1><div>${filtered.length} entries - Balance: ${money(balance)}</div></div><div>${shortDate(new Date())}</div></div><table><thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Staff</th><th>Date</th><th>Notes</th></tr></thead><tbody>${filtered.map(entry => `<tr><td>${entry.id}</td><td>${typeConfig(entry.type).label}</td><td>${entry.amount}</td><td>${entry.staffName}</td><td>${entry.date}</td><td>${entry.notes}</td></tr>`).join('')}</tbody></table>`;
    const blob = new Blob([`<!doctype html><html><head><title>Petty Cash Log</title><style>body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; } table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; } th { background: #f8fafc; color: #475569; } .top { display: flex; justify-content: space-between; margin-bottom: 16px; }</style></head><body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petty-cash-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Petty Cash" subtitle="Running log of top-ups, staff expenses & sales cash use" actionLabel="Add Entry" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <ModuleToolbar filters={FILTER_TYPES} filter={filter} setFilter={setFilter} search="" setSearch={() => {}} placeholder="" />
        </div>
        <select
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)' }}
        >
          {monthOptions.map(month => <option key={month} value={month}>{formatMonthLabel(month)}</option>)}
        </select>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Download Log" onClick={downloadPettyCashLog}>
          <Icon d={D.download} size={13} />
        </button>
      </div>
      <RegisterCard title="Petty Cash Log" countLabel={`${filtered.length} entr${filtered.length !== 1 ? 'ies' : 'y'} found`} loading={loading} error={error} emptyIcon="PC" emptyMessage="No entries match your filters.">
        {filtered.map(entry => <EntryRow key={entry.id} entry={entry} onDelete={handleDelete} />)}
      </RegisterCard>
      <AddPettyCashModal isOpen={showEntry} onClose={() => setShowEntry(false)} onSave={handleSave} staffList={staffList} />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Entry"
        message={deleteTarget ? `Delete ${deleteTarget.id}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
      <ModuleToast toast={toast} />
    </main>
  );
}
