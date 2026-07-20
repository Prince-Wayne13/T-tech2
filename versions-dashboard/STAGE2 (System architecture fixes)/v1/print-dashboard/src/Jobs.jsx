import React, { useEffect, useState } from 'react';
import './styles.css';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewJobModal } from './components/Modals';
import { api } from './api/client';
import {
  Icon,
  ModuleHeader,
  ModuleToast,
  ModuleToolbar,
  RegisterCard,
  STANDARD_ICONS,
  StatsGrid,
  useModuleToast,
} from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  jobs: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18 M16 10a4 4 0 0 1-8 0',
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  more: 'M12 12h.01 M19 12h.01 M5 12h.01',
};

const JOB_STATUSES = ['All', 'Queued', 'Printing', 'Finished', 'Cancelled'];

const mapJob = job => ({
  id: job.job_ref || `JOB-${job.id}`,
  backendId: job.id,
  client: job.client_name || 'Walk-in Client',
  title: job.title || 'Untitled job',
  pages: job.pages || 0,
  copies: job.copies || 1,
  status: job.status === 'completed' || job.status === 'ready' ? 'finished' : job.status === 'finishing' ? 'printing' : job.status || 'queued',
  progress: job.progress || 0,
  due: job.due_date || 'No due date',
  due_date: job.due_date,
  priority: job.priority || 'medium',
  machine_name: job.machine_name,
  service_category: job.service_category,
  notes: job.notes,
});

function jobPayload(form, fallback = {}) {
  return {
    client_name: form.client || fallback.client || 'Walk-in Client',
    title: form.title || fallback.title || 'New print job',
    priority: form.priority || fallback.priority || 'medium',
    due_date: form.due || fallback.due_date || null,
    service_category: form.printer || fallback.service_category || form.specs?.[0],
    notes: [form.notes, form.specs?.join(', ')].filter(Boolean).join('\n'),
  };
}

function JobRow({ job, onPreview, onEdit }) {
  const statusConfig = {
    queued: { label: 'Queued', cls: 'pending', accent: 'var(--warning)' },
    printing: { label: 'Printing', cls: 'active', accent: 'var(--primary)' },
    finished: { label: 'Finished', cls: 'paid', accent: 'var(--teal)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[job.status] || statusConfig.queued;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{String(job.id).split('-')[1] || 'JOB'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{job.title}</div>
        <div className="vendor-cat">{job.client} - {job.pages}pp x {job.copies}</div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0, width: '100px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Progress</div>
        <div className="fin-bar" style={{ height: '4px' }}>
          <div className={`fin-bar-fill ${job.priority === 'high' ? 'red' : job.priority === 'medium' ? 'warning' : 'teal'}`} style={{ width: `${job.progress}%` }} />
        </div>
      </div>
      <div className="vendor-right">
        <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
        <div className="activity-time" style={{ marginTop: '4px' }}>{job.due}</div>
      </div>
      <button className="notif-btn" style={{ width: '24px', height: '24px', color: 'black' }} title="Preview" onClick={() => onPreview(job)}>
        <Icon d={D.more} size={12} />
      </button>
      <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit" onClick={() => onEdit(job)}>
        Edit
      </button>
    </div>
  );
}

export default function Jobs() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadJobs = () => {
    setLoading(true);
    setError(null);
    api.jobs('?per_page=200')
      .then(data => setJobs((data.items || []).map(mapJob)))
      .catch(() => setError('Could not load jobs. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filtered = jobs.filter(job => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || job.status === filter.toLowerCase();
    const matchesSearch = `${job.client} ${job.title} ${job.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Active Jobs', value: jobs.filter(job => ['printing', 'queued'].includes(job.status)).length, sub: 'Currently processing', icon: D.printer, color: 'primary' },
    { label: 'Queued', value: jobs.filter(job => job.status === 'queued').length, sub: 'Awaiting start', icon: D.clock, color: 'warning' },
    { label: 'Completed', value: jobs.filter(job => job.status === 'finished').length, sub: 'Ready for pickup', icon: D.check, color: 'teal' },
    { label: 'Avg. Turnaround', value: '4.2h', sub: 'Last 7 days', icon: D.jobs, color: 'secondary' },
  ];

  const handleSave = async form => {
    try {
      const saved = editRecord?.backendId
        ? await api.updateJob(editRecord.backendId, jobPayload(form, editRecord))
        : await api.createJob(jobPayload(form));
      setShowEntry(false);
      setEditRecord(null);
      setPreview(mapJob(saved));
      notify(editRecord ? 'Job updated' : 'Job created');
      loadJobs();
    } catch (saveError) {
      notify(saveError.message || 'Could not save job', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Jobs" subtitle="Manage print production queue" actionLabel="New Job" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={JOB_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Production Queue" countLabel={`${filtered.length} job${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="JOB" emptyMessage="No jobs match your filters.">
        {filtered.map(job => <JobRow key={job.id} job={job} onPreview={setPreview} onEdit={setEditRecord} />)}
      </RegisterCard>
      <NewJobModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PrintPreviewModal type="job" title={preview ? `Job Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
