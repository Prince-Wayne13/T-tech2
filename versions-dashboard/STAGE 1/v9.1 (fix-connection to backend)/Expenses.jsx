// Expenses.jsx — PrintOps BMS (Malawi-Ready)
import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';

/* ═══════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════ */
function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  expenses: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
};

const EXPENSE_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'Reimbursed'];

const EXPENSES_DATA = [
  { id: 'EXP-501', category: 'Fuel & Transport', title: 'Delivery fuel (Lilongwe–Blantyre)', amount: 'MK 85,000', date: '12 Mar 2026', status: 'approved', submittedBy: 'Chikondi M.', notes: 'Round trip delivery for City Council order' },
  { id: 'EXP-502', category: 'Paper & Consumables', title: 'Emergency A3 paper purchase', amount: 'MK 120,000', date: '10 Mar 2026', status: 'pending', submittedBy: 'Grace K.', notes: 'Store ran out, bought from City Mall' },
  { id: 'EXP-503', category: 'Equipment Maintenance', title: 'HP Latex 315 service call', amount: 'MK 450,000', date: '08 Mar 2026', status: 'approved', submittedBy: 'Tech Team', notes: 'Printhead calibration + roller replacement' },
  { id: 'EXP-504', category: 'Staff Allowances', title: 'Overtime for night shift', amount: 'MK 95,000', date: '05 Mar 2026', status: 'reimbursed', submittedBy: 'HR Admin', notes: '3 staff members, 4hrs each' },
  { id: 'EXP-505', category: 'Utilities', title: 'ESCOM monthly bill', amount: 'MK 185,000', date: '01 Mar 2026', status: 'approved', submittedBy: 'Accounts', notes: 'March consumption, VAT inclusive' },
  { id: 'EXP-506', category: 'Miscellaneous', title: 'Office cleaning supplies', amount: 'MK 45,000', date: '14 Mar 2026', status: 'pending', submittedBy: 'Thandi N.', notes: 'Monthly restock: detergents, brushes, bags' },
];

