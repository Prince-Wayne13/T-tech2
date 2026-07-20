import React from 'react';
import { downloadPreviewPdf, recordToPdfHtml } from '../utils/downloads';

export default function PreviewModal({ title, data, onClose }) {
  if (!data) return null;
  const simpleEntries = typeof data === 'object'
    ? Object.entries(data).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
    : [];
  const arrays = typeof data === 'object'
    ? Object.entries(data).filter(([, value]) => Array.isArray(value) && value.length)
    : [];

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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="filter-btn" onClick={() => downloadPreviewPdf(title, recordToPdfHtml(title, data))}>Download PDF</button>
            <button className="filter-btn active" onClick={onClose}>Close</button>
          </div>
        </div>
        {typeof data === 'string' ? (
          <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '12px', lineHeight: 1.55 }}>{data}</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {simpleEntries.map(([key, value]) => (
                <div key={key} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-faint)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>{key.replaceAll('_', ' ')}</div>
                  <div style={{ color: 'var(--text-head)', fontSize: '12px', fontWeight: 650, marginTop: '4px' }}>{String(value)}</div>
                </div>
              ))}
            </div>
            {arrays.map(([key, rows]) => {
              const columns = Object.keys(rows[0] || {}).slice(0, 5);
              return (
                <div key={key}>
                  <h4 className="card-title" style={{ marginBottom: '8px' }}>{key.replaceAll('_', ' ')}</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead><tr>{columns.map(column => <th key={column} style={{ textAlign: 'left', padding: '7px', borderBottom: '1px solid var(--border-faint)' }}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
                    <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column} style={{ padding: '7px', borderBottom: '1px solid var(--border-faint)' }}>{String(row[column] ?? '')}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
