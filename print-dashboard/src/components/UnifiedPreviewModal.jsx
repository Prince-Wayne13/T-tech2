// UnifiedPreviewModal.jsx — PrintOps BMS (Premium Gold + Darker Blue)
import React, { useEffect, useState } from 'react';

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
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
};

/* ═══════════════════════════════════════
   THEME ENGINE (Exact :root Match)
═══════════════════════════════════════ */
function getTheme(data) {
  const type = data?.type || '';
  const status = data?.status || '';
  
  // Financials -> Darker Yacht Blue
  if (['Invoice', 'Proposal', 'Expense', 'Receivables', 'Payables'].includes(type) || type === 'document' || status === 'financial') {
    return { color: '#2C3A4C', dim: 'rgba(44, 58, 76, 0.08)', label: 'Financial', icon: D.fileText };
  }
  // Jobs/Production -> Teal
  if (['Job', 'Production'].includes(type) || type === 'job') {
    return { color: '#6B8E7B', dim: 'rgba(107, 142, 123, 0.08)', label: 'Production', icon: D.check };
  }
  // Reports/Analytics -> Purple
  if (['Report', 'Metric'].includes(type) || type === 'report') {
    return { color: '#7B6B8E', dim: 'rgba(123, 107, 142, 0.08)', label: 'Report', icon: D.activity };
  }
  // Audit/System/Archive -> PREMIUM GOLD
  if (['Audit', 'System', 'Log', 'Archive'].includes(type) || type === 'audit') {
    return { color: '#C4A35A', dim: 'rgba(196, 163, 90, 0.1)', label: 'System', icon: D.clock };
  }
  
  // Default -> Secondary
  return { color: '#5B7C99', dim: 'rgba(91, 124, 153, 0.08)', label: 'Record', icon: D.fileText };
}

/* ═══════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════ */
const cancelButton = { padding: '7px 14px', borderRadius: '50px', border: '1px solid var(--border-faint)', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all var(--ease)' };
const primaryButton = (theme) => ({ padding: '7px 14px', borderRadius: '50px', border: 'none', background: theme.color, color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 3px 8px ${theme.color}30`, transition: 'all var(--ease)' });

/* ═══════════════════════════════════════
   HELPER: Smart Data Router
═══════════════════════════════════════ */
function detectLayout(data) {
  if (!data || typeof data !== 'object') return 'text';
  if (data.items || data.line_items) return 'document';
  if (data.metrics && typeof data.metrics === 'object') return 'report';
  if (data.user && data.action && data.target) return 'audit';
  if (data.type && ['Job', 'Invoice', 'Proposal', 'Receipt', 'Advance', 'Expense', 'Archive'].includes(data.type)) return 'record';
  return 'metadata';
}

function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

/* ═══════════════════════════════════════
   STATUS BADGE (Gold Enhanced)
═══════════════════════════════════════ */
function StatusBadge({ status, color }) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  let bg = 'var(--bg-canvas)';
  let txt = 'var(--text-body)';
  
  if (['active', 'paid', 'approved', 'ready', 'completed', 'archived'].some(w => s.includes(w))) { bg = 'rgba(196, 163, 90, 0.12)'; txt = '#C4A35A'; }
  else if (['pending', 'draft', 'queued', 'processing'].some(w => s.includes(w))) { bg = 'var(--warning-dim)'; txt = 'var(--warning)'; }
  else if (['failed', 'overdue', 'rejected', 'cancelled'].some(w => s.includes(w))) { bg = 'var(--red-dim)'; txt = 'var(--red)'; }
  else { bg = color === '#C4A35A' ? 'rgba(196, 163, 90, 0.1)' : 'var(--primary-dim)'; txt = color; }

  return (
    <span style={{ padding: '4px 10px', borderRadius: '50px', background: bg, color: txt, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${txt}20` }}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════
   LAYOUT RENDERERS
═══════════════════════════════════════ */
function DocumentLayout({ data, theme }) {
  const items = data.items || data.line_items || [];
  const total = items.reduce((sum, i) => sum + (Number(i.rate || i.unit_price || i.amount || 0) * Number(i.qty || i.quantity || 1)), 0);
  
  return (
    <>
      {/* Document Header with Gold Accent */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-faint)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: theme.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color }}>
              <Icon d={theme.icon} size={14} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-head)' }}>{data.client_name || data.client || data.party || 'Client'}</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{data.title || data.name || 'Untitled Document'}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: 1.6 }}>
          <StatusBadge status={data.status} color={theme.color} />
          <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>Ref: <span style={{ fontWeight: 600, color: 'var(--text-head)' }}>{data.id || '—'}</span></div>
        </div>
      </div>

      {/* Enhanced Table with Gold Hover & Border */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border-faint)', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-canvas)', borderBottom: '2px solid var(--border-faint)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', width: '70px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', width: '110px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-faint)' : 'none', transition: 'background var(--ease)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(196, 163, 90, 0.04)'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <td style={{ padding: '12px 16px', color: 'var(--text-body)' }}>{item.desc || item.description || item.name || '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-body)' }}>{item.qty || item.quantity || 1}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-head)' }}>MK {(Number(item.rate || item.unit_price || item.amount || 0) * Number(item.qty || item.quantity || 1)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Premium Gold Total Box */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right', background: 'rgba(196, 163, 90, 0.06)', padding: '14px 22px', borderRadius: '8px', border: `1px solid #C4A35A30`, boxShadow: '0 2px 8px rgba(196, 163, 90, 0.08)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Amount</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#C4A35A' }}>MK {total.toLocaleString()}</div>
        </div>
      </div>
    </>
  );
}

