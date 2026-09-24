import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import { PrintPreviewModal } from './components/PrintLayouts';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { shareText } from './utils/downloads';
import { calculateTotal } from './utils/calculateTotal';
import { useDeviceIdentity } from './hooks/useDeviceIdentity';
import {
  Icon,
  ImportedDot,
  ModuleHeader,
  ModuleToast,
  ModuleToolbar,
  DetailBreakdownModal,
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
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

// ── Merge note (T-Tech2 Merge 1) ──────────────────────────────────────────
// Receivables.jsx has been deleted. Its filter set is reproduced exactly:
// "Outstanding" = invoice.status in ['sent', 'overdue'] (Receivables.jsx's
// original filter was ['sent', 'overdue', 'paid'] for its full list, with
// 'sent' relabeled "Due" in the UI — that relabel is preserved below, gated
// on which tab is active rather than which file it lives in).
const TABS = ['Outstanding', 'All', 'Paid', 'Partial'];

const TAB_STATUS_SETS = {
  Outstanding: ['not_paid', 'partial', 'sent', 'overdue'],
  All: null, // no filter
  Paid: ['paid'],
  Partial: ['partial'],
};

function mapInvoice(invoice) {
  const lineItems = invoice.line_items || [];
  // Item 4 (Prompt 7): read total/paid/balance straight from the backend's
  // own invoice.totals (services/invoices.py::invoice_totals()), rather than
  // recomputing from line items client-side. The prior calculateTotal(lineItems)
  // approach silently ignored discount_amount and never carried paid/balance
  // at all, so "Balance ${inv.amount}" in the reminder message below was
  // actually showing the full total, not what's still owed — this fix
  // corrects both the summary stat and that per-invoice reminder text.
  const totals = invoice.totals || {};
  const total = Number(totals.total ?? calculateTotal(lineItems));
  const paid = Number(totals.paid ?? 0);
  const balance = Number(totals.balance ?? total);
  return {
    backendId: invoice.id,
    id: invoice.invoice_ref || `INV-${invoice.id}`,
    client: invoice.client_name || 'Walk-in Client',
    title: invoice.title || 'Untitled invoice',
    amount: money(total, invoice.currency || 'MWK'),
    amountValue: total,
    paidValue: paid,
    balanceValue: balance,
    paidLabel: money(paid, invoice.currency || 'MWK'),
    balanceLabel: money(balance, invoice.currency || 'MWK'),
    status: invoice.status || 'draft',
    issued: compactDate(invoice.issued_on),
    due: compactDate(invoice.due_on),
    issued_on: invoice.issued_on,
    due_on: invoice.due_on,
    paid: compactDate(invoice.paid_on),
    line_items: lineItems,
    notes: invoice.notes,
    sourceProposalRef: invoice.source_proposal_ref || null,
    discount_amount: Number(invoice.discount_amount || 0),
    deviceId: invoice.device_id,
  };
}

// Shared row renderer. `onOutstandingTab` gates the Receivables-style
// relabeling (sent -> "Due") so it only applies where that framing made
// sense — it stays off on the "All" tab where showing the true status
// ("Sent") is more accurate for a full-history view.
function InvoiceRow({ inv, onPreview, onOutstandingTab, currentDeviceId }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    not_paid: { label: onOutstandingTab ? 'Due' : 'Not Paid', cls: 'current', accent: 'var(--secondary)' },
    partial: { label: 'Partial', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: onOutstandingTab ? 'Due' : 'Sent', cls: onOutstandingTab ? 'current' : 'current', accent: 'var(--secondary)' },
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
        <div className="vendor-name">{inv.title}<ImportedDot recordDeviceId={inv.deviceId} currentDeviceId={currentDeviceId} /></div>
        <div className="vendor-cat">{inv.client} - Due: {inv.due || '-'}</div>
        {inv.sourceProposalRef && (
          <div className="activity-time" style={{ marginTop: '2px' }}>Converted from {inv.sourceProposalRef}</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '110px' }}>
        <div className="activity-amount">{inv.amount}</div>
        <div className="activity-time" style={{ color: 'var(--teal)', fontWeight: 600 }}>Paid: {inv.paidLabel}</div>
        {/* Item 4 (Prompt 7): show what's still owed alongside the total,
            distinct from "Paid" status badges — a partially-paid invoice
            should visibly show its remaining balance, not just its total. */}
        {inv.balanceValue > 0 && inv.status !== 'draft' && inv.status !== 'cancelled' && (
          <div className="activity-time" style={{ color: 'var(--warning)', fontWeight: 600 }}>Owed: {inv.balanceLabel}</div>
        )}
        <div className="activity-time">Issued: {inv.issued || '-'}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        {inv.status === 'sent' && (
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Send Reminder" onClick={() => shareText(`Invoice reminder ${inv.id}`, `Reminder for ${inv.client}: ${inv.title} is due ${inv.due}. Balance ${inv.balanceLabel}.`)}>
            <Icon d={D.send} size={11} />
          </button>
        )}
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(inv)}>
          <Icon d={D.eye} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download PDF" onClick={() => downloadInvoicePDF(inv)}>
          <Icon d={D.download} size={11} />
        </button>
      </div>
    </div>
  );
}

