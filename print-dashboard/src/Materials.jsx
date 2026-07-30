// path: src/Materials.jsx
//
// Frontend for the backend built in an earlier session (services/materials.py,
// services/reports.py's build_materials_reconciliation()). Three views in one
// page, switched by a segmented control rather than three separate nav items,
// since they're all facets of the same "materials" concept:
//   - Directory: every material's live stock/revenue/projection (existing
//     GET /materials/summary, previously backend-only with no UI).
//   - Transactions: drill into one material's ledger, log a new
//     purchase/usage/adjustment/count.
//   - Month-End Report: the periodic-inventory reconciliation Wayne asked
//     for — opening/purchased/consumed/closing per material, cross-checked
//     against a physical count and against recorded output ("this much
//     vinyl became this much stickers").

import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { money, compactDate, number } from './utils/format';
import { NewMaterialModal, RecordMaterialTransactionModal } from './components/Modals';
import { Icon, ModuleHeader, ModuleToast, RegisterCard, STANDARD_ICONS, StatsGrid, useModuleToast } from './components/ModuleStandard';

const D = {
  ...STANDARD_ICONS,
  materials: 'M20 7h-9M14 17H5M17 4l3 3-3 3M7 20l-3-3 3-3',
  back: 'M19 12H5M12 19l-7-7 7-7',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 1 1 .5 4M3 3v6h6',
};

const VIEWS = ['Directory', 'Month-End Report'];

