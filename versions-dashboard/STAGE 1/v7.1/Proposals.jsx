// Proposals.jsx — PrintOps BMS (Static Pill Button)
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
  proposals: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

const PROPOSAL_STATUSES = ['All', 'Draft', 'Sent', 'Viewed', 'Approved', 'Rejected'];
const PROPOSALS_DATA = [
  { id: 'PROP-1024', client: 'TechCorp Ltd', title: 'Q1 Marketing Collateral', amount: '$3,400', status: 'approved', sent: 'Mar 12', viewed: 'Mar 13', expires: 'Apr 12' },
  { id: 'PROP-1023', client: 'BrandX Agency', title: 'Product Launch Kit', amount: '$5,200', status: 'viewed', sent: 'Mar 10', viewed: 'Mar 11', expires: 'Apr 10' },
  { id: 'PROP-1022', client: 'City Council', title: 'Annual Report Design', amount: '$1,850', status: 'sent', sent: 'Mar 14', viewed: '—', expires: 'Apr 14' },
  { id: 'PROP-1021', client: 'MediaGroup', title: 'Social Media Templates', amount: '$980', status: 'draft', sent: '—', viewed: '—', expires: '—' },
  { id: 'PROP-1020', client: 'StartupHub', title: 'Pitch Deck Printing', amount: '$720', status: 'rejected', sent: 'Mar 5', viewed: 'Mar 6', expires: 'Apr 5' },
];

function ProposalRow({ prop }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    viewed: { label: 'Viewed', cls: 'active', accent: 'var(--primary)' },
    approved: { label: 'Approved', cls: 'paid', accent: 'var(--teal)' },
    rejected: { label: 'Rejected', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[prop.status];
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{prop.id.split('-')[1]}</div>
      <div className="vendor-info">
        <div className="vendor-name">{prop.title}</div>
        <div className="vendor-cat">{prop.client} • Expires {prop.expires}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">{prop.amount}</div>
        <div className="activity-time">Sent: {prop.sent}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview"><Icon d={D.eye} size={11} /></button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download"><Icon d={D.download} size={11} /></button>
      </div>
    </div>
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

export default function Proposals() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filtered = PROPOSALS_DATA.filter(p => {
    const matchesStatus = filter === 'All' || p.status === filter.toLowerCase();
    const matchesSearch = p.client.toLowerCase().includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const stats = [
    { label: 'Total Value', value: '$12,150', sub: 'All proposals', icon: 'proposals', color: 'primary' },
    { label: 'Pending Review', value: '3', sub: 'Awaiting response', icon: 'clock', color: 'warning' },
    { label: 'Win Rate', value: '68%', sub: 'Last 90 days', icon: 'check', color: 'teal' },
    { label: 'Avg. Value', value: '$2,430', sub: 'Per approved', icon: 'proposals', color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      
      {/* HEADER — Static pill button */}
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Proposals</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Quotes and project proposals</p>
        </div>
        
        {/* ✅ SMALL ROUNDED PILL BUTTON */}
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
          New Proposal
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {PROPOSAL_STATUSES.map(f => (<button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search client, title, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Proposal Pipeline</h3><span className="card-sub">{filtered.length} proposal{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(prop => <ProposalRow key={prop.id} prop={prop} />)}
          {filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}><div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📑</div>No proposals match your filters.</div>)}
        </div>
      </div>
    </main>
  );
}