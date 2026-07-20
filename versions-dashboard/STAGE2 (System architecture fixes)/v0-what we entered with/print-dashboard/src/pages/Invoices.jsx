import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';
import PreviewModal from '../components/PreviewModal';
import { downloadJson } from '../utils/downloads';

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
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

const money = (value, currency = 'MWK') =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const shortDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value));
};

function normalizeInvoice(invoice) {
  const total = invoice.totals?.total ?? invoice.amount ?? 0;
  return {
    dbId: invoice.id,
    id: invoice.invoice_ref,
    client: invoice.client_name,
    title: invoice.title,
    amount: money(total, invoice.currency || 'MWK'),
    status: invoice.status,
    issued: shortDate(invoice.issued_on),
    due: shortDate(invoice.due_on),
    paid: shortDate(invoice.paid_on),
    balance: money(invoice.totals?.balance ?? 0, invoice.currency || 'MWK'),
    lineCount: invoice.line_items?.length || 0,
    raw: invoice,
  };
}

function InvoiceRow({ inv, onPreview }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[inv.status] || statusConfig.draft;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>
        {(inv.id || '').split('-')[1] || inv.id}
      </div>
      <div className="vendor-info">
        <div className="vendor-name">{inv.title}</div>
        <div className="vendor-cat">{inv.client} - Due: {inv.due} - {inv.lineCount} line item{inv.lineCount === 1 ? '' : 's'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '110px' }}>
        <div className="activity-amount">{inv.amount}</div>
        <div className="activity-time">Balance: {inv.balance}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        {inv.status === 'sent' && (
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Send Reminder">
            <Icon d={D.send} size={11} />
          </button>
        )}
        <button
          className="notif-btn"
          style={{ width: '24px', height: '24px' }}
          title="Preview invoice"
          onClick={() => onPreview(inv.raw)}
        >
          <Icon d={D.eye} size={11} />
        </button>
        <button
          className="notif-btn"
          style={{ width: '24px', height: '24px' }}
          title="Download invoice JSON"
          onClick={() => downloadJson(`${inv.id}.json`, inv.raw)}
        >
          <Icon d={D.download} size={11} />
        </button>
      </div>
    </div>
  );
}

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
        <div className="fin-label" style={{ color: '#374f6c' }}>{label}</div>
        <div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div>
      </div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export default function Invoices() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadInvoices() {
      try {
        setLoading(true);
        const [invoiceResponse, statResponse] = await Promise.all([
          api.invoices('?per_page=200'),
          api.invoiceStats(),
        ]);
        if (!active) return;
        setInvoices((invoiceResponse.items || []).map(normalizeInvoice));
        setSummary(statResponse);
        setError('');
      } catch (err) {
        if (active) setError(err.message || 'Could not load invoices');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInvoices();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => invoices.filter(i => {
    const matchesStatus = filter === 'All' || i.status === filter.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = i.client.toLowerCase().includes(query) ||
      i.title.toLowerCase().includes(query) ||
      i.id.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  }), [filter, invoices, search]);

  const stats = [
    { label: 'Outstanding', value: money(summary?.outstanding), sub: 'Unpaid invoices', icon: 'invoices', color: 'warning' },
    { label: 'Overdue', value: `${summary?.overdue_count || 0}`, sub: 'Invoices past due', icon: 'alert', color: 'red' },
    { label: 'Paid', value: money(summary?.paid), sub: 'Cash collected', icon: 'check', color: 'teal' },
    { label: 'Draft Value', value: money(summary?.draft), sub: `${summary?.invoice_count || 0} total invoices`, icon: 'clock', color: 'secondary' },
  ];

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '50px' }}>Invoices</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Live billing data from Flask</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}>
          <Icon d={D.plus} size={11} />
          New Invoice
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        {stats.map(s => <StatsCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {INVOICE_STATUSES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search backend invoices..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters">
          <Icon d={D.filter} size={12} />
        </button>
      </div>

      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}>
          <h3 className="card-title">Invoice Register</h3>
          <span className="card-sub">{loading ? 'Loading from API...' : `${filtered.length} invoice${filtered.length === 1 ? '' : 's'} found`}</span>
        </div>
        {error && <div style={{ padding: '12px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        <div className="vendor-items">
          {filtered.map(inv => <InvoiceRow key={inv.dbId} inv={inv} onPreview={setPreview} />)}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              No backend invoices match your filters.
            </div>
          )}
        </div>
      </div>
      <PreviewModal title="Invoice Preview" data={preview} onClose={() => setPreview(null)} />
    </main>
  );
}
