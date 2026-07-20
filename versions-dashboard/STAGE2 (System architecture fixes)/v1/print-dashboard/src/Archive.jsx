import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';
import { calculateTotal } from './utils/calculateTotal';
import UnifiedPreviewModal from './components/UnifiedPreviewModal';


const D = {
  ...STANDARD_ICONS,
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

const ARCHIVE_TYPES = ['All', 'Jobs', 'Invoices', 'Proposals', 'Receipts'];

function ArchiveRow({ arc, onPreview }) {
  const typeConfig = {
    Job: { label: 'Job', cls: 'active', accent: 'var(--primary)' },
    Invoice: { label: 'Invoice', cls: 'current', accent: 'var(--secondary)' },
    Proposal: { label: 'Proposal', cls: 'pending', accent: 'var(--warning)' },
    Receipt: { label: 'Receipt', cls: 'paid', accent: 'var(--teal)' },
  };
  const cfg = typeConfig[arc.type] || typeConfig.Invoice;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--bg-canvas)', color: 'var(--text-body)', fontSize: '9px' }}>{arc.type[0]}</div>
      <div className="vendor-info">
        <div className="vendor-name">{arc.title}</div>
        <div className="vendor-cat">{arc.party} - Archived: {arc.archived}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{arc.amount}</div>
        <div className="activity-time">{arc.type}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <button className="notif-btn" style={{ width: '24px', height: '24px', marginLeft: '8px' }} title="Preview" onClick={() => onPreview(arc)}>
        <Icon d={D.eye} size={11} />
      </button>
    </div>
  );
}

export default function Archive() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [archiveData, setArchiveData] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.invoices('?status=paid&per_page=100'), api.jobs('?status=completed&per_page=100')])
      .then(([invoiceData, jobData]) => {
        setArchiveData([
          ...(invoiceData.items || []).map(invoice => ({
            id: invoice.invoice_ref,
            type: 'Invoice',
            title: invoice.title,
            party: invoice.client_name,
            amount: `MK ${calculateTotal(invoice.line_items || []).toLocaleString()}`,
            archived: new Date(invoice.updated_at || invoice.paid_on || invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            notes: invoice.notes || 'Paid invoice retained in archive',
          })),
          ...(jobData.items || []).map(job => ({
            id: job.job_ref,
            type: 'Job',
            title: job.title,
            party: job.client_name,
            amount: `${job.progress || 100}% complete`,
            archived: new Date(job.updated_at || job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            notes: job.notes || 'Completed production job',
          })),
        ]);
      })
      .catch(() => setError('Could not load archive records. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = archiveData.filter(row => {
    const query = search.toLowerCase();
    const matchesType = filter === 'All' || `${row.type}s` === filter || row.type === filter;
    const matchesSearch = `${row.party} ${row.title} ${row.id}`.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const stats = [
    { label: 'Total Archived', value: String(archiveData.length), sub: 'All records', icon: D.archive, color: 'primary' },
    { label: 'This Year', value: String(archiveData.filter(row => row.archived?.includes('2026')).length), sub: '2026 records', icon: D.clock, color: 'warning' },
    { label: 'Storage Used', value: '1.2 GB', sub: 'Of 5 GB limit', icon: D.alert, color: 'secondary' },
    { label: 'Restored', value: '7', sub: 'This month', icon: D.check, color: 'teal' },
  ];

  const downloadArchive = () => {
    const htmlContent = `<div class="top"><div><h1>T-Tech Archive</h1><div>${filtered.length} records</div></div><div>${new Date().toLocaleDateString()}</div></div><table><thead><tr><th>ID</th><th>Type</th><th>Title</th><th>Party</th><th>Archived</th></tr></thead><tbody>${filtered.map(row => `<tr><td>${row.id}</td><td>${row.type}</td><td>${row.title}</td><td>${row.party}</td><td>${row.archived}</td></tr>`).join('')}</tbody></table>`;
    const blob = new Blob([`<!doctype html><html><head><title>Archive Directory</title><style>body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; } table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; } th { background: #f8fafc; color: #475569; }</style></head><body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archive-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Archive" subtitle="Historical records & closed items" actionLabel="Download PDF" actionIcon={D.download} onAction={downloadArchive} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={ARCHIVE_TYPES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search archived records..." />
      <RegisterCard title="Archive Directory" countLabel={`${filtered.length} record${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="ARC" emptyMessage="No archived records match your filters.">
        {filtered.map(row => <ArchiveRow key={row.id} arc={row} onPreview={setPreview} />)}
      </RegisterCard>
      <UnifiedPreviewModal 
  isOpen={!!preview} 
  onClose={() => setPreview(null)} 
  title="Archive Record" 
  data={preview} 
/>
    </main>
  );
}
