// path: src/components/Modals.jsx

// Modals.jsx — PrintOps BMS (Mobile Toggle + Full-Size Preview)
import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { calculateTotal, calculateDiscountedTotal } from '../utils/calculateTotal';
import { api } from '../api/client';

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
  const subtotal = calculateTotal(data.items || []);
  const discount = Number(data.discount || 0);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
        {discount > 0 && (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Subtotal: MK {subtotal.toLocaleString()}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Discount: -MK {discount.toLocaleString()}</div>
          </>
        )}
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#3A506B' }}>Total: MK {total.toLocaleString()}</div>
      </div>
    </PaperPreview>
  );
}

function ProposalPreviewFrame({ data, total }) {
  const subtotal = data.items?.reduce((s, it) => s + Number(it.amount || 0), 0) || 0;
  const discount = Number(data.discount || 0);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginBottom: '16px' }}>
        {discount > 0 && (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Subtotal: MK {subtotal.toLocaleString()}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Discount: -MK {discount.toLocaleString()}</div>
          </>
        )}
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#5B7C99' }}>Total: MK {total.toLocaleString()}</div>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-faint)', paddingTop: '16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Terms</div>
        <div>50% deposit required to commence work. Balance due upon delivery. Prices valid for 30 days.</div>
      </div>
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
  const [form, setForm] = useState({ client: '', items: [], due: '', notes: '', discount: 0 });
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
      discount: Number(initialData?.discount_amount || 0),
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
  const total = calculateDiscountedTotal(form.items, form.discount);

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
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-faint)', flexShrink: 0 }}>
            <label style={labelStyle}>Discount (flat amount, MK)</label>
            <input type="number" min="0" style={inputStyle} placeholder="0" value={form.discount || ''} onChange={e => setForm({ ...form, discount: Number(e.target.value) || 0 })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Subtotal</span><span>MK {calculateTotal(form.items).toLocaleString()}</span>
            </div>
            {form.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>Discount</span><span>-MK {Number(form.discount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-head)' }}>
              <span>Total</span><span>MK {total.toLocaleString()}</span>
            </div>
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
  const [form, setForm] = useState({ client: '', title: '', items: [], validUntil: '', validDays: '', contact: '', notes: '', discount: 0 });
  const [selectedService, setSelectedService] = useState(null);
  const [qty, setQty] = useState('1');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Item 5 (Prompt 7): valid_until is entered as "N days from today"
    // rather than a raw date picker — computed once at save time (today +
    // N days), then stored as a fixed date, per this session's confirmed
    // choice ("give us a day to do it for you" = a relative offset, not a
    // live-recalculating one). When editing an existing draft, back-derive
    // a days count from the stored valid_until so the field still shows a
    // sensible number rather than blanking out; this is a display
    // convenience only — re-saving recomputes from *today*, it does not
    // preserve the original creation date as the base.
    const existingValidUntil = initialData?.valid_until || '';
    let derivedDays = '';
    if (existingValidUntil) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diff = Math.round((new Date(existingValidUntil) - new Date(new Date().toDateString())) / msPerDay);
      derivedDays = diff > 0 ? String(diff) : '';
    }
    setForm({
      client: initialData?.client_name || '',
      title: initialData?.title || '',
      items: (initialData?.line_items || []).map(item => ({ desc: item.description, amount: Number(item.amount) })),
      validUntil: existingValidUntil,
      validDays: derivedDays,
      contact: initialData?.contact || '',
      notes: initialData?.notes || '',
      discount: Number(initialData?.discount_amount || 0),
    });
    setSelectedService(null); setQty('1'); setShowPreview(false);
  }, [isOpen, initialData]);

  // Recompute the stored validUntil date whenever the days input changes.
  // Base is always "today" at the moment of typing/saving — not the
  // proposal's original creation date on edit — matching the confirmed
  // "computed once at save time" behavior.
  const setValidDays = daysStr => {
    const days = Number(daysStr);
    if (daysStr === '' || Number.isNaN(days) || days < 0) {
      setForm(prev => ({ ...prev, validDays: daysStr, validUntil: '' }));
      return;
    }
    const target = new Date();
    target.setDate(target.getDate() + days);
    setForm(prev => ({ ...prev, validDays: daysStr, validUntil: target.toISOString().slice(0, 10) }));
  };

  const addItem = () => {
    if (selectedService) {
      setForm(p => ({ ...p, items: [...p.items, { desc: selectedService.name, amount: Number(selectedService.rate) * Number(qty) }] }));
      setQty('1'); setSelectedService(null);
    }
  };
  const subtotal = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const total = Math.max(subtotal - Number(form.discount || 0), 0);

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
            <div>
              <label style={labelStyle}>Valid For (days from today)</label>
              <input type="number" min="0" style={inputStyle} placeholder="e.g. 14" value={form.validDays} onChange={e => setValidDays(e.target.value)} />
              {form.validUntil && (
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Expires: {new Date(form.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
            {/* Item 1 (Prompt 7): contact input was previously entirely
                missing from this form's JSX despite existing in form state
                and being sent to the backend — this was the actual bug, not
                a broken selector. Plain text for now; to be upgraded to a
                dropdown of the selected client's known contacts (with this
                as the free-text fallback) once the Client model's contact
                field shape is confirmed. */}
            <div><label style={labelStyle}>Contact Person</label><input style={inputStyle} placeholder="Name or phone/email" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
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
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-faint)', flexShrink: 0 }}>
            <label style={labelStyle}>Discount (flat amount, MK)</label>
            <input type="number" min="0" style={inputStyle} placeholder="0" value={form.discount || ''} onChange={e => setForm({ ...form, discount: Number(e.target.value) || 0 })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Subtotal</span><span>MK {subtotal.toLocaleString()}</span>
            </div>
            {form.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>Discount</span><span>-MK {Number(form.discount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-head)' }}>
              <span>Total</span><span>MK {total.toLocaleString()}</span>
            </div>
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

/* ═══════════════════════════════════════
   VENDOR PICKER (Prompt 6, item 4)
   Shown only when the selected expense category is flagged vendor-related
   on the backend (ExpenseCategory.vendor_related). Supports picking an
   existing vendor or adding a new one inline (name + phone/email, matching
   NewVendorModal's core fields, per this session's confirmed choice).
═══════════════════════════════════════ */
function VendorPicker({ vendorId, onSelectVendor, vendors, onVendorCreated }) {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleCreateVendor = async () => {
    if (!newVendor.name.trim()) return;
    setSaving(true);
    try {
      const created = await api.createVendor({ name: newVendor.name, phone: newVendor.phone, email: newVendor.email, category: 'Other' });
      onVendorCreated(created);
      onSelectVendor(created.id);
      setShowAddNew(false);
      setNewVendor({ name: '', phone: '', email: '' });
    } catch (err) {
      // Surfaced via the modal's own notify pattern isn't available here,
      // so fall back to a lightweight inline message.
      alert(err.message || 'Could not create vendor');
    } finally {
      setSaving(false);
    }
  };

  if (showAddNew) {
    return (
      <div style={{ border: '1px dashed var(--border-faint)', borderRadius: '6px', padding: '10px', display: 'grid', gap: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>New Vendor</div>
        <input style={inputStyle} placeholder="Vendor name" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
        <input style={inputStyle} placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
        <input style={inputStyle} placeholder="Email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAddNew(false)} style={cancelButton}>Cancel</button>
          <button onClick={handleCreateVendor} style={createButton} disabled={saving}>{saving ? 'Saving...' : 'Save Vendor'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <select style={{ ...inputStyle, flex: 1 }} value={vendorId || ''} onChange={e => onSelectVendor(e.target.value || null)}>
        <option value="">— Select vendor —</option>
        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <button onClick={() => setShowAddNew(true)} style={{ ...createButton, whiteSpace: 'nowrap' }}>+ New</button>
    </div>
  );
}

/* ═══════════════════════════════════════ MODAL: Add Expense ═══════════════════════════════════════ */
export function AddExpenseModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ category: '', title: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '', vendor_id: null });
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      category: initialData?.category || '',
      title: initialData?.title || '',
      amount: initialData?.amountValue ?? '',
      date: initialData?.expense_date || new Date().toISOString().split('T')[0],
      notes: initialData?.notes || '',
      vendor_id: initialData?.vendorId || null,
    });
    setShowPreview(false);
    // Category vendor-relatedness and the vendor list are only needed while
    // this modal is open, so both are fetched here rather than pre-loaded
    // app-wide. Failures here are non-fatal: the picker simply won't gate
    // correctly (falls back to never showing), rather than blocking the form.
    api.expenseCategories().then(data => setCategories(data.items || [])).catch(() => setCategories([]));
    api.vendors('?per_page=200').then(data => setVendors(data.items || [])).catch(() => setVendors([]));
  }, [isOpen, initialData]);

  const isVendorRelated = categories.some(c => c.name === form.category && c.vendor_related);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Expense" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Category</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['Fuel', 'Paper', 'Maintenance', 'Utilities', 'Staff', 'Other'].map(c => <button key={c} onClick={() => setForm({ ...form, category: c, vendor_id: null })} style={pillBtnStyle(form.category === c)}>{c}</button>)}</div></div>
            {isVendorRelated && (
              <div>
                <label style={labelStyle}>Vendor</label>
                <VendorPicker
                  vendorId={form.vendor_id}
                  onSelectVendor={id => setForm(prev => ({ ...prev, vendor_id: id }))}
                  vendors={vendors}
                  onVendorCreated={created => setVendors(prev => [...prev, created])}
                />
              </div>
            )}
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
export function RecordPaymentModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ job: '', amount: '', date: new Date().toISOString().split('T')[0], method: 'bank', ref: '', notes: '' });
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      job: initialData?.id || initialData?.job_ref || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'bank',
      ref: '',
      notes: '',
    });
    setShowPreview(false);
  }, [isOpen, initialData]);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Record Payment" wide footer={<>
      <button onClick={onClose} style={cancelButton}>Cancel</button>
      <button onClick={() => onSave(form)} style={createButton}>Create</button>
    </>}>
      <SplitPane showGrid={false} showPreview={showPreview} setShowPreview={setShowPreview}
        formChildren={
          <div style={{ padding: '20px', display: 'grid', gap: '12px', alignContent: 'start', overflowY: 'auto', flex: 1 }}>
            <div><label style={labelStyle}>Job / Client</label><input style={inputStyle} value={form.job} onChange={e => setForm({ ...form, job: e.target.value })} /></div>
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