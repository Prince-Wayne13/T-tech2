import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewInvoiceModal } from './components/Modals';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { shareText } from './utils/downloads';
import { calculateTotal } from './utils/calculateTotal';
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
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
};

const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

function mapInvoice(invoice) {
  const lineItems = invoice.line_items || [];
  const total = calculateTotal(lineItems);
  return {
    backendId: invoice.id,
    id: invoice.invoice_ref || `INV-${invoice.id}`,
    client: invoice.client_name || 'Walk-in Client',
    title: invoice.title || 'Untitled invoice',
    amount: money(total, invoice.currency || 'MWK'),
    amountValue: total,
    status: invoice.status || 'draft',
    issued: compactDate(invoice.issued_on),
    due: compactDate(invoice.due_on),
    issued_on: invoice.issued_on,
    due_on: invoice.due_on,
    paid: compactDate(invoice.paid_on),
    line_items: lineItems,
    notes: invoice.notes,
  };
}

function InvoiceRow({ inv, onPreview, onEdit }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
    cancelled: { label: 'Cancelled', cls: 'overdue', accent: 'var(--text-muted)' },
  };
  const cfg = statusConfig[inv.status] || statusConfig.draft;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>
        {String(inv.id).split('-')[1] || 'INV'}
      </div>
      <div className="vendor-info">
        <div className="vendor-name">{inv.title}</div>
        <div className="vendor-cat">{inv.client} - Due: {inv.due || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">{inv.amount}</div>
        <div className="activity-time">Issued: {inv.issued || '-'}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        {inv.status === 'sent' && (
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Send Reminder" onClick={() => shareText(`Invoice reminder ${inv.id}`, `Reminder for ${inv.client}: ${inv.title} is due ${inv.due}. Balance ${inv.amount}.`)}>
            <Icon d={D.send} size={11} />
          </button>
        )}
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(inv)}>
          <Icon d={D.invoices} size={11} />
        </button>
        <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit" onClick={() => onEdit(inv)}>
          Edit
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download PDF" onClick={() => downloadInvoicePDF(inv)}>
          <Icon d={D.download} size={11} />
        </button>
      </div>
    </div>
  );
}

function invoicePayload(form, fallback = {}) {
  const lineItems = (form.items || []).map(item => ({
    description: item.desc || item.description || 'Print service',
    quantity: Number(item.qty || item.quantity || 1),
    unit_price: Number(item.rate || item.unit_price || 0),
    unit: 'item',
  }));

  return {
    client_name: form.client || fallback.client || 'Walk-in Client',
    title: form.title || fallback.title || form.items?.[0]?.desc || 'Print invoice',
    due_on: form.due || null,
    notes: form.notes,
    status: fallback.status || 'draft',
    line_items: lineItems.length ? lineItems : [{ description: 'Print service', quantity: 1, unit_price: 0, unit: 'item' }],
  };
}

export default function Invoices() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadInvoices = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.invoices('?per_page=200'), api.invoiceStats()])
      .then(([invoiceResponse, statsResponse]) => {
        setInvoices((invoiceResponse.items || []).map(mapInvoice));
        setInvoiceStats(statsResponse);
      })
      .catch(() => setError('Could not load invoices. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filtered = invoices.filter(invoice => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || invoice.status === filter.toLowerCase();
    const matchesSearch = `${invoice.client} ${invoice.title} ${invoice.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Outstanding', value: money(invoiceStats?.outstanding), sub: 'Unpaid invoices', icon: D.invoices, color: 'warning' },
    { label: 'Overdue', value: String(invoiceStats?.overdue_count || 0), sub: 'Past due invoices', icon: D.alert, color: 'red' },
    { label: 'Paid This Month', value: money(invoiceStats?.paid), sub: 'Cash collected', icon: D.check, color: 'teal' },
    { label: 'Draft Value', value: money(invoiceStats?.draft), sub: `${invoiceStats?.invoice_count || filtered.length} invoices`, icon: D.clock, color: 'secondary' },
  ];

  const handleSave = async form => {
    try {
      const saved = editRecord?.backendId
        ? await api.updateInvoice(editRecord.backendId, invoicePayload(form, editRecord))
        : await api.createInvoice(invoicePayload(form));

      setShowEntry(false);
      setEditRecord(null);
      setPreview(mapInvoice(saved));
      notify(editRecord ? 'Invoice updated' : 'Invoice created');
      loadInvoices();
    } catch (saveError) {
      notify(saveError.message || 'Could not save invoice', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Invoices" subtitle="Track billing & payments" actionLabel="New Invoice" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={INVOICE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Invoice Register" countLabel={`${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="INV" emptyMessage="No invoices match your filters.">
        {filtered.map(inv => <InvoiceRow key={inv.id} inv={inv} onPreview={setPreview} onEdit={setEditRecord} />)}
      </RegisterCard>
      <NewInvoiceModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PrintPreviewModal type="invoice" title={preview ? `Invoice Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
