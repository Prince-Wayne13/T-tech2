import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';

function Icon({ d, size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}><path d={d} /></svg>;
}

const D = {
  vendors: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

const money = (value) => new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', maximumFractionDigits: 0 }).format(Number(value || 0));

function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = { warning: 'var(--warning)', red: 'var(--red)', teal: 'var(--teal)', secondary: 'var(--secondary)', primary: 'var(--primary)' };
  return <div className="card fin-card"><div className="fin-top"><div className="fin-label" style={{ color: '#374f6c' }}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div><div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div><div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div></div>;
}

function VendorRow({ vendor }) {
  const cfg = vendor.status === 'current'
    ? { label: 'Current', cls: 'paid', accent: 'var(--teal)' }
    : { label: vendor.status || 'Watch', cls: 'overdue', accent: 'var(--red)' };
  const initials = vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{initials}</div>
      <div className="vendor-info">
        <div className="vendor-name">{vendor.name}</div>
        <div className="vendor-cat">{vendor.category || 'Supplier'} - {vendor.email || vendor.phone || 'No contact'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '120px' }}>
        <div className="activity-amount">{money(vendor.balance)}</div>
        <div className="activity-time">{vendor.phone || '-'}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
    </div>
  );
}

export default function Vendors() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.vendors('?per_page=200')
      .then(data => active && setVendors(data.items || []))
      .catch(err => active && setError(err.message || 'Could not load vendors'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const categories = ['All', ...new Set(vendors.map(v => v.category).filter(Boolean))];
  const filtered = useMemo(() => vendors.filter(v => {
    const matchesCategory = filter === 'All' || v.category === filter;
    const query = search.toLowerCase();
    return matchesCategory && [v.name, v.category, v.email, v.phone].some(value => (value || '').toLowerCase().includes(query));
  }), [filter, search, vendors]);

  const totalBalance = filtered.reduce((sum, vendor) => sum + Number(vendor.balance || 0), 0);
  const watchCount = filtered.filter(v => v.status !== 'current').length;
  const stats = [
    { label: 'Total Vendors', value: `${filtered.length}`, sub: 'Backend directory', icon: 'vendors', color: 'primary' },
    { label: 'Outstanding Balance', value: money(totalBalance), sub: 'Total owed', icon: 'alert', color: 'warning' },
    { label: 'Watch Accounts', value: `${watchCount}`, sub: 'Need attention', icon: 'alert', color: 'red' },
    { label: 'Current Suppliers', value: `${filtered.length - watchCount}`, sub: 'Good standing', icon: 'check', color: 'teal' },
  ];

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '60px' }}>Vendors</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Live supplier directory</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}><Icon d={D.plus} size={11} /> New Vendor</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)', overflowX: 'auto' }}>{categories.map(f => <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
        <input type="text" placeholder="Search vendor or category..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '260px', flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Vendor Directory</h3><span className="card-sub">{loading ? 'Loading from API...' : `${filtered.length} vendor${filtered.length === 1 ? '' : 's'} found`}</span></div>
        {error && <div style={{ padding: '12px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        <div className="vendor-items">{filtered.map(vendor => <VendorRow key={vendor.id} vendor={vendor} />)}</div>
      </div>
    </main>
  );
}
