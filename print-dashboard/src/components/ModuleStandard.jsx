import React, { useState } from 'react';

export function Icon({ d, size = 14, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d={d} />
    </svg>
  );
}

export const STANDARD_ICONS = {
  plus: 'M12 5v14M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  invoices: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2 M12 12v4 M10 14h4',
};

export function ImportedDot({ recordDeviceId, currentDeviceId }) {
  if (!recordDeviceId || !currentDeviceId || recordDeviceId === currentDeviceId) return null;
  return (
    <span
      title={`New from sync (${recordDeviceId})`}
      style={{
        display: 'inline-block',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: 'var(--secondary)',
        boxShadow: '0 0 0 3px rgba(101, 139, 181, 0.16)',
        marginLeft: '6px',
        verticalAlign: 'middle',
      }}
    />
  );
}

export const moduleStyles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '18px',
    paddingBottom: '14px',
    borderBottom: '1.2px solid rgba(231, 228, 228, 0.4)',
    position: 'relative',
    gap: '14px',
  },
  titleWrap: { position: 'relative', paddingLeft: '14px', minWidth: 0 },
  accent: {
    position: 'absolute',
    left: 0,
    top: '2px',
    bottom: '2px',
    width: '3px',
    background: 'linear-gradient(to bottom, var(--primary), var(--teal))',
    borderRadius: '4px',
  },
  title: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    letterSpacing: 0,
  },
  subtitle: { fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' },
  primaryAction: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '7px 15px',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    transition: 'all var(--ease)',
    boxShadow: '0 3px 10px rgba(58,80,107,0.35)',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '14px',
    padding: '10px 12px',
    background: 'rgba(248, 249, 251, 0.92)',
    backdropFilter: 'blur(8px)',
    borderRadius: 'var(--r-card)',
    border: '1px solid var(--border-faint)',
  },
  segments: {
    display: 'flex',
    background: 'var(--bg-canvas)',
    borderRadius: '6px',
    padding: '2px',
    border: '1px solid var(--border-faint)',
    overflowX: 'auto',
  },
  search: {
    width: '100%',
    padding: '6px 10px 6px 28px',
    borderRadius: '6px',
    border: '1px solid var(--border-faint)',
    background: '#fff',
    color: 'var(--text-body)',
    fontSize: '10px',
    outline: 'none',
  },
};

export function useModuleToast() {
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  };
  return { toast, notify };
}

export function ModuleToast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: 'var(--z-toast)',
      padding: '10px 12px',
      borderRadius: '8px',
      background: toast.type === 'error' ? 'var(--red)' : 'var(--primary)',
      color: '#fff',
      fontSize: '11px',
      fontWeight: 600,
      boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
    }}>
      {toast.message}
    </div>
  );
}

export function ModuleHeader({ title, subtitle, actionLabel, onAction, actionIcon = STANDARD_ICONS.plus }) {
  return (
    <header style={moduleStyles.header}>
      <div style={moduleStyles.titleWrap}>
        <div style={moduleStyles.accent} />
        <h1 style={moduleStyles.title}>{title}</h1>
        <p style={moduleStyles.subtitle}>{subtitle}</p>
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          style={moduleStyles.primaryAction}
          onMouseEnter={event => {
            event.currentTarget.style.transform = 'translateY(-1px)';
            event.currentTarget.style.boxShadow = '0 4px 12px rgba(58,80,107,0.5)';
          }}
          onMouseLeave={event => {
            event.currentTarget.style.transform = 'translateY(0)';
            event.currentTarget.style.boxShadow = '0 3px 10px rgba(58,80,107,0.35)';
          }}
        >
          <Icon d={actionIcon} size={11} />
          {actionLabel}
        </button>
      )}
    </header>
  );
}

export function StatsCard({ label, value, sub, icon, color, details, onOpenDetails }) {
  const colorMap = {
    warning: 'var(--warning)',
    red: 'var(--red)',
    teal: 'var(--teal)',
    secondary: 'var(--secondary)',
    primary: 'var(--primary)',
  };
  const clickable = Boolean(details && onOpenDetails);
  return (
    <div
      className="card fin-card"
      onClick={clickable ? () => onOpenDetails(details) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? event => {
        if (event.key === 'Enter' || event.key === ' ') onOpenDetails(details);
      } : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
      title={clickable ? 'Show breakdown' : undefined}
    >
      <div className="fin-top">
        <div className="fin-label" style={{ color: '#374f6c' }}>{label}</div>
        <div className={`fin-icon ${color}`}><Icon d={icon} size={15} /></div>
      </div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export function StatsGrid({ stats, columns = 4, onOpenDetails }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '14px', marginBottom: '14px' }}>
      {stats.map(stat => <StatsCard key={stat.label} {...stat} onOpenDetails={onOpenDetails} />)}
    </div>
  );
}

