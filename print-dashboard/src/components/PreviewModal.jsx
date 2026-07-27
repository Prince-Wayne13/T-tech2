// PreviewModal.jsx — PrintOps BMS (Elegant Document Layout)
import React from 'react';
import { downloadInvoicePDF } from './InvoicePDF';
import ttechIcon from '../assets/ttech-icon.png';

/* ═══════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════ */
function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  x: 'M18 6L6 18M6 6l12 12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  hash: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
};

/* ═══════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════ */
const cancelButton = {
  padding: '7px 14px',
  borderRadius: '50px',
  border: '1px solid var(--border-faint)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: '10px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all var(--ease)',
};

const primaryButton = {
  padding: '7px 14px',
  borderRadius: '50px',
  border: 'none',
  background: 'var(--primary)',
  color: '#fff',
  fontSize: '10px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 3px 8px rgba(58,80,107,0.25)',
  transition: 'all var(--ease)',
};

/* ═══════════════════════════════════════
   HELPER: Format Data
═══════════════════════════════════════ */
function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

function buildInvoicePayload(title, data) {
  if (!data || typeof data !== 'object') return { id: title, client_name: title, title, items: [] };
  const items = Array.isArray(data.items)
    ? data.items.map(i => ({ description: i.desc || i.description || i.name || '', quantity: i.qty || i.quantity || 1, unit_price: i.rate || i.unit_price || i.amount || 0 }))
    : Array.isArray(data.line_items)
    ? data.line_items.map(i => ({ description: i.desc || i.description || '', quantity: i.qty || i.quantity || 1, unit_price: i.rate || i.unit_price || 0 }))
    : [];
  return { id: data.id || data.invoice_ref || title, client_name: data.client_name || data.client || data.name || data.recipient || '', title: data.title || title, items };
}

/* ═══════════════════════════════════════
   COMPONENT: Preview Modal
═══════════════════════════════════════ */
export default function PreviewModal({ title, data, onClose }) {
  if (!data) return null;

  const isDocument = typeof data === 'object' && (data.items || data.line_items);
  const handleDownload = () => downloadInvoicePDF(buildInvoicePayload(title, data));

  // Extract simple fields for metadata section
  const metaEntries = typeof data === 'object'
    ? Object.entries(data)
        .filter(([key, val]) => key !== 'items' && key !== 'line_items' && val != null && typeof val !== 'object')
        .slice(0, 8) // Limit to keep it clean
    : [];

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.15s ease' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-card)', width: 'min(640px, 96vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', border: '1px solid var(--border-light)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
        
        {/* ── Header ─ */}
        <div style={{ position: 'relative', padding: '18px 20px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-faint)', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: '20px', right: '20px', height: '3px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', borderRadius: '4px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', overflow: 'hidden' }}>
                <img src={ttechIcon} alt="T-Tech" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h3 className="card-title" style={{ fontSize: '14px', margin: 0, lineHeight: 1.2, color: 'var(--text-head)' }}>{title}</h3>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{isDocument ? 'Invoice / Quote Preview' : 'Record Details'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', transition: 'background var(--ease)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-canvas)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Icon d={D.x} size={18} />
            </button>
          </div>
        </div>

        {/* ── Body (Elegant Document Layout) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-canvas)' }}>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border-faint)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            
            {isDocument ? (
              <>
                {/* Document Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-faint)' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-head)', marginBottom: '4px' }}>{data.client_name || data.client || 'Client Name'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{data.title || 'Untitled Document'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: 1.6 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Ref:</span> <span style={{ fontWeight: 600, color: 'var(--text-head)' }}>{data.id || '—'}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ fontWeight: 600, color: 'var(--teal)' }}>Active</span></div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', width: '60px' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', width: '100px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items || data.line_items || []).map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-body)' }}>{item.desc || item.description || item.name || '—'}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center', borderBottom: '1px solid var(--border-faint)', color: 'var(--text-body)' }}>{item.qty || item.quantity || 1}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', borderBottom: '1px solid var(--border-faint)', fontWeight: 600, color: 'var(--text-head)' }}>MK {(Number(item.rate || item.unit_price || item.amount || 0) * Number(item.qty || item.quantity || 1)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-faint)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                      MK {(data.items || data.line_items || []).reduce((sum, item) => sum + (Number(item.rate || item.unit_price || item.amount || 0) * Number(item.qty || item.quantity || 1)), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Metadata Section */}
                {metaEntries.length > 0 && (
                  <div style={{ marginBottom: metaEntries.length > 4 ? '16px' : '0' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {metaEntries.map(([key, val], i) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: i < metaEntries.length - 1 ? '1px dashed var(--border-faint)' : 'none' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{formatKey(key)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-head)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{formatValue(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback for non-object data */}
                {typeof data === 'string' && (
                  <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '11px', lineHeight: 1.6, fontStyle: 'italic' }}>{data}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button style={cancelButton} onClick={onClose}>Close</button>
          <button style={primaryButton} onClick={handleDownload} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(58,80,107,0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(58,80,107,0.25)'; }}>
            <Icon d={D.download} size={13} />
            Download PDF
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}