// Sync T-Tech Materials: same pattern as Settings.jsx's "Sync T-Tech
// Machines" / DEFAULT_MACHINES button -- a fixed, hardcoded list of
// Wayne's real materials (not test/seed data), used only to fill in any
// that are missing on THIS device. Not a device-to-device sync. Runs
// instantly, no other computer involved. machine_ref values match
// DEFAULT_MACHINES in Settings.jsx so materials link to the right machine.
// Only the material definitions themselves are created here -- no
// purchase/usage transactions -- so a fresh install gets clean, empty
// stock/transaction history for each of these.
const DEFAULT_MATERIALS = [
  { name: 'PVC Banner', unit: 'sqm', category: 'Large format ink', machine_ref: 'MCH-LF-01', vendor_name: 'FlexMaster Media', unit_cost: 4200, reorder_point: 40, notes: 'Standard outdoor banner stock.' },
  { name: 'Vinyl Sticker', unit: 'sqm', category: 'Large format ink', machine_ref: 'MCH-LF-01', vendor_name: 'FlexMaster Media', unit_cost: 5800, reorder_point: 30, notes: 'Self-adhesive vinyl for stickers and general cut vinyl.' },
  { name: 'Large Format Ink', unit: 'L', category: 'Large format ink', machine_ref: 'MCH-LF-01', vendor_name: 'InkPro Malawi', unit_cost: 32000, reorder_point: 8, notes: 'CMYK ink set for the large format printer, shared across banner/sticker jobs.' },
  { name: 'Grayback Banner', unit: 'sqm', category: 'Large format ink', machine_ref: 'MCH-LF-01', vendor_name: 'FlexMaster Media', unit_cost: 3800, reorder_point: 30, notes: 'Grayback banner stock.' },
  { name: 'Contra Vision', unit: 'sqm', category: 'Large format ink', machine_ref: 'MCH-LF-01', vendor_name: 'FlexMaster Media', unit_cost: 6500, reorder_point: 20, notes: 'Perforated window vision film.' },
  { name: 'DTF Film', unit: 'm', category: 'Large format ink', machine_ref: 'MCH-DTF-01', vendor_name: 'InkPro Malawi', unit_cost: 8500, reorder_point: 20, notes: 'DTF transfer film roll.' },
  { name: 'DTF Powder', unit: 'kg', category: 'Large format ink', machine_ref: 'MCH-DTF-01', vendor_name: 'InkPro Malawi', unit_cost: 15500, reorder_point: 5, notes: 'Hot-melt adhesive powder for DTF transfers.' },
  { name: 'Digital Printer Ink', unit: 'L', category: 'Large format ink', machine_ref: 'MCH-DIGI-01', vendor_name: 'InkPro Malawi', unit_cost: 28000, reorder_point: 8, notes: 'Ink for the digital printer (books, magazines, calendars).' },
  { name: 'Digital Printer Paper', unit: 'ream', category: 'Paper & card stock', machine_ref: 'MCH-DIGI-01', vendor_name: 'Paperline Supplies', unit_cost: 17500, reorder_point: 15, notes: 'Paper stock for the digital printer.' },
  { name: 'Staples', unit: 'box', category: 'Paper & card stock', machine_ref: 'MCH-BIND-01', vendor_name: 'Paperline Supplies', unit_cost: 3200, reorder_point: 10, notes: 'Staples for binding/finishing.' },
  { name: 'UV DTF Film', unit: 'm', category: 'Large format ink', machine_ref: 'MCH-UVDTF-01', vendor_name: 'InkPro Malawi', unit_cost: 9500, reorder_point: 15, notes: 'UV DTF transfer film roll.' },
  { name: 'UV DTF Ink', unit: 'L', category: 'Large format ink', machine_ref: 'MCH-UVDTF-01', vendor_name: 'InkPro Malawi', unit_cost: 34000, reorder_point: 6, notes: 'Ink set for the UV DTF printer.' },
  { name: 'Pebble Ribbon', unit: 'roll', category: 'Large format ink', machine_ref: 'MCH-PVC-01', vendor_name: 'InkPro Malawi', unit_cost: 22000, reorder_point: 5, notes: 'Ribbon for the Pebble/Evolis card printer.' },
  { name: 'PVC Cards', unit: 'card', category: 'Paper & card stock', machine_ref: 'MCH-PVC-01', vendor_name: 'Paperline Supplies', unit_cost: 450, reorder_point: 100, notes: 'Blank PVC cards for the Pebble/Evolis card printer.' },
  { name: 'Konica Minolta Paper', unit: 'ream', category: 'Paper & card stock', machine_ref: 'MCH-KM-01', vendor_name: 'Paperline Supplies', unit_cost: 18500, reorder_point: 15, notes: 'Paper stock for the Konica Minolta press (calendars, books, normal printing).' },
  { name: 'Konica Minolta Ink', unit: 'L', category: 'Large format ink', machine_ref: 'MCH-KM-01', vendor_name: 'InkPro Malawi', unit_cost: 30000, reorder_point: 8, notes: 'Ink/toner for the Konica Minolta press.' },
  { name: 'Sublimation Paper', unit: 'ream', category: 'Paper & card stock', machine_ref: 'MCH-SUB-01', vendor_name: 'Paperline Supplies', unit_cost: 12500, reorder_point: 15, notes: 'Transfer paper for the sublimation printer.' },
  { name: 'Sublimation Ink', unit: 'L', category: 'Large format ink', machine_ref: 'MCH-SUB-01', vendor_name: 'InkPro Malawi', unit_cost: 27000, reorder_point: 6, notes: 'Ink set for the sublimation printer (mug cups).' },
];

/* ═══════════════════════════════════════ Directory ═══════════════════════════════════════ */

function MaterialCard({ material, onOpen, onEdit }) {
  const proj = material.projection || {};
  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px', cursor: 'pointer' }} onClick={() => onOpen(material)}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: material.low_stock ? 'var(--red)' : 'var(--teal)', borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{material.name.slice(0, 2).toUpperCase()}</div>
      <div className="vendor-info">
        <div className="vendor-name">{material.name}</div>
        <div className="vendor-cat">{material.category || 'Uncategorised'} - {material.material_ref}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '150px' }}>
        <div className="activity-amount">{number(material.on_hand)} {material.unit} on hand</div>
        <div className="activity-time">
          {proj.days_remaining != null ? `~${proj.days_remaining}d remaining` : proj.basis || 'No usage yet'}
        </div>
      </div>
      {material.low_stock && <span className="status-badge overdue" style={{ marginLeft: '12px' }}>Low Stock</span>}
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="filter-btn" style={{ padding: '4px 8px', fontSize: '9px' }} onClick={e => { e.stopPropagation(); onEdit(material); }}>Edit</button>
      </div>
    </div>
  );
}

