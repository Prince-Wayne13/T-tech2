// ExportData.jsx — PrintOps BMS (Malawi-Ready)
import React, { useState, useEffect } from 'react';
import './styles.css';
import { downloadPreviewPdf } from './utils/downloads';
import { api } from './api/client';

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
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
};

const EXPORT_TYPES = ['All', 'CSV', 'PDF', 'Excel', 'Backup'];

function ExportRow({ exp, isExpanded, onToggle }) {
  const statusConfig = {
    ready: { label: 'Ready', cls: 'paid', accent: 'var(--teal)' },
    processing: { label: 'Processing', cls: 'active', accent: 'var(--primary)' },
    failed: { label: 'Failed', cls: 'overdue', accent: 'var(--red)' },
    completed: { label: 'Completed', cls: 'current', accent: 'var(--secondary)' },
  };
  const cfg = statusConfig[exp.status];
  const [hovered, setHovered] = useState(false);
  const downloadExport = (event) => {
    event.stopPropagation();
    const downloadUrl = api.exportDownloadUrl(exp.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${exp.name.toLowerCase().replaceAll(' ', '-')}.${exp.format.toLowerCase() === 'excel' ? 'xlsx' : exp.format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        
        {/* Avatar (Format Initials) */}
        <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{exp.format.slice(0, 2)}</div>
        
        {/* Info */}
        <div className="vendor-info">
          <div className="vendor-name">{exp.name}</div>
          <div className="vendor-cat">{exp.format} • {exp.records} records • {exp.size}</div>
        </div>
        
        {/* Date + Status */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
          <div className="activity-amount" style={{ fontSize: '11px', fontWeight: '600' }}>{exp.date}</div>
          <div className="activity-time">By: {exp.generatedBy}</div>
        </div>
        
        {/* Status Badge + Actions */}
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          {exp.status === 'ready' && (
            <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={downloadExport}>
              <Icon d={D.download} size={11} />
            </button>
          )}
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
            <div><span style={{ color: 'var(--text-muted)' }}>Format:</span> {exp.format}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Records:</span> {exp.records}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {exp.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {exp.status === 'ready' && (
                <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Download" onClick={downloadExport}>
                  <Icon d={D.download} size={11} />
                </button>
              )}
              {exp.status === 'failed' && (
                <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Retry Export" onClick={(e) => { e.stopPropagation(); downloadPreviewPdf('Export Retry Request', `<div class="top"><div><h1>Export Retry Request</h1><div>${exp.name}</div></div><div>${new Date().toLocaleDateString()}</div></div><div class="kv"><div class="label">Status</div><div>Retry requested</div></div>`); }}>
                  <Icon d={D.check} size={11} />
                </button>
              )}
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

export default function ExportData() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [exportsData, setExportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState([
    { label: 'Total Exports', value: '-', sub: 'All time', icon: 'download', color: 'primary' },
    { label: 'Ready to Download', value: '-', sub: 'Available now', icon: 'check', color: 'teal' },
    { label: 'Failed/Retry', value: '-', sub: 'Need attention', icon: 'alert', color: 'red' },
    { label: 'Storage Used', value: '-', sub: 'Of 5 GB limit', icon: 'clock', color: 'secondary' },
  ]);

  useEffect(() => {
    const fetchExportsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.exports();
        const rows = data.items || data;
        const transformedData = rows.map(exp => ({
          id: exp.id,
          name: exp.name || exp.description || 'Export',
          format: exp.format || 'CSV',
          records: exp.records || exp.recordCount || 0,
          size: exp.fileSize ? `${(exp.fileSize / 1024 / 1024).toFixed(1)} MB` : '0 KB',
          date: new Date(exp.created_at || exp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: exp.status || 'ready',
          generatedBy: exp.generated_by || exp.generatedBy || 'System',
          notes: exp.notes || 'No notes',
        }));
        setExportsData(transformedData);
        const readyCount = transformedData.filter(e => e.status === 'ready').length;
        const failedCount = transformedData.filter(e => e.status === 'failed').length;
        setStats(prev => [
          { ...prev[0], value: transformedData.length.toString() },
          { ...prev[1], value: readyCount.toString() },
          { ...prev[2], value: failedCount.toString() },
          { ...prev[3], value: '1.8 GB' },
        ]);
      } catch (err) {
        console.error('Failed to fetch exports data:', err);
        setError('Failed to load exports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchExportsData();
  }, []);

  const filtered = exportsData.filter(e => {
    const matchesType = filter === 'All' || e.format === filter;
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.format.toLowerCase().includes(search.toLowerCase()) || 
                          e.id.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Export Data</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Backup records & generate reports</p>
        </div>
        
        {/* Static Pill Button */}
        <button onClick={async () => {
          const created = await api.createExport({ dataset: 'invoices', format: 'csv', generated_by: 'Wayne' });
          setExportsData(current => [{
            id: created.id,
            name: created.name,
            format: created.format,
            records: created.records,
            size: 'Ready',
            date: new Date(created.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            status: created.status,
            generatedBy: created.generated_by,
            notes: created.notes,
          }, ...current]);
        }} style={{
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
          New Export
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)' }}>
          {EXPORT_TYPES.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search exports..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Export Queue</h3><span className="card-sub">{loading ? 'Loading...' : filtered.length} export{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px' }}>⏳</div>
              Loading exports...
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--red)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px' }}>⚠️</div>
              {error}
            </div>
          )}
          {!loading && !error && filtered.map(exp => (
            <ExportRow 
              key={exp.id} 
              exp={exp} 
              isExpanded={expandedId === exp.id} 
              onToggle={() => setExpandedId(expandedId === exp.id ? null : exp.id)} 
            />
          ))}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>📤</div>
              No exports match your filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
