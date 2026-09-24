import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { ModuleHeader, ModuleToolbar, STANDARD_ICONS } from './components/ModuleStandard';
import { downloadTablePDF } from './components/TablePDF';
import { shortDate } from './utils/format';

const D = {
  ...STANDARD_ICONS,
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
};

const LEVELS = ['All', 'Error', 'Info', 'Debug'];

function formatTime(value) {
  if (!value) return '--:--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function safeText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function prettyJson(value) {
  if (!value) return '';
  const text = safeText(value);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function mapDebugEvent(entry) {
  return {
    id: entry.id,
    level: safeText(entry.level, 'info').toLowerCase(),
    source: safeText(entry.source, 'frontend'),
    method: safeText(entry.method),
    path: safeText(entry.path),
    status: entry.status_code,
    duration: entry.duration_ms,
    message: safeText(entry.message, 'Debug event'),
    request: safeText(entry.request_body),
    response: safeText(entry.response_body),
    error: safeText(entry.error),
    createdAt: entry.created_at,
  };
}

function TerminalLine({ event, expanded, onToggle }) {
  const color = event.level === 'error' ? '#ff6b6b' : event.level === 'debug' ? '#8ab4f8' : '#74d99f';
  const prompt = event.level === 'error' ? 'ERR' : event.level === 'debug' ? 'DBG' : 'OK ';
  const status = event.status ? ` status=${event.status}` : '';
  const duration = event.duration != null ? ` ${event.duration}ms` : '';

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: '#d7e1ea',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '11px',
          lineHeight: 1.55,
          textAlign: 'left',
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <span style={{ color: '#8796a5' }}>{formatTime(event.createdAt)}</span>{' '}
        <span style={{ color }}>[{prompt}]</span>{' '}
        <span style={{ color: '#f2cc60' }}>{event.method || event.source}</span>{' '}
        <span>{event.path || event.message}</span>
        <span style={{ color: '#8796a5' }}>{status}{duration}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 10px 10px 34px', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '10.5px', color: '#b9c7d3', display: 'grid', gap: '8px' }}>
          <div><span style={{ color: '#8796a5' }}>time:</span> {formatDateTime(event.createdAt)}</div>
          <div><span style={{ color: '#8796a5' }}>message:</span> {event.message}</div>
          {event.error && <pre style={terminalBlockStyle('#3a1418')}>{event.error}</pre>}
          {event.request && (
            <div>
              <div style={{ color: '#8796a5', marginBottom: '3px' }}>request body</div>
              <pre style={terminalBlockStyle()}>{prettyJson(event.request)}</pre>
            </div>
          )}
          {event.response && (
            <div>
              <div style={{ color: '#8796a5', marginBottom: '3px' }}>backend response</div>
              <pre style={terminalBlockStyle()}>{prettyJson(event.response)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function terminalBlockStyle(background = 'rgba(255,255,255,0.045)') {
  return {
    margin: 0,
    padding: '8px',
    maxHeight: '220px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    borderRadius: '6px',
    background,
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#d7e1ea',
  };
}

export default function AuditLog() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = () => {
    setLoading(true);
    setError(null);
    api.debugEvents('?per_page=200')
      .then(data => setEvents((data.items || []).map(mapDebugEvent)))
      .catch(() => setError('Could not load debug log. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
    const id = window.setInterval(loadEvents, 10000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return events.filter(event => {
      const matchesLevel = filter === 'All' || event.level === filter.toLowerCase();
      const matchesSearch = `${event.message} ${event.method} ${event.path} ${safeText(event.status)} ${event.error || ''}`.toLowerCase().includes(query);
      return matchesLevel && matchesSearch;
    });
  }, [events, filter, search]);

  const downloadAudit = async () => {
    await downloadTablePDF({
      title: 'Debug Terminal Log',
      subtitle: `${shortDate(new Date())} - ${filtered.length} events`,
      columns: [
        { label: 'Time', key: 'createdAt', flex: 1.2, render: row => formatDateTime(row.createdAt) },
        { label: 'Level', key: 'level', flex: 0.7 },
        { label: 'Request', flex: 1.6, render: row => `${row.method || ''} ${row.path || ''}` },
        { label: 'Status', key: 'status', flex: 0.7 },
        { label: 'Message', key: 'message', flex: 2.2 },
      ],
      rows: filtered.map(event => ({
        ...event,
        __key: event.id,
        status: safeText(event.status, '-'),
        message: safeText(event.message, 'Debug event'),
      })),
      filename: `debug-terminal-log-${new Date().toISOString().split('T')[0]}.pdf`,
    });
  };

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Debug Terminal" subtitle="Frontend actions, API requests, backend responses & errors" actionLabel="Download PDF" actionIcon={D.download} onAction={downloadAudit} />
      <ModuleToolbar filters={LEVELS} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search request, response, status, or error..." />
      <section className="card" style={{ background: '#071019', borderTop: '2px solid var(--primary)', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9fb0bf', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '11px' }}>
          <span>ttech-debug-console :: {filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
          <button className="filter-btn" onClick={loadEvents}>Refresh</button>
        </div>
        <div style={{ maxHeight: '66vh', overflow: 'auto' }}>
          {loading && <div style={{ color: '#9fb0bf', padding: '14px', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '11px' }}>loading debug events...</div>}
          {!loading && error && <div style={{ color: '#ff6b6b', padding: '14px', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '11px' }}>{error}</div>}
          {!loading && !error && filtered.length === 0 && <div style={{ color: '#9fb0bf', padding: '14px', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '11px' }}>no debug events yet. use the app, then come back here.</div>}
          {!loading && !error && filtered.map(event => (
            <TerminalLine
              key={event.id}
              event={event}
              expanded={expandedId === event.id}
              onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
