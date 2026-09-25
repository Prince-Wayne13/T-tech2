// path: src/Quotations.jsx

import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewQuotationModal, ClientMatchModal } from './components/Modals';
import { DetailBreakdownModal, Icon, ImportedDot, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';
import { downloadQuotationPDF } from './components/InvoicePDF';
import { resolveClientMatch } from './utils/clientMatch';
import { useDeviceIdentity } from './hooks/useDeviceIdentity';

const D = {
  ...STANDARD_ICONS,
  quotations: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

// Status vocabulary matches the backend Quotation.status field (draft/sent/accepted/declined).
// This replaces the previous frontend-only fake set (draft/sent/viewed/approved/rejected),
// which had no backend counterpart to sync against. Flagged as a deviation in dev-log.md —
// this is a visible UI behavior change (filter pills, badge labels), not a pure plumbing fix.
const QUOTATION_STATUSES = ['All', 'Draft', 'Sent', 'Accepted', 'Declined'];

function QuotationRow({ prop, onPreview, onAccept, onSend, onDecline, onEdit, currentDeviceId }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    accepted: { label: 'Accepted', cls: 'paid', accent: 'var(--teal)' },
    declined: { label: 'Declined', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[prop.status] || statusConfig.draft;
  const total = prop.totals?.total ?? 0;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{prop.quotation_ref?.split('-')[1] || 'PR'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{prop.title}<ImportedDot recordDeviceId={prop.device_id} currentDeviceId={currentDeviceId} /></div>
        <div className="vendor-cat">{prop.client_name} - Valid until {prop.valid_until || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">MK {total.toLocaleString()}</div>
        <div className="activity-time">{prop.quotation_ref}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        {prop.status === 'draft' && (
          <>
            <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit Draft" onClick={() => onEdit(prop)}>
              Edit
            </button>
            <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Mark as Sent to Client" onClick={() => onSend(prop)}>
              Send
            </button>
          </>
        )}
        {prop.status === 'sent' && (
          <>
            <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Accept & Convert to Invoice" onClick={() => onAccept(prop)}>
              <Icon d={D.check} size={11} />
            </button>
            <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Mark as Declined" onClick={() => onDecline(prop)}>
              Decline
            </button>
          </>
        )}
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(prop)}><Icon d={D.eye} size={11} /></button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download PDF" onClick={() => downloadQuotationPDF(prop)}><Icon d={D.download} size={11} /></button>
      </div>
    </div>
  );
}

export default function Quotations() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [statDetail, setStatDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Item 6: mirrors Jobs.jsx's clientMatch state - holds { form, match }
  // while a "Did you mean X?" prompt is shown mid-save, null otherwise.
  const [clientMatch, setClientMatch] = useState(null);
  const { toast, notify } = useModuleToast();
  const deviceIdentity = useDeviceIdentity();

  const loadQuotations = () => {
    setLoading(true);
    setError(null);
    api.quotations('?per_page=200')
      .then(response => setQuotations(response.items || []))
      .catch(() => setError('Could not load quotations. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuotations(); }, []);

  const filtered = quotations.filter(quotation => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || quotation.status === filter.toLowerCase();
    const matchesSearch = `${quotation.client_name} ${quotation.title} ${quotation.quotation_ref}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });
  const totalValue = quotations.reduce((sum, quotation) => sum + (quotation.totals?.total ?? 0), 0);
  const accepted = quotations.filter(quotation => quotation.status === 'accepted');
  const pending = quotations.filter(quotation => ['draft', 'sent'].includes(quotation.status));
  const quotationRows = list => list.map(quotation => ({
    ref: quotation.quotation_ref,
    title: quotation.title,
    party: quotation.client_name,
    amount: Number(quotation.totals?.total || 0),
    date: quotation.valid_until || quotation.created_at,
    status: quotation.status,
  }));
  const stats = [
    { label: 'Total Value', value: `MK ${totalValue.toLocaleString()}`, sub: 'All quotations', icon: D.quotations, color: 'primary', details: { title: 'Total Quotation Value', sections: [{ title: 'All Quotations', rows: quotationRows(quotations) }] } },
    { label: 'Pending Review', value: String(pending.length), sub: 'Awaiting response', icon: D.clock, color: 'warning', details: { title: 'Pending Quotations', sections: [{ title: 'Draft / Sent', rows: quotationRows(pending) }] } },
    { label: 'Win Rate', value: `${Math.round((accepted.length / Math.max(quotations.length, 1)) * 100)}%`, sub: 'Current pipeline', icon: D.check, color: 'teal', details: { title: 'Accepted Quotations', sections: [{ title: 'Accepted', rows: quotationRows(accepted) }, { title: 'All Quotations', rows: quotationRows(quotations) }] } },
    { label: 'Avg. Value', value: `MK ${Math.round(totalValue / Math.max(quotations.length, 1)).toLocaleString()}`, sub: 'Per quotation', icon: D.quotations, color: 'secondary', details: { title: 'Average Quotation Value', sections: [{ title: 'All Quotations', rows: quotationRows(quotations) }] } },
  ];

  // Item 6: pulled out of handleSave so it can be called with a resolved
  // client_id, same split as Jobs.jsx's jobPayload/commitJobSave.
  const buildQuotationPayload = (form, clientId) => ({
    client_name: form.client || 'Walk-in Client',
    // Item 6: real Client link, resolved by handleSave below before this
    // is called. null means no client typed / lookup skipped, same as
    // plain-text-only behavior before this item.
    client_id: clientId,
    title: form.title || 'New quotation draft',
    line_items: (form.items || []).map((item, index) => {
      const quantity = Number(item.qty ?? item.quantity ?? 1) || 1;
      const rate = Number(item.rate ?? item.unit_price ?? 0) || 0;
      const amount = Number(item.amount ?? item.line_total ?? 0) || 0;
      const amountDerivedRate = amount > 0 && quantity > 0 ? amount / quantity : 0;
      return {
        position: index + 1,
        description: item.desc || item.description || 'Print service',
        quantity,
        unit_price: rate || amountDerivedRate,
        unit: item.unit || 'item',
        // Build decision #5: each line carries its own machine, set
        // by Modals.jsx's handleServiceSelect from the picked
        // service's category (matched against ProductionMachine.
        // category) -- carried onto the converted Job's invoice by
        // accept_quotation() in routes/quotations.py.
        machine_id: item.machineId || item.machine_id || null,
      };
    }),
    valid_until: form.validUntil || null,
    // The real date this quotation happened, as typed into the "Quotation
    // Date" box -- separate from valid_until above (the expiry date).
    work_date: form.workDate || null,
    contact: form.contact,
    notes: form.notes,
    status: editRecord?.status || 'draft',
    discount_amount: Number(form.discount || 0),
    // Internal-only fields (Job/Quotation parity) -- accept_quotation()
    // carries all of these onto the Job it creates.
    priority: form.priority,
    assigned_staff_id: form.assignedStaffId || null,
    // Build decision #5: "Quotations currently have no machine field
    // at all, so this is also adding that concept there for the
    // first time." Job-level summary field, derived from whichever
    // service line most recently set form.machineId.
    machine_id: form.machineId || null,
  });

  const commitQuotationSave = (form, clientId) => {
    const payload = buildQuotationPayload(form, clientId);
    const request = editRecord?.id
      ? api.updateQuotation(editRecord.id, payload)
      : api.createQuotation(payload);
    request
      .then(saved => {
        setShowEntry(false);
        setEditRecord(null);
        setClientMatch(null);
        setPreview(saved);
        notify(editRecord ? 'Quotation updated' : 'Quotation draft added');
        loadQuotations();
      })
      .catch(() => notify(editRecord ? 'Could not update quotation.' : 'Could not save quotation. Check the backend connection.'));
  };

  const handleSave = async form => {
    const typedName = (form.client || '').trim();
    if (!typedName) {
      commitQuotationSave(form, null);
      return;
    }
    try {
      const { items: clients } = await api.clients('?per_page=500');
      const result = resolveClientMatch(typedName, clients || []);
      if (result.status === 'exact') {
        commitQuotationSave(form, result.client.id);
        return;
      }
      if (result.status === 'suggest') {
        setClientMatch({ form, match: result.client });
        return;
      }
      const created = await api.createClient({ name: typedName });
      commitQuotationSave(form, created.id);
    } catch (matchError) {
      // Non-fatal, same reasoning as Jobs.jsx: client matching is a
      // convenience layer, not a requirement for saving the quotation.
      commitQuotationSave(form, null);
    }
  };

  const handleAccept = prop => {
    api.acceptQuotation(prop.id)
      .then(() => {
        notify(`Quotation ${prop.quotation_ref} accepted and converted to invoice`);
        loadQuotations();
      })
      .catch(() => notify('Could not accept quotation. Check the backend connection.'));
  };

  const handleSend = prop => {
    api.updateQuotation(prop.id, { status: 'sent' })
      .then(() => {
        notify(`Quotation ${prop.quotation_ref} marked as sent`);
        loadQuotations();
      })
      .catch(() => notify('Could not mark quotation as sent. Check the backend connection.'));
  };

  const handleDecline = prop => {
    api.updateQuotation(prop.id, { status: 'declined' })
      .then(() => {
        notify(`Quotation ${prop.quotation_ref} marked as declined`);
        loadQuotations();
      })
      .catch(() => notify('Could not mark quotation as declined. Check the backend connection.'));
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Quotations" subtitle="Quotes and project quotations" actionLabel="New Quotation" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} onOpenDetails={setStatDetail} />
      <ModuleToolbar filters={QUOTATION_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Quotation Pipeline" countLabel={`${filtered.length} quotation${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="PROP" emptyMessage="No quotations match your filters.">
        {filtered.map(prop => <QuotationRow key={prop.id} prop={prop} onPreview={setPreview} onAccept={handleAccept} onSend={handleSend} onDecline={handleDecline} onEdit={setEditRecord} currentDeviceId={deviceIdentity?.device_id} />)}
      </RegisterCard>
      <NewQuotationModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PrintPreviewModal type="quotation" title={preview ? `Quotation Preview: ${preview.quotation_ref}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ClientMatchModal
        isOpen={Boolean(clientMatch)}
        typedName={clientMatch?.form?.client}
        suggestedClient={clientMatch?.match}
        onClose={() => setClientMatch(null)}
        onUseExisting={() => clientMatch && commitQuotationSave(clientMatch.form, clientMatch.match.id)}
        onCreateNew={async () => {
          if (!clientMatch) return;
          try {
            const created = await api.createClient({ name: clientMatch.form.client.trim() });
            commitQuotationSave(clientMatch.form, created.id);
          } catch (createError) {
            notify('Could not create client.');
          }
        }}
      />
      <DetailBreakdownModal detail={statDetail} onClose={() => setStatDetail(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