function ExpenseRow({ exp, isExpanded, onToggle }) {
  const statusConfig = {
    pending: { label: 'Pending', cls: 'pending', accent: 'var(--warning)' },
    approved: { label: 'Approved', cls: 'active', accent: 'var(--primary)' },
    rejected: { label: 'Rejected', cls: 'overdue', accent: 'var(--red)' },
    reimbursed: { label: 'Reimbursed', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[exp.status];
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div 
        className="vendor-item" 
        style={{ 
          position: 'relative', 
          paddingLeft: '14px', 
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'background var(--ease)',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
      >
        {/* Status accent bar */}
        <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
        
        {/* Avatar (Category Initials) */}
        <div className="vendor-avatar" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>
          {exp.category.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        
        {/* Info */}
        <div className="vendor-info">
          <div className="vendor-name">{exp.title}</div>
          <div className="vendor-cat">{exp.category} • {exp.date}</div>
        </div>
        
        {/* Amount + Status */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount">{exp.amount}</div>
          <div className="activity-time">By: {exp.submittedBy}</div>
        </div>
        
        {/* Status Badge + Actions */}
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View Receipt" onClick={(e) => { e.stopPropagation(); alert(`Receipt: ${exp.title}`); }}>
            <Icon d={D.eye} size={11} />
          </button>
          <Icon d={D.chevron} size={12} style={{ 
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
            transition: 'transform var(--ease)', 
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }} />
        </div>
      </div>
      
      {/* Expandable Detail Panel */}
      {isExpanded && (
        <div style={{ 
          marginLeft: '14px', 
          padding: '10px 14px', 
          background: 'var(--bg-canvas)', 
          borderRadius: '0 0 var(--r-card) var(--r-card)', 
          borderTop: '1px solid var(--border-faint)', 
          animation: 'fadeIn 0.2s ease',
          fontSize: '11px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Submitted By:</span> {exp.submittedBy}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {exp.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {exp.status === 'pending' && (
                <>
                  <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Approve" onClick={(e) => { e.stopPropagation(); alert(`${exp.title} approved`); }}>
                    <Icon d={D.check} size={11} />
                  </button>
                  <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Reject" onClick={(e) => { e.stopPropagation(); alert(`${exp.title} rejected`); }}>
                    <Icon d={D.alert} size={11} />
                  </button>
                </>
              )}
              {exp.status === 'approved' && (
                <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Mark Reimbursed" onClick={(e) => { e.stopPropagation(); alert(`${exp.title} marked as reimbursed`); }}>
                  <Icon d={D.check} size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = { warning: 'var(--warning)', red: 'var(--red)', teal: 'var(--teal)', secondary: 'var(--secondary)', primary: 'var(--primary)' };
  return (
    <div className="card fin-card">
      <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export default function Expenses() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    let active = true;
    api.expenses('?per_page=200')
      .then(data => {
        if (!active) return;
        setExpenses((data.items || []).map(expense => ({
          id: expense.expense_ref,
          category: expense.category,
          title: expense.title,
          amount: money(expense.amount),
          date: compactDate(expense.expense_date),
          status: expense.status,
          submittedBy: expense.submitted_by || 'Team',
          notes: expense.notes || 'Backend expense record',
        })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filtered = expenses.filter(e => {
    const matchesStatus = filter === 'All' || e.status === filter.toLowerCase();
    const matchesSearch = e.category.toLowerCase().includes(search.toLowerCase()) || 
                          e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const total = filtered.reduce((sum, expense) => sum + Number(String(expense.amount).replace(/[^0-9.-]/g, '')), 0);
  const pendingTotal = filtered.filter(expense => expense.status === 'pending').reduce((sum, expense) => sum + Number(String(expense.amount).replace(/[^0-9.-]/g, '')), 0);
  const reimbursedTotal = filtered.filter(expense => expense.status === 'reimbursed').reduce((sum, expense) => sum + Number(String(expense.amount).replace(/[^0-9.-]/g, '')), 0);
  const categoryTotals = filtered.reduce((acc, expense) => ({ ...acc, [expense.category]: (acc[expense.category] || 0) + Number(String(expense.amount).replace(/[^0-9.-]/g, '')) }), {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: 'Total This Month', value: money(total), sub: 'All categories', icon: 'expenses', color: 'primary' },
    { label: 'Pending Approval', value: money(pendingTotal), sub: `${filtered.filter(expense => expense.status === 'pending').length} requests`, icon: 'clock', color: 'warning' },
    { label: 'Top Category', value: topCategory?.[0] || '-', sub: topCategory ? money(topCategory[1]) : 'No spend', icon: 'alert', color: 'secondary' },
    { label: 'Reimbursed', value: money(reimbursedTotal), sub: 'Paid back', icon: 'check', color: 'teal' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      {/* HEADER — Same structure */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '18px', 
        paddingBottom: '14px',
        borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)',
        position: 'relative'
      }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Expenses</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Track operational costs & approvals</p>
        </div>
        
        {/* Static Pill Button */}
        <button style={{
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '7px 15px',
          fontSize: '10px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          cursor: 'pointer',
          transition: 'all var(--ease)',
          boxShadow: '0 3px 10px rgba(58,80,107,0.35)'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(58,80,107,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(58,80,107,0.35)'; }}>
          <Icon d={D.plus} size={11} />
          New Expense
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {EXPENSE_STATUSES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search category, title, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Expense Log</h3><span className="card-sub">{filtered.length} expense{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(exp => (
            <ExpenseRow 
              key={exp.id} 
              exp={exp} 
              isExpanded={expandedId === exp.id} 
              onToggle={() => setExpandedId(expandedId === exp.id ? null : exp.id)} 
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>🧾</div>
              No expenses match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
