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

function TransactionRow({ txn }) {
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
        {txn.job_ref ? `Job ${txn.job_ref}` : ''}
        {txn.output_quantity ? `${txn.job_ref ? ' - ' : ''}${number(txn.output_quantity)} ${txn.output_description || 'output'}` : ''}
        {txn.notes ? `${txn.job_ref || txn.output_quantity ? ' - ' : ''}${txn.notes}` : ''}
      </span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{compactDate(txn.transaction_date)}</span>
    </div>
  );
}

function MaterialDetail({ material, onBack, onLogTransaction, notify }) {
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

  useEffect(() => { load(); }, [material.id]);

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
        {!loading && transactions.map(txn => <TransactionRow key={txn.id} txn={txn} />)}
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
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '11px', outline: 'none' }}
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
      if (form.transaction_type !== 'count') {
        if (form.job_id) payload.job_id = Number(form.job_id);
        if (form.transaction_type === 'usage' && form.output_quantity !== '') {
          payload.output_quantity = Number(form.output_quantity);
          payload.output_description = form.output_description || null;
        }
      }
      await api.createMaterialTransaction(txnMaterial.id, payload);
      notify('Transaction logged');
      setTxnMaterial(null);
      loadMaterials();
      if (selected?.id === txnMaterial.id) {
        // Refresh the open detail view's stock figures by re-fetching the summary.
        const data = await api.materialsSummary();
        const updated = (data.items || []).find(m => m.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (saveError) {
      notify(saveError.message || 'Could not log transaction', 'error');
    }
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader
        title="Materials"
        subtitle="Stock, consumption & month-end reconciliation"
        actionLabel={view === 'Directory' && !selected ? 'New Material' : undefined}
        onAction={() => setShowEntry(true)}
      />

      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {VIEWS.map(v => (
          <button
            key={v}
            className={`filter-btn ${view === v ? 'active' : ''}`}
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
        isOpen={Boolean(txnMaterial)}
        material={txnMaterial}
        onClose={() => setTxnMaterial(null)}
        onSave={handleLogTransaction}
      />
      <ModuleToast toast={toast} />
    </main>
  );
}