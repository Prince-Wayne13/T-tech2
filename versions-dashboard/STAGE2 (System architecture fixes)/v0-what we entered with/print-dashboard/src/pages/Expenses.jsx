import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';

function Icon({ d, size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}><path d={d} /></svg>;
}

const D = {
  expenses: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

const EXPENSE_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'Reimbursed'];
const money = (value) => new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = (value) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value)) : '-';

function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = { warning: 'var(--warning)', red: 'var(--red)', teal: 'var(--teal)', secondary: 'var(--secondary)', primary: 'var(--primary)' };
  return <div className="card fin-card"><div className="fin-top"><div className="fin-label" style={{ color: '#374f6c' }}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div><div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div><div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div></div>;
}

function ExpenseRow({ exp }) {
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
      <div className="vendor-avatar" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>{exp.category.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
      <div className="vendor-info">
        <div className="vendor-name">{exp.title}</div>
        <div className="vendor-cat">{exp.category} - {shortDate(exp.expense_date)} - {exp.submitted_by || 'Team'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{money(exp.amount)}</div>
        <div className="activity-time">{exp.expense_ref}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
    </div>
  );
}

export default function Expenses() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.expenses('?per_page=200')
      .then(data => active && setExpenses(data.items || []))
      .catch(err => active && setError(err.message || 'Could not load expenses'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => expenses.filter(e => {
    const matchesStatus = filter === 'All' || e.status === filter.toLowerCase();
    const query = search.toLowerCase();
    return matchesStatus && [e.category, e.title, e.expense_ref, e.submitted_by].some(value => (value || '').toLowerCase().includes(query));
  }), [expenses, filter, search]);

  const total = filtered.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const pending = filtered.filter(exp => exp.status === 'pending');
  const categories = filtered.reduce((acc, exp) => ({ ...acc, [exp.category]: (acc[exp.category] || 0) + Number(exp.amount || 0) }), {});
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  const stats = [
    { label: 'Total Expenses', value: money(total), sub: 'Filtered records', icon: 'expenses', color: 'primary' },
    { label: 'Pending Approval', value: money(pending.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)), sub: `${pending.length} request${pending.length === 1 ? '' : 's'}`, icon: 'clock', color: 'warning' },
    { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: 'alert', color: 'secondary' },
    { label: 'Reimbursed', value: money(filtered.filter(exp => exp.status === 'reimbursed').reduce((sum, exp) => sum + Number(exp.amount || 0), 0)), sub: 'Paid back', icon: 'check', color: 'teal' },
  ];

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '60px' }}>Expenses</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Live operational costs</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}><Icon d={D.plus} size={11} /> New Expense</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>{EXPENSE_STATUSES.map(f => <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
        <input type="text" placeholder="Search category, title, or ref..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '260px', flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Expense Log</h3><span className="card-sub">{loading ? 'Loading from API...' : `${filtered.length} expense${filtered.length === 1 ? '' : 's'} found`}</span></div>
        {error && <div style={{ padding: '12px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        <div className="vendor-items">{filtered.map(exp => <ExpenseRow key={exp.id} exp={exp} />)}</div>
      </div>
    </main>
  );
}
