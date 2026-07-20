import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { api } from '../api/client';

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
  plus: 'M12 5v14M5 12h14',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  tag: 'M20.59 13.41 11 3.83A2.82 2.82 0 0 0 9 3H4a1 1 0 0 0-1 1v5c0 .75.3 1.47.83 2l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83zM7 7h.01',
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-faint)',
  background: '#fff',
  color: 'var(--text-body)',
  fontSize: '11px',
  outline: 'none',
  boxSizing: 'border-box',
};

const money = (value) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function StatCard({ label, value, sub, icon, color }) {
  const colorMap = { warning: 'var(--warning)', red: 'var(--red)', teal: 'var(--teal)', secondary: 'var(--secondary)', primary: 'var(--primary)' };
  return (
    <div className="card fin-card">
      <div className="fin-top"><div className="fin-label" style={{ color: '#374f6c' }}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)', fontSize: '18px' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export default function Settings() {
  const [machines, setMachines] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [machineRevenue, setMachineRevenue] = useState([]);
  const [category, setCategory] = useState('All');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newPrice, setNewPrice] = useState({
    code: '',
    name: '',
    category: 'DTF Apparel',
    machine_id: '',
    unit: 'unit',
    price: '',
    cost_estimate: '',
  });

  async function loadSettings() {
    const [machineResponse, pricingResponse, revenueResponse] = await Promise.all([
      api.machines('?per_page=200'),
      api.pricingItems('?per_page=300'),
      api.machineRevenue(),
    ]);
    setMachines(machineResponse.items || []);
    setPricing(pricingResponse.items || []);
    setMachineRevenue(revenueResponse.items || []);
  }

  useEffect(() => {
    loadSettings().catch(err => setError(err.message || 'Could not load settings'));
  }, []);

  const categories = useMemo(() => ['All', ...new Set(pricing.map(item => item.category))], [pricing]);
  const filteredPricing = pricing.filter(item => category === 'All' || item.category === category);
  const activeMachines = machines.filter(machine => machine.status === 'active');
  const plannedMachines = machines.filter(machine => machine.status === 'planned');
  const topMachine = machineRevenue[0];

  const savePrice = async () => {
    if (!newPrice.code || !newPrice.name || !newPrice.price) return;
    setSaving(true);
    try {
      await api.createPricingItem({
        ...newPrice,
        machine_id: newPrice.machine_id ? Number(newPrice.machine_id) : null,
        price: Number(newPrice.price),
        cost_estimate: Number(newPrice.cost_estimate || 0),
      });
      setNewPrice({ code: '', name: '', category: 'DTF Apparel', machine_id: '', unit: 'unit', price: '', cost_estimate: '' });
      await loadSettings();
      setError('');
    } catch (err) {
      setError(err.message || 'Could not save pricing item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="main-canvas">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)', position: 'relative' }}>
        <div style={{ position: 'relative', paddingLeft: '14px' }}>
          <div style={{ position: 'absolute', left: 0, top: '2px', bottom: '2px', width: '3px', background: 'linear-gradient(to bottom, var(--primary), var(--teal))', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, paddingRight: '60px' }}>Settings</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Machines, services and unit pricing</p>
        </div>
      </header>

      {error && <div className="card" style={{ marginBottom: '14px', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
        <StatCard label="Machines" value={machines.length} sub={`${activeMachines.length} active, ${plannedMachines.length} planned`} icon="printer" color="primary" />
        <StatCard label="Price Items" value={pricing.length} sub="Unit prices from backend" icon="tag" color="secondary" />
        <StatCard label="Top Machine" value={topMachine ? money(topMachine.revenue) : 'MK 0'} sub={topMachine?.name || 'No revenue yet'} icon="check" color="teal" />
        <StatCard label="Currency" value="MWK" sub="Malawian Kwacha" icon="settings" color="warning" />
      </div>

      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">Machine Fleet</h3>
          <span className="card-sub">Production assets and planned expansion</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
          {machines.map(machine => (
            <div key={machine.id} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-faint)', borderRadius: 'var(--r-card)', overflow: 'hidden' }}>
              {machine.image_path && <img src={machine.image_path} alt={machine.name} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />}
              <div style={{ padding: '12px' }}>
                <div className="vendor-name">{machine.name}</div>
                <div className="vendor-cat">{machine.category}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px', lineHeight: 1.5, margin: '8px 0 0' }}>{machine.capability}</p>
                <span className={`status-badge ${machine.status === 'active' ? 'paid' : 'pending'}`} style={{ marginTop: '8px' }}>{machine.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--secondary)' }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">Add Unit Price</h3>
          <span className="card-sub">These prices are used for quotes and invoice line items</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <input style={inputStyle} placeholder="Code e.g. DTF-HOODIE" value={newPrice.code} onChange={e => setNewPrice(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} />
          <input style={inputStyle} placeholder="Service name" value={newPrice.name} onChange={e => setNewPrice(prev => ({ ...prev, name: e.target.value }))} />
          <input style={inputStyle} placeholder="Category" value={newPrice.category} onChange={e => setNewPrice(prev => ({ ...prev, category: e.target.value }))} />
          <select style={inputStyle} value={newPrice.machine_id} onChange={e => setNewPrice(prev => ({ ...prev, machine_id: e.target.value }))}>
            <option value="">No machine</option>
            {machines.map(machine => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
          </select>
          <input style={inputStyle} placeholder="Unit" value={newPrice.unit} onChange={e => setNewPrice(prev => ({ ...prev, unit: e.target.value }))} />
          <input style={inputStyle} type="number" placeholder="Selling price" value={newPrice.price} onChange={e => setNewPrice(prev => ({ ...prev, price: e.target.value }))} />
          <input style={inputStyle} type="number" placeholder="Cost estimate" value={newPrice.cost_estimate} onChange={e => setNewPrice(prev => ({ ...prev, cost_estimate: e.target.value }))} />
          <button onClick={savePrice} disabled={saving} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Icon d={D.plus} size={12} /> {saving ? 'Saving...' : 'Add Price'}
          </button>
        </div>
      </div>

      <div className="card" style={{ borderTop: '2px solid var(--teal)' }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">Pricing Library</h3>
          <span className="card-sub">{filteredPricing.length} item{filteredPricing.length === 1 ? '' : 's'}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {categories.map(item => <button key={item} className={`filter-btn ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
          {filteredPricing.map(item => (
            <div key={item.id} style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>{item.code}</span>
              <div className="vendor-name" style={{ marginTop: '4px' }}>{item.name}</div>
              <div className="vendor-cat">{item.category} - {item.machine_name || 'Manual'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                <div>
                  <div className="fin-sub">Price / {item.unit}</div>
                  <div className="activity-amount">{money(item.price)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="fin-sub">Cost</div>
                  <div className="activity-time">{money(item.cost_estimate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
