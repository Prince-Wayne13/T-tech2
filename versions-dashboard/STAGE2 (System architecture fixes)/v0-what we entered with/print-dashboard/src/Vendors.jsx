// Vendors.jsx — PrintOps BMS (Malawi-Ready)
import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { NewVendorModal } from './components/Modals';

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
  vendors: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
};

const VENDOR_CATEGORIES = ['All', 'Paper & Supplies', 'Ink & Toner', 'Equipment', 'Logistics', 'Utilities', 'Other'];

const VENDORS_DATA = [
  { id: 'VEN-101', name: 'Paper Plus Co.', category: 'Paper & Supplies', contact: 'sales@paperplus.mw', phone: '+265 1 234 567', balance: 'MK 340,000', status: 'current', lastOrder: '10 Mar 2026', notes: 'Net 30 terms, bulk discounts available' },
  { id: 'VEN-102', name: 'Ink Masters', category: 'Ink & Toner', contact: 'accounts@inkmasters.mw', phone: '+265 1 345 678', balance: 'MK 890,000', status: 'overdue', lastOrder: '05 Mar 2026', notes: 'Urgent payment needed - credit limit reached' },
  { id: 'VEN-103', name: 'Swift Delivery', category: 'Logistics', contact: 'billing@swift.mw', phone: '+265 999 123 456', balance: 'MK 150,000', status: 'current', lastOrder: '12 Mar 2026', notes: 'Monthly contract, auto-pay enabled' },
  { id: 'VEN-104', name: 'PrintTech Parts', category: 'Equipment', contact: 'service@printtech.mw', phone: '+265 1 456 789', balance: 'MK 1,200,000', status: 'overdue', lastOrder: '01 Mar 2026', notes: 'Annual service contract, VAT inclusive' },
  { id: 'VEN-105', name: 'Office Depot', category: 'Paper & Supplies', contact: 'orders@officedepot.mw', phone: '+265 1 567 890', balance: 'MK 0', status: 'current', lastOrder: '14 Mar 2026', notes: 'Paid in full, reliable supplier' },
  { id: 'VEN-106', name: 'PowerCom Ltd', category: 'Utilities', contact: 'billing@powercom.mw', phone: '+265 1 800 200', balance: 'MK 185,000', status: 'current', lastOrder: '01 Apr 2026', notes: 'Monthly electricity, due 5th of each month' },
];

