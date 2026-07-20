import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';

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
  reports: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
};

const REPORT_TYPES = ['All', 'Monthly', 'Quarterly', 'Annual', 'Operational'];

const money = (value) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function ReportRow({ rpt, isExpanded, onToggle }) {
  const statusConfig = {
    ready: { label: 'Ready', cls: 'paid', accent: 'var(--teal)' },
    pending: { label: 'Pending', cls: 'pending', accent: 'var(--warning)' },
    failed: { label: 'Failed', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[rpt.status] || statusConfig.ready;
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px', background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background var(--ease)', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onToggle}>
        <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
        <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>{rpt.id.split('-').pop()}</div>
        <div className="vendor-info">
          <div className="vendor-name">{rpt.name}</div>
          <div className="vendor-cat">{rpt.type} - Generated from Flask backend</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount" style={{ fontSize: '11px', fontWeight: '600' }}>By: {rpt.generated_by}</div>
          <div className="activity-time">{rpt.type}</div>
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
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Description:</span> {rpt.notes}</div>
            <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
              {JSON.stringify(rpt.metrics || {})}
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
      <div className="fin-top"><div className="fin-label" style={{ color: '#374f6c' }}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export default function Reports() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [reports, setReports] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [machineRevenue, setMachineRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadReports() {
      try {
        setLoading(true);
        const [reportResponse, financialResponse, machineResponse] = await Promise.all([
          api.reports(),
          api.financialReport('month'),
          api.machineRevenue(),
        ]);
        if (!active) return;
        setReports(reportResponse.items || []);
        setFinancials(financialResponse);
        setMachineRevenue(machineResponse.items || []);
        setError('');
      } catch (err) {
        if (active) setError(err.message || 'Could not load reports');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReports();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => reports.filter(r => {
    const matchesType = filter === 'All' || r.type === filter;
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  }), [filter, reports, search]);

  const readyCount = reports.filter(report => report.status === 'ready').length;
  const topMachine = machineRevenue[0];
  const stats = [
    { label: 'Reports Generated', value: `${reports.length}`, sub: 'From backend', icon: 'reports', color: 'primary' },
    { label: 'Revenue', value: money(financials?.revenue), sub: 'Billed work', icon: 'check', color: 'teal' },
    { label: 'Profit', value: money(financials?.profit), sub: 'Revenue less expenses', icon: 'reports', color: 'secondary' },
    { label: 'Top Machine', value: topMachine ? money(topMachine.revenue) : 'MK 0', sub: topMachine?.name || `${readyCount} reports ready`, icon: 'clock', color: 'warning' },
  ];

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '60px' }}>Reports</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Live financial and operational summaries</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}>
          <Icon d={D.plus} size={11} /> New Report
        </button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {REPORT_TYPES.map(f => (<button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search backend reports..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Report Library</h3><span className="card-sub">{loading ? 'Loading from API...' : `${filtered.length} report${filtered.length === 1 ? '' : 's'} found`}</span></div>
        {error && <div style={{ padding: '12px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        <div className="vendor-items">
          {filtered.map(rpt => (<ReportRow key={rpt.id} rpt={rpt} isExpanded={expandedId === rpt.id} onToggle={() => setExpandedId(expandedId === rpt.id ? null : rpt.id)} />))}
          {!loading && filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>No backend reports match your filters.</div>)}
        </div>
      </div>
      <div className="card" style={{ borderTop: '2px solid var(--teal)', marginTop: '14px' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}>
          <h3 className="card-title">Machine Revenue</h3>
          <span className="card-sub">Which machines bring in the most money</span>
        </div>
        <div className="vendor-items">
          {machineRevenue.map(machine => (
            <div className="vendor-item" key={machine.machine_ref} style={{ position: 'relative', paddingLeft: '14px' }}>
              <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: machine.status === 'active' ? 'var(--teal)' : 'var(--warning)', borderRadius: '2px' }} />
              <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>{machine.category.slice(0, 2).toUpperCase()}</div>
              <div className="vendor-info">
                <div className="vendor-name">{machine.name}</div>
                <div className="vendor-cat">{machine.category} - {machine.jobs} job{machine.jobs === 1 ? '' : 's'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '130px' }}>
                <div className="activity-amount">{money(machine.revenue)}</div>
                <div className="activity-time">{machine.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
