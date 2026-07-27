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
    name: 'T-Tech Printing Solutions',
    phone: '+265 1 234 567',
    email: 'info@ttechmw.com',
    address: 'Area 47, Lilongwe, Malawi',
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

    </main>
  );
}