function TransactionRow({ txn, onEdit, onDelete }) {
  const typeColor = {
    purchase: 'var(--teal)',
    usage: 'var(--primary)',
    adjustment: 'var(--warning)',
    count: 'var(--secondary)',
  }[txn.transaction_type] || 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)', fontSize: '11px' }}>
      <span className="status-badge" style={{ background: `${typeColor}22`, color: typeColor, textTransform: 'capitalize', flexShrink: 0 }}>{txn.transaction_type}</span>
      <span style={{ fontWeight: 600, minWidth: '70px' }}>{number(txn.quantity)}</span>
      <span style={{ color: 'var(--text-muted)', flex: 1 }}>
        {txn.vendor_name ? `from ${txn.vendor_name}` : ''}
        {txn.job_ref ? `${txn.vendor_name ? ' - ' : ''}Job ${txn.job_ref}` : ''}
        {txn.output_quantity ? `${txn.vendor_name || txn.job_ref ? ' - ' : ''}${number(txn.output_quantity)} ${txn.output_description || 'output'}` : ''}
        {txn.notes ? `${txn.vendor_name || txn.job_ref || txn.output_quantity ? ' - ' : ''}${txn.notes}` : ''}
      </span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{compactDate(txn.transaction_date)}</span>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button className="filter-btn" style={{ padding: '3px 7px', fontSize: '9px' }} onClick={() => onEdit(txn)}>Edit</button>
        <button className="filter-btn" style={{ padding: '3px 7px', fontSize: '9px', color: 'var(--red)' }} onClick={() => onDelete(txn)}>Delete</button>
      </div>
    </div>
  );
}

