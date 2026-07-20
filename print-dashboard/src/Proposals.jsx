import React, { useState } from 'react';
import './styles.css';
import { PrintPreviewModal } from './components/PrintLayouts';
import { NewProposalModal } from './components/Modals';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';
import { calculateTotal } from './utils/calculateTotal';
import { downloadProposalPDF } from './components/InvoicePDF';

const D = {
  ...STANDARD_ICONS,
  proposals: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

const PROPOSAL_STATUSES = ['All', 'Draft', 'Sent', 'Viewed', 'Approved', 'Rejected'];
const PROPOSALS_DATA = [
  { id: 'PROP-1024', client: 'TechCorp Ltd', title: 'Q1 Marketing Collateral', items: [{ desc: 'Q1 Marketing Collateral', amount: 3400000 }], status: 'approved', sent: 'Mar 12', viewed: 'Mar 13', expires: 'Apr 12' },
  { id: 'PROP-1023', client: 'BrandX Agency', title: 'Product Launch Kit', items: [{ desc: 'Product Launch Kit', amount: 5200000 }], status: 'viewed', sent: 'Mar 10', viewed: 'Mar 11', expires: 'Apr 10' },
  { id: 'PROP-1022', client: 'City Council', title: 'Annual Report Design', items: [{ desc: 'Annual Report Design', amount: 1850000 }], status: 'sent', sent: 'Mar 14', viewed: '-', expires: 'Apr 14' },
  { id: 'PROP-1021', client: 'MediaGroup', title: 'Social Media Templates', items: [{ desc: 'Social Media Templates', amount: 980000 }], status: 'draft', sent: '-', viewed: '-', expires: '-' },
  { id: 'PROP-1020', client: 'StartupHub', title: 'Pitch Deck Printing', items: [{ desc: 'Pitch Deck Printing', amount: 720000 }], status: 'rejected', sent: 'Mar 5', viewed: 'Mar 6', expires: 'Apr 5' },
];

function ProposalRow({ prop, onPreview }) {
  const statusConfig = {
    draft: { label: 'Draft', cls: 'pending', accent: 'var(--warning)' },
    sent: { label: 'Sent', cls: 'current', accent: 'var(--secondary)' },
    viewed: { label: 'Viewed', cls: 'active', accent: 'var(--primary)' },
    approved: { label: 'Approved', cls: 'paid', accent: 'var(--teal)' },
    rejected: { label: 'Rejected', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[prop.status] || statusConfig.draft;
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{prop.id.split('-')[1]}</div>
      <div className="vendor-info">
        <div className="vendor-name">{prop.title}</div>
        <div className="vendor-cat">{prop.client} - Expires {prop.expires}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
        <div className="activity-amount">MK {calculateTotal(prop.items).toLocaleString()}</div>
        <div className="activity-time">Sent: {prop.sent}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
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
  const [proposals, setProposals] = useState(PROPOSALS_DATA);
  const { toast, notify } = useModuleToast();

  const filtered = proposals.filter(proposal => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || proposal.status === filter.toLowerCase();
    const matchesSearch = `${proposal.client} ${proposal.title} ${proposal.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });
  const totalValue = proposals.reduce((sum, proposal) => sum + calculateTotal(proposal.items), 0);
  const approved = proposals.filter(proposal => proposal.status === 'approved');
  const pending = proposals.filter(proposal => ['draft', 'sent', 'viewed'].includes(proposal.status));
  const stats = [
    { label: 'Total Value', value: `MK ${totalValue.toLocaleString()}`, sub: 'All proposals', icon: D.proposals, color: 'primary' },
    { label: 'Pending Review', value: String(pending.length), sub: 'Awaiting response', icon: D.clock, color: 'warning' },
    { label: 'Win Rate', value: `${Math.round((approved.length / Math.max(proposals.length, 1)) * 100)}%`, sub: 'Current pipeline', icon: D.check, color: 'teal' },
    { label: 'Avg. Value', value: `MK ${Math.round(totalValue / Math.max(proposals.length, 1)).toLocaleString()}`, sub: 'Per proposal', icon: D.proposals, color: 'secondary' },
  ];

  const handleSave = form => {
    const total = calculateTotal(form.items);
    const draft = {
      id: `PROP-DRAFT-${proposals.length + 1}`,
      client: form.client || 'Walk-in Client',
      title: form.title || 'New proposal draft',
      items: form.items,
      validUntil: form.validUntil,
      expires: form.validUntil || '-',
      sent: '-',
      viewed: '-',
      notes: form.notes,
      status: 'draft',
    };
    setProposals(current => [draft, ...current]);
    setShowEntry(false);
    setPreview(draft);
    notify('Proposal draft added');
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Proposals" subtitle="Quotes and project proposals" actionLabel="New Proposal" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={PROPOSAL_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search client, title, or ID..." />
      <RegisterCard title="Proposal Pipeline" countLabel={`${filtered.length} proposal${filtered.length !== 1 ? 's' : ''} found`} loading={false} error={null} emptyIcon="PROP" emptyMessage="No proposals match your filters.">
        {filtered.map(prop => <ProposalRow key={prop.id} prop={prop} onPreview={setPreview} />)}
      </RegisterCard>
      <NewProposalModal isOpen={showEntry} onClose={() => setShowEntry(false)} onSave={handleSave} />
      <PrintPreviewModal type="proposal" title={preview ? `Proposal Preview: ${preview.id}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
