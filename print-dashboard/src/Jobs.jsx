import React, { useEffect, useState } from 'react';
import './styles.css';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewJobModal, RecordPaymentModal } from './components/Modals';
import { api } from './api/client';
import { shortDate } from './utils/format';
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
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const JOB_STATUSES = ['All', 'In Session', 'Finished', 'Cancelled'];

// Item 2 (Prompt 7): sortable by priority. Weighted so 'high' sorts first
// when sorting "high to low" — matches the same high/medium/low vocabulary
// already used for the progress-bar color and NewJobModal's priority pills.
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

const mapJob = job => ({
  id: job.job_ref || `JOB-${job.id}`,
  backendId: job.id,
  client: job.client_name || 'Walk-in Client',
  title: job.title || 'Untitled job',
  pages: job.pages || 0,
  copies: job.copies || 1,
  status: ['queued', 'printing', 'finishing'].includes(job.status) ? 'in_session' : job.status === 'completed' || job.status === 'ready' ? 'finished' : job.status || 'in_session',
  progress: job.progress || 0,
  // Item 6 (Prompt 7): increment-based progress fields from Prompt 4
  // (Job.completed_count / Job.total_count). Deliberately not clamped here
  // either — a completed count above total (reprints) is a real state, not
  // bad data, matching the backend's own documented stance.
  completedCount: job.completed_count ?? 0,
  totalCount: job.total_count ?? 0,
  due: job.due_date || 'No due date',
  due_date: job.due_date,
  priority: job.priority || 'medium',
  machine_name: job.machine_name,
  service_category: job.service_category,
  // Item 7/8 (Prompt 7): real staff assignment. Backend field
  // (Job.assigned_staff_id -> Staff.name) is being added alongside this
  // frontend change; until then this simply reads undefined and falls back
  // to '-' everywhere it's displayed, so this page doesn't break if deployed
  // slightly ahead of that backend field landing.
  assignedStaffId: job.assigned_staff_id || null,
  assignedStaffName: job.assigned_staff_name || null,
  notes: job.notes,
  totals: job.totals || { total: 0, paid: 0, balance: 0 },
  invoice: job.invoice,
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

function ProgressCell({ job, onUpdateProgress }) {
  const [editing, setEditing] = useState(false);
  const [completed, setCompleted] = useState(job.completedCount);
  const [total, setTotal] = useState(job.totalCount);

  const hasCounts = job.totalCount > 0;
  // Item 6: visual fill is capped at 100% even when completed exceeds total
  // (reprints), but the real numbers are still shown alongside the bar —
  // the cap is purely cosmetic, never applied to the displayed figures.
  const rawPct = hasCounts ? (job.completedCount / job.totalCount) * 100 : job.progress;
  const fillPct = Math.min(rawPct, 100);
  const overCount = hasCounts && job.completedCount > job.totalCount;

  const save = () => {
    onUpdateProgress(job, Number(completed) || 0, Number(total) || 0);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ textAlign: 'center', flexShrink: 0, width: '120px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
          <input type="number" min="0" value={completed} onChange={e => setCompleted(e.target.value)} style={{ width: '38px', padding: '3px', fontSize: '10px', textAlign: 'center', border: '1px solid var(--border-faint)', borderRadius: '4px' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/</span>
          <input type="number" min="0" value={total} onChange={e => setTotal(e.target.value)} style={{ width: '38px', padding: '3px', fontSize: '10px', textAlign: 'center', border: '1px solid var(--border-faint)', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
          <button className="filter-btn active" style={{ padding: '2px 6px', fontSize: '9px' }} onClick={save}>Save</button>
          <button className="filter-btn" style={{ padding: '2px 6px', fontSize: '9px' }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', flexShrink: 0, width: '120px', cursor: 'pointer' }} onClick={() => { setCompleted(job.completedCount); setTotal(job.totalCount); setEditing(true); }} title="Click to update progress">
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        {hasCounts ? `${job.completedCount} of ${job.totalCount}` : 'Progress'}
      </div>
      <div className="fin-bar" style={{ height: '4px' }}>
        <div className={`fin-bar-fill ${job.priority === 'high' ? 'red' : job.priority === 'medium' ? 'warning' : 'teal'}`} style={{ width: `${fillPct}%` }} />
      </div>
      {overCount && <div style={{ fontSize: '8px', color: 'var(--warning)', marginTop: '2px' }}>Reprint</div>}
    </div>
  );
}

function JobRow({ job, onPreview, onEdit, onPayment, onUpdateProgress, onMarkFinished }) {
  const statusConfig = {
    in_session: { label: 'In Session', cls: 'active', accent: 'var(--primary)' },
    finished: { label: 'Finished', cls: 'paid', accent: 'var(--teal)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[job.status] || statusConfig.in_session;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{String(job.id).split('-')[1] || 'JOB'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{job.title}</div>
        <div className="vendor-cat">{job.client} - {job.pages}pp x {job.copies}</div>
      </div>
      <ProgressCell job={job} onUpdateProgress={onUpdateProgress} />
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
      <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Update Payment" onClick={() => onPayment(job)}>
        Payment
      </button>
      {job.status === 'in_session' && (
        <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px', color: 'var(--teal)' }} title="Mark this job as finished" onClick={() => onMarkFinished(job)}>
          Mark Finished
        </button>
      )}
    </div>
  );
}

export default function Jobs() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('none');
  const [preview, setPreview] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [paymentRecord, setPaymentRecord] = useState(null);
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
    const matchesStatus = filter === 'All' || job.status === filter.toLowerCase().replace(' ', '_');
    const matchesSearch = `${job.client} ${job.title} ${job.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  // Item 2 (Prompt 7): sortable by priority, toggling high-to-low / low-to-high.
  // 'none' preserves the backend's own order (created_at desc), so switching
  // back off sorting doesn't require a second fetch.
  const sorted = sortBy === 'none'
    ? filtered
    : [...filtered].sort((a, b) => {
        const diff = (PRIORITY_WEIGHT[a.priority] || 0) - (PRIORITY_WEIGHT[b.priority] || 0);
        return sortBy === 'priority_desc' ? -diff : diff;
      });

  const stats = [
    { label: 'Active Jobs', value: jobs.filter(job => job.status === 'in_session').length, sub: 'Currently processing', icon: D.printer, color: 'primary' },
    { label: 'Outstanding', value: `MK ${jobs.reduce((sum, job) => sum + Number(job.totals?.balance || 0), 0).toLocaleString()}`, sub: 'Job balances', icon: D.clock, color: 'warning' },
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

  const handlePayment = async form => {
    if (!paymentRecord?.backendId) return;
    try {
      await api.recordJobPayment(paymentRecord.backendId, {
        amount: Number(form.amount || 0),
        paid_on: form.date,
        method: form.method,
        payment_ref: form.ref,
        notes: form.notes,
      });
      setPaymentRecord(null);
      notify('Payment recorded');
      loadJobs();
    } catch (paymentError) {
      notify(paymentError.message || 'Could not record payment', 'error');
    }
  };

  // Item 6: increment-based progress entry, e.g. "20 of 40 diaries done".
  // Hits the dedicated PATCH /api/jobs/<id>/progress route added in Prompt 4
  // rather than the general update_job() route, so this doesn't need to
  // resend the whole job payload just to bump a counter.
  const handleUpdateProgress = async (job, completedCount, totalCount) => {
    try {
      await api.updateJobProgress(job.backendId, { completed_count: completedCount, total_count: totalCount });
      notify('Progress updated');
      loadJobs();
    } catch (progressError) {
      notify(progressError.message || 'Could not update progress', 'error');
    }
  };

  // Item 3: Mark Finished. Reuses the existing update_job() route (status
  // field is already in its update allowlist) rather than adding a new
  // backend endpoint for what's just a status transition.
  const handleMarkFinished = async job => {
    try {
      await api.updateJob(job.backendId, { status: 'finished', progress: 100 });
      notify(`${job.id} marked as finished`);
      loadJobs();
    } catch (finishError) {
      notify(finishError.message || 'Could not mark job as finished', 'error');
    }
  };

  // Item 8: Download Today's To-Do List — printable list of all in-session
  // jobs regardless of due date (per this session's confirmed scope), one
  // staff field per job. Uses the same HTML print-dialog export mechanism
  // as Audit Log/Archive/Petty Cash, for visual and mechanical consistency
  // across the app's "download a register" actions rather than introducing
  // a fourth different export approach.
  const downloadTodoList = () => {
    const activeJobs = jobs.filter(job => job.status === 'in_session');
    const rows = activeJobs.map(job => `
      <tr>
        <td>${job.id}</td>
        <td>${job.client}</td>
        <td>${job.title}</td>
        <td>${job.pages}pp x ${job.copies}</td>
        <td style="text-transform:capitalize">${job.priority}</td>
        <td>${job.due}</td>
        <td>${job.assignedStaffName || '________________'}</td>
      </tr>
    `).join('');
    const htmlContent = `
      <div class="top">
        <div><h1>T-Tech Today's To-Do List</h1><div>${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''}</div></div>
        <div>${shortDate(new Date())}</div>
      </div>
      <table>
        <thead>
          <tr><th>Job Ref</th><th>Client</th><th>Job Title</th><th>Specs</th><th>Priority</th><th>Due</th><th>Assigned Staff</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No active jobs right now.</td></tr>'}</tbody>
      </table>
    `;
    const blob = new Blob([`<!doctype html><html><head><title>Today's To-Do List</title><style>body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; } table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; } th { background: #f8fafc; color: #475569; } .top { display: flex; justify-content: space-between; margin-bottom: 16px; }</style></head><body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo-list-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Jobs" subtitle="Manage print production queue" actionLabel="New Job" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button className="notif-btn" style={{ width: 'auto', padding: '0 12px', height: '30px', gap: '6px', display: 'flex', alignItems: 'center', fontSize: '10px', fontWeight: 600 }} title="Download Today's To-Do List" onClick={downloadTodoList}>
          <Icon d={D.download} size={12} /> Download Today's To-Do List
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <ModuleToolbar filters={JOB_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          title="Sort by priority"
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)', marginBottom: '14px' }}
        >
          <option value="none">Default Order</option>
          <option value="priority_desc">Priority: High to Low</option>
          <option value="priority_asc">Priority: Low to High</option>
        </select>
      </div>
      <RegisterCard title="Production Queue" countLabel={`${sorted.length} job${sorted.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="JOB" emptyMessage="No jobs match your filters.">
        {sorted.map(job => (
          <JobRow
            key={job.id}
            job={job}
            onPreview={setPreview}
            onEdit={setEditRecord}
            onPayment={setPaymentRecord}
            onUpdateProgress={handleUpdateProgress}
            onMarkFinished={handleMarkFinished}
          />
        ))}
      </RegisterCard>
      <NewJobModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PrintPreviewModal type="job" title={preview ? `Job Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
      <RecordPaymentModal
        isOpen={Boolean(paymentRecord)}
        initialData={paymentRecord}
        onClose={() => setPaymentRecord(null)}
        onSave={handlePayment}
      />
      <ModuleToast toast={toast} />
    </main>
  );
}