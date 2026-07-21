// path: src/components/Modals.jsx

// Modals.jsx — PrintOps BMS (Mobile Toggle + Full-Size Preview)
import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { calculateTotal } from '../utils/calculateTotal';

/* ═══════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════ */
function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
};

/* ═══════════════════════════════════════
   SERVICE DATA
═══════════════════════════════════════ */
const SERVICES = [
  { category: 'Digital Print', items: [
    { name: 'A4 B&W Document', rate: 150, unit: 'page' },
    { name: 'A4 Color Document', rate: 650, unit: 'page' },
    { name: 'A5 Flyer Full Color', rate: 210, unit: 'flyer' },
  ]},
  { category: 'DTF Apparel', items: [
    { name: 'DTF T-Shirt (A4)', rate: 8500, unit: 'print' },
    { name: 'DTF Cap Branding', rate: 6500, unit: 'cap' },
    { name: 'DTF Diary Branding', rate: 7500, unit: 'diary' },
  ]},
  { category: 'Large Format', items: [
    { name: 'PVC Banner', rate: 18000, unit: 'sqm' },
    { name: 'Vinyl Sticker', rate: 22000, unit: 'sqm' },
    { name: 'Window Frosting', rate: 28000, unit: 'sqm' },
    { name: 'Contra Vision', rate: 30000, unit: 'sqm' },
  ]},
  { category: 'Finishing', items: [
    { name: 'Book Binding', rate: 3500, unit: 'book' },
  ]},
  { category: 'Sublimation', items: [
    { name: 'Mug Print', rate: 7500, unit: 'mug' },
    { name: 'Plate Print', rate: 9500, unit: 'plate' },
  ]},
  { category: 'UV DTF', items: [
    { name: 'Pen Branding', rate: 1800, unit: 'pen' },
    { name: 'Key Holder', rate: 2500, unit: 'key holder' },
  ]},
];