export default function Invoices() {
  // Default tab is "Outstanding" (Option C) — matches the owner's daily
  // use pattern of checking what's unpaid, not browsing full history.
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [statDetail, setStatDetail] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useModuleToast();
  const deviceIdentity = useDeviceIdentity();

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

  const statusSet = TAB_STATUS_SETS[tab];
  const filtered = invoices.filter(invoice => {
    const query = search.toLowerCase();
    const matchesTab = !statusSet || statusSet.includes(invoice.status);
    const matchesSearch = `${invoice.client} ${invoice.title} ${invoice.id}`.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const onOutstandingTab = tab === 'Outstanding';

  // Stats reflect the ACTIVE tab, not always the full unfiltered total.
  // On "Outstanding" the headline is "Total Outstanding," not "Total (All)."
  // Item 4 (Prompt 7): sums balanceValue (what's actually still owed, from
  // the backend's own paid/total split), not amountValue (the full invoice
  // total) — a partially-paid invoice's remaining balance is less than its
  // total, and the prior version overstated "outstanding" by ignoring that.
  const outstandingTotal = invoices.filter(i => ['not_paid', 'partial', 'sent', 'overdue'].includes(i.status)).reduce((sum, i) => sum + i.balanceValue, 0);
  const overdueList = invoices.filter(i => i.status === 'overdue');
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amountValue, 0);
  const allTotal = invoices.reduce((sum, i) => sum + i.amountValue, 0);
  const allOwed = invoices.reduce((sum, i) => sum + i.balanceValue, 0);
  const invoiceRows = list => list.map(invoice => ({
    ref: invoice.id,
    title: invoice.title,
    party: invoice.client,
    amount: invoice.balanceValue > 0 ? invoice.balanceValue : invoice.amountValue,
    date: invoice.due_on || invoice.issued_on,
    status: invoice.status,
  }));

  const statsByTab = {
    Outstanding: [
      { label: 'Total Outstanding', value: money(invoiceStats?.outstanding ?? outstandingTotal), sub: 'Unpaid invoices', icon: D.invoices, color: 'warning', details: { title: 'Total Outstanding', sections: [{ title: 'Unpaid / Partial Invoices', rows: invoiceRows(invoices.filter(i => ['not_paid', 'partial', 'sent', 'overdue'].includes(i.status))) }] } },
      { label: 'Overdue', value: String(invoiceStats?.overdue_count ?? overdueList.length), sub: 'Past due invoices', icon: D.alert, color: 'red', details: { title: 'Overdue Invoices', sections: [{ title: 'Past Due', rows: invoiceRows(overdueList) }] } },
      { label: 'Due Amount', value: money(outstandingTotal), sub: `${filtered.length} invoices`, icon: D.clock, color: 'secondary', details: { title: 'Due Amount', sections: [{ title: 'Current Filter', rows: invoiceRows(filtered) }] } },
      { label: 'Paid This Month', value: money(invoiceStats?.paid), sub: 'Cash collected', icon: D.check, color: 'teal', details: { title: 'Paid Invoices', sections: [{ title: 'Paid', rows: invoiceRows(invoices.filter(i => i.status === 'paid')) }] } },
    ],
    All: [
      { label: 'Total Invoiced', value: money(allTotal), sub: 'All statuses', icon: D.invoices, color: 'primary', details: { title: 'Total Invoiced', sections: [{ title: 'All Invoices', rows: invoiceRows(invoices) }] } },
      { label: 'Total Owed', value: money(allOwed), sub: 'Total minus payments received', icon: D.clock, color: 'warning', details: { title: 'Total Owed', sections: [{ title: 'Invoices With Balance', rows: invoiceRows(invoices.filter(i => i.balanceValue > 0)) }] } },
      { label: 'Overdue', value: String(overdueList.length), sub: 'Past due invoices', icon: D.alert, color: 'red', details: { title: 'Overdue Invoices', sections: [{ title: 'Past Due', rows: invoiceRows(overdueList) }] } },
      { label: 'Invoice Count', value: String(invoices.length), sub: 'All records', icon: D.invoices, color: 'secondary', details: { title: 'Invoice Count', sections: [{ title: 'All Invoices', rows: invoiceRows(invoices) }] } },
    ],
    Paid: [
      { label: 'Total Paid', value: money(paidTotal), sub: 'Collected', icon: D.check, color: 'teal' },
      { label: 'Paid This Month', value: money(invoiceStats?.paid), sub: 'Cash collected', icon: D.check, color: 'teal' },
      { label: 'Paid Count', value: String(filtered.length), sub: 'Invoices settled', icon: D.invoices, color: 'primary' },
      { label: 'Avg. Value', value: money(filtered.length ? paidTotal / filtered.length : 0), sub: 'Per paid invoice', icon: D.invoices, color: 'secondary' },
    ],
    Partial: [
      { label: 'Partial Value', value: money(filtered.reduce((sum, i) => sum + i.amountValue, 0)), sub: `${filtered.length} invoices`, icon: D.clock, color: 'secondary' },
      { label: 'Partial Count', value: String(filtered.length), sub: 'Installments started', icon: D.invoices, color: 'warning' },
      { label: 'Total Invoiced', value: money(allTotal), sub: 'All statuses', icon: D.invoices, color: 'primary' },
      { label: 'Overdue', value: String(overdueList.length), sub: 'Past due invoices', icon: D.alert, color: 'red' },
    ],
  };
  const stats = statsByTab[tab];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Invoices" subtitle="Derived from jobs and payment history" />
      <StatsGrid stats={stats} onOpenDetails={setStatDetail} />
      <ModuleToolbar filters={TABS} filter={tab} setFilter={setTab} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Invoice Register" countLabel={`${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="INV" emptyMessage="No invoices match your filters.">
        {filtered.map(inv => <InvoiceRow key={inv.id} inv={inv} onPreview={setPreview} onOutstandingTab={onOutstandingTab} currentDeviceId={deviceIdentity?.device_id} />)}
      </RegisterCard>
      <PrintPreviewModal type="invoice" title={preview ? `Invoice Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
      <DetailBreakdownModal detail={statDetail} onClose={() => setStatDetail(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
