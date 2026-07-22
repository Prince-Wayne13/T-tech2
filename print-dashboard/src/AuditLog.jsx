import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';
import { shortDate } from './utils/format';
import UnifiedPreviewModal from './components/UnifiedPreviewModal';

const D = {
  ...STANDARD_ICONS,
  reports: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

const LOG_TYPES = ['All', 'User Action', 'Financial', 'System', 'Document'];

function mapAuditEntry(entry) {
  const typeMap = {
    job: 'Document',
    invoice: 'Financial',
    expense: 'Financial',
    system: 'System',
    user: 'User Action',
  };
  const stamp = entry.created_at || entry.timestamp;
  return {
    id: entry.id || `LOG-${Math.random().toString().slice(2, 6)}`,
    user: entry.actor || entry.user || 'System',
    action: entry.action || entry.description || 'Action',
    target: entry.entity_type ? `${entry.entity_type} #${entry.entity_id || '-'}` : entry.target || 'Unknown',
    time: stamp ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(stamp)) : 'Unknown',
    type: typeMap[entry.entity_type || entry.type] || 'User Action',
    details: entry.action || entry.details || 'No details available',
  };
}

function LogRow({ log, onPreview }) {
  const typeConfig = {
    'User Action': { label: 'User', cls: 'current', accent: 'var(--secondary)' },
    Financial: { label: 'Financial', cls: 'active', accent: 'var(--primary)' },
    System: { label: 'System', cls: 'paid', accent: 'var(--teal)' },
    Document: { label: 'Document', cls: 'pending', accent: 'var(--warning)' },
  };
  const cfg = typeConfig[log.type] || typeConfig['User Action'];
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--bg-canvas)', color: 'var(--text-body)', fontSize: '8px' }}>{log.user.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
      <div className="vendor-info">
        <div className="vendor-name">{log.action}</div>
        <div className="vendor-cat">{log.target} - {log.time}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount" style={{ fontSize: '11px', fontWeight: 600 }}>{log.user}</div>
        <div className="activity-time">{log.type}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <button className="notif-btn" style={{ width: '24px', height: '24px', marginLeft: '8px' }} title="Preview" onClick={() => onPreview(log)}>
        <Icon d={D.eye} size={11} />
      </button>
    </div>
  );
}

export default function AuditLog() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [auditData, setAuditData] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.audit()
      .then(data => setAuditData((data.items || data || []).map(mapAuditEntry)))
      .catch(() => setError('Could not load audit log. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = auditData.filter(log => {
    const query = search.toLowerCase();
    const matchesType = filter === 'All' || log.type === filter;
    const matchesSearch = `${log.user} ${log.action} ${log.target}`.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const stats = [
    { label: 'Total Entries', value: String(auditData.length), sub: 'All time', icon: D.reports, color: 'primary' },
    { label: "Today's Activity", value: String(auditData.filter(log => log.time.includes(shortDate(new Date()))).length), sub: 'Logged actions', icon: D.clock, color: 'warning' },
    { label: 'Critical Events', value: String(auditData.filter(log => log.type === 'Financial').length), sub: 'Financial changes', icon: D.alert, color: 'red' },
    { label: 'Active Users', value: String(new Set(auditData.map(log => log.user)).size), sub: 'This month', icon: D.reports, color: 'teal' },
  ];

  const downloadAudit = () => {
    const htmlContent = `<div class="top"><div><h1>T-Tech Audit Log</h1><div>${filtered.length} entries</div></div><div>${shortDate(new Date())}</div></div><table><thead><tr><th>User</th><th>Action</th><th>Target</th><th>Time</th></tr></thead><tbody>${filtered.map(log => `<tr><td>${log.user}</td><td>${log.action}</td><td>${log.target}</td><td>${log.time}</td></tr>`).join('')}</tbody></table>`;
    const blob = new Blob([`<!doctype html><html><head><title>Audit Log</title><style>body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; } table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; } th { background: #f8fafc; color: #475569; }</style></head><body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Audit Log" subtitle="Activity history & tracking" actionLabel="Download PDF" actionIcon={D.download} onAction={downloadAudit} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={LOG_TYPES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search user, action, or target..." />
      <RegisterCard title="Activity Feed" countLabel={`${filtered.length} log${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="LOG" emptyMessage="No logs match your filters.">
        {filtered.map(log => <LogRow key={log.id} log={log} onPreview={setPreview} />)}
      </RegisterCard>
      <UnifiedPreviewModal 
  isOpen={!!preview} 
  onClose={() => setPreview(null)} 
  title="Audit Entry" 
  data={preview} 
/>
    </main>
  );
}
