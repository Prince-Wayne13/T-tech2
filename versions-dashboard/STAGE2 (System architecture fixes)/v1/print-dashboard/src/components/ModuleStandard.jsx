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
      zIndex: 1200,
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

export function StatsCard({ label, value, sub, icon, color }) {
  const colorMap = {
    warning: 'var(--warning)',
    red: 'var(--red)',
    teal: 'var(--teal)',
    secondary: 'var(--secondary)',
    primary: 'var(--primary)',
  };
  return (
    <div className="card fin-card">
      <div className="fin-top">
        <div className="fin-label" style={{ color: '#374f6c' }}>{label}</div>
        <div className={`fin-icon ${color}`}><Icon d={icon} size={15} /></div>
      </div>
      <div className="fin-metric" style={{ color: colorMap[color] || 'var(--text-head)' }}>{value}</div>
      <div className="fin-sub" style={{ marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

export function StatsGrid({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
      {stats.map(stat => <StatsCard key={stat.label} {...stat} />)}
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
