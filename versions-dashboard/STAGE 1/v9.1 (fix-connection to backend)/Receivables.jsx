// Receivables.jsx — PrintOps BMS (Malawi-Ready)
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
  ar: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
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

const RECEIVABLE_STATUSES = ['All', 'Due', 'Overdue', 'Partial', 'Paid'];

const RECEIVABLES_DATA = [
  { id: 'REC-4021', client: 'TechCorp Ltd', title: 'Annual Report Printing', amount: 'MK 1,200,000', due: '15 Mar 2026', days: 2, status: 'due', contact: 'jane@techcorp.mw', notes: 'Net 14 terms' },
  { id: 'REC-4020', client: 'BrandX Agency', title: 'Product Catalog', amount: 'MK 850,000', due: '24 Mar 2026', days: -5, status: 'overdue', contact: 'mark@brandx.mw', notes: 'Follow up weekly' },
  { id: 'REC-4019', client: 'City Council', title: 'Event Flyers (1000x)', amount: 'MK 420,000', due: '06 Mar 2026', days: -12, status: 'overdue', contact: 'admin@city.gov.mw', notes: 'PO required for payment' },
  { id: 'REC-4018', client: 'MediaGroup', title: 'Business Cards', amount: 'MK 180,000', due: '19 Mar 2026', days: 1, status: 'due', contact: 'hello@mediagroup.mw', notes: 'Rush order - prioritize' },
  { id: 'REC-4017', client: 'StartupHub', title: 'Pitch Decks', amount: 'MK 320,000', due: '—', days: 0, status: 'partial', contact: 'founder@startuphub.mw', notes: '50% deposit received' },
  { id: 'REC-4016', client: 'Legal Partners', title: 'Contract Binders', amount: 'MK 560,000', due: '26 Mar 2026', days: 8, status: 'due', contact: 'accounts@legal.mw', notes: 'VAT invoice sent' },
];

function ReceivableRow({ rec, isExpanded, onToggle }) {
  const statusConfig = {
    due: { label: 'Due', cls: 'current', accent: 'var(--secondary)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    partial: { label: 'Partial', cls: 'pending', accent: 'var(--warning)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = statusConfig[rec.status];
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
        <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>{rec.id.split('-')[1]}</div>
        
        {/* Info */}
        <div className="vendor-info">
          <div className="vendor-name">{rec.title}</div>
          <div className="vendor-cat">{rec.client} • Due: {rec.due}</div>
        </div>
        
        {/* Amount + Days */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount">{rec.amount}</div>
          <div className="activity-time" style={{ color: rec.days < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
            {rec.days < 0 ? `${Math.abs(rec.days)}d overdue` : rec.days > 0 ? `${rec.days}d left` : 'Due today'}
          </div>
        </div>
        
        {/* Status + Actions */}
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View Details" onClick={(e) => { e.stopPropagation(); alert(`View: ${rec.title}`); }}>
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
            <div><span style={{ color: 'var(--text-muted)' }}>Contact:</span> {rec.contact}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {rec.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {rec.status !== 'paid' && (
                <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Send Reminder" onClick={(e) => { e.stopPropagation(); alert(`Reminder sent to ${rec.contact}`); }}>
                  <Icon d={D.send} size={11} />
                </button>
              )}
              <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Record Payment" onClick={(e) => { e.stopPropagation(); alert(`Payment recorded for ${rec.title}`); }}>
                <Icon d={D.check} size={11} />
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

export default function Receivables() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.invoices('?per_page=200'), api.invoiceStats()])
      .then(([invoiceResponse, statsResponse]) => {
        if (!active) return;
        const today = new Date();
        setReceivables((invoiceResponse.items || [])
          .filter(invoice => ['sent', 'overdue', 'paid'].includes(invoice.status))
          .map(invoice => {
            const dueDate = invoice.due_on ? new Date(invoice.due_on) : null;
            const days = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : 0;
            return {
              id: invoice.invoice_ref,
              client: invoice.client_name,
              title: invoice.title,
              amount: money(invoice.totals?.balance ?? invoice.totals?.total ?? invoice.amount, invoice.currency || 'MWK'),
              due: compactDate(invoice.due_on),
              days,
              status: invoice.status === 'sent' ? 'due' : invoice.status,
              contact: invoice.client_name,
              notes: invoice.notes || invoice.payment_terms || 'Backend invoice receivable',
            };
          }));
        setInvoiceStats(statsResponse);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filtered = receivables.filter(r => {
    const matchesStatus = filter === 'All' || r.status === filter.toLowerCase();
    const matchesSearch = r.client.toLowerCase().includes(search.toLowerCase()) || 
                          r.title.toLowerCase().includes(search.toLowerCase()) || 
                          r.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total Outstanding', value: money(invoiceStats?.outstanding), sub: 'Unpaid invoices', icon: 'ar', color: 'warning' },
    { label: 'Overdue Amount', value: String(invoiceStats?.overdue_count || 0), sub: 'Past due invoices', icon: 'alert', color: 'red' },
    { label: 'Avg. Collection', value: '18 days', sub: 'Last 30 days', icon: 'clock', color: 'teal' },
    { label: 'Collected This Month', value: money(invoiceStats?.paid), sub: 'Backend payments', icon: 'check', color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      {/* HEADER — Same structure as Proposals */}
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Receivables</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Track money owed to your business</p>
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
          New Receivable
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {RECEIVABLE_STATUSES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search client, title, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Outstanding Receivables</h3><span className="card-sub">{filtered.length} receivable{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(rec => (
            <ReceivableRow 
              key={rec.id} 
              rec={rec} 
              isExpanded={expandedId === rec.id} 
              onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)} 
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>💰</div>
              No receivables match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
