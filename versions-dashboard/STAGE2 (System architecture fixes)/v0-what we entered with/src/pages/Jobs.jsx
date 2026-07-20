import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';

function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  jobs: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18 M16 10a4 4 0 0 1-8 0',
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14 M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  more: 'M12 12h.01 M19 12h.01 M5 12h.01',
};

const JOB_STATUSES = ['All', 'Queued', 'Printing', 'Finishing', 'Ready', 'Completed', 'Cancelled'];

const shortDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value));
};

function JobRow({ job }) {
  const statusConfig = {
    queued: { label: 'Queued', cls: 'pending', accent: 'var(--warning)' },
    printing: { label: 'Printing', cls: 'active', accent: 'var(--primary)' },
    finishing: { label: 'Finishing', cls: 'active', accent: 'var(--secondary)' },
    ready: { label: 'Ready', cls: 'paid', accent: 'var(--teal)' },
    completed: { label: 'Completed', cls: 'paid', accent: 'var(--teal)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[job.status] || statusConfig.queued;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{job.job_ref.split('-')[1]}</div>
      <div className="vendor-info">
        <div className="vendor-name">{job.title}</div>
        <div className="vendor-cat">{job.client_name} - {job.machine_name || job.machine_category || 'Unassigned'} - {job.copies} copies</div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0, width: '100px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Progress</div>
        <div className="fin-bar" style={{ height: '4px' }}><div className={`fin-bar-fill ${job.priority === 'high' ? 'red' : job.priority === 'medium' ? 'warning' : 'teal'}`} style={{ width: `${job.progress || 0}%` }} /></div>
      </div>
      <div className="vendor-right">
        <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
        <div className="activity-time" style={{ marginTop: '4px' }}>Due {shortDate(job.due_date)}</div>
      </div>
      <button className="notif-btn" style={{ width: '24px', height: '24px', color: 'black' }}><Icon d={D.more} size={12} /></button>
    </div>
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

export default function Jobs() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.jobs('?per_page=200')
      .then(data => {
        if (!active) return;
        setJobs(data.items || []);
        setError('');
      })
      .catch(err => active && setError(err.message || 'Could not load jobs'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => jobs.filter(j => {
    const matchesStatus = filter === 'All' || j.status === filter.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = j.client_name.toLowerCase().includes(query) || j.title.toLowerCase().includes(query) || j.job_ref.toLowerCase().includes(query) || (j.machine_name || '').toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  }), [filter, jobs, search]);

  const activeJobs = jobs.filter(job => ['queued', 'printing', 'finishing'].includes(job.status));
  const stats = [
    { label: 'Active Jobs', value: `${activeJobs.length}`, sub: 'Live queue', icon: 'printer', color: 'primary' },
    { label: 'Queued', value: `${jobs.filter(job => job.status === 'queued').length}`, sub: 'Awaiting start', icon: 'clock', color: 'warning' },
    { label: 'Ready/Done', value: `${jobs.filter(job => ['ready', 'completed'].includes(job.status)).length}`, sub: 'Pickup or delivered', icon: 'check', color: 'teal' },
    { label: 'Machines Used', value: `${new Set(jobs.map(job => job.machine_name).filter(Boolean)).size}`, sub: 'Production assets', icon: 'jobs', color: 'secondary' },
  ];

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '110px' }}>Jobs</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Live print production queue</p>
        </div>
        <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px', padding: '7px 15px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(58,80,107,0.35)' }}>
          <Icon d={D.plus} size={11} /> New Job
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {JOB_STATUSES.map(f => (<button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search client, title, machine..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Production Queue</h3><span className="card-sub">{loading ? 'Loading from API...' : `${filtered.length} job${filtered.length === 1 ? '' : 's'} found`}</span></div>
        {error && <div style={{ padding: '12px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        <div className="vendor-items">
          {filtered.map(job => <JobRow key={job.id} job={job} />)}
          {!loading && filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>No jobs match your filters.</div>)}
        </div>
      </div>
    </main>
  );
}
