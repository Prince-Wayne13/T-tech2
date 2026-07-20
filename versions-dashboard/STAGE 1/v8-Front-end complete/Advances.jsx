// Advances.jsx — PrintOps BMS (Malawi-Ready)
import React, { useState } from 'react';
import './styles.css';

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
  advances: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
};

const ADVANCE_STATUSES = ['All', 'Active', 'Settled', 'Refunded', 'Expired'];

const ADVANCES_DATA = [
  { id: 'ADV-201', party: 'TechCorp Ltd', title: 'Deposit for Annual Report', amount: 'MK 600,000', date: '10 Mar 2026', status: 'active', remaining: 'MK 600,000', notes: '50% upfront as agreed' },
  { id: 'ADV-202', party: 'PrintTech Parts', title: 'Equipment prepayment', amount: 'MK 300,000', date: '05 Mar 2026', status: 'settled', remaining: 'MK 0', notes: 'Fully applied to March invoice' },
  { id: 'ADV-203', party: 'StartupHub', title: 'Pitch deck deposit', amount: 'MK 160,000', date: '02 Mar 2026', status: 'refunded', remaining: 'MK 0', notes: 'Project cancelled, refund processed' },
  { id: 'ADV-204', party: 'City Council', title: 'Event materials advance', amount: 'MK 210,000', date: '14 Mar 2026', status: 'active', remaining: 'MK 210,000', notes: 'Waiting for PO delivery' },
];

function AdvanceRow({ adv, isExpanded, onToggle }) {
  const statusConfig = {
    active: { label: 'Active', cls: 'active', accent: 'var(--primary)' },
    settled: { label: 'Settled', cls: 'paid', accent: 'var(--teal)' },
    refunded: { label: 'Refunded', cls: 'pending', accent: 'var(--warning)' },
    expired: { label: 'Expired', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[adv.status];
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px', background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background var(--ease)', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onToggle}>
        <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
        <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{adv.id.split('-')[1]}</div>
        <div className="vendor-info">
          <div className="vendor-name">{adv.title}</div>
          <div className="vendor-cat">{adv.party} • {adv.date}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount">{adv.amount}</div>
          <div className="activity-time">Rem: {adv.remaining}</div>
        </div>
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View" onClick={(e) => e.stopPropagation()}><Icon d={D.eye} size={11} /></button>
          <Icon d={D.chevron} size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--ease)', color: 'var(--text-muted)', cursor: 'pointer' }} />
        </div>
      </div>
      {isExpanded && (
        <div style={{ marginLeft: '14px', padding: '10px 14px', background: 'var(--bg-canvas)', borderRadius: '0 0 var(--r-card) var(--r-card)', borderTop: '1px solid var(--border-faint)', animation: 'fadeIn 0.2s ease', fontSize: '11px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {adv.notes}</div>
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

export default function Advances() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = ADVANCES_DATA.filter(a => {
    const matchesStatus = filter === 'All' || a.status === filter.toLowerCase();
    const matchesSearch = a.party.toLowerCase().includes(search.toLowerCase()) || a.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total Advances', value: 'MK 1,270,000', sub: 'All time', icon: 'advances', color: 'primary' },
    { label: 'Active Balance', value: 'MK 810,000', sub: 'Unsettled', icon: 'clock', color: 'warning' },
    { label: 'Settled', value: 'MK 300,000', sub: 'This month', icon: 'check', color: 'teal' },
    { label: 'Refunded', value: 'MK 160,000', sub: '1 cancellation', icon: 'alert', color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Advances</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Track prepayments & deposits</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', transition: 'all var(--ease)', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(58,80,107,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(58,80,107,0.35)'; }}>
          <Icon d={D.plus} size={11} /> New Advance
        </button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {ADVANCE_STATUSES.map(f => (<button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search party or title..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Advance Register</h3><span className="card-sub">{filtered.length} advance{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(adv => (<AdvanceRow key={adv.id} adv={adv} isExpanded={expandedId === adv.id} onToggle={() => setExpandedId(expandedId === adv.id ? null : adv.id)} />))}
          {filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}><div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>💰</div>No advances match your filters.</div>)}
        </div>
      </div>
    </main>
  );
}