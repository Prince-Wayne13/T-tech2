import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { money } from './utils/format';
import { PrintPreviewModal } from './components/PrintLayouts';
import { downloadInvoicePDF } from './components/InvoicePDF';
import { Icon, ModuleHeader, ModuleToolbar, RegisterCard, STANDARD_ICONS, StatsGrid } from './components/ModuleStandard';
import UnifiedPreviewModal from './components/UnifiedPreviewModal';


const D = {
  ...STANDARD_ICONS,
  reports: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
};

const REPORT_TYPES = ['All', 'Monthly', 'Quarterly', 'Annual', 'Operational', 'Custom'];

function ReportRow({ rpt, onPreview }) {
  const statusConfig = {
    ready: { label: 'Ready', cls: 'paid', accent: 'var(--teal)' },
    pending: { label: 'Pending', cls: 'pending', accent: 'var(--warning)' },
    failed: { label: 'Failed', cls: 'overdue', accent: 'var(--red)' },
  };
  const cfg = statusConfig[rpt.status] || statusConfig.pending;
  const metricCount = Object.keys(rpt.metrics || {}).length;

  return (
    <div className="vendor-item" style={{ position: 'relative', paddingLeft: '14px' }}>
      <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '10px', width: '2px', background: cfg.accent, borderRadius: '2px' }} />
      <div className="vendor-avatar" style={{ background: 'var(--secondary-dim)', color: 'var(--secondary)' }}>{String(rpt.id).split('-')[1] || 'RPT'}</div>
      <div className="vendor-info">
        <div className="vendor-name">{rpt.name}</div>
        <div className="vendor-cat">{rpt.type} - Generated: {rpt.generated}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
        <div className="activity-amount" style={{ fontSize: '11px', fontWeight: 600 }}>By: {rpt.generatedBy}</div>
        <div className="activity-time">{metricCount} metric{metricCount !== 1 ? 's' : ''}</div>
      </div>
      <span className={`status-badge ${cfg.cls}`} style={{ marginLeft: '12px' }}>{cfg.label}</span>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Download" onClick={() => downloadInvoicePDF({ id: rpt.id, client_name: rpt.type, title: rpt.name, items: [{ description: rpt.name, quantity: 1, unit_price: 0 }] })}>
          <Icon d={D.download} size={11} />
        </button>
        <button className="notif-btn" style={{ width: '24px', height: '24px' }} title="Preview" onClick={() => onPreview(rpt)}>
          <Icon d={D.eye} size={11} />
        </button>
      </div>
    </div>
  );
}

export default function Reports() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [machineRevenue, setMachineRevenue] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.reports(), api.financialReport('month'), api.machineRevenue()])
      .then(([reportResponse, financialReport, machineResponse]) => {
        setReports((reportResponse.items || []).map(report => ({
          id: report.id,
          name: report.name,
          type: report.type,
          generated: 'Live',
          status: report.status,
          generatedBy: report.generated_by || 'System',
          notes: report.notes,
          metrics: report.metrics || {},
        })));
        setFinancials(financialReport);
        setMachineRevenue(machineResponse.items || []);
      })
      .catch(() => setError('Could not load reports. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(report => {
    const query = search.toLowerCase();
    const matchesType = filter === 'All' || report.type === filter;
    const matchesSearch = `${report.name} ${report.id} ${report.notes}`.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });
  const readyCount = reports.filter(report => report.status === 'ready').length;
  const pendingCount = reports.filter(report => report.status === 'pending').length;
  const topMachine = machineRevenue.find(machine => Number(machine.revenue) > 0);
  const stats = [
    { label: 'Reports Generated', value: reports.length, sub: 'Live library', icon: D.reports, color: 'primary' },
    { label: 'Pending Review', value: pendingCount, sub: 'Awaiting approval', icon: D.clock, color: 'warning' },
    { label: 'Ready to Download', value: readyCount, sub: 'Available now', icon: D.check, color: 'teal' },
    { label: 'Top Machine', value: topMachine ? money(topMachine.revenue) : money(financials?.profit || 0), sub: topMachine ? topMachine.name : 'Profit this period', icon: D.reports, color: 'secondary' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Reports" subtitle="Financial & operational summaries" actionLabel={null} />
      <StatsGrid stats={stats} />
      <ModuleToolbar filters={REPORT_TYPES} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} placeholder="Search reports..." />
      <RegisterCard title="Report Library" countLabel={`${filtered.length} report${filtered.length !== 1 ? 's' : ''} found`} loading={loading} error={error} emptyIcon="RPT" emptyMessage="No reports match your filters.">
        {filtered.map(rpt => <ReportRow key={rpt.id} rpt={rpt} onPreview={setPreview} />)}
      </RegisterCard>
    <UnifiedPreviewModal 
  isOpen={!!preview} 
  onClose={() => setPreview(null)} 
  title={preview?.name} 
  data={preview} 
/>
    </main>
  );
}
