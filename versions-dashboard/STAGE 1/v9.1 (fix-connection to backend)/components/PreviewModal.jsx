import React from 'react';

export default function PreviewModal({ title, data, onClose }) {
  if (!data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'grid',
        placeItems: 'center',
        padding: '18px',
        background: 'rgba(5, 12, 18, 0.62)',
      }}
      onClick={onClose}
    >
      <section
        className="card"
        style={{
          width: 'min(760px, 94vw)',
          maxHeight: '82vh',
          overflow: 'auto',
          borderTop: '2px solid var(--primary)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-header" style={{ marginBottom: '10px' }}>
          <h3 className="card-title">{title}</h3>
          <button className="filter-btn active" onClick={onClose}>Close</button>
        </div>
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            color: 'var(--text-body)',
            fontSize: '11px',
            lineHeight: 1.55,
          }}
        >
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </div>
  );
}