function ReportLayout({ data, theme }) {
  const metrics = Object.entries(data.metrics || {});
  return (
    <>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '2px', background: '#C4A35A', borderRadius: '2px' }} /> Key Metrics
      </div>
      {metrics.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {metrics.map(([key, val]) => (
            <div key={key} style={{ padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border-faint)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${theme.color}, transparent)` }} />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>{formatKey(key)}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: theme.color }}>{typeof val === 'number' ? `MK ${val.toLocaleString()}` : formatValue(val)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-canvas)', borderRadius: '8px', border: '1px dashed var(--border-faint)' }}>No metrics available for this report.</div>
      )}
      {data.notes && <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-faint)', fontSize: '11px', color: 'var(--text-body)', lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes:</span> {data.notes}</div>}
    </>
  );
}

function AuditLayout({ data, theme }) {
  const entries = [
    { label: 'User', value: data.user },
    { label: 'Action', value: data.action },
    { label: 'Target', value: data.target },
    { label: 'Timestamp', value: data.time },
    { label: 'Category', value: data.type },
  ];
  
  return (
    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border-faint)', padding: '20px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: '0', bottom: 0, width: '3px', background: `linear-gradient(180deg, #C4A35A, transparent)`, borderRadius: '4px 0 0 4px' }} />
      {entries.map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 10px 12px', borderBottom: i < entries.length - 1 ? '1px dashed var(--border-faint)' : 'none' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', width: '30%' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-head)', fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{formatValue(value)}</span>
        </div>
      ))}
      {data.details && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(196, 163, 90, 0.05)', borderRadius: '6px', border: `1px solid #C4A35A20` }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#C4A35A', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Details</span>
          <span style={{ fontSize: '11px', color: 'var(--text-body)', lineHeight: 1.5 }}>{data.details}</span>
        </div>
      )}
    </div>
  );
}

