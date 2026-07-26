import React, { useEffect, useState } from 'react';
import './styles.css';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewJobModal, RecordPaymentModal, JobProgressModal } from './components/Modals';
import { downloadTablePDF } from './components/TablePDF';
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
  machine_id: job.machine_id,
  service_category: job.service_category,
  // Item 7/8 (Prompt 7): real staff assignment. Backend field
  // (Job.assigned_staff_id -> Staff.name) is being added alongside this
  // frontend change; until then this simply reads undefined and falls back
  // to '-' everywhere it's displayed, so this page doesn't break if deployed
  // slightly ahead of that backend field landing.
  assignedStaffId: job.assigned_staff_id || null,
  assignedStaffName: job.assigned_staff_name || null,
  // Item 6 (backend priority list): client phone, now joined by the backend
  // (services/jobs.py::serialize_job()), for the To-Do List export below.
  clientPhone: job.client_phone || null,
  notes: job.notes,
  totals: job.totals || { total: 0, paid: 0, balance: 0 },
  invoice: job.invoice,
  line_items: job.invoice?.line_items || job.line_items || [],
  discount_amount: job.invoice?.discount_amount ?? job.discount_amount ?? 0,
  // Question 4 ("Can we release it?"): payment status, read from the
  // backend's own derived invoice status (not_paid/partial/paid) rather
  // than recomputed here from totals — invoice_status_from_totals() in
  // services/invoices.py is the single source of truth for this label.
  paymentStatus: job.invoice?.status || (Number(job.totals?.balance) > 0 ? 'not_paid' : job.totals ? 'paid' : 'not_paid'),
});

function jobPayload(form, fallback = {}) {
  const lineItems = (form.items || []).map((item, index) => ({
    position: index + 1,
    description: item.desc || item.description || form.title || 'Print service',
    quantity: Number(item.qty ?? item.quantity ?? 1) || 1,
    unit_price: Number(item.rate ?? item.unit_price ?? 0) || 0,
    unit: item.unit || 'item',
  }));
  const totalCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    client_name: form.client || fallback.client || 'Walk-in Client',
    title: form.title || fallback.title || 'New print job',
    priority: form.priority || fallback.priority || 'medium',
    due_date: form.due || fallback.due_date || null,
    machine_id: form.machineId || fallback.machine_id || null,
    service_category: fallback.service_category || form.specs?.[0],
    assigned_staff_id: form.assignedStaffId || fallback.assignedStaffId || null,
    notes: [form.notes, form.specs?.join(', ')].filter(Boolean).join('\n'),
    line_items: lineItems,
    discount_amount: Number(form.discount || 0),
    total_count: totalCount || fallback.totalCount || fallback.total_count || 0,
  };
}

