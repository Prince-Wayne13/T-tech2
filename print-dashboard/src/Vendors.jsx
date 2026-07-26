import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { NewVendorModal } from './components/Modals';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToast, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  vendors: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

// Payment status is derived per vendor from amount_owed/amount_paid, which
// services/vendors.py already computes live from that vendor's Expense rows
// (see backend comment there — Vendor.balance itself is a dead column).
// "Partial" isn't an Expense-level status anywhere in this app (expenses are
// binary pending/paid) — it's a vendor-level fact that only shows up once
// you look at a vendor's expenses as a set: some paid, some still owed.
function paymentStatus(owed, paid) {
  if (owed <= 0 && paid > 0) return 'paid';
  if (owed > 0 && paid > 0) return 'partial';
  return 'unpaid';
}

function mapVendor(vendor) {
  const owed = Number(vendor.amount_owed ?? vendor.balance ?? 0);
  const paid = Number(vendor.amount_paid ?? 0);
  return {
    id: `VEN-${vendor.id}`,
    backendId: vendor.id,
    name: vendor.name,
    category: vendor.category || 'Other',
    contact: vendor.email || vendor.phone || 'No contact',
    phone: vendor.phone || '-',
    email: vendor.email || '',
    balance: money(owed),
    balanceValue: owed,
    amountPaid: paid,
    lifetimeSpend: Number(vendor.lifetime_spend ?? owed + paid),
    paymentStatus: paymentStatus(owed, paid),
    status: vendor.status === 'current' ? 'current' : 'overdue',
    lastOrder: compactDate(vendor.updated_at),
    notes: vendor.notes || 'Backend vendor record',
  };
}

const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', cls: 'paid', accent: 'var(--teal)' },
  partial: { label: 'Partial', cls: 'pending', accent: 'var(--warning)' },
  unpaid: { label: 'Unpaid', cls: 'overdue', accent: 'var(--red)' },
};

function VendorRow({ vendor, onPreview, onEdit }) {
  const cfg = PAYMENT_STATUS_CONFIG[vendor.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid;
  const initials = vendor.name.split(' ').map(word => word[0]).join('').slice(0, 2);

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{initials}</div>
      <div className="vendor-info">
        <div className="vendor-name">{vendor.name}</div>
        <div className="vendor-cat">{vendor.category} - {vendor.contact}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '140px' }}>
        <div className="activity-amount">{vendor.balance} owed</div>
        <div className="activity-time">Paid {money(vendor.amountPaid)} - Last: {vendor.lastOrder || '-'}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: vendor.id, client_name: vendor.name, title: vendor.category, items: [{ description: vendor.name, quantity: 1, unit_price: vendor.balanceValue }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View Details" onClick={() => onPreview(vendor)}>
          <Icon d={D.eye} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Email Vendor" onClick={() => { if (vendor.email) window.location.href = `mailto:${vendor.email}`; }}>
          <Icon d={D.send} size={11} />
        </button>
        <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} title="Edit" onClick={() => onEdit(vendor)}>
          Edit
        </button>
      </div>
    </div>
  );
}

// Wayne's ask: "change the vendor page filter to paid/partial/unpaid" —
// replaces the previous category filter (categories are still visible per-row
// and searchable, just no longer the primary filter dimension).
const PAYMENT_FILTERS = ['All', 'Unpaid', 'Partial', 'Paid'];

export default function Vendors() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, notify } = useModuleToast();

  const loadVendors = () => {
    setLoading(true);
    setError(null);
    api.vendors('?per_page=200')
      .then(data => {
        setVendors((data.items || []).map(mapVendor));
      })
      .catch(() => setError('Could not load vendors. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filtered = vendors.filter(vendor => {
    const query = search.toLowerCase();
    const matchesStatus = filter === 'All' || vendor.paymentStatus === filter.toLowerCase();
    const matchesSearch = `${vendor.name} ${vendor.category} ${vendor.id}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const totalOwed = filtered.reduce((sum, vendor) => sum + vendor.balanceValue, 0);
  const totalPaid = filtered.reduce((sum, vendor) => sum + vendor.amountPaid, 0);
  const unpaidCount = filtered.filter(vendor => vendor.paymentStatus === 'unpaid').length;
  const partialCount = filtered.filter(vendor => vendor.paymentStatus === 'partial').length;
  const stats = [
    { label: 'Total Vendors', value: String(filtered.length), sub: 'In directory', icon: D.vendors, color: 'primary' },
    { label: 'We Owe', value: money(totalOwed), sub: `${unpaidCount} unpaid, ${partialCount} partial`, icon: D.alert, color: 'warning' },
    { label: 'Paid Out', value: money(totalPaid), sub: 'Lifetime, this view', icon: D.check, color: 'teal' },
    { label: 'Unpaid Vendors', value: String(unpaidCount), sub: 'Need a payment run', icon: D.alert, color: 'red' },
  ];

  const handleSave = async form => {
    try {
      const payload = {
        name: form.name || editRecord?.name || 'New Vendor',
        category: form.category || editRecord?.category || 'Other',
        phone: form.phone,
        email: form.email || form.contact,
        balance: editRecord?.balanceValue || 0,
        status: editRecord?.status || 'current',
      };
      const saved = editRecord?.backendId ? await api.updateVendor(editRecord.backendId, payload) : await api.createVendor(payload);
      setShowEntry(false);
      setEditRecord(null);
      setPreview(saved);
      notify(editRecord ? 'Vendor updated' : 'Vendor created');
      loadVendors();
    } catch (saveError) {
      notify(saveError.message || 'Could not save vendor', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Vendors" subtitle="Supplier directory & balances" actionLabel="New Vendor" onAction={() => setShowEntry(true)} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={PAYMENT_FILTERS} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search vendor, category, or ID..." />
      <RegisterCard title="Vendor Directory" countLabel={`${filtered.length} vendor${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="VEN" emptyMessage="No vendors match your filters.">
        {filtered.map(vendor => <VendorRow key={vendor.id} vendor={vendor} onPreview={setPreview} onEdit={setEditRecord} />)}
      </RegisterCard>
      <NewVendorModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSave}
      />
      <PreviewModal title={preview ? `Vendor Preview: ${preview.name || 'Draft'}` : ''} data={preview} onClose={() => setPreview(null)} />
      <ModuleToast toast={toast} />
    </main>
  );
}
