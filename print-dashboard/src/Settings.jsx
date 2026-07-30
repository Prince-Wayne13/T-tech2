// Settings.jsx — PrintOps BMS (Clean Grid + Popup Modals)
import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';

/* ═══════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════ */
function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  x: 'M18 6L6 18M6 6l12 12',
};

// Shared input style
const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-faint)',
  background: '#fff',
  color: 'var(--text-body)',
  fontSize: '11px',
  outline: 'none',
  transition: 'border-color var(--ease)',
  fontFamily: 'var(--font)',
  boxSizing: 'border-box'
};

// Shared card style for the popup modal
const modalCardStyle = {
  background: 'var(--bg-card)',
  borderRadius: 'var(--r-card)',
  padding: '20px',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  border: '1px solid var(--border-light)',
  position: 'relative',
  animation: 'fadeIn 0.2s ease'
};

// Plain names for table names, so the sync screen reads in normal words
const TABLE_DISPLAY_NAMES = {
  production_machines: 'machines',
  capabilities: 'skills list',
  vendors: 'vendors',
  staff: 'staff',
  expense_categories: 'expense categories',
  advances: 'cash advances',
  export_jobs: 'exports',
  materials: 'materials',
  clients: 'clients',
  pricing_items: 'price list items',
  jobs: 'jobs',
  invoices: 'invoices',
  proposals: 'proposals',
  expenses: 'expenses',
  petty_cash_entries: 'petty cash entries',
  sales: 'sales',
};

function tableDisplayName(table) {
  return TABLE_DISPLAY_NAMES[table] || table.replace(/_/g, ' ');
}

// Fields we never show in a plain comparison — internal/technical only,
// not something a person needs to see to make a decision.
const HIDDEN_DIFF_FIELDS = new Set(['id', 'device_id', 'created_at', 'updated_at']);

// Plain names for raw column names, so "amount" doesn't need explaining
// and "client_id" isn't shown as a raw database word.
const FIELD_DISPLAY_NAMES = {
  amount: 'Total',
  discount_amount: 'Discount',
  tax_rate: 'Tax rate',
  status: 'Status',
  notes: 'Notes',
  quantity: 'Quantity',
  unit_cost: 'Cost per unit',
  price: 'Price',
  due_date: 'Due date',
  due_on: 'Due date',
  issued_on: 'Issue date',
  paid_on: 'Paid on',
  title: 'Title',
  client_name: 'Client name',
  progress: 'Progress',
  active: 'Active',
};