function ProgressCell({ job, onOpenProgress }) {
  const hasCounts = job.totalCount > 0;
  // Item 6: visual fill is capped at 100% even when completed exceeds total
  // (reprints), but the real numbers are still shown alongside the bar —
  // the cap is purely cosmetic, never applied to the displayed figures.
  const rawPct = hasCounts ? (job.completedCount / job.totalCount) * 100 : job.progress;
  const fillPct = Math.min(rawPct, 100);
  const overCount = hasCounts && job.completedCount > job.totalCount;

  // Inline two-input editing replaced by JobProgressModal (opens with the
  // job's tagged service/amount already shown, so the user isn't re-entering
  // context they've already set elsewhere — just adjusting the one figure
  // that changes day to day).
  return (
    <div style={{ textAlign: 'center', flexShrink: 0, width: '120px', cursor: 'pointer' }} onClick={() => onOpenProgress(job)} title="Click to update progress">
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

// Question 4 ("Can we release it?"): Paid/Partial/Unpaid badge. Same
// vocabulary and status-badge CSS classes Invoices.jsx already uses for the
// same underlying not_paid/partial/paid values, so this reads consistently
// with the rest of the app rather than inventing a second payment-status
// visual language just for Jobs.
const PAYMENT_STATUS_CONFIG = {
  not_paid: { label: 'Unpaid', cls: 'overdue' },
  partial: { label: 'Partial', cls: 'pending' },
  paid: { label: 'Paid', cls: 'paid' },
};

function PaymentStatusBadge({ status }) {
  const cfg = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.not_paid;
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// The row is laid out around the five questions the Jobs page must answer,
// left to right: what we're making, what's happening, who it's for, and
// (Can we release it?) payment status + balance. "What can I do next?"
// stays as the action buttons at the end, unchanged in spirit from before.
function JobRow({ job, onPreview, onEdit, onPayment, onOpenProgress, onMarkFinished }) {
  const statusConfig = {
    in_session: { label: 'In Session', cls: 'active', accent: 'var(--primary)' },
    finished: { label: 'Finished', cls: 'paid', accent: 'var(--teal)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[job.status] || statusConfig.in_session;
  const balance = Number(job.totals?.balance || 0);

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px', flexWrap: 'wrap', rowGap: '8px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{String(job.id).split('-')[1] || 'JOB'}</div>

      {/* Q1: What are we making? Services / quantity / notes indicator. */}
      <div className="vendor-info">
        <div className="vendor-name">{job.title}</div>
        <div className="vendor-cat">
          {job.totalCount > 0 ? `${job.totalCount} units` : `${job.pages}pp x ${job.copies}`}
          {job.notes ? ' - has notes' : ''}
        </div>
      </div>

      {/* Q2: What is happening? Status, progress, machine, operator. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '150px', flexShrink: 0 }}>
        <span className={`status-badge ${cfg.cls}`} style={{ width: 'fit-content' }}>{cfg.label}</span>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{job.machine_name || 'No machine assigned'}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{job.assignedStaffName || 'Unassigned'}</div>
      </div>

      <ProgressCell job={job} onOpenProgress={onOpenProgress} />

      {/* Q3: Who is it for? Customer, phone, due date. */}
      <div className="vendor-right" style={{ minWidth: '130px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-body)' }}>{job.client}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{job.clientPhone || 'No phone on file'}</div>
        <div className="activity-time" style={{ marginTop: '2px' }}>Due {job.due}</div>
      </div>

      {/* Q4: Can we release it? Payment status + remaining balance. */}
      <div style={{ textAlign: 'right', minWidth: '110px', flexShrink: 0 }}>
        <PaymentStatusBadge status={job.paymentStatus} />
        <div style={{ fontSize: '10px', color: balance > 0 ? 'var(--red)' : 'var(--teal)', marginTop: '4px', fontWeight: 600 }}>
          {balance > 0 ? `MK ${balance.toLocaleString()} owed` : 'Fully paid'}
        </div>
      </div>

      {/* Q5: What can I do next? */}
      <button className="notif-btn" style={{ width: '24px', height: '24px', color: 'black' }} title="Preview" onClick={() => onPreview(job)}>
        <Icon d={D.more} size={12} />
      </button>
      <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit" onClick={() => onEdit(job)}>
        Edit
      </button>
      <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Record Payment" onClick={() => onPayment(job)}>
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
  const [progressJob, setProgressJob] = useState(null);
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
  // resend the whole job payload just to bump a counter. Now the save
  // handler for JobProgressModal rather than inline ProgressCell state.
  const handleSaveProgress = async (job, completedCount, totalCount) => {
    try {
      await api.updateJobProgress(job.backendId, { completed_count: completedCount, total_count: totalCount });
      notify('Progress updated');
      setProgressJob(null);
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
  // staff field per job. Now a real .pdf via TablePDF.jsx (react-pdf) rather
  // than an HTML file that only opened window.print() and called itself a
  // PDF — Wayne's explicit ask this session.
  const downloadTodoList = async () => {
    const activeJobs = jobs.filter(job => job.status === 'in_session');
    // Item 6 (backend priority list): client phone, amount to pay (total),
    // amount paid so far, and quantity (completedCount/totalCount when
    // tracked, else pages x copies) on the printable to-do list.
    const columns = [
      { label: 'Job Ref', key: 'id', flex: 1.1 },
      { label: 'Client', key: 'client', flex: 1.4 },
      { label: 'Phone', key: 'clientPhone', flex: 1.1 },
      { label: 'Job Title', key: 'title', flex: 1.6 },
      {
        label: 'Qty', flex: 1,
        render: job => (job.totalCount > 0 ? `${job.completedCount} of ${job.totalCount}` : `${job.pages}pp x ${job.copies}`),
      },
      { label: 'Priority', flex: 0.8, render: job => job.priority?.charAt(0).toUpperCase() + job.priority?.slice(1) },
      { label: 'Due', key: 'due', flex: 0.9 },
      { label: 'Amount to Pay', flex: 1.1, align: 'right', render: job => `MK ${Number(job.totals?.total || 0).toLocaleString()}` },
      { label: 'Amount Paid', flex: 1.1, align: 'right', render: job => `MK ${Number(job.totals?.paid || 0).toLocaleString()}` },
      { label: 'Assigned Staff', flex: 1.3, render: job => job.assignedStaffName || '________________' },
    ];
    await downloadTablePDF({
      title: "Today's To-Do List",
      subtitle: `${shortDate(new Date())} - ${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''}`,
      columns,
      rows: activeJobs.map(job => ({ ...job, __key: job.id })),
      filename: `todo-list-${new Date().toISOString().split('T')[0]}.pdf`,
    });
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
            onOpenProgress={setProgressJob}
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
      <PrintPreviewModal
        type="job"
        title={preview ? `Job Preview: ${preview.id}` : ''}
        data={preview}
        onClose={() => setPreview(null)}
        actions={preview && (
          <>
            <button className="filter-btn" style={{ background: '#3A506B', color: '#fff', borderRadius: '999px', padding: '8px 14px', border: 'none' }} onClick={() => { setProgressJob(preview); setPreview(null); }}>Update Progress</button>
            <button className="filter-btn" style={{ background: '#3A506B', color: '#fff', borderRadius: '999px', padding: '8px 14px', border: 'none' }} onClick={() => { setPaymentRecord(preview); setPreview(null); }}>Record Payment</button>
            <button className="filter-btn" style={{ background: '#3A506B', color: '#fff', borderRadius: '999px', padding: '8px 14px', border: 'none' }} onClick={() => { setEditRecord(preview); setPreview(null); }}>Edit Job</button>
            {preview.status === 'in_session' && (
              <button className="filter-btn" style={{ background: '#3A506B', color: '#fff', borderRadius: '999px', padding: '8px 14px', border: 'none' }} onClick={() => { handleMarkFinished(preview); setPreview(null); }}>Mark Finished</button>
            )}
          </>
        )}
      />
      <RecordPaymentModal
        isOpen={Boolean(paymentRecord)}
        initialData={paymentRecord}
        onClose={() => setPaymentRecord(null)}
        onSave={handlePayment}
      />
      <JobProgressModal
        isOpen={Boolean(progressJob)}
        job={progressJob}
        onClose={() => setProgressJob(null)}
        onSave={handleSaveProgress}
      />
      <ModuleToast toast={toast} />
    </main>
  );
}