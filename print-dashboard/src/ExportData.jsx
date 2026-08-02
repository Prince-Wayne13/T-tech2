import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { friendlyError } from './utils/errors';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const EXPORT_TYPES = ['All', 'CSV', 'PDF', 'Excel', 'Backup'];

function ExportRow({ exp }) {
  const statusConfig = {
    ready: { label: 'Ready', cls: 'paid', accent: 'var(--teal)' },
    processing: { label: 'Processing', cls: 'active', accent: 'var(--primary)' },
    failed: { label: 'Failed', cls: 'overdue', accent: 'var(--red)' },
    completed: { label: 'Completed', cls: 'current', accent: 'var(--secondary)' },
  };
  const cfg = statusConfig[exp.status] || statusConfig.ready;
  const downloadExport = () => {
    const link = document.createElement('a');
    link.href = api.exportDownloadUrl(exp.id);
    link.download = `${exp.name.toLowerCase().replaceAll(' ', '-')}.${exp.format.toLowerCase() === 'excel' ? 'xlsx' : exp.format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{exp.format.slice(0, 2)}</div>
      <div className="vendor-info">
        <div className="vendor-name">{exp.name}</div>
        <div className="vendor-cat">{exp.format} - {exp.records} records - {exp.size}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount" style={{ fontSize: '11px', fontWeight: 600 }}>{exp.date}</div>
        <div className="activity-time">By: {exp.generatedBy}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      {exp.status === 'ready' && (
        <button className="notif-btn" style={{ width: '24px', height: '24px', marginLeft: '8px' }} title="Download" onClick={downloadExport}>
          <Icon d={D.download} size={11} />
        </button>
      )}
    </div>
  );
}

export default function ExportData() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [exportsData, setExportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadExports = () => {
    setLoading(true);
    setError(null);
    api.exports()
      .then(data => {
        const rows = data.items || data || [];
        setExportsData(rows.map(exp => ({
          id: exp.id,
          name: exp.name || exp.description || 'Export',
          format: exp.format || 'CSV',
          records: exp.records || exp.recordCount || 0,
          size: exp.fileSize ? `${(exp.fileSize / 1024 / 1024).toFixed(1)} MB` : '0 KB',
          date: new Date(exp.created_at || exp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: exp.status || 'ready',
          generatedBy: exp.generated_by || exp.generatedBy || 'System',
          notes: exp.notes || 'No notes',
        })));
      })
      .catch(() => setError('Could not load exports. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExports();
  }, []);

  const filtered = exportsData.filter(exp => {
    const query = search.toLowerCase();
    const matchesType = filter === 'All' || exp.format === filter;
    const matchesSearch = `${exp.name} ${exp.format} ${exp.id}`.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const readyCount = exportsData.filter(exp => exp.status === 'ready').length;
  const failedCount = exportsData.filter(exp => exp.status === 'failed').length;
  const stats = [
    { label: 'Total Exports', value: String(exportsData.length), sub: 'All time', icon: D.download, color: 'primary' },
    { label: 'Ready to Download', value: String(readyCount), sub: 'Available now', icon: D.check, color: 'teal' },
    { label: 'Failed/Retry', value: String(failedCount), sub: 'Need attention', icon: D.alert, color: 'red' },
    { label: 'Storage Used', value: '1.8 GB', sub: 'Of 5 GB limit', icon: D.clock, color: 'secondary' },
  ];

  const createExport = async () => {
    try {
      // generated_by intentionally omitted here - routes/exports.py's
      // create_export_file() defaults to this machine's real device_id
      // rather than a hardcoded person's name.
      await api.createExport({ dataset: 'invoices', format: 'csv' });
      notify('Export created');
      loadExports();
    } catch (saveError) {
      notify(friendlyError(saveError, 'Could not create export'), 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Export Data" subtitle="Backup records & generate reports" actionLabel="New Export" actionIcon={D.download} onAction={createExport} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={EXPORT_TYPES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search exports..." />
      <RegisterCard title="Export Queue" countLabel={`${filtered.length} export${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="EXP" emptyMessage="No exports match your filters.">
        {filtered.map(exp => <ExportRow key={exp.id} exp={exp} />)}
      </RegisterCard>
      <ModuleToast toast={toast} />
    </main>
  );
}