/* ═══════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════ */
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '11px', outline: 'none', transition: 'border-color var(--ease)', fontFamily: 'var(--font)', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };
const pillBtnStyle = active => ({ padding: '5px 10px', borderRadius: '50px', border: 'none', fontSize: '10px', fontWeight: active ? 600 : 500, background: active ? 'var(--primary)' : 'var(--bg-canvas)', color: active ? '#fff' : 'var(--text-body)', cursor: 'pointer', transition: 'all var(--ease)' });
const cancelButton = { padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' };
const createButton = { padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer' };

/* ═══════════════════════════════════════
   MOBILE DETECTION HOOK
═══════════════════════════════════════ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/* ═══════════════════════════════════════
   BASE MODAL WRAPPER
═══════════════════════════════════════ */
function ModalWrapper({ isOpen, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    const handleEsc = event => event.key === 'Escape' && onClose();
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
      onClick={event => event.target === event.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-card)', padding: 0, width: '95%', maxWidth: wide ? '950px' : '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', position: 'relative', animation: 'fadeIn 0.2s ease', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ position: 'relative', padding: '20px 20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-faint)', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: '20px', right: '20px', height: '3px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', borderRadius: '4px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ fontSize: '14px', margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
              <Icon d={D.x} size={16} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SPLIT PANE — JS-driven, no CSS fights
═══════════════════════════════════════ */
function SplitPane({ formChildren, previewContent, showGrid = false, showPreview, setShowPreview }) {
  const isMobile = useIsMobile();

  // On desktop: both always visible, side by side
  // On mobile:  only one panel visible at a time
  const showForm    = !isMobile || !showPreview;
  const showPrev    = !isMobile || showPreview;

  const gridCols = isMobile ? '1fr' : (showGrid ? '380px 1fr' : '45% 55%');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Mobile-only toggle bar */}
      {isMobile && (
        <div style={{ display: 'flex', flexShrink: 0, padding: '10px 16px', gap: '8px', justifyContent: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-faint)' }}>
          <button
            onClick={() => setShowPreview(false)}
            style={{ padding: '6px 20px', borderRadius: '50px', border: '1px solid var(--border-faint)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: !showPreview ? 'var(--primary)' : 'transparent', color: !showPreview ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease' }}
          >
            ✎ Edit Form
          </button>
          <button
            onClick={() => setShowPreview(true)}
            style={{ padding: '6px 20px', borderRadius: '50px', border: '1px solid var(--border-faint)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: showPreview ? 'var(--primary)' : 'transparent', color: showPreview ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease' }}
          >
            Preview ▸
          </button>
        </div>
      )}

      {/* Panels grid */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT — Form panel */}
        <div style={{
          display: showForm ? 'flex' : 'none',
          flexDirection: 'column',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRight: isMobile ? 'none' : '1px solid var(--border-faint)',
          minHeight: 0,
        }}>
          {formChildren}
        </div>

        {/* RIGHT — Preview panel */}
        <div style={{
          display: showPrev ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflowY: 'auto',
          background: 'var(--bg-canvas)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border-faint)',
          padding: '20px',
          minHeight: 0,
        }}>
          <div style={{ marginBottom: '12px', fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Live Preview
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {previewContent}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SERVICE DROPDOWN SELECTOR
═══════════════════════════════════════ */
function ServiceDropdown({ selectedService, onSelect }) {
  const allServices = SERVICES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.category })));
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-faint)', background: 'var(--bg-card)', flexShrink: 0 }}>
      <label style={labelStyle}>Select Service</label>
      <select
        style={{ ...inputStyle, cursor: 'pointer' }}
        value={selectedService?.name || ''}
        onChange={e => {
          const service = allServices.find(s => s.name === e.target.value);
          if (service) onSelect(service);
        }}
      >
        <option value="">— Choose a service —</option>
        {SERVICES.map(cat => (
          <optgroup key={cat.category} label={cat.category}>
            {cat.items.map(item => (
              <option key={item.name} value={item.name}>
                {item.name} (MK {item.rate.toLocaleString()}/{item.unit})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function AddItemBar({ selectedService, form, setForm, onAdd }) {
  if (!selectedService) return null;
  return (
    <div style={{ padding: '12px 20px', background: 'var(--bg-canvas)', borderTop: '1px solid var(--border-faint)', display: 'flex', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-head)', marginBottom: '2px' }}>{selectedService.name}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>MK {Number(selectedService.rate).toLocaleString()} per {selectedService.unit}</div>
      </div>
      <div style={{ width: '70px' }}>
        <label style={{ ...labelStyle, marginBottom: '2px' }}>Qty</label>
        <input type="number" min="1" style={{ ...inputStyle, padding: '6px', textAlign: 'center' }} value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
      </div>
      <button onClick={onAdd} style={{ ...createButton, padding: '6px 12px' }}>
        <Icon d={D.plus} size={14} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   PREVIEW FRAMES
═══════════════════════════════════════ */
function PaperPreview({ children, accentColor }) {
  return (
    <div style={{ width: '100%', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', position: 'relative', border: '1px solid var(--border-faint)', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: '24px', right: '24px', height: '3px', background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, borderRadius: '4px 4px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '24px', right: '24px', height: '3px', background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, borderRadius: '0 0 4px 4px' }} />
      {children}
    </div>
  );
}

function InvoicePreviewFrame({ data, total }) {
  return (
    <PaperPreview accentColor="#3A506B">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#3A506B' }}>INVOICE</div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>
          <div>{data.client || 'Client Name'}</div>
          <div>Due: {data.due || '—'}</div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '10px' }}>
        <thead><tr>
          <th style={{ textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)' }}>Item</th>
          <th style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)' }}>Amt</th>
        </tr></thead>
        <tbody>{data.items?.map((it, i) => (
          <tr key={i}>
            <td style={{ padding: '6px 0', borderBottom: '1px solid var(--border-faint)' }}>{it.desc}</td>
            <td style={{ padding: '6px 0', textAlign: 'right', borderBottom: '1px solid var(--border-faint)' }}>MK {(it.qty * it.rate).toLocaleString()}</td>
          </tr>
        ))}</tbody>
      </table>
      <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#3A506B' }}>Total: MK {total.toLocaleString()}</div>
    </PaperPreview>
  );
}

function ProposalPreviewFrame({ data, total }) {
  return (
    <PaperPreview accentColor="#5B7C99">
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #5B7C99', paddingBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#5B7C99' }}>PROPOSAL</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.title || 'Untitled'}</div>
      </div>
      <div style={{ fontSize: '10px', marginBottom: '12px' }}><strong>Client:</strong> {data.client || '—'}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '10px' }}>
        <thead><tr>
          <th style={{ textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)' }}>Service</th>
          <th style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)' }}>Value</th>
        </tr></thead>
        <tbody>{data.items?.map((it, i) => (
          <tr key={i}>
            <td style={{ padding: '6px 0', borderBottom: '1px solid var(--border-faint)' }}>{it.desc}</td>
            <td style={{ padding: '6px 0', textAlign: 'right', borderBottom: '1px solid var(--border-faint)' }}>MK {Number(it.amount).toLocaleString()}</td>
          </tr>
        ))}</tbody>
      </table>
      <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#5B7C99' }}>Total: MK {total.toLocaleString()}</div>
    </PaperPreview>
  );
}

function JobPreviewFrame({ data }) {
  return (
    <PaperPreview accentColor="#6B8E7B">
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px dashed #6B8E7B', paddingBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B8E7B' }}>PRODUCTION TICKET</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>#{data.id || 'DRAFT'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', marginBottom: '12px' }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Client:</span> {data.client || '—'}</div>
        <div><span style={{ color: 'var(--text-muted)' }}>Due:</span> {data.due || '—'}</div>
        <div><span style={{ color: 'var(--text-muted)' }}>Priority:</span> <span style={{ textTransform: 'capitalize' }}>{data.priority || 'medium'}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Specs:</span> {data.specs?.join(', ') || '—'}</div>
      </div>
      <div style={{ padding: '10px', background: 'var(--bg-canvas)', borderRadius: '6px', fontSize: '9px', lineHeight: 1.4 }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Notes:</strong> {data.notes || 'None'}
      </div>
    </PaperPreview>
  );
}

function SimpleRecordPreview({ type, data }) {
  const color = type === 'expense' ? '#B8A06A' : type === 'advance' ? '#7B6B8E' : '#5B7C99';
  return (
    <PaperPreview accentColor={color}>
      <div style={{ textAlign: 'center', marginBottom: '16px', fontWeight: 700, fontSize: '14px', color }}>{type.toUpperCase()} RECORD</div>
      {Object.entries(data).map(([key, val]) => {
        if (key === 'tags') val = val.join(', ');
        if (!val || val === '[]') return null;
        return (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '10px', borderBottom: '1px solid var(--border-faint)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 600 }}>{String(val)}</span>
          </div>
        );
      })}
    </PaperPreview>
  );
}

/* ═══════════════════════════════════════ MODAL: New Invoice ═══════════════════════════════════════ */
export function NewInvoiceModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ client: '', items: [], due: '', notes: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [qty, setQty] = useState('1');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      client: initialData?.client || initialData?.client_name || '',
      items: (initialData?.items || initialData?.line_items || []).map(item => ({ desc: item.desc || item.description || '', qty: item.qty || item.quantity || 1, rate: item.rate || item.unit_price || 0 })),
      due: initialData?.due_on || initialData?.due || '',
      notes: initialData?.notes || '',
    });
    setSelectedService(null); setQty('1'); setShowPreview(false);
  }, [isOpen, initialData]);

  const addItem = () => {
    if (selectedService && qty > 0) {
      setForm(p => ({ ...p, items: [...p.items, { desc: selectedService.name, qty: Number(qty), rate: selectedService.rate }] }));
      setQty('1'); setSelectedService(null);
    }
  };
  const removeItem = i => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const total = calculateTotal(form.items);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Invoice' : 'New Invoice'} wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>{initialData ? 'Update' : 'Create'}</button>
    </>}>
      <SplitPane showGrid showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={<>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-faint)', display: 'grid', gap: '10px', flexShrink: 0 }}>
            <div><label style={labelStyle}>Client</label><input style={inputStyle} placeholder="Search client..." value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
            <div><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></div>
          </div>
          <ServiceDropdown selectedService={selectedService} onSelect={s => { setSelectedService(s); setQty('1'); }} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            <label style={labelStyle}>Line Items ({form.items.length})</label>
            {form.items.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '10px' }}>No items added yet. Select a service above.</div>
              : form.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '6px', background: 'var(--bg-canvas)', borderRadius: '6px', fontSize: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.desc}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{it.qty} × MK {it.rate.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>MK {(it.qty * it.rate).toLocaleString()}</span>
                    <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                  </div>
                </div>
              ))
            }
          </div>
          <AddItemBar selectedService={selectedService} form={{ qty }} setForm={f => setQty(f.qty)} onAdd={addItem} />
        </>}
        previewContent={<InvoicePreviewFrame data={form} total={total} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: New Proposal ═══════════════════════════════════════ */
export function NewProposalModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ client: '', title: '', items: [], validUntil: '', contact: '', notes: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [qty, setQty] = useState('1');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ client: '', title: '', items: [], validUntil: '', contact: '', notes: '' });
    setSelectedService(null); setQty('1'); setShowPreview(false);
  }, [isOpen]);

  const addItem = () => {
    if (selectedService) {
      setForm(p => ({ ...p, items: [...p.items, { desc: selectedService.name, amount: Number(selectedService.rate) * Number(qty) }] }));
      setQty('1'); setSelectedService(null);
    }
  };
  const total = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Proposal" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={<>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-faint)', display: 'grid', gap: '10px', flexShrink: 0 }}>
            <div><label style={labelStyle}>Client</label><input style={inputStyle} value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
            <div><label style={labelStyle}>Proposal Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label style={labelStyle}>Valid Until</label><input type="date" style={inputStyle} value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></div>
          </div>
          <ServiceDropdown selectedService={selectedService} onSelect={s => { setSelectedService(s); setQty('1'); }} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            <label style={labelStyle}>Scope Items ({form.items.length})</label>
            {form.items.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '10px' }}>No items added yet. Select a service above.</div>
              : form.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '6px', background: 'var(--bg-canvas)', borderRadius: '6px', fontSize: '10px' }}>
                  <div><div style={{ fontWeight: 600 }}>{it.desc}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>MK {Number(it.amount).toLocaleString()}</span>
                    <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                  </div>
                </div>
              ))
            }
          </div>
          <AddItemBar selectedService={selectedService} form={{ qty }} setForm={f => setQty(f.qty)} onAdd={addItem} />
        </>}
        previewContent={<ProposalPreviewFrame data={form} total={total} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: New Job ═══════════════════════════════════════ */
export function NewJobModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ client: '', title: '', specs: [], priority: 'medium', due: '', printer: '', notes: '' });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ client: initialData?.client || '', title: initialData?.title || '', specs: initialData?.specs || [], priority: initialData?.priority || 'medium', due: initialData?.due_date || initialData?.due || '', printer: initialData?.printer || '', notes: initialData?.notes || '' });
    setShowPreview(false);
  }, [isOpen, initialData]);

  const toggleSpec = s => setForm(p => ({ ...p, specs: p.specs.includes(s) ? p.specs.filter(x => x !== s) : [...p.specs, s] }));

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Job' : 'New Job'} wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>{initialData ? 'Update' : 'Create'}</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Client</label><input style={inputStyle} placeholder="Search client..." value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Job Title</label><input style={inputStyle} placeholder="e.g., Annual Report 500x" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Specs</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['A4 B&W', 'A4 Color', 'A3 B&W', 'A3 Color', 'Lamination', 'Binding', 'Delivery', 'Glossy'].map(s => <button key={s} onClick={() => toggleSpec(s)} style={pillBtnStyle(form.specs.includes(s))}>{s}</button>)}</div></div>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Priority</label><div style={{ display: 'flex', gap: '6px' }}>{['low', 'medium', 'high'].map(p => <button key={p} onClick={() => setForm({ ...form, priority: p })} style={pillBtnStyle(form.priority === p)}>{p}</button>)}</div></div>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></div>
            <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Assigned Printer</label><input style={inputStyle} value={form.printer} onChange={e => setForm({ ...form, printer: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        }
        previewContent={<JobPreviewFrame data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: Add Expense ═══════════════════════════════════════ */
export function AddExpenseModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ category: '', title: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [showPreview, setShowPreview] = useState(false);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Expense" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Category</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['Fuel', 'Paper', 'Maintenance', 'Utilities', 'Staff', 'Other'].map(c => <button key={c} onClick={() => setForm({ ...form, category: c })} style={pillBtnStyle(form.category === c)}>{c}</button>)}</div></div>
            <div><label style={labelStyle}>Description</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label style={labelStyle}>Amount (MK)</label><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        }
        previewContent={<SimpleRecordPreview type="expense" data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: New Advance ═══════════════════════════════════════ */
export function NewAdvanceModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ recipient: '', amount: '', issued_on: new Date().toISOString().split('T')[0], status: 'open', notes: '' });
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => { if (!isOpen) return; setForm({ recipient: '', amount: '', issued_on: new Date().toISOString().split('T')[0], status: 'open', notes: '' }); setShowPreview(false); }, [isOpen]);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Advance" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Recipient</label><input style={inputStyle} value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} /></div>
            <div><label style={labelStyle}>Amount (MK)</label><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={labelStyle}>Issued On</label><input type="date" style={inputStyle} value={form.issued_on} onChange={e => setForm({ ...form, issued_on: e.target.value })} /></div>
            <div><label style={labelStyle}>Status</label><div style={{ display: 'flex', gap: '6px' }}>{['open', 'settled', 'refunded'].map(s => <button key={s} onClick={() => setForm({ ...form, status: s })} style={pillBtnStyle(form.status === s)}>{s}</button>)}</div></div>
            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        }
        previewContent={<SimpleRecordPreview type="advance" data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: New Vendor ═══════════════════════════════════════ */
export function NewVendorModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ name: '', category: 'Paper & Supplies', contact: '', phone: '', email: '', location: '', notes: '' });
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setForm({ name: initialData?.name || '', category: initialData?.category || 'Paper & Supplies', contact: initialData?.contact || '', phone: initialData?.phone || '', email: initialData?.email || '', location: initialData?.location || '', notes: initialData?.notes || '' });
    setShowPreview(false);
  }, [isOpen, initialData]);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Vendor' : 'New Vendor'} wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>{initialData ? 'Update' : 'Create'}</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            {['name', 'category', 'contact', 'phone', 'email', 'location'].map(f => (
              <div key={f}><label style={labelStyle}>{f}</label><input style={inputStyle} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} /></div>
            ))}
            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        }
        previewContent={<SimpleRecordPreview type="vendor" data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: Record Payment ═══════════════════════════════════════ */
export function RecordPaymentModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ invoice: '', amount: '', date: new Date().toISOString().split('T')[0], method: 'bank', ref: '', notes: '' });
  const [showPreview, setShowPreview] = useState(false);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Record Payment" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Invoice / Client</label><input style={inputStyle} value={form.invoice} onChange={e => setForm({ ...form, invoice: e.target.value })} /></div>
            <div><label style={labelStyle}>Amount Paid (MK)</label><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={labelStyle}>Payment Date</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={labelStyle}>Method</label><div style={{ display: 'flex', gap: '6px' }}>{['cash', 'bank', 'mobile', 'cheque'].map(m => <button key={m} onClick={() => setForm({ ...form, method: m })} style={pillBtnStyle(form.method === m)}>{m}</button>)}</div></div>
            <div><label style={labelStyle}>Reference / Receipt #</label><input style={inputStyle} value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        }
        previewContent={<SimpleRecordPreview type="payment" data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: Quick Entry ═══════════════════════════════════════ */
export function QuickEntryModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ note: '', amount: '', tags: [] });
  const [showPreview, setShowPreview] = useState(false);
  const toggleTag = t => setForm(p => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }));
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Quick Entry" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Quick Note</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
            <div><label style={labelStyle}>Amount (MK) - Optional</label><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={labelStyle}>Tags</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['Urgent', 'Follow-up', 'Supplier', 'Personal', 'Admin'].map(t => <button key={t} onClick={() => toggleTag(t)} style={pillBtnStyle(form.tags.includes(t))}>{t}</button>)}</div></div>
          </div>
        }
        previewContent={<SimpleRecordPreview type="quick" data={form} />}
      />
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════ MODAL: Search Results ═══════════════════════════════════════ */
export function SearchResultsModal({ isOpen, onClose, results, onSelect }) {
  if (!isOpen) return null;
  const rows = [
    ...(results?.invoices || []).map(i => ({ title: i.title, type: 'Invoice', sub: i.client_name || i.invoice_ref, raw: i })),
    ...(results?.jobs || []).map(i => ({ title: i.title, type: 'Job', sub: i.client_name || i.job_ref, raw: i })),
    ...(results?.vendors || []).map(i => ({ title: i.name, type: 'Vendor', sub: i.category || i.email, raw: i })),
    ...(results?.machines || []).map(i => ({ title: i.name, type: 'Machine', sub: i.category || i.machine_ref, raw: i })),
    ...(results?.pricing || []).map(i => ({ title: i.name, type: 'Pricing', sub: `${i.category || ''} ${i.price ? `- MK ${Number(i.price).toLocaleString()}` : ''}`, raw: i })),
  ];
  return (
    <div style={{ position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 950, width: '90%', maxWidth: '420px', background: 'var(--bg-card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'fadeIn 0.15s ease' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-faint)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Search Results</div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {rows.length === 0
          ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No matches found.</div>
          : rows.map((r, i) => (
            <div key={i} onClick={() => onSelect(r)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-faint)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-head)' }}>{r.title}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.type} - {r.sub}</div>
            </div>
          ))
        }
      </div>
      <div style={{ padding: '8px', textAlign: 'center' }}>
        <button onClick={onClose} style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Close Search</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ MODAL: Activity Preview ═══════════════════════════════════════ */
export function ActivityPreviewModal({ isOpen, onClose, activity }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Activity Details" footer={<button onClick={onClose} style={createButton}>Close</button>}>
      <pre style={{ margin: 0, padding: '20px', whiteSpace: 'pre-wrap', color: 'var(--text-body)', fontSize: '11px', lineHeight: 1.55, overflowY: 'auto' }}>
        {JSON.stringify(activity, null, 2)}
      </pre>
    </ModalWrapper>
  );
}