function MaterialDetail({ material, onBack, onLogTransaction, onEditTransaction, onDeleteTransaction, refreshKey, notify }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciliation, setReconciliation] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.materialTransactions(material.id, '?per_page=100'),
      api.materialReconciliation(material.id),
    ])
      .then(([txnData, reconData]) => {
        setTransactions(txnData.items || []);
        setReconciliation(reconData);
      })
      .catch(() => notify('Could not load material history', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [material.id, refreshKey]);

  return (
    <div>
      <button className="filter-btn" style={{ padding: '5px 10px', fontSize: '10px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={onBack}>
        <Icon d={D.back} size={11} /> Back to Directory
      </button>
      <StatsGrid stats={[
        { label: 'On Hand', value: `${number(material.on_hand)} ${material.unit}`, sub: `${number(material.purchased)} purchased, ${number(material.used)} used`, icon: D.materials, color: material.low_stock ? 'red' : 'teal' },
        { label: 'Revenue Generated', value: money(material.revenue_generated), sub: `Across ${material.jobs_supplied} job(s)`, icon: D.check, color: 'primary' },
        { label: 'Est. Profit', value: money(material.estimated_profit), sub: `Spent ${money(material.total_spent)}`, icon: D.ar, color: 'secondary' },
        {
          label: 'Physical Count Check',
          value: reconciliation?.reconciled ? `${reconciliation.variance >= 0 ? '+' : ''}${number(reconciliation.variance)} ${material.unit}` : 'No count yet',
          sub: reconciliation?.reconciled ? `Counted ${compactDate(reconciliation.count_date)}` : 'Log a count to reconcile',
          icon: D.alert,
          color: reconciliation?.reconciled && Math.abs(reconciliation.variance) > 0.001 ? 'warning' : 'teal',
        },
      ]} />
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Transaction History</h3>
          <button className="notif-btn" style={{ width: 'auto', padding: '5px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => onLogTransaction(material)}>
            <Icon d={D.plus} size={10} /> Log Transaction
          </button>
        </div>
        {loading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>Loading...</div>}
        {!loading && transactions.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No transactions logged yet.</div>}
        {!loading && transactions.map(txn => (
          <TransactionRow
            key={txn.id}
            txn={txn}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ Month-End Reconciliation Report ═══════════════════════════════════════ */

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function ReconciliationRow({ row }) {
  const variance = row.physical_count_check?.variance;
  const hasVariance = row.physical_count_check && Math.abs(variance) > 0.001;
  const outputEntries = Object.entries(row.output_produced || {});
  return (
    <tr style={{ borderBottom: '1px solid var(--border-faint)' }}>
      <td style={{ padding: '8px', fontWeight: 600 }}>{row.name}<div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>{row.material_ref}</div></td>
      <td style={{ padding: '8px', textAlign: 'right' }}>{number(row.opening_stock)}</td>
      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--teal)' }}>+{number(row.purchased)}</td>
      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--red)' }}>-{number(row.consumed)}</td>
      <td style={{ padding: '8px', textAlign: 'right' }}>{row.adjusted !== 0 ? number(row.adjusted) : '-'}</td>
      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{number(row.closing_stock)} {row.unit}</td>
      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
        {outputEntries.length === 0 ? '-' : outputEntries.map(([label, qty]) => (
          <div key={label}>{number(qty)} {label}</div>
        ))}
      </td>
      <td style={{ padding: '8px', textAlign: 'right' }}>
        {!row.physical_count_check ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Not counted</span>
        ) : (
          <span className={`status-badge ${hasVariance ? 'overdue' : 'active'}`}>
            {variance >= 0 ? '+' : ''}{number(variance)}
          </span>
        )}
      </td>
    </tr>
  );
}

function MonthEndReport({ notify }) {
  const [month, setMonth] = useState(currentMonthValue());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.materialsReconciliationReport(month)
      .then(setReport)
      .catch(() => setError('Could not load the reconciliation report. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, [month]);

  const rows = report?.materials || [];
  const unreconciledCount = report?.flags?.unreconciled_count?.length || 0;
  const varianceCount = report?.flags?.count_variance?.length || 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Month</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-faint)',
            background: '#fff',
            color: 'var(--text-head)',
            colorScheme: 'light',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        {report && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{report.period_start} to {report.period_end} - Periodic inventory method</span>}
      </div>

      {(unreconciledCount > 0 || varianceCount > 0) && !loading && (
        <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--warning)', padding: '12px 16px', display: 'flex', gap: '18px', fontSize: '11px' }}>
          {varianceCount > 0 && <span><strong style={{ color: 'var(--red)' }}>{varianceCount}</strong> material(s) with a count variance</span>}
          {unreconciledCount > 0 && <span><strong style={{ color: 'var(--warning)' }}>{unreconciledCount}</strong> material(s) not yet counted this month</span>}
        </div>
      )}

      <div className="card" style={{ borderTop: '2px solid var(--secondary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}>
          <h3 className="card-title">Monthly Materials Reconciliation</h3>
          <span className="card-sub">{report?.formula}</span>
        </div>
        {loading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>Loading...</div>}
        {!loading && error && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
        {!loading && !error && rows.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No materials on record.</div>}
        {!loading && !error && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Material</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Opening</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Purchased</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Consumed</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Adjusted</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Closing</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Output Produced</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Count Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => <ReconciliationRow key={row.material_id} row={row} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ Page ═══════════════════════════════════════ */

export default function Materials() {
  const [view, setView] = useState('Directory');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [txnMaterial, setTxnMaterial] = useState(null);
  // Item 4/5 (flagged gaps, fixed this pass): editTxn holds the transaction
  // being edited (null = "Log Transaction" create flow, set = edit flow -
  // both share the same modal). jobs is the list RecordMaterialTransactionModal
  // searches against for the Job-link field (item 5), fetched once here
  // rather than per-modal-open, since the job list doesn't change within a
  // single Materials page session and jobs() can return a lot of rows.
  const [editTxn, setEditTxn] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [txnRefreshKey, setTxnRefreshKey] = useState(0);
  const { toast, notify } = useModuleToast();

  const loadMaterials = () => {
    setLoading(true);
    setError(null);
    api.materialsSummary()
      .then(data => setMaterials(data.items || []))
      .catch(() => setError('Could not load materials. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMaterials(); }, []);
  useEffect(() => {
    api.jobs('?per_page=200').then(data => setJobs(data.items || [])).catch(() => {});
  }, []);
  useEffect(() => {
    api.vendors('?per_page=200').then(data => setVendors(data.items || [])).catch(() => {});
  }, []);

  const filtered = materials.filter(m => `${m.name} ${m.category} ${m.material_ref}`.toLowerCase().includes(search.toLowerCase()));
  const lowStockCount = materials.filter(m => m.low_stock).length;
  const totalOnHandValue = materials.reduce((sum, m) => sum + (m.on_hand * (m.unit_cost || 0)), 0);
  const totalRevenue = materials.reduce((sum, m) => sum + (m.revenue_generated || 0), 0);

  const stats = [
    { label: 'Materials Tracked', value: String(materials.length), sub: `${lowStockCount} low stock`, icon: D.materials, color: 'primary' },
    { label: 'Stock Value', value: money(totalOnHandValue), sub: 'Current on-hand, at cost', icon: D.ar, color: 'teal' },
    { label: 'Revenue Generated', value: money(totalRevenue), sub: 'Attributed via job usage', icon: D.check, color: 'secondary' },
    { label: 'Low Stock', value: String(lowStockCount), sub: 'At or below reorder point', icon: D.alert, color: lowStockCount > 0 ? 'warning' : 'teal' },
  ];

  const [syncingMaterials, setSyncingMaterials] = useState(false);

  const seedDefaultMaterials = async () => {
    setSyncingMaterials(true);
    try {
      const existingRefs = new Set((materials || []).map(m => m.name.trim().toLowerCase()));
      const [machinesRes, vendorsRes] = await Promise.all([
        api.machines('?per_page=200'),
        api.vendors('?per_page=200'),
      ]);
      const machineByRef = new Map((machinesRes.items || []).map(m => [m.machine_ref, m.id]));
      const vendorByName = new Map((vendorsRes.items || []).map(v => [v.name, v.id]));

      for (const item of DEFAULT_MATERIALS) {
        if (existingRefs.has(item.name.trim().toLowerCase())) continue;
        await api.createMaterial({
          name: item.name,
          unit: item.unit,
          category: item.category,
          unit_cost: item.unit_cost,
          reorder_point: item.reorder_point,
          notes: item.notes,
          machine_id: machineByRef.get(item.machine_ref) || null,
          vendor_id: vendorByName.get(item.vendor_name) || null,
        });
      }
      loadMaterials();
      notify('Materials synced');
    } catch (syncError) {
      notify(syncError.message || 'Could not sync materials', 'error');
    } finally {
      setSyncingMaterials(false);
    }
  };

  const handleSaveMaterial = async form => {
    try {
      const payload = {
        name: form.name,
        category: form.category || null,
        unit: form.unit || 'unit',
        unit_cost: Number(form.unit_cost) || 0,
        reorder_point: form.reorder_point === '' ? null : Number(form.reorder_point),
        notes: form.notes,
      };
      if (editRecord?.id) {
        await api.updateMaterial(editRecord.id, payload);
        notify('Material updated');
      } else {
        await api.createMaterial(payload);
        notify('Material created');
      }
      setShowEntry(false);
      setEditRecord(null);
      loadMaterials();
    } catch (saveError) {
      notify(saveError.message || 'Could not save material', 'error');
    }
  };

  const handleLogTransaction = async form => {
    try {
      const payload = {
        transaction_type: form.transaction_type,
        quantity: Number(form.quantity),
        transaction_date: form.transaction_date,
        notes: form.notes || null,
      };
      if (form.transaction_type === 'purchase' && form.unit_cost !== '') payload.unit_cost = Number(form.unit_cost);
      if (form.transaction_type === 'purchase') payload.vendor_id = form.vendor_id ? Number(form.vendor_id) : null;
      if (form.transaction_type !== 'count') {
        payload.job_id = form.job_id ? Number(form.job_id) : null;
        if (form.transaction_type === 'usage' && form.output_quantity !== '') {
          payload.output_quantity = Number(form.output_quantity);
          payload.output_description = form.output_description || null;
        } else {
          payload.output_quantity = null;
          payload.output_description = null;
        }
      }
      if (editTxn) {
        await api.updateMaterialTransaction(editTxn.id, payload);
        notify('Transaction updated');
      } else {
        await api.createMaterialTransaction(txnMaterial.id, payload);
        notify('Transaction logged');
      }
      setTxnMaterial(null);
      setEditTxn(null);
      loadMaterials();
      setTxnRefreshKey(k => k + 1);
      if (selected?.id === (txnMaterial?.id || editTxn?.material_id)) {
        // Refresh the open detail view's stock figures by re-fetching the summary.
        const data = await api.materialsSummary();
        const updated = (data.items || []).find(m => m.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (saveError) {
      notify(saveError.message || 'Could not save transaction', 'error');
    }
  };

  const handleDeleteTransaction = async txn => {
    if (!window.confirm(`Delete this ${txn.transaction_type} transaction (${txn.quantity})? This cannot be undone.`)) return;
    try {
      await api.deleteMaterialTransaction(txn.id);
      notify('Transaction deleted');
      loadMaterials();
      setTxnRefreshKey(k => k + 1);
    } catch (deleteError) {
      notify(deleteError.message || 'Could not delete transaction', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <ModuleHeader
          title="Materials"
          subtitle="Stock, consumption & month-end reconciliation"
        />
        {view === 'Directory' && !selected && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              onClick={seedDefaultMaterials}
              disabled={syncingMaterials}
              style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: '600', color: 'var(--primary)', cursor: syncingMaterials ? 'not-allowed' : 'pointer' }}
            >
              {syncingMaterials ? 'Syncing…' : 'Sync T-Tech Materials'}
            </button>
            <button
              onClick={() => setShowEntry(true)}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50px',
                padding: '7px 15px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(58,80,107,0.35)',
              }}
            >
              New Material
            </button>
          </div>
        )}
      </div>

      <div className="chart-filters on-canvas" style={{ display: 'flex', gap: '6px', marginBottom: '14px', width: 'fit-content' }}>
        {VIEWS.map(v => (
          <button
            key={v}
            className={`filter-btn on-canvas ${view === v ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '11px', fontWeight: view === v ? 600 : 500 }}
            onClick={() => { setView(v); setSelected(null); }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'Directory' && !selected && (
        <>
          <StatsGrid stats={stats} />
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="Search material, category, or ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: '320px', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '11px', outline: 'none' }}
            />
          </div>
          <RegisterCard
            title="Material Directory"
            countLabel={`${filtered.length} material${filtered.length !== 1 ? 's' : ''} found`}
            loading={loading}
            error={error}
            emptyIcon="MAT"
            emptyMessage="No materials match your search."
          >
            {filtered.map(material => (
              <MaterialCard
                key={material.id}
                material={material}
                onOpen={setSelected}
                onEdit={record => setEditRecord(record)}
              />
            ))}
          </RegisterCard>
        </>
      )}

      {view === 'Directory' && selected && (
        <MaterialDetail
          material={selected}
          onBack={() => setSelected(null)}
          onLogTransaction={setTxnMaterial}
          onEditTransaction={txn => setEditTxn(txn)}
          onDeleteTransaction={handleDeleteTransaction}
          refreshKey={txnRefreshKey}
          notify={notify}
        />
      )}

      {view === 'Month-End Report' && <MonthEndReport notify={notify} />}

      <NewMaterialModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={handleSaveMaterial}
      />
      <RecordMaterialTransactionModal
        isOpen={Boolean(txnMaterial) || Boolean(editTxn)}
        material={txnMaterial || selected}
        editRecord={editTxn}
        jobs={jobs}
        vendors={vendors}
        onClose={() => { setTxnMaterial(null); setEditTxn(null); }}
        onSave={handleLogTransaction}
      />
      <ModuleToast toast={toast} />
    </main>
  );
}