function RecordLayout({ data, theme }) {
  const entries = [
    { label: 'Type', value: data.type },
    { label: 'Title', value: data.title || data.name },
    { label: 'Party / Client', value: data.party || data.client },
    { label: 'Amount / Status', value: data.amount || data.status },
    { label: 'Archived / Date', value: data.archived || data.date || data.created_at },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--border-faint)', padding: '20px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, #C4A35A, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color }}>
            <Icon d={theme.icon} size={14} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-head)' }}>{data.title || data.name || 'Record'}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{data.id || 'ID Unknown'}</div>
          </div>
        </div>
        <StatusBadge status={data.status} color={theme.color} />
      </div>
      
      <div style={{ borderTop: '1px solid var(--border-faint)' }}>
        {entries.filter(e => e.value).map(({ label, value }, i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: i < entries.length - 1 ? '1px dashed var(--border-faint)' : 'none' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', width: '40%' }}>{label}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-head)', fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{formatValue(value)}</span>
          </div>
        ))}
      </div>
      {data.notes && <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-body)', lineHeight: 1.5, fontStyle: 'italic', padding: '10px', background: 'var(--bg-canvas)', borderRadius: '6px', border: '1px solid var(--border-faint)' }}>"{data.notes}"</div>}
    </div>
  );
}

function MetadataLayout({ data, theme }) {
  const entries = Object.entries(data).filter(([, val]) => val != null && typeof val !== 'object');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px dashed var(--border-faint)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{formatKey(key)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-head)', fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{formatValue(val)}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Unified Preview Modal
═══════════════════════════════════════ */
export default function UnifiedPreviewModal({ isOpen, onClose, title, data, onDownload }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) setVisible(true);
    else { const t = setTimeout(() => setVisible(false), 150); return () => clearTimeout(t); }
  }, [isOpen]);

  if (!visible) return null;

  const layout = detectLayout(data);
  const theme = getTheme(data);
  
  const LayoutComponent = {
    document: DocumentLayout,
    report: ReportLayout,
    audit: AuditLayout,
    record: RecordLayout,
    metadata: MetadataLayout,
    text: () => <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '11px', lineHeight: 1.6, fontStyle: 'italic' }}>{String(data)}</p>
  }[layout];

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', animation: isOpen ? 'fadeIn 0.15s ease' : 'fadeOut 0.15s ease' }} onClick={onClose}>
      {/* Premium Gold-Edged Modal Container */}
      <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--r-card)', width: 'min(680px, 96vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(196, 163, 90, 0.15)', border: '1px solid var(--border-light)', overflow: 'hidden', animation: isOpen ? 'slideUp 0.2s ease' : 'slideDown 0.15s ease' }} onClick={e => e.stopPropagation()}>
        
        {/* ── HEADER ── */}
        <div style={{ position: 'relative', padding: '18px 20px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-faint)', flexShrink: 0 }}>
          {/* Dynamic Gradient Accent (Blue → Gold) */}
          <div style={{ position: 'absolute', top: 0, left: '0', right: '0', height: '3px', background: `linear-gradient(90deg, transparent, ${theme.color}, #C4A35A, transparent)`, borderRadius: '4px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: theme.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color }}>
                <Icon d={theme.icon} size={16} />
              </div>
              <div>
                <h3 className="card-title" style={{ fontSize: '14px', margin: 0, lineHeight: 1.2, color: 'var(--text-head)' }}>{title || 'Preview'}</h3>
                <span style={{ fontSize: '10px', color: theme.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{theme.label} Preview</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', transition: 'background var(--ease)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-canvas)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Icon d={D.x} size={18} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <LayoutComponent data={data} theme={theme} />
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '14px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button style={cancelButton} onClick={onClose}>Close</button>
          {onDownload && (
            <button style={primaryButton(theme)} onClick={onDownload} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 5px 12px ${theme.color}40`; e.currentTarget.style.borderColor = '#C4A35A'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 3px 8px ${theme.color}40`; e.currentTarget.style.borderColor = 'transparent'; }}>
              <Icon d={D.download} size={13} />
              Download PDF
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(12px); opacity: 0; } }
      `}</style>
    </div>
  );
}