const fmtAmount = value => `MK ${Number(value || 0).toLocaleString('en-MW', { maximumFractionDigits: 0 })}`;

export function DetailBreakdownModal({ detail, onClose }) {
  if (!detail) return null;
  const sections = detail.sections || [];
  const summary = detail.summary || [];
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-overlay)', display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(5, 12, 18, 0.62)' }} onClick={onClose}>
      <section className="card" style={{ width: 'min(760px, 96vw)', maxHeight: '86vh', overflow: 'auto', borderTop: '2px solid var(--primary)' }} onClick={event => event.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div>
            <h3 className="card-title">{detail.title || 'Breakdown'}</h3>
            <p className="card-sub">Source rows behind this value</p>
          </div>
          <button className="filter-btn active" onClick={onClose}>Close</button>
        </div>
        {summary.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(summary.length, 3)}, 1fr)`, gap: '8px', marginBottom: '14px' }}>
            {summary.map(item => (
              <div key={item.label} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-faint)', borderRadius: '7px', padding: '10px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: Number(item.amount) < 0 ? 'var(--red)' : 'var(--text-head)', marginTop: '4px' }}>{fmtAmount(item.amount)}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: '14px' }}>
          {sections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-head)', marginBottom: '7px' }}>{section.title}</div>
              <div style={{ border: '1px solid var(--border-faint)', borderRadius: '7px', overflow: 'hidden' }}>
                {(section.rows || []).length === 0 ? (
                  <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>No source rows found.</div>
                ) : section.rows.map((row, index) => (
                  <div key={`${row.ref || section.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.8fr 1fr 1fr', gap: '8px', alignItems: 'center', padding: '9px 10px', borderTop: index ? '1px solid var(--border-faint)' : 'none', fontSize: '10px', background: index % 2 ? 'rgba(248,249,251,0.7)' : '#fff' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-head)' }}>{row.ref || '-'}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-body)' }}>{row.title || '-'}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{row.party || row.status || '-'}</div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{row.date || '-'}</div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: section.negative ? 'var(--red)' : 'var(--text-head)' }}>{section.negative ? '-' : ''}{fmtAmount(row.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ModuleToolbar({ filters, filter, setFilter, search, setSearch, placeholder }) {
  return (
    <div style={moduleStyles.toolbar}>
      <div style={moduleStyles.segments}>
        {filters.map(item => (
          <button
            key={item}
            className={`filter-btn ${filter === item ? 'active' : ''}`}
            onClick={() => setFilter(item)}
            style={{ padding: '5px 10px', fontSize: '10px', fontWeight: filter === item ? 600 : 500, whiteSpace: 'nowrap' }}
          >
            {item}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={event => setSearch(event.target.value)}
          style={moduleStyles.search}
        />
      </div>
      <button className="notif-btn" style={{ width: '30px', height: '30px' }} title="Filters">
        <Icon d={STANDARD_ICONS.filter} size={12} />
      </button>
    </div>
  );
}

export function RegisterCard({ title, countLabel, loading, error, emptyMessage, emptyIcon, children }) {
  return (
    <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
      <div className="card-header" style={{ marginBottom: '8px' }}>
        <h3 className="card-title">{title}</h3>
        <span className="card-sub">{loading ? 'Loading...' : countLabel}</span>
      </div>
      <div className="vendor-items">
        {loading && <EmptyState icon="..." message="Loading records..." />}
        {!loading && error && <EmptyState icon="!" message={error} tone="error" />}
        {!loading && !error && children}
        {!loading && !error && React.Children.count(children) === 0 && (
          <EmptyState icon={emptyIcon} message={emptyMessage} />
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, message, tone = 'muted' }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px', color: tone === 'error' ? 'var(--red)' : 'var(--text-muted)', fontSize: '11px' }}>
      <div style={{ fontSize: '18px', marginBottom: '6px', opacity: tone === 'error' ? 0.9 : 0.4 }}>{icon}</div>
      {message}
    </div>
  );
}
