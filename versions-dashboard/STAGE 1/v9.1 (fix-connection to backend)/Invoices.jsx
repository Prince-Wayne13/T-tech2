// Invoices.jsx — PrintOps BMS (Dark-Ready Header + Palette + Refined UI)
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
  invoices: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2 M12 12v4 M10 14h4',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
};

const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

const INVOICES_DATA = [
  { id: 'INV-5041', client: 'TechCorp Ltd', title: 'Annual Report Printing', amount: '$1,200', status: 'paid', issued: 'Mar 1', due: 'Mar 15', paid: 'Mar 14' },
  { id: 'INV-5040', client: 'BrandX Agency', title: 'Product Catalog', amount: '$850', status: 'sent', issued: 'Mar 10', due: 'Mar 24', paid: '—' },
  { id: 'INV-5039', client: 'City Council', title: 'Event Flyers (1000x)', amount: '$420', status: 'overdue', issued: 'Feb 20', due: 'Mar 6', paid: '—' },
  { id: 'INV-5038', client: 'MediaGroup', title: 'Business Cards', amount: '$180', status: 'paid', issued: 'Mar 5', due: 'Mar 19', paid: 'Mar 18' },
  { id: 'INV-5037', client: 'StartupHub', title: 'Pitch Decks', amount: '$320', status: 'draft', issued: '—', due: '—', paid: '—' },
  { id: 'INV-5036', client: 'Legal Partners', title: 'Contract Binders', amount: '$560', status: 'sent', issued: 'Mar 12', due: 'Mar 26', paid: '—' },
];

/* ═══════════════════════════════════════
   COMPONENT: Invoice Row
═══════════════════════════════════════ */
function InvoiceRow({ inv }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[inv.status];

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>
        {inv.id.split('-')[1]}
      </div>
      <div className="vendor-info">
        <div className="vendor-name">{inv.title}</div>
        <div className="vendor-cat">{inv.client} • Due: {inv.due}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">{inv.amount}</div>
        <div className="activity-time">Issued: {inv.issued}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        {inv.status === 'sent' && (
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Send Reminder">
            <Icon d={D.send} size={11} />
          </button>
        )}
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download PDF">
          <Icon d={D.download} size={11} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Stats Card
═══════════════════════════════════════ */
function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = {
    warning: 'var(--warning)',
    red: 'var(--red)',
    teal: 'var(--teal)',
    secondary: 'var(--secondary)',
    primary: 'var(--primary)'
  };
  return (
    <div className="card fin-card">
      <div className="fin-top">
        <div className="fin-label" style={{color:'#374f6c'}}>{label}</div>
        <div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div>
      </div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function Invoices() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.invoices('?per_page=200'), api.invoiceStats()])
      .then(([invoiceResponse, statsResponse]) => {
        if (!active) return;
        setInvoices((invoiceResponse.items || []).map(invoice => ({
          id: invoice.invoice_ref,
          client: invoice.client_name,
          title: invoice.title,
          amount: money(invoice.totals?.total || invoice.amount, invoice.currency || 'MWK'),
          status: invoice.status,
          issued: compactDate(invoice.issued_on),
          due: compactDate(invoice.due_on),
          paid: compactDate(invoice.paid_on),
        })));
        setInvoiceStats(statsResponse);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filtered = invoices.filter(i => {
    const matchesStatus = filter === 'All' || i.status === filter.toLowerCase();
    const matchesSearch = i.client.toLowerCase().includes(search.toLowerCase()) || 
                          i.title.toLowerCase().includes(search.toLowerCase()) ||
                          i.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Outstanding', value: money(invoiceStats?.outstanding), sub: 'Unpaid invoices', icon: 'invoices', color: 'warning' },
    { label: 'Overdue', value: String(invoiceStats?.overdue_count || 0), sub: 'Past due invoices', icon: 'alert', color: 'red' },
    { label: 'Paid This Month', value: money(invoiceStats?.paid), sub: 'Cash collected', icon: 'check', color: 'teal' },
    { label: 'Draft Value', value: money(invoiceStats?.draft), sub: `${invoiceStats?.invoice_count || filtered.length} invoices`, icon: 'clock', color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      {/* ✅ DARK-READY HEADER: Transparent, palette-accented, visible text */}
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em',paddingRight: '50px' }}>Invoices</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Track billing & payments</p>
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
          New Invoice
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        {stats.map(s => <StatsCard key={s.label} {...s} />)}
      </div>

      {/* Filter & Search Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        marginBottom: '14px',
        padding: '10px 12px',
        background: 'rgba(248, 249, 251, 0.92)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--r-card)',
        border: '1px solid var(--border-faint)'
      }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {INVOICE_STATUSES.map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}
            >{f}</button>
          ))}
        </div>

        {/* ✅ CORRECTED SEARCH */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          
          <input
            type="text"
            placeholder="Search client, title, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '6px 10px 6px 28px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-faint)', 
              background: '#fff',
              color: 'var(--text-body)',
              fontSize: '10px',
              outline: 'none',
              transition: 'border-color var(--ease)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-faint)'}
          />
        </div>

        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters">
          <Icon d={D.filter} size={12} />
        </button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}>
          <h3 className="card-title">Invoice Register</h3>
          <span className="card-sub">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''} found</span>
        </div>
        <div className="vendor-items">
          {filtered.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📄</div>
              No invoices match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
