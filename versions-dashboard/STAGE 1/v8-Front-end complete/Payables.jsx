// Payables.jsx — PrintOps BMS (Malawi-Ready)
import React, { useState } from 'react';
import './styles.css';

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
  ap: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
};

const PAYABLE_STATUSES = ['All', 'Due', 'Overdue', 'Scheduled', 'Paid'];

const PAYABLES_DATA = [
  { id: 'PAY-3021', vendor: 'Paper Plus Co.', title: 'A4 Paper (50 reams)', amount: 'MK 450,000', due: '20 Mar 2026', days: 5, status: 'due', contact: 'sales@paperplus.mw', notes: 'Net 30 terms' },
  { id: 'PAY-3020', vendor: 'Ink Masters', title: 'CMYK Ink Cartridges', amount: 'MK 280,000', due: '10 Mar 2026', days: -8, status: 'overdue', contact: 'accounts@inkmasters.mw', notes: 'Urgent - printing halted' },
  { id: 'PAY-3019', vendor: 'Swift Delivery', title: 'Monthly Logistics', amount: 'MK 150,000', due: '01 Apr 2026', days: 15, status: 'scheduled', contact: 'billing@swift.mw', notes: 'Auto-pay enabled' },
  { id: 'PAY-3018', vendor: 'PrintTech Parts', title: 'Printer Maintenance', amount: 'MK 620,000', due: '25 Mar 2026', days: 10, status: 'due', contact: 'service@printtech.mw', notes: 'Annual service contract' },
  { id: 'PAY-3017', vendor: 'Office Depot', title: 'Stationery Supplies', amount: 'MK 95,000', due: '—', days: 0, status: 'paid', contact: 'orders@officedepot.mw', notes: 'Paid via bank transfer' },
  { id: 'PAY-3016', vendor: 'PowerCom Ltd', title: 'Electricity Bill', amount: 'MK 185,000', due: '05 Apr 2026', days: 20, status: 'scheduled', contact: 'billing@powercom.mw', notes: 'VAT inclusive' },
];

function PayableRow({ pay, isExpanded, onToggle }) {
  const statusConfig = {
    due: { label: 'Due', cls: 'current', accent: 'var(--secondary)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    scheduled: { label: 'Scheduled', cls: 'pending', accent: 'var(--warning)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[pay.status];
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
        
        {/* Avatar */}
        <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{pay.id.split('-')[1]}</div>
        
        {/* Info */}
        <div className="vendor-info">
          <div className="vendor-name">{pay.title}</div>
          <div className="vendor-cat">{pay.vendor} • Due: {pay.due}</div>
        </div>
        
        {/* Amount + Days */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount">{pay.amount}</div>
          <div className="activity-time" style={{ color: pay.days < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
            {pay.days < 0 ? `${Math.abs(pay.days)}d overdue` : pay.days > 0 ? `${pay.days}d left` : 'Due today'}
          </div>
        </div>
        
        {/* Status + Actions */}
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View Details" onClick={(e) => { e.stopPropagation(); alert(`View: ${pay.title}`); }}>
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
            <div><span style={{ color: 'var(--text-muted)' }}>Contact:</span> {pay.contact}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {pay.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {pay.status !== 'paid' && (
                <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Schedule Payment" onClick={(e) => { e.stopPropagation(); alert(`Payment scheduled for ${pay.title}`); }}>
                  <Icon d={D.check} size={11} />
                </button>
              )}
              <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="View Invoice" onClick={(e) => { e.stopPropagation(); alert(`Invoice for ${pay.title}`); }}>
                <Icon d={D.eye} size={11} />
              </button>
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

export default function Payables() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = PAYABLES_DATA.filter(p => {
    const matchesStatus = filter === 'All' || p.status === filter.toLowerCase();
    const matchesSearch = p.vendor.toLowerCase().includes(search.toLowerCase()) || 
                          p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total Payable', value: 'MK 1,780,000', sub: 'Unpaid bills', icon: 'ap', color: 'warning' },
    { label: 'Overdue Amount', value: 'MK 280,000', sub: '1 past due', icon: 'alert', color: 'red' },
    { label: 'Due This Week', value: 'MK 1,070,000', sub: '2 bills', icon: 'clock', color: 'secondary' },
    { label: 'Paid This Month', value: 'MK 95,000', sub: '1 payment', icon: 'check', color: 'teal' },
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Payables</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Track money your business owes</p>
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
          New Payable
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {PAYABLE_STATUSES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search vendor, title, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Outstanding Payables</h3><span className="card-sub">{filtered.length} payable{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(pay => (
            <PayableRow 
              key={pay.id} 
              pay={pay} 
              isExpanded={expandedId === pay.id} 
              onToggle={() => setExpandedId(expandedId === pay.id ? null : pay.id)} 
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📋</div>
              No payables match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}