function VendorRow({ vendor, isExpanded, onToggle, onPreview, onEdit }) {
  const statusConfig = {
    current: { label: 'Current', cls: 'paid', accent: 'var(--teal)' },
    overdue: { label: 'Overdue', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[vendor.status];
  const [hovered, setHovered] = useState(false);

  // Get initials from vendor name
  const initials = vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <>
      <div 
        className="vendor-item" 
        style={{ 
          position: 'relative', 
          paddingLeft: '14px', 
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'background var(--ease)',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
      >
        {/* Status accent bar */}
        <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
        
        {/* Avatar (Vendor Initials) */}
        <div className="vendor-avatar" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>{initials}</div>
        
        {/* Info */}
        <div className="vendor-info">
          <div className="vendor-name">{vendor.name}</div>
          <div className="vendor-cat">{vendor.category} • {vendor.contact}</div>
        </div>
        
        {/* Balance + Last Order */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '120px' }}>
          <div className="activity-amount">{vendor.balance}</div>
          <div className="activity-time">Last: {vendor.lastOrder}</div>
        </div>
        
        {/* Status Badge + Actions */}
        <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="View Details" onClick={(e) => { e.stopPropagation(); onPreview(vendor); }}>
            <Icon d={D.eye} size={11} />
          </button>
          <Icon d={D.chevron} size={12} style={{ 
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
            transition: 'transform var(--ease)', 
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }} />
        </div>
      </div>
      
      {/* Expandable Detail Panel */}
      {isExpanded && (
        <div style={{ 
          marginLeft: '14px', 
          padding: '10px 14px', 
          background: 'var(--bg-canvas)', 
          borderRadius: '0 0 var(--r-card) var(--r-card)', 
          borderTop: '1px solid var(--border-faint)', 
          animation: 'fadeIn 0.2s ease',
          fontSize: '11px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {vendor.phone}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {vendor.notes}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="notif-btn" style={{ width: '26px', height: '26px' }} title="Send Message" onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${vendor.contact}`; }}>
                <Icon d={D.send} size={11} />
              </button>
              <button className="filter-btn" style={{ padding: '5px 9px', fontSize: '9px' }} title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(vendor); }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = { warning: 'var(--warning)', red: 'var(--red)', teal: 'var(--teal)', secondary: 'var(--secondary)', primary: 'var(--primary)' };
  return (
    <div className="card fin-card">
      <div className="fin-top"><div className="fin-label" style={{color:'#374f6c'}}>{label}</div><div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div></div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export default function Vendors() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState(VENDOR_CATEGORIES);
  const [showEntry, setShowEntry] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  useEffect(() => {
    let active = true;
    api.vendors('?per_page=200')
      .then(data => {
        if (!active) return;
        const items = (data.items || []).map(vendor => ({
          id: `VEN-${vendor.id}`,
          backendId: vendor.id,
          name: vendor.name,
          category: vendor.category || 'Other',
          contact: vendor.email || vendor.phone || 'No contact',
          phone: vendor.phone || '-',
          balance: money(vendor.balance),
          status: vendor.status === 'current' ? 'current' : 'overdue',
          lastOrder: compactDate(vendor.updated_at),
          notes: vendor.notes || 'Backend vendor record',
        }));
        setVendors(items);
        setCategories(['All', ...new Set(items.map(vendor => vendor.category))]);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filtered = vendors.filter(v => {
    const matchesCategory = filter === 'All' || v.category === filter;
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.category.toLowerCase().includes(search.toLowerCase()) || 
                          v.id.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const totalBalance = filtered.reduce((sum, v) => {
    const amount = parseInt(v.balance.replace(/[^0-9]/g, ''));
    return sum + amount;
  }, 0);
  
  const overdueCount = filtered.filter(v => v.status === 'overdue').length;
  const activeVendors = filtered.filter(v => v.status === 'current').length;

  const stats = [
    { label: 'Total Vendors', value: String(filtered.length), sub: 'In directory', icon: 'vendors', color: 'primary' },
    { label: 'Outstanding Balance', value: `MK ${totalBalance.toLocaleString()}`, sub: 'Total owed', icon: 'alert', color: 'warning' },
    { label: 'Overdue Accounts', value: String(overdueCount), sub: 'Need attention', icon: 'alert', color: 'red' },
    { label: 'Active Suppliers', value: String(activeVendors), sub: 'Good standing', icon: 'check', color: 'teal' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      
      {/* HEADER — Same structure */}
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
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.02em', paddingRight: '60px' }}>Vendors</h1>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>Supplier directory & balances</p>
        </div>
        
        {/* Static Pill Button */}
        <button onClick={() => setShowEntry(true)} style={{
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '7px 15px',
          fontSize: '10px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          cursor: 'pointer',
          transition: 'all var(--ease)',
          boxShadow: '0 3px 10px rgba(58,80,107,0.35)'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(58,80,107,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(58,80,107,0.35)'; }}>
          <Icon d={D.plus} size={11} />
          New Vendor
        </button>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>{stats.map(s => <StatsCard key={s.label} {...s} />)}</div>

      {/* Filter & Search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 12px', background: 'rgba(248, 249, 251, 0.92)', backdropFilter: 'blur(8px)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)' }}>
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-faint)', overflowX: 'auto' }}>
          {categories.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === f ? '600' : '500', whiteSpace: 'nowrap' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input type="text" placeholder="Search vendor, category, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '10px', outline: 'none' }} />
        </div>
        <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters"><Icon d={D.filter} size={12} /></button>
      </div>

      {/* Main List */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
        <div className="card-header" style={{ marginBottom: '8px' }}><h3 className="card-title">Vendor Directory</h3><span className="card-sub">{filtered.length} vendor{filtered.length !== 1 ? 's' : ''} found</span></div>
        <div className="vendor-items">
          {filtered.map(vendor => (
            <VendorRow 
              key={vendor.id} 
              vendor={vendor} 
              isExpanded={expandedId === vendor.id} 
              onToggle={() => setExpandedId(expandedId === vendor.id ? null : vendor.id)} 
              onPreview={setPreview}
              onEdit={setEditRecord}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', opacity: 0.4 }}>🏢</div>
              No vendors match your filters.
            </div>
          )}
        </div>
      </div>
      <NewVendorModal
        isOpen={showEntry || Boolean(editRecord)}
        initialData={editRecord}
        onClose={() => { setShowEntry(false); setEditRecord(null); }}
        onSave={async (form) => {
          const payload = { name: form.name || editRecord?.name, category: form.category || editRecord?.category, phone: form.phone, email: form.email || form.contact };
          const saved = editRecord?.backendId ? await api.updateVendor(editRecord.backendId, payload) : await api.createVendor(payload);
          setShowEntry(false);
          setEditRecord(null);
          setPreview(saved);
        }}
      />
      <PreviewModal title={preview ? `Vendor Preview: ${preview.name || 'Draft'}` : ''} data={preview} onClose={() => setPreview(null)} />
    </main>
  );
}
