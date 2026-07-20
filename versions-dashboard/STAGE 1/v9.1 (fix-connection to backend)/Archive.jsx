// Archive.jsx — PrintOps BMS (Malawi-Ready)
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
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
  restore: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5',
};

const ARCHIVE_TYPES = ['All', 'Jobs', 'Invoices', 'Proposals', 'Receipts'];

const ARCHIVE_DATA = [
  { id: 'ARC-101', type: 'Job', title: '2025 Calendar Printing', party: 'City Council', amount: 'MK 850,000', archived: '01 Jan 2026', notes: 'Completed & delivered. Final sign-off received.' },
  { id: 'ARC-102', type: 'Invoice', title: 'INV-4890', party: 'TechCorp Ltd', amount: 'MK 1,200,000', archived: '15 Dec 2025', notes: 'Paid in full via bank transfer. VAT receipt issued.' },
  { id: 'ARC-103', type: 'Proposal', title: 'PROP-0980', party: 'BrandX Agency', amount: 'MK 2,400,000', archived: '10 Nov 2025', notes: 'Expired after 30 days. Client went with competitor.' },
  { id: 'ARC-104', type: 'Receipt', title: 'RCT-2210', party: 'Paper Plus Co.', amount: 'MK 450,000', archived: '20 Oct 2025', notes: 'Office supplies purchase. Filed for tax deduction.' },
  { id: 'ARC-105', type: 'Job', title: 'Election Ballot Papers', party: 'Electoral Commission', amount: 'MK 3,200,000', archived: '05 Sep 2025', notes: 'High-security print run. Confidentiality agreement signed.' },
];

function ArchiveRow({ arc, isExpanded, onToggle }) {
  const typeConfig = {
    Job: { label: 'Job', cls: 'active', accent: 'var(--primary)' },
    Invoice: { label: 'Invoice', cls: 'current', accent: 'var(--secondary)' },
    Proposal: { label: 'Proposal', cls: 'pending', accent: 'var(--warning)' },
    Receipt: { label: 'Receipt', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = typeConfig[arc.type];
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
        <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
        <div className="vendor-avatar" style={{ background: 'var(--bg-canvas)', color: 'var(--text-body)', fontSize: '9px' }}>{arc.type[0]}</div>
        <div className="vendor-info">
          <div className="vendor-name">{arc.title}</div>
          <div className="vendor-cat">{arc.party} • Archived: {arc.archived}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount">{arc.amount}</div>
          <div className="activity-time">{arc.type}</div>
        </div>
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View" onClick={(e) => e.stopPropagation()}>
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
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {arc.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Restore to Active" onClick={(e) => { e.stopPropagation(); alert(`${arc.title} restored`); }}>
                <Icon d={D.restore} size={11} />
              </button>
              <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Download PDF" onClick={(e) => e.stopPropagation()}>
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

export default function Archive() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = ARCHIVE_DATA.filter(a => {
    const matchesType = filter === 'All' || a.type === filter;
    const matchesSearch = a.party.toLowerCase().includes(search.toLowerCase()) || 
                          a.title.toLowerCase().includes(search.toLowerCase()) || 
                          a.id.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const stats = [
    { label: 'Total Archived', value: '142', sub: 'All records', icon: 'archive', color: 'primary' },
    { label: 'This Year', value: '48', sub: '2026 records', icon: 'clock', color: 'warning' },
    { label: 'Storage Used', value: '1.2 GB', sub: 'Of 5 GB limit', icon: 'alert', color: 'secondary' },
    { label: 'Restored', value: '7', sub: 'This month', icon: 'check', color: 'teal' },
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Archive</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Historical records & closed items</p>
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
          Export Archive
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {ARCHIVE_TYPES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search archived records..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Archive Directory</h3><span className="card-sub">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(arc => (
            <ArchiveRow 
              key={arc.id} 
              arc={arc} 
              isExpanded={expandedId === arc.id} 
              onToggle={() => setExpandedId(expandedId === arc.id ? null : arc.id)} 
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📦</div>
              No archived records match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}