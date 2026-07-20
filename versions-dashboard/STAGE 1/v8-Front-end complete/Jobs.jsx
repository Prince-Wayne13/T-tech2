// Jobs.jsx — PrintOps BMS (Static Pill Button)
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
  jobs: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18 M16 10a4 4 0 0 1-8 0',
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  more: 'M12 12h.01 M19 12h.01 M5 12h.01',
};

const JOB_STATUSES = ['All', 'Queued', 'Printing', 'Finished', 'Cancelled'];
const JOBS_DATA = [
  { id: 'JOB-2841', client: 'TechCorp Ltd', title: 'Annual Report (500x)', pages: 24, copies: 500, status: 'printing', progress: 68, due: 'Today, 3PM', priority: 'high' },
  { id: 'JOB-2840', client: 'BrandX Agency', title: 'Product Catalog', pages: 48, copies: 200, status: 'queued', progress: 0, due: 'Tomorrow', priority: 'medium' },
  { id: 'JOB-2839', client: 'City Council', title: 'Event Flyers', pages: 2, copies: 1000, status: 'finished', progress: 100, due: 'Delivered', priority: 'low' },
  { id: 'JOB-2838', client: 'MediaGroup', title: 'Business Cards', pages: 1, copies: 250, status: 'printing', progress: 32, due: 'Today, 5PM', priority: 'high' },
  { id: 'JOB-2837', client: 'StartupHub', title: 'Pitch Decks', pages: 12, copies: 50, status: 'queued', progress: 0, due: 'Fri, 10AM', priority: 'medium' },
  { id: 'JOB-2836', client: 'Legal Partners', title: 'Contract Binders', pages: 80, copies: 15, status: 'cancelled', progress: 0, due: '—', priority: 'low' },
];

function JobRow({ job }) {
  const statusConfig = {
    queued: { label: 'Queued', cls: 'pending', accent: 'var(--warning)' },
    printing: { label: 'Printing', cls: 'active', accent: 'var(--primary)' },
    finished: { label: 'Finished', cls: 'paid', accent: 'var(--teal)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[job.status];
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{job.id.split('-')[1]}</div>
      <div className="vendor-info">
        <div className="vendor-name">{job.title}</div>
        <div className="vendor-cat">{job.client} • {job.pages}pp × {job.copies}</div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0, width: '100px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Progress</div>
        <div className="fin-bar" style={{ height: '4px' }}><div className={`fin-bar-fill ${job.priority === 'high' ? 'red' : job.priority === 'medium' ? 'warning' : 'teal'}`} style={{ width: `${job.progress}%` }} /></div>
      </div>
      <div className="vendor-right">
        <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
        <div className="activity-time" style={{ marginTop: '4px' }}>{job.due}</div>
      </div>
      <button className="notif-btn" style={{ width: '24px', height: '24px',color:'black' }}><Icon d={D.more} size={12} /></button>
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

export default function Jobs() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filtered = JOBS_DATA.filter(j => {
    const matchesStatus = filter === 'All' || j.status === filter.toLowerCase();
    const matchesSearch = j.client.toLowerCase().includes(search.toLowerCase()) || j.title.toLowerCase().includes(search.toLowerCase()) || j.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const stats = [
    { label: 'Active Jobs', value: '12', sub: 'Currently processing', icon: 'printer', color: 'primary' },
    { label: 'Queued', value: '5', sub: 'Awaiting start', icon: 'clock', color: 'warning' },
    { label: 'Completed Today', value: '8', sub: 'Ready for pickup', icon: 'check', color: 'teal' },
    { label: 'Avg. Turnaround', value: '4.2h', sub: 'Last 7 days', icon: 'jobs', color: 'secondary' },
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
    <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '110px' }}>Jobs</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Manage print production queue</p>
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
          New Job
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {JOB_STATUSES.map(f => (<button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search client, title, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Production Queue</h3><span className="card-sub">{filtered.length} job{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(job => <JobRow key={job.id} job={job} />)}
          {filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}><div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📦</div>No jobs match your filters.</div>)}
        </div>
      </div>
    </main>
  );
}