function fieldDisplayName(field) {
  return FIELD_DISPLAY_NAMES[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatFieldValue(val) {
  if (val === null || val === undefined || val === '') return '(empty)';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val === 0 || val === 1) {
    // could be a real number or a stored boolean; treat plain 0/1 as-is
    return String(val);
  }
  return String(val);
}

// Compares the two full versions of one record and returns only the
// fields that actually differ, in plain "before -> after" form.
function computeFieldDiffs(aValues, bValues) {
  if (!aValues || !bValues) return [];
  const allFields = new Set([...Object.keys(aValues), ...Object.keys(bValues)]);
  const diffs = [];
  allFields.forEach(field => {
    if (HIDDEN_DIFF_FIELDS.has(field)) return;
    const aVal = aValues[field];
    const bVal = bValues[field];
    if (String(aVal ?? '') === String(bVal ?? '')) return;
    diffs.push({
      field,
      label: fieldDisplayName(field),
      before: formatFieldValue(aVal),
      after: formatFieldValue(bVal),
    });
  });
  return diffs;
}

// Turns one table's raw sync data into plain lines, split into two groups:
// things that will be added automatically, and things that need a person
// to look at because both devices changed the same record.
//
// IMPORTANT: the backend (merge_preview.py -> preview_merge()) returns
// { tables: [ { table, match_strategy, weak_key_warning, changes, summary }, ... ] },
// an ARRAY of per-table objects, not a flat { table_name: {...} } map. Each
// entry already carries its own `table` key, so callers should iterate
// syncPreview.tables and pass each entry straight in here (not
// Object.entries(syncPreview)).
function describeSyncTable(table, tableData) {
  const name = tableDisplayName(table);
  const changes = (tableData && Array.isArray(tableData.changes)) ? tableData.changes : [];

  if (changes.length === 0) {
    return { newLine: null, reviewItems: [] };
  }

  const newCount = changes.filter(c => c.action === 'add_from_b').length;
  const autoUpdateCount = changes.filter(c => c.action === 'b_wins_update' && !c.needs_review).length;
  const needsReview = changes.filter(c => c.needs_review);

  const newParts = [];
  if (newCount > 0) newParts.push(`${newCount} new ${name}`);
  if (autoUpdateCount > 0) newParts.push(`${autoUpdateCount} ${name} updated from the other device`);
  const newLine = newParts.length > 0 ? newParts.join(', ') : null;

  const reviewItems = needsReview.map(c => ({
    table,
    tableName: name,
    key: c.key,
    label: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${c.key} — edited on both devices, needs your review`,
    diffs: computeFieldDiffs(c.a_values, c.b_values),
  }));

  return { newLine, reviewItems };
}

const DEFAULT_MACHINES = [
  { machine_ref: 'MCH-PVC-01', name: 'Pebble Evolis Card Printer', category: 'PVC Cards', capability: 'PVC ID cards and card printing', image_path: '/machines/pvc-card.svg' },
  { machine_ref: 'MCH-SUB-01', name: 'Sublimation Printer', category: 'Sublimation', capability: 'Mug cups and coated gift items', image_path: '/machines/sublimation.svg' },
  { machine_ref: 'MCH-UVDTF-01', name: 'UV DTF Printer', category: 'UV DTF', capability: 'Assorted / other UV DTF items', image_path: '/machines/uv-dtf.svg' },
  { machine_ref: 'MCH-LF-01', name: 'Large Format Printer', category: 'Large Format', capability: 'Banners and stickers', image_path: '/machines/large-format.svg' },
  { machine_ref: 'MCH-DTF-01', name: 'DTF Printer', category: 'DTF Apparel', capability: 'T-shirts, diaries and other DTF items', image_path: '/machines/dtf.svg' },
  { machine_ref: 'MCH-PLOT-01', name: 'Plotter', category: 'Cutting', capability: 'Cutting stencils', image_path: '/machines/plotter.svg' },
  { machine_ref: 'MCH-DIGI-01', name: 'Digital Printer', category: 'Digital Print', capability: 'Books, magazines, calendars and other digital print items', image_path: '/machines/digital-printer.svg' },
  { machine_ref: 'MCH-BIND-01', name: 'Binder', category: 'Finishing', capability: 'Binding books', image_path: '/machines/binder-cutter.svg' },
  { machine_ref: 'MCH-KM-01', name: 'Konica Minolta', category: 'Digital Print', capability: 'Calendars, books and normal printing', image_path: '/machines/digital-press.svg' },
];

// ── Field-diff popup ────────────────────────────────────────────────
// Shows the full "before -> after" comparison for one record that was
// edited on both devices. Purely a display layer over the diffs that
// describeSyncTable/computeFieldDiffs already computed — no fetching,
// no state beyond what's passed in.
function FieldDiffModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div style={{ ...modalCardStyle, maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 className="card-title">What changed</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Icon d={D.x} size={16} />
          </button>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          {item.tableName.charAt(0).toUpperCase() + item.tableName.slice(1)} — {item.key}
        </p>

        {item.diffs.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            No field-level differences were found between the two versions.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
            {item.diffs.map((d) => (
              <div key={d.field} style={{ border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>{d.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--red, #c0392b)', textDecoration: 'line-through', opacity: 0.8 }}>{d.before}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{d.after}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // ✅ Dynamic State
  const [pricingItems, setPricingItems] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null); // If set, show delete confirmation
  const [newItem, setNewItem] = useState({ name: '', value: '', category: 'Digital Print', unit: 'unit', cost: '' });

  const [loadError, setLoadError] = useState(null);

  // Backup / Reports-to-Drive status
  const [backupStatus, setBackupStatus] = useState(null);
  const [reportsStatus, setReportsStatus] = useState(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [sendingReports, setSendingReports] = useState(false);
  const [backupActionMessage, setBackupActionMessage] = useState(null);
  const [reportsActionMessage, setReportsActionMessage] = useState(null);

  // Sync with another device
  const [thisDeviceId, setThisDeviceId] = useState(null);
  const [otherDevices, setOtherDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [checkingDeviceId, setCheckingDeviceId] = useState(null);
  const [syncPreview, setSyncPreview] = useState(null);
  const [applyingDeviceId, setApplyingDeviceId] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [activeDiffItem, setActiveDiffItem] = useState(null); // review item currently shown in the popup

  const loadSyncDevices = async () => {
    setLoadingDevices(true);
    try {
      const identity = await api.deviceIdentity();
      setThisDeviceId(identity.device_id);
      const { backups } = await api.availableBackups();
      const others = (backups || []).filter((b) => b.device_id !== identity.device_id);
      setOtherDevices(others);
    } catch (error) {
      setSyncMessage(error.message || 'Could not check for other devices.');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handlePreviewSync = async (otherBackup) => {
    setSyncPreview(null);
    setSyncMessage(null);
    setCheckingDeviceId(otherBackup.device_id);
    try {
      const thisDeviceBackup = otherDevices.length >= 0
        ? (await api.availableBackups()).backups.find((b) => b.device_id === thisDeviceId)
        : null;
      if (!thisDeviceBackup) {
        setSyncMessage('This device has no backup yet — run "Backup Now" above first.');
        return;
      }
      const result = await api.mergePreview(thisDeviceBackup.full_path, otherBackup.full_path);
      setSyncPreview({ ...result, otherBackup });
    } catch (error) {
      setSyncMessage(error.message || 'Could not compare with that device.');
    } finally {
      setCheckingDeviceId(null);
    }
  };

  const handleApplySync = async (otherBackup) => {
    setApplyingDeviceId(otherBackup.device_id);
    setSyncMessage(null);
    try {
      const result = await api.mergeApply(otherBackup.full_path, false);
      setSyncMessage(result.ok ? 'Sync applied successfully.' : (result.message || 'Sync failed.'));
      setSyncPreview(null);
    } catch (error) {
      setSyncMessage(error.message || 'Sync failed.');
    } finally {
      setApplyingDeviceId(null);
    }
  };

  const loadBackupAndReportsStatus = async () => {
    try {
      const status = await api.backupStatus();
      setBackupStatus(status);
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
    try {
      const status = await api.reportsBackupStatus();
      setReportsStatus(status);
    } catch (error) {
      console.error('Failed to load reports status:', error);
    }
  };

  const handleRunBackupNow = async () => {
    setRunningBackup(true);
    setBackupActionMessage(null);
    try {
      const result = await api.runBackupNow();
      setBackupActionMessage(result.message || (result.ok ? 'Backup completed.' : 'Backup failed.'));
    } catch (error) {
      setBackupActionMessage(error.message || 'Backup failed.');
    } finally {
      setRunningBackup(false);
      loadBackupAndReportsStatus();
    }
  };

  const handleSendReportsNow = async () => {
    setSendingReports(true);
    setReportsActionMessage(null);
    try {
      const result = await api.sendReportsNow();
      setReportsActionMessage(result.message || (result.ok ? 'Reports sent to Drive.' : 'Reports send failed.'));
    } catch (error) {
      setReportsActionMessage(error.message || 'Reports send failed.');
    } finally {
      setSendingReports(false);
      loadBackupAndReportsStatus();
    }
  };

  const loadPricing = async () => {
    setLoadingPricing(true);
    setLoadError(null);
    try {
      const [machineData, pricingData] = await Promise.all([api.machines('?per_page=100'), api.pricingItems('?per_page=200')]);
      setMachines(machineData.items || []);
      setPricingItems(pricingData.items || []);
    } catch (error) {
      console.error('Failed to load settings data:', error);
      setLoadError(error.message || 'Failed to load settings data.');
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    loadPricing();
    loadBackupAndReportsStatus();
    loadSyncDevices();
  }, []);

  // Handlers
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const openAddModal = () => {
    setNewItem({ name: '', value: '', category: 'Digital Print', unit: 'unit', cost: '' });
    setShowAddModal(true);
  };

  const confirmAdd = async () => {
    if (newItem.name && newItem.value) {
      await api.createPricingItem({
        code: `${newItem.category.slice(0, 3).toUpperCase()}-${Date.now()}`,
        name: newItem.name,
        category: newItem.category,
        unit: newItem.unit || 'unit',
        price: Number(newItem.value || 0),
        cost_estimate: Number(newItem.cost || 0),
      });
      await loadPricing();
      setShowAddModal(false);
    }
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const targetId = deleteId;
    setDeleteId(null);
    try {
      await api.deletePricingItem(targetId);
      setPricingItems(prev => prev.filter(item => item.id !== targetId));
    } catch (error) {
      console.error('Failed to delete pricing item:', error);
      await loadPricing();
    }
  };

  const seedMachinesAndPricing = async () => {
    setSaving(true);
    try {
      const currentMachines = await api.machines('?per_page=200');
      const existingRefs = new Set((currentMachines.items || []).map(machine => machine.machine_ref));
      for (const machine of DEFAULT_MACHINES) {
        if (!existingRefs.has(machine.machine_ref)) await api.createMachine(machine);
      }
      await loadPricing();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

   const [business, setBusiness] = useState({
    name: 'T-Tech Suppliers & General Dealers Ltd',
    phone: '+265 988 231 291',
    email: 'ttechsuppliers@gmail.com',
    address: 'Lilongwe, City Mall, Standard Bank Corridor',
    tin: '1002345678'
  });
  
  const [tax, setTax] = useState({
    vatEnabled: true,
    vatRate: '16.5',
    showWithTax: false
  });
  
  const [defaults, setDefaults] = useState({
    paper: 'A4 80gsm',
    finish: 'Matte',
    autoBackup: true,
    receiptFooter: 'Thank you for your business! T-Tech Printing | MRA TIN: 1002345678'
  });

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      {/* HEADER */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '18px', 
        paddingBottom: '14px',
        borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)',
        position: 'relative'
      }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Settings</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Configure rates, costs & preferences</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'var(--text-muted)' : saved ? 'var(--teal)' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '7px 15px',
            fontSize: '10px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all var(--ease)',
            boxShadow: saved ? '0 3px 10px rgba(107,142,123,0.4)' : '0 3px 10px rgba(58,80,107,0.35)',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Icon d={saving ? 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' : saved ? D.check : D.save} size={11} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        <div className="card fin-card">
          <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>Active Items</div><div className={`fin-icon primary`}><Icon d={D.settings} size={15} /></div></div>
          <div className="fin-metric" style={{ color: 'var(--text-head)', fontSize: '18px' }}>{pricingItems.length}</div>
          <div className="fin-sub" style={{ marginTop: '4px' }}>Pricing & costs</div>
        </div>
        <div className="card fin-card">
          <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>VAT Status</div><div className={`fin-icon ${tax.vatEnabled ? 'teal' : 'warning'}`}><Icon d={tax.vatEnabled ? D.check : D.alert} size={15} /></div></div>
          <div className="fin-metric" style={{ color: tax.vatEnabled ? 'var(--teal)' : 'var(--warning)', fontSize: '18px' }}>{tax.vatEnabled ? 'Enabled' : 'Disabled'}</div>
          <div className="fin-sub" style={{ marginTop: '4px' }}>{tax.vatRate}% rate</div>
        </div>
        <div className="card fin-card">
          <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>Last Saved</div><div className={`fin-icon secondary`}><Icon d={D.clock} size={15} /></div></div>
          <div className="fin-metric" style={{ color: 'var(--secondary)', fontSize: '18px' }}>Today</div>
          <div className="fin-sub" style={{ marginTop: '4px' }}>14:32 MWAT</div>
        </div>
        <div className="card fin-card">
          <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>Currency</div><div className={`fin-icon primary`}><Icon d={D.settings} size={15} /></div></div>
          <div className="fin-metric" style={{ color: 'var(--text-head)', fontSize: '18px' }}>MK</div>
          <div className="fin-sub" style={{ marginTop: '4px' }}>Malawian Kwacha</div>
        </div>
      </div>

      {/* ✅ PRICING & FIXED COSTS - Clean Grid */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--secondary)', position: 'relative' }}>
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div><h3 className="card-title">Machines & Reference Prices</h3><span className="card-sub">{loadingPricing ? 'Loading backend data...' : `${machines.length} machines, ${pricingItems.length} saved reference prices (all job/invoice prices are entered manually)`}</span></div>
          
          {/* Add Button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={seedMachinesAndPricing} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}>Sync T-Tech Machines</button>
            <button 
              onClick={openAddModal}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-faint)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: '600',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all var(--ease)'
              }}
            >
              <Icon d={D.plus} size={12} /> Add New
            </button>
          </div>
        </div>

        {loadError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', background: 'var(--red-dim, #fdecea)', border: '1px solid var(--red, #c0392b)', color: 'var(--red, #c0392b)', fontSize: '11px', fontWeight: 600 }}>
            <span>Could not load machines/pricing: {loadError}</span>
            <button onClick={loadPricing} style={{ background: 'transparent', border: '1px solid currentColor', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
          {machines.map(machine => (
            <div key={machine.id} style={{ background: 'rgba(255,255,255,0.78)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-faint)', display: 'grid', gap: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-head)' }}>{machine.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>{machine.category} · {machine.status}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.35 }}>{machine.capability}</span>
            </div>
          ))}
        </div>
        
        {/* Clean Grid of Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {pricingItems.map(item => (
            <div key={item.id} style={{ position: 'relative', background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Delete Button (Top Right) */}
              <button 
                onClick={() => openDeleteModal(item.id)}
                style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', opacity: 0.6 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = 0.6; }}
                title="Remove"
              >
                <Icon d={D.x} size={12} />
              </button>

              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', lineHeight: '1.2', paddingRight: '22px' }}>{item.name}</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-head)', lineHeight: '1.2' }}>MK {Number(item.price || item.value || 0).toLocaleString()}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{item.category} · per {item.unit || 'unit'} · cost MK {Number(item.cost_estimate || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Business Profile */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">Business Profile</h3>
          <span className="card-sub">Company details & MRA registration</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Name</label>
            <input style={inputStyle} value={business.name} onChange={(e) => setBusiness(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone</label>
            <input style={inputStyle} value={business.phone} onChange={(e) => setBusiness(prev => ({ ...prev, phone: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</label>
            <input style={inputStyle} value={business.email} onChange={(e) => setBusiness(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>MRA TIN</label>
            <input style={inputStyle} value={business.tin} onChange={(e) => setBusiness(prev => ({ ...prev, tin: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Physical Address</label>
            <input style={inputStyle} value={business.address} onChange={(e) => setBusiness(prev => ({ ...prev, address: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Tax & Compliance */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--warning)' }}>
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">Tax & Compliance</h3>
          <span className="card-sub">MRA VAT settings & invoicing</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-body)', marginBottom: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={tax.vatEnabled} onChange={(e) => setTax(prev => ({ ...prev, vatEnabled: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              Enable VAT on invoices
            </label>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>VAT Rate (%)</label>
            <input style={inputStyle} value={tax.vatRate} onChange={(e) => setTax(prev => ({ ...prev, vatRate: e.target.value }))} disabled={!tax.vatEnabled} />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-body)', marginBottom: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={tax.showWithTax} onChange={(e) => setTax(prev => ({ ...prev, showWithTax: e.target.checked }))} disabled={!tax.vatEnabled} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              Display prices with VAT included
            </label>
          </div>
        </div>
      </div>

      {/* Sync with Another Device */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--teal)' }}>
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">Sync with Another Device</h3>
          <span className="card-sub">Bring in machines, materials, vendors, and staff from another device's latest backup</span>
        </div>

        {loadingDevices ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Checking for other devices…</div>
        ) : otherDevices.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            No other device's backup was found yet in the shared backup folder.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {otherDevices.map((device) => (
              <div key={device.device_id} style={{ border: '1px solid var(--border-faint)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-body)' }}>
                      {device.device_name || device.device_id}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Last backup: {device.most_recent_updated_at ? new Date(device.most_recent_updated_at).toLocaleString() : 'unknown'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handlePreviewSync(device)}
                      disabled={checkingDeviceId === device.device_id}
                      style={{
                        padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border-faint)',
                        background: 'transparent', color: 'var(--text-body)', fontSize: '10px', fontWeight: '600',
                        cursor: checkingDeviceId === device.device_id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {checkingDeviceId === device.device_id ? 'Checking…' : 'Preview Sync'}
                    </button>
                    <button
                      onClick={() => handleApplySync(device)}
                      disabled={applyingDeviceId === device.device_id}
                      style={{
                        padding: '7px 14px', borderRadius: '6px', border: 'none',
                        background: applyingDeviceId === device.device_id ? 'var(--border-faint)' : 'var(--primary)',
                        color: '#fff', fontSize: '10px', fontWeight: '600',
                        cursor: applyingDeviceId === device.device_id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {applyingDeviceId === device.device_id ? 'Applying…' : 'Apply Sync'}
                    </button>
                  </div>
                </div>

                {syncPreview && syncPreview.otherBackup && syncPreview.otherBackup.device_id === device.device_id && (() => {
                  // syncPreview shape (from preview_merge in merge_preview.py):
                  //   { generated_at, zip_path_a, zip_path_b, tables: [ { table, changes, ... }, ... ], otherBackup }
                  // `tables` is an ARRAY, and each entry already carries its own
                  // `table` name — iterate the array directly rather than
                  // Object.entries(syncPreview), which would walk top-level keys
                  // like "generated_at" instead of per-table data.
                  const tables = Array.isArray(syncPreview.tables) ? syncPreview.tables : [];
                  const newLines = [];
                  const reviewItems = [];
                  tables.forEach((tableData) => {
                    const { newLine, reviewItems: tableReviewItems } = describeSyncTable(tableData.table, tableData);
                    if (newLine) newLines.push(newLine);
                    reviewItems.push(...tableReviewItems);
                  });

                  return (
                    <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-body)', background: 'var(--bg-subtle, #f7f7f7)', borderRadius: '6px', padding: '10px' }}>
                      {newLines.length === 0 && reviewItems.length === 0 && (
                        <div>Nothing new from this device. Everything already matches.</div>
                      )}
                      {newLines.length > 0 && (
                        <div style={{ marginBottom: reviewItems.length > 0 ? '10px' : 0 }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>From this device:</div>
                          {newLines.map((line, i) => (
                            <div key={i} style={{ marginBottom: '4px', lineHeight: 1.5 }}>{line}</div>
                          ))}
                        </div>
                      )}
                      {reviewItems.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--primary)' }}>Needs your review (edited on both devices):</div>
                          {reviewItems.map((item, i) => (
                            <div
                              key={`${item.table}-${item.key}-${i}`}
                              onClick={() => setActiveDiffItem(item)}
                              style={{ marginBottom: '4px', lineHeight: 1.5, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                              title="Click to see exactly what changed"
                            >
                              {item.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {syncMessage && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px' }}>{syncMessage}</div>
        )}
      </div>

      {/* Backups & Reports to Drive */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--teal)' }}>
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">Backups & Reports to Drive</h3>
          <span className="card-sub">Database backups run automatically; reports send weekly to Drive</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

          {/* Database backup */}
          <div style={{ border: '1px solid var(--border-faint)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-body)', marginBottom: '6px' }}>
              Database Backup
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {backupStatus ? backupStatus.status : 'Checking status…'}
            </div>
            <button
              onClick={handleRunBackupNow}
              disabled={runningBackup || (backupStatus && backupStatus.backup_in_progress)}
              style={{
                padding: '7px 14px', borderRadius: '6px', border: 'none',
                background: (runningBackup || (backupStatus && backupStatus.backup_in_progress)) ? 'var(--border-faint)' : 'var(--primary)',
                color: '#fff', fontSize: '10px', fontWeight: '600',
                cursor: (runningBackup || (backupStatus && backupStatus.backup_in_progress)) ? 'not-allowed' : 'pointer',
              }}
            >
              {runningBackup ? 'Backing up…' : 'Backup Now'}
            </button>
            {backupActionMessage && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>{backupActionMessage}</div>
            )}
          </div>

          {/* Weekly encrypted reports to Drive */}
          <div style={{ border: '1px solid var(--border-faint)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-body)', marginBottom: '6px' }}>
              Weekly Reports to Drive (Encrypted)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {reportsStatus
                ? (reportsStatus.status === 'due'
                    ? 'Due — ready to send'
                    : reportsStatus.status === 'sent'
                      ? `Sent — next due ${reportsStatus.next_due ? new Date(reportsStatus.next_due).toLocaleDateString() : ''}`
                      : 'Inactive')
                : 'Checking status…'}
            </div>
            <button
              onClick={handleSendReportsNow}
              disabled={sendingReports}
              style={{
                padding: '7px 14px', borderRadius: '6px', border: 'none',
                background: sendingReports ? 'var(--border-faint)' : 'var(--teal)',
                color: '#fff', fontSize: '10px', fontWeight: '600',
                cursor: sendingReports ? 'not-allowed' : 'pointer',
              }}
            >
              {sendingReports ? 'Sending…' : 'Send Reports Now'}
            </button>
            {reportsActionMessage && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>{reportsActionMessage}</div>
            )}
          </div>

        </div>
      </div>

      {/* Print & System Defaults */}
      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--teal)' }}>
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">Print & System Defaults</h3>
          <span className="card-sub">Job defaults & automation</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Default Paper</label>
            <select style={{...inputStyle, appearance: 'none', background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238B9BB0\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 10px center'}} value={defaults.paper} onChange={(e) => setDefaults(prev => ({ ...prev, paper: e.target.value }))}>
              <option>A4 80gsm</option>
              <option>A3 80gsm</option>
              <option>A4 120gsm</option>
              <option>Glossy Photo</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Default Finish</label>
            <select style={{...inputStyle, appearance: 'none', background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238B9BB0\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 10px center'}} value={defaults.finish} onChange={(e) => setDefaults(prev => ({ ...prev, finish: e.target.value }))}>
              <option>Matte</option>
              <option>Glossy</option>
              <option>Silk</option>
              <option>None</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-body)', marginBottom: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={defaults.autoBackup} onChange={(e) => setDefaults(prev => ({ ...prev, autoBackup: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              Auto-backup data weekly
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Receipt Footer Text</label>
            <textarea style={{...inputStyle, minHeight: '60px', resize: 'vertical'}} value={defaults.receiptFooter} onChange={(e) => setDefaults(prev => ({ ...prev, receiptFooter: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
         POPUP MODALS (Overlay)
         ═══════════════════════════════════════ */}
      
      {/* 1. ADD ITEM MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Icon d={D.x} size={16} />
              </button>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Item Name</label>
              <input 
                autoFocus
                style={inputStyle} 
                placeholder="e.g., A5 Printing, Rent, Electricity..." 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</label>
                <input style={inputStyle} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Unit</label>
                <input style={inputStyle} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Cost / Price (MK)</label>
              <input 
                type="text"
                style={inputStyle} 
                placeholder="0" 
                value={newItem.value}
                onChange={e => setNewItem({...newItem, value: e.target.value})}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Fixed Cost Estimate (MK)</label>
              <input type="text" style={inputStyle} placeholder="0" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmAdd}
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={modalCardStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--red)' }}>
                <Icon d={D.trash} size={20} />
              </div>
              <h3 className="card-title" style={{ marginBottom: '8px' }}>Remove Item?</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Are you sure you want to remove this pricing item? This action cannot be undone.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setDeleteId(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Keep It
                </button>
                <button 
                  onClick={confirmDelete}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--red)', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FIELD-BY-FIELD SYNC DIFF MODAL */}
      {activeDiffItem && (
        <FieldDiffModal item={activeDiffItem} onClose={() => setActiveDiffItem(null)} />
      )}

    </main>
  );
}