// path: src/Proposals.jsx

import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewProposalModal, ClientMatchModal } from './components/Modals';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';
import { downloadProposalPDF } from './components/InvoicePDF';
import { resolveClientMatch } from './utils/clientMatch';

const D = {
  ...STANDARD_ICONS,
  proposals: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

// Status vocabulary matches the backend Proposal.status field (draft/sent/accepted/declined).
// This replaces the previous frontend-only fake set (draft/sent/viewed/approved/rejected),
// which had no backend counterpart to sync against. Flagged as a deviation in dev-log.md —
// this is a visible UI behavior change (filter pills, badge labels), not a pure plumbing fix.
const PROPOSAL_STATUSES = ['All', 'Draft', 'Sent', 'Accepted', 'Declined'];

function ProposalRow({ prop, onPreview, onAccept, onSend, onDecline, onEdit }) {
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
      <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{prop.proposal_ref?.split('-')[1] || 'PR'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{prop.title}</div>
        <div className="vendor-cat">{prop.client_name} - Valid until {prop.valid_until || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">MK {total.toLocaleString()}</div>
        <div className="activity-time">{prop.proposal_ref}</div>
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
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download PDF" onClick={() => downloadProposalPDF(prop)}><Icon d={D.download} size={11} /></button>
      </div>
    </div>
  );
}

export default function Proposals() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Item 6: mirrors Jobs.jsx's clientMatch state - holds { form, match }
  // while a "Did you mean X?" prompt is shown mid-save, null otherwise.
  const [clientMatch, setClientMatch] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadProposals = () => {
    setLoading(true);
    setError(null);
    api.proposals('?per_page=200')
      .then(response => setProposals(response.items || []))
      .catch(() => setError('Could not load proposals. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProposals(); }, []);

  const filtered = proposals.filter(proposal => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || proposal.status === filter.toLowerCase();
    const matchesSearch = `${proposal.client_name} ${proposal.title} ${proposal.proposal_ref}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });
  const totalValue = proposals.reduce((sum, proposal) => sum + (proposal.totals?.total ?? 0), 0);
  const accepted = proposals.filter(proposal => proposal.status === 'accepted');
  const pending = proposals.filter(proposal => ['draft', 'sent'].includes(proposal.status));
  const stats = [
    { label: 'Total Value', value: `MK ${totalValue.toLocaleString()}`, sub: 'All proposals', icon: D.proposals, color: 'primary' },
    { label: 'Pending Review', value: String(pending.length), sub: 'Awaiting response', icon: D.clock, color: 'warning' },
    { label: 'Win Rate', value: `${Math.round((accepted.length / Math.max(proposals.length, 1)) * 100)}%`, sub: 'Current pipeline', icon: D.check, color: 'teal' },
    { label: 'Avg. Value', value: `MK ${Math.round(totalValue / Math.max(proposals.length, 1)).toLocaleString()}`, sub: 'Per proposal', icon: D.proposals, color: 'secondary' },
  ];

  // Item 6: pulled out of handleSave so it can be called with a resolved
  // client_id, same split as Jobs.jsx's jobPayload/commitJobSave.
  const buildProposalPayload = (form, clientId) => ({
    client_name: form.client || 'Walk-in Client',
    // Item 6: real Client link, resolved by handleSave below before this
    // is called. null means no client typed / lookup skipped, same as
    // plain-text-only behavior before this item.
    client_id: clientId,
    title: form.title || 'New proposal draft',
    line_items: (form.items || []).map((item, index) => ({
      position: index + 1,
      description: item.desc || item.description || 'Print service',
      quantity: Number(item.qty ?? item.quantity ?? 1) || 1,
      unit_price: Number(item.rate ?? item.unit_price ?? item.amount ?? 0) || 0,
      unit: item.unit || 'item',
      // Build decision #5: each line carries its own machine, set
      // by Modals.jsx's handleServiceSelect from the picked
      // service's category (matched against ProductionMachine.
      // category) -- carried onto the converted Job's invoice by
      // accept_proposal() in routes/proposals.py.
      machine_id: item.machineId || item.machine_id || null,
    })),
    valid_until: form.validUntil || null,
    contact: form.contact,
    notes: form.notes,
    status: editRecord?.status || 'draft',
    discount_amount: Number(form.discount || 0),
    // Internal-only fields (Job/Proposal parity) -- accept_proposal()
    // carries all of these onto the Job it creates.
    priority: form.priority,
    assigned_staff_id: form.assignedStaffId || null,
    // Build decision #5: "Proposals currently have no machine field
    // at all, so this is also adding that concept there for the
    // first time." Job-level summary field, derived from whichever
    // service line most recently set form.machineId.
    machine_id: form.machineId || null,
  });

  const commitProposalSave = (form, clientId) => {
    const payload = buildProposalPayload(form, clientId);
    const request = editRecord?.id
      ? api.updateProposal(editRecord.id, payload)
      : api.createProposal(payload);
    request
      .then(saved => {
        setShowEntry(false);
        setEditRecord(null);
        setClientMatch(null);
        setPreview(saved);
        notify(editRecord ? 'Proposal updated' : 'Proposal draft added');
        loadProposals();
      })
      .catch(() => notify(editRecord ? 'Could not update proposal.' : 'Could not save proposal. Check the backend connection.'));
  };

  const handleSave = async form => {
    const typedName = (form.client || '').trim();
    if (!typedName) {
      commitProposalSave(form, null);
      return;
    }
    try {
      const { items: clients } = await api.clients('?per_page=500');
      const result = resolveClientMatch(typedName, clients || []);
      if (result.status === 'exact') {
        commitProposalSave(form, result.client.id);
        return;
      }
      if (result.status === 'suggest') {
        setClientMatch({ form, match: result.client });
        return;
      }
      const created = await api.createClient({ name: typedName });
      commitProposalSave(form, created.id);
    } catch (matchError) {
      // Non-fatal, same reasoning as Jobs.jsx: client matching is a
      // convenience layer, not a requirement for saving the proposal.
      commitProposalSave(form, null);
    }
  };

  const handleAccept = prop => {
    api.acceptProposal(prop.id)
      .then(() => {
        notify(`Proposal ${prop.proposal_ref} accepted and converted to invoice`);
        loadProposals();
      })
      .catch(() => notify('Could not accept proposal. Check the backend connection.'));
  };

  const handleSend = prop => {
    api.updateProposal(prop.id, { status: 'sent' })
      .then(() => {
        notify(`Proposal ${prop.proposal_ref} marked as sent`);
        loadProposals();
      })
      .catch(() => notify('Could not mark proposal as sent. Check the backend connection.'));
  };

  const handleDecline = prop => {
    api.updateProposal(prop.id, { status: 'declined' })
      .then(() => {
        notify(`Proposal ${prop.proposal_ref} marked as declined`);
        loadProposals();
      })
      .catch(() => notify('Could not mark proposal as declined. Check the backend connection.'));
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Proposals" subtitle="Quotes and project proposals" actionLabel="New Proposal" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={PROPOSAL_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Proposal Pipeline" countLabel={`${filtered.length} proposal${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="PROP" emptyMessage="No proposals match your filters.">
        {filtered.map(prop => <ProposalRow key={prop.id} prop={prop} onPreview={setPreview} onAccept={handleAccept} onSend={handleSend} onDecline={handleDecline} onEdit={setEditRecord} />)}
      </RegisterCard>
      <NewProposalModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PrintPreviewModal type="proposal" title={preview ? `Proposal Preview: ${preview.proposal_ref}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ClientMatchModal
        isOpen={Boolean(clientMatch)}
        typedName={clientMatch?.form?.client}
        suggestedClient={clientMatch?.match}
        onClose={() => setClientMatch(null)}
        onUseExisting={() => clientMatch && commitProposalSave(clientMatch.form, clientMatch.match.id)}
        onCreateNew={async () => {
          if (!clientMatch) return;
          try {
            const created = await api.createClient({ name: clientMatch.form.client.trim() });
            commitProposalSave(clientMatch.form, created.id);
          } catch (createError) {
            notify('Could not create client.');
          }
        }}
      />
      <ModuleToast toast={toast} />
    </main>
  );
}
