import React, { useEffect, useRef, useState } from 'react';

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

function ModalWrapper({ isOpen, onClose, title, children, footer, wide = false }) {
  const modalRef = useRef();

  useEffect(() => {
    const handleEsc = event => event.key === 'Escape' && onClose();
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }} onClick={event => event.target === event.currentTarget && onClose()}>
      <div ref={modalRef} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-card)', padding: '20px', width: '90%', maxWidth: wide ? '680px' : '480px', boxShadow: '0 12px 32px rgba(43,58,74,0.12)', border: '1px solid var(--border-light)', position: 'relative', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-faint)' }}>
          <h3 className="card-title" style={{ fontSize: '14px', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
            <Icon d={D.x} size={16} />
          </button>
        </div>
        <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>{children}</div>
        {footer && <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>{footer}</div>}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', color: 'var(--text-body)', fontSize: '11px', outline: 'none', transition: 'border-color var(--ease)', fontFamily: 'var(--font)', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };
const pillBtnStyle = active => ({ padding: '5px 10px', borderRadius: '50px', border: 'none', fontSize: '10px', fontWeight: active ? 600 : 500, background: active ? 'var(--primary)' : 'var(--bg-canvas)', color: active ? '#fff' : 'var(--text-body)', cursor: 'pointer', transition: 'all var(--ease)' });
const cancelButton = { padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' };
const primaryButton = { padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer' };

export function NewInvoiceModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ client: '', items: [], due: '', notes: '' });
  const [itemInput, setItemInput] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      client: initialData?.client || initialData?.client_name || '',
      title: initialData?.title || '',
      items: (initialData?.items || initialData?.line_items || []).map(item => ({
        desc: item.desc || item.description || '',
        qty: item.qty || item.quantity || 1,
        rate: item.rate || item.unit_price || 0,
      })),
      due: initialData?.due_on || initialData?.due || '',
      notes: initialData?.notes || '',
    });
  }, [isOpen, initialData]);
  const addItem = () => {
    if (!itemInput.trim()) return;
    setForm(current => ({ ...current, items: [...current.items, { desc: itemInput.trim(), qty: 1, rate: 0 }] }));
    setItemInput('');
  };
  const updateItem = (index, field, value) => setForm(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const removeItem = index => setForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  const total = form.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Invoice" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Client</label><input style={inputStyle} placeholder="Search client..." value={form.client} onChange={event => setForm({ ...form, client: event.target.value })} /></div>
        <div>
          <label style={labelStyle}>Line Items</label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}><input style={{ ...inputStyle, flex: 1 }} placeholder="Add item..." value={itemInput} onChange={event => setItemInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && addItem()} /><button onClick={addItem} style={{ padding: '6px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}><Icon d={D.plus} size={12} /></button></div>
          {form.items.map((item, index) => <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', padding: '6px', background: 'var(--bg-canvas)', borderRadius: '6px' }}><span style={{ flex: 1, fontSize: '11px' }}>{item.desc}</span><input type="number" style={{ ...inputStyle, width: '56px' }} value={item.qty} onChange={event => updateItem(index, 'qty', event.target.value)} /><input type="number" style={{ ...inputStyle, width: '82px' }} value={item.rate} onChange={event => updateItem(index, 'rate', event.target.value)} /><button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>x</button></div>)}
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-head)', marginTop: '4px' }}>Total: MK {total.toLocaleString()}</div>
        </div>
        <div><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={form.due} onChange={event => setForm({ ...form, due: event.target.value })} /></div>
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function NewJobModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ client: '', title: '', specs: [], priority: 'medium', due: '', printer: '', notes: '' });
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      client: initialData?.client || initialData?.client_name || '',
      title: initialData?.title || '',
      specs: initialData?.specs || [],
      priority: initialData?.priority || 'medium',
      due: initialData?.due_date || initialData?.due || '',
      printer: initialData?.printer || initialData?.machine_name || initialData?.service_category || '',
      notes: initialData?.notes || '',
    });
  }, [isOpen, initialData]);
  const toggleSpec = spec => setForm(current => ({ ...current, specs: current.specs.includes(spec) ? current.specs.filter(item => item !== spec) : [...current.specs, spec] }));
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Job" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Client</label><input style={inputStyle} placeholder="Search client..." value={form.client} onChange={event => setForm({ ...form, client: event.target.value })} /></div>
        <div><label style={labelStyle}>Job Title</label><input style={inputStyle} placeholder="e.g., Annual Report 500x" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div>
        <div><label style={labelStyle}>Specs</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['A4 B&W', 'A4 Color', 'A3 B&W', 'A3 Color', 'Lamination', 'Binding', 'Delivery', 'Glossy'].map(spec => <button key={spec} onClick={() => toggleSpec(spec)} style={pillBtnStyle(form.specs.includes(spec))}>{spec}</button>)}</div></div>
        <div><label style={labelStyle}>Priority</label><div style={{ display: 'flex', gap: '6px' }}>{['low', 'medium', 'high'].map(priority => <button key={priority} onClick={() => setForm({ ...form, priority })} style={pillBtnStyle(form.priority === priority)}>{priority}</button>)}</div></div>
        <div><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={form.due} onChange={event => setForm({ ...form, due: event.target.value })} /></div>
        <div><label style={labelStyle}>Assigned Printer</label><input style={inputStyle} value={form.printer} onChange={event => setForm({ ...form, printer: event.target.value })} /></div>
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function NewProposalModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ client: '', title: '', items: [], total: '', validUntil: '', contact: '', notes: '' });
  const addItem = () => setForm(current => ({ ...current, items: [...current.items, { desc: '', amount: '' }] }));
  const updateItem = (index, field, value) => setForm(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Proposal" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Client</label><input style={inputStyle} value={form.client} onChange={event => setForm({ ...form, client: event.target.value })} /></div>
        <div><label style={labelStyle}>Proposal Title</label><input style={inputStyle} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div>
        <div><label style={labelStyle}>Scope & Pricing</label>{form.items.map((item, index) => <div key={index} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}><input style={{ ...inputStyle, flex: 1 }} placeholder="Service/Item" value={item.desc} onChange={event => updateItem(index, 'desc', event.target.value)} /><input style={{ ...inputStyle, width: '90px' }} placeholder="Amount" value={item.amount} onChange={event => updateItem(index, 'amount', event.target.value)} /></div>)}<button onClick={addItem} style={{ padding: '4px 8px', background: 'var(--bg-canvas)', border: '1px dashed var(--border-light)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '9px', cursor: 'pointer', width: '100%' }}>+ Add Line</button></div>
        <div><label style={labelStyle}>Total Value (MK)</label><input style={inputStyle} value={form.total} onChange={event => setForm({ ...form, total: event.target.value })} /></div>
        <div><label style={labelStyle}>Valid Until</label><input type="date" style={inputStyle} value={form.validUntil} onChange={event => setForm({ ...form, validUntil: event.target.value })} /></div>
        <div><label style={labelStyle}>Client Contact Email</label><input style={inputStyle} value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} /></div>
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function AddExpenseModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ category: '', title: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Expense" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Category</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['Fuel', 'Paper', 'Maintenance', 'Utilities', 'Staff', 'Other'].map(category => <button key={category} onClick={() => setForm({ ...form, category })} style={pillBtnStyle(form.category === category)}>{category}</button>)}</div></div>
        <div><label style={labelStyle}>Description</label><input style={inputStyle} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div>
        <div><label style={labelStyle}>Amount (MK)</label><input type="number" style={inputStyle} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div>
        <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div>
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function NewVendorModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({ name: '', category: 'Paper & Supplies', contact: '', phone: '', email: '', location: '', notes: '' });
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: initialData?.name || '',
      category: initialData?.category || 'Paper & Supplies',
      contact: initialData?.contact || initialData?.email || '',
      phone: initialData?.phone || '',
      email: initialData?.email || (initialData?.contact?.includes('@') ? initialData.contact : ''),
      location: initialData?.location || '',
      notes: initialData?.notes || '',
    });
  }, [isOpen, initialData]);
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Vendor" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        {['name', 'category', 'contact', 'phone', 'email', 'location'].map(field => <div key={field}><label style={labelStyle}>{field}</label><input style={inputStyle} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} /></div>)}
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function RecordPaymentModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ invoice: '', amount: '', date: new Date().toISOString().split('T')[0], method: 'bank', ref: '', notes: '' });
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Record Payment" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Invoice / Client</label><input style={inputStyle} value={form.invoice} onChange={event => setForm({ ...form, invoice: event.target.value })} /></div>
        <div><label style={labelStyle}>Amount Paid (MK)</label><input type="number" style={inputStyle} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div>
        <div><label style={labelStyle}>Payment Date</label><input type="date" style={inputStyle} value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div>
        <div><label style={labelStyle}>Method</label><div style={{ display: 'flex', gap: '6px' }}>{['cash', 'bank', 'mobile', 'cheque'].map(method => <button key={method} onClick={() => setForm({ ...form, method })} style={pillBtnStyle(form.method === method)}>{method}</button>)}</div></div>
        <div><label style={labelStyle}>Reference / Receipt #</label><input style={inputStyle} value={form.ref} onChange={event => setForm({ ...form, ref: event.target.value })} /></div>
      </div>
    </ModalWrapper>
  );
}

