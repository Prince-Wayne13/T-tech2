import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { NewAdvanceModal } from './components/Modals';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  advances: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const ADVANCE_STATUSES = ['All', 'Active', 'Settled', 'Refunded', 'Expired'];

const mapAdvance = advance => {
  const status = advance.status === 'open' ? 'active' : advance.status || 'active';
  return {
    id: advance.advance_ref || `ADV-${advance.id}`,
    backendId: advance.id,
    party: advance.recipient || 'Unknown',
    title: advance.notes || advance.recipient || 'Advance',
    amount: money(advance.amount),
    amountValue: Number(advance.amount || 0),
    date: compactDate(advance.issued_on),
    status,
    remaining: status === 'settled' ? money(0) : money(advance.amount),
    notes: advance.notes || 'Backend advance record',
  };
};

function AdvanceRow({ adv, onPreview }) {
  const statusConfig = {
    active: { label: 'Active', cls: 'active', accent: 'var(--primary)' },
    settled: { label: 'Settled', cls: 'paid', accent: 'var(--teal)' },
    refunded: { label: 'Refunded', cls: 'pending', accent: 'var(--warning)' },
    expired: { label: 'Expired', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[adv.status] || statusConfig.active;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{String(adv.id).split('-')[1] || 'ADV'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{adv.title}</div>
        <div className="vendor-cat">{adv.party} - {adv.date || '-'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount">{adv.amount}</div>
        <div className="activity-time">Rem: {adv.remaining}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: adv.id, client_name: adv.party, title: adv.title, items: [{ description: adv.title, quantity: 1, unit_price: adv.amountValue }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(adv)}>
          <Icon d={D.eye} size={11} />
        </button>
      </div>
    </div>
  );
}

export default function Advances() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [advances, setAdvances] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadAdvances = () => {
    setLoading(true);
    setError(null);
    api.advances('?per_page=200')
      .then(data => setAdvances((data.items || []).map(mapAdvance)))
      .catch(() => setError('Could not load advances. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdvances();
  }, []);

  const filtered = advances.filter(advance => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || advance.status === filter.toLowerCase();
    const matchesSearch = `${advance.party} ${advance.title} ${advance.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const total = filtered.reduce((sum, advance) => sum + advance.amountValue, 0);
  const activeTotal = filtered.filter(advance => advance.status === 'active').reduce((sum, advance) => sum + advance.amountValue, 0);
  const settledTotal = filtered.filter(advance => advance.status === 'settled').reduce((sum, advance) => sum + advance.amountValue, 0);
  const refundedTotal = filtered.filter(advance => advance.status === 'refunded').reduce((sum, advance) => sum + advance.amountValue, 0);
  const stats = [
    { label: 'Total Advances', value: money(total), sub: 'All time', icon: D.advances, color: 'primary' },
    { label: 'Active Balance', value: money(activeTotal), sub: 'Unsettled', icon: D.clock, color: 'warning' },
    { label: 'Settled', value: money(settledTotal), sub: 'Backend records', icon: D.check, color: 'teal' },
    { label: 'Refunded', value: money(refundedTotal), sub: 'Refunded deposits', icon: D.alert, color: 'secondary' },
  ];

  const handleSave = async form => {
    try {
      const saved = await api.createAdvance({
        recipient: form.recipient || 'Unknown',
        amount: Number(form.amount || 0),
        issued_on: form.issued_on,
        status: form.status || 'open',
        notes: form.notes,
      });
      setShowEntry(false);
      setPreview(saved);
      notify('Advance created');
      loadAdvances();
    } catch (saveError) {
      notify(saveError.message || 'Could not save advance', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Advances" subtitle="Track prepayments & deposits" actionLabel="New Advance" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={ADVANCE_STATUSES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search party, title, or ID..." />
      <RegisterCard title="Advance Register" countLabel={`${filtered.length} advance${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="ADV" emptyMessage="No advances match your filters.">
        {filtered.map(adv => <AdvanceRow key={adv.id} adv={adv} onPreview={setPreview} />)}
      </RegisterCard>
      <NewAdvanceModal isOpen={showEntry} onClose={() => setShowEntry(false)} onSave={handleSave} />
      <PreviewModal title={preview ? `Advance Preview: ${preview.advance_ref || preview.id || 'Draft'}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