export function QuickEntryModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ note: '', amount: '', tags: [] });
  const toggleTag = tag => setForm(current => ({ ...current, tags: current.tags.includes(tag) ? current.tags.filter(item => item !== tag) : [...current.tags, tag] }));
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Quick Entry" footer={<><button onClick={onClose} style={cancelButton}>Cancel</button><button onClick={() => onSave(form)} style={primaryButton}>Add after Review</button></>}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><label style={labelStyle}>Quick Note</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>
        <div><label style={labelStyle}>Amount (MK) - Optional</label><input type="number" style={inputStyle} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div>
        <div><label style={labelStyle}>Tags</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{['Urgent', 'Follow-up', 'Supplier', 'Personal', 'Admin'].map(tag => <button key={tag} onClick={() => toggleTag(tag)} style={pillBtnStyle(form.tags.includes(tag))}>{tag}</button>)}</div></div>
      </div>
    </ModalWrapper>
  );
}

export function SearchResultsModal({ isOpen, onClose, results, onSelect }) {
  if (!isOpen) return null;
  const rows = [
    ...(results?.invoices || []).map(item => ({ title: item.title, type: 'Invoice', sub: item.client_name || item.invoice_ref, raw: item })),
    ...(results?.jobs || []).map(item => ({ title: item.title, type: 'Job', sub: item.client_name || item.job_ref, raw: item })),
    ...(results?.vendors || []).map(item => ({ title: item.name, type: 'Vendor', sub: item.category || item.email, raw: item })),
    ...(results?.machines || []).map(item => ({ title: item.name, type: 'Machine', sub: item.category || item.machine_ref, raw: item })),
    ...(results?.pricing || []).map(item => ({ title: item.name, type: 'Pricing', sub: `${item.category || ''} ${item.price ? `- MK ${Number(item.price).toLocaleString()}` : ''}`, raw: item })),
  ];
  return (
    <div style={{ position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 950, width: '90%', maxWidth: '420px', background: 'var(--bg-card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-faint)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'fadeIn 0.15s ease' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-faint)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Search Results</div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>{rows.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No matches found.</div> : rows.map((row, index) => <div key={index} onClick={() => onSelect(row)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-faint)', cursor: 'pointer' }}><div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-head)' }}>{row.title}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{row.type} - {row.sub}</div></div>)}</div>
      <div style={{ padding: '8px', textAlign: 'center' }}><button onClick={onClose} style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Close Search</button></div>
    </div>
  );
}

export function ActivityPreviewModal({ isOpen, onClose, activity }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Activity Details" footer={<button onClick={onClose} style={primaryButton}>Close</button>}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-body)', fontSize: '11px', lineHeight: 1.55 }}>{JSON.stringify(activity, null, 2)}</pre>
    </ModalWrapper>
  );
}
