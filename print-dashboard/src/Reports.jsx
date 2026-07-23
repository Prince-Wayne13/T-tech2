import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { money } from './utils/format';
import { ModuleHeader, StatsGrid } from './components/ModuleStandard';

// ── Reports rebuild (nav/reports consolidation session) ──────────────────
// Replaces the previous generic report-library list with two tabs:
// Cashflow (money in/out by month, cash-basis) and Snapshot (at-a-glance
// operational + financial totals). The old report-library cards
// (RPT-FIN-MONTH etc. from services/reports.py::build_report_library())
// are no longer surfaced here — this page now reads financialReport(),
// invoiceStats(), jobs(), and expenses() directly instead.

// Prompt 6 item 3: the five new analytics endpoints (Prompt 5) are grouped
// into a single "Analytics" tab rather than five separate top-level tabs, per
// this session's confirmed choice ("easy to get right on the first try, not
// confusing" — a 7-tab bar was judged more likely to overwhelm a first-time
// user than a single tab with clear sub-section headers).
const TABS = ['Cashflow', 'Snapshot', 'Analytics'];
const ANALYTICS_SECTIONS = ['Vendor Spend', 'Client Performance', 'Projections', 'Sales vs Expenses', 'Machine Revenue'];

// ── PulseChart ─────────────────────────────────────────────────────────
// Moved from App.jsx verbatim (dataset construction + SVG rendering logic
// unchanged) so Reports.jsx owns the chart it's meant to house, rather than
// App.jsx importing report data just to feed a chart that lives elsewhere.
const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const EMPTY_DATASETS = [
  { title: 'Revenue vs Expenses', a: MONTHS.map(() => 0), b: MONTHS.map(() => 0), months: MONTHS },
  { title: 'Profit', a: MONTHS.map(() => 0), b: MONTHS.map(() => 0), months: MONTHS },
  { title: 'Cash Flow', a: MONTHS.map(() => 0), b: MONTHS.map(() => 0), months: MONTHS },
];

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`;
  }
  return d;
}

function PulseChart({ financials }) {
  const [slide, setSlide] = useState(0);
  const liveDatasets = financials?.revenue_by_month ? (() => {
    const months = Object.keys(financials.revenue_by_month);
    const revenue = months.map(month => Number(financials.revenue_by_month[month] || 0));
    const expenses = months.map(month => Number(financials.expenses_by_month?.[month] || 0));
    return [
      { title: 'Revenue vs Expenses', a: revenue, b: expenses, months },
      { title: 'Profit', a: revenue.map((value, index) => value - expenses[index]), b: revenue.map(() => 0), months },
      { title: 'Cash Flow', a: revenue, b: expenses.map(value => -value), months },
    ];
  })() : EMPTY_DATASETS;

  useEffect(() => {
    const i = setInterval(() => setSlide(s => (s + 1) % liveDatasets.length), 10000);
    return () => clearInterval(i);
  }, [liveDatasets.length]);

  const [filter, setFilter] = useState('3M');
  const FILTERS = ['1W', '1M', '3M', 'YTD'];
  const currentRaw = liveDatasets[slide] || liveDatasets[0];
  const sliceCount = filter === '1W' ? 1 : filter === '1M' ? 2 : filter === '3M' ? 3 : currentRaw.a.length;
  const current = {
    ...currentRaw,
    a: currentRaw.a.slice(-sliceCount),
    b: currentRaw.b.slice(-sliceCount),
    months: currentRaw.months?.slice(-sliceCount),
  };
  const W = 600, H = 190;
  const PAD = { t: 18, r: 20, b: 30, l: 46 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const dataA = current.a;
  const dataB = current.b;
  const all = [...dataA, ...dataB];
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const range = maxV - minV || 1;

  const toX = i => PAD.l + (i / Math.max(dataA.length - 1, 1)) * pw;
  const toY = v => PAD.t + ph - ((v - minV) / range) * ph;

  const revPts = dataA.map((v, i) => [toX(i), toY(v)]);
  const expPts = dataB.map((v, i) => [toX(i), toY(v)]);
  const revLine = smoothPath(revPts);
  const expLine = smoothPath(expPts);
  const baseY = PAD.t + ph;
  const revArea = `${revLine} L ${toX(dataA.length - 1)} ${baseY} L ${toX(0)} ${baseY} Z`;
  const expArea = `${expLine} L ${toX(dataB.length - 1)} ${baseY} L ${toX(0)} ${baseY} Z`;

  const yTicks = [minV, minV + range / 3, minV + (2 * range) / 3, maxV].map(v => ({
    label: v >= 1000000 ? `MK ${(v / 1000000).toFixed(1)}m` : v >= 1000 ? `MK ${(v / 1000).toFixed(0)}k` : `MK ${v}`,
    y: toY(v),
  }));

  const lastRevY = toY(dataA[dataA.length - 1]);
  const lastExpY = toY(dataB[dataB.length - 1]);
  const lastX = toX(dataA.length - 1) + 6;
  const monthLabels = current.months
    ? current.months.map(month => new Date(`${month}-01`).toLocaleDateString('en-GB', { month: 'short' }))
    : MONTHS;
  const lastRevenue = dataA[dataA.length - 1] || 0;
  const lastExpense = dataB[dataB.length - 1] || 0;
  const netProfit = lastRevenue - lastExpense;

  return (
    <div className="card pulse-chart" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">Business Pulse</h2>
          <p className="card-sub">{current.title} - live backend values</p>
        </div>
        <div className="chart-filters">
          {FILTERS.map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="chart-area fade">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3A506B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3A506B" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A06B6B" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#A06B6B" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={tick.y} x2={W - PAD.r} y2={tick.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.l - 7} y={tick.y + 4} textAnchor="end" fontSize="8.5" fill="rgba(255,255,255,0.28)">{tick.label}</text>
            </g>
          ))}
          {monthLabels.map((m, i) => (
            <g key={m}>
              <line x1={toX(i)} y1={PAD.t + ph} x2={toX(i)} y2={PAD.t + ph + 5} stroke="rgba(58,80,107,0.6)" strokeWidth="1" />
              <text x={toX(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="rgba(58,80,107,0.9)">{m}</text>
            </g>
          ))}
          <path d={revArea} fill="url(#gRev)" />
          <path d={expArea} fill="url(#gExp)" />
          <path d={revLine} fill="none" stroke="#3A506B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={expLine} fill="none" stroke="#A06B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {revPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === revPts.length - 1 ? 4.5 : 2.5} fill={i === revPts.length - 1 ? '#3A506B' : '#0B1E1A'} stroke="#3A506B" strokeWidth={i === revPts.length - 1 ? 0 : 1.5} />
          ))}
          {expPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === expPts.length - 1 ? 4 : 2} fill={i === expPts.length - 1 ? '#A06B6B' : '#0B1E1A'} stroke="#A06B6B" strokeWidth={i === expPts.length - 1 ? 0 : 1.5} />
          ))}
          <text x={lastX} y={lastRevY + 4} fontSize="9" fontWeight="700" fill="#3A506B">{money(lastRevenue).replace('MWK', 'MK')}</text>
          <text x={lastX} y={lastExpY + 4} fontSize="9" fontWeight="700" fill="#A06B6B">{money(Math.abs(lastExpense)).replace('MWK', 'MK')}</text>
        </svg>
      </div>
      <div className="chart-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#3A506B' }} /> Revenue</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#A06B6B' }} /> Expenses</div>
        <div className="legend-net">Net Profit <strong>{money(netProfit)}</strong><span className="trend-badge">Live</span></div>
      </div>
    </div>
  );
}

const D_JOBS = 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0';
const D_INVOICES = 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2M12 12v4M10 14h4';
const D_EXPENSES = 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6';
const D_CASH = 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6';

// Outstanding-payables status set — must stay identical to Expenses.jsx's
// TAB_STATUS_SETS.Outstanding, since that's the definition of "unpaid" this
// app already uses elsewhere. No backend total exists for this yet, so it's
// computed client-side from api.expenses() with the same filter Expenses.jsx
// applies, rather than inventing a different definition of "outstanding."
const OUTSTANDING_EXPENSE_STATUSES = ['pending', 'approved', 'scheduled'];
// Active-jobs status set — identical to Jobs.jsx's "Active Jobs" stat filter.
const ACTIVE_JOB_STATUSES = ['printing', 'queued'];

/* ═══════════════════════════════════════
   ANALYTICS TAB (Prompt 6, item 3)
   Wraps the five Prompt 5 aggregation endpoints as sub-sections within one
   tab. Each section fetches its own endpoint independently and renders its
   own loading/error/empty state, so one slow or failing endpoint doesn't
   block the others from showing.
═══════════════════════════════════════ */
function useAnalyticsData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loader()
      .then(setData)
      .catch(() => setError('Could not load this report. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

function SectionShell({ title, loading, error, empty, children }) {
  return (
    <div className="card" style={{ marginBottom: '14px', borderTop: '2px solid var(--secondary)' }}>
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <h3 className="card-title">{title}</h3>
      </div>
      {loading && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>Loading...</div>}
      {!loading && error && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--red)', fontSize: '11px' }}>{error}</div>}
      {!loading && !error && empty && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No data available yet.</div>}
      {!loading && !error && !empty && children}
    </div>
  );
}

function VendorSpendSection() {
  const { data, loading, error } = useAnalyticsData(() => api.analyticsVendors());
  const rows = data?.items || [];
  return (
    <SectionShell title="Vendor Spend" loading={loading} error={error} empty={rows.length === 0}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Vendor</th>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Category</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Lifetime Spend</th>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Top Category (This Year)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const currentYear = row.yearly?.[row.yearly.length - 1];
              return (
                <tr key={row.vendor_id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  <td style={{ padding: '8px' }}>{row.vendor_name}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{row.category || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{money(row.lifetime_total)}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{currentYear?.top_category || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function ClientPerformanceSection() {
  const { data, loading, error } = useAnalyticsData(() => api.analyticsClients());
  const rows = data?.items || [];
  return (
    <SectionShell title="Client Performance" loading={loading} error={error} empty={rows.length === 0}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Client</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Total Purchased</th>
              <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)' }}>Invoices</th>
              <th style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)' }}>Recurring?</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map(row => (
              <tr key={row.client_id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                <td style={{ padding: '8px' }}>{row.client_name}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{money(row.total_purchased)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{row.invoice_count}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <span className={`status-badge ${row.is_recurring ? 'paid' : 'pending'}`}>{row.is_recurring ? 'Recurring' : 'One-off'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function ProjectionsSection() {
  const { data, loading, error } = useAnalyticsData(() => api.analyticsProjections());
  return (
    <SectionShell title="Projections" loading={loading} error={error} empty={!data}>
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-canvas)', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Sent Pipeline</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{money(data.pipeline?.sent_not_expired?.total)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.pipeline?.sent_not_expired?.count || 0} proposals</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-canvas)', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Accepted, Awaiting Payment</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{money(data.pipeline?.accepted_not_yet_invoiced?.total)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.pipeline?.accepted_not_yet_invoiced?.count || 0} proposals</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-canvas)', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Recurring Clients (Avg.)</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{money(data.recurring_clients_projection?.total)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.recurring_clients_projection?.count || 0} clients</div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(196, 163, 90, 0.08)', borderRadius: '8px', border: '1px solid rgba(196, 163, 90, 0.2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Projected ({data.projection_month})</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#C4A35A' }}>{money(data.total_projected_revenue)}</div>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This is a simple historical-average projection based on existing pipeline and recurring-client data — not a forecasting model.
          </div>
        </>
      )}
    </SectionShell>
  );
}

function SalesVsExpensesSection() {
  const { data, loading, error } = useAnalyticsData(() => api.analyticsSalesVsExpenses());
  const rows = data?.months || [];
  return (
    <SectionShell title="Sales vs Expenses" loading={loading} error={error} empty={rows.length === 0}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Month</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Sales</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Expenses</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                <td style={{ padding: '8px' }}>{row.month}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--teal)' }}>{money(row.sales)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--warning)' }}>{money(row.expenses)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: row.balance >= 0 ? 'var(--teal)' : 'var(--red)' }}>{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function MachineRevenueSection() {
  const { data, loading, error } = useAnalyticsData(() => api.analyticsMachineRevenue());
  const rows = data?.items || [];
  return (
    <SectionShell title="Machine Revenue" loading={loading} error={error} empty={rows.length === 0}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {rows.slice(0, 12).map(row => (
          <div key={row.key} style={{ padding: '12px', background: 'var(--bg-canvas)', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{row.name}</div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{money(row.lifetime_revenue)}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{row.type}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function AnalyticsTab() {
  const [section, setSection] = useState(ANALYTICS_SECTIONS[0]);
  return (
    <>
      <div className="chart-filters" style={{ marginBottom: '14px', width: 'fit-content', flexWrap: 'wrap' }}>
        {ANALYTICS_SECTIONS.map(s => (
          <button key={s} className={`filter-btn ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>{s}</button>
        ))}
      </div>
      {section === 'Vendor Spend' && <VendorSpendSection />}
      {section === 'Client Performance' && <ClientPerformanceSection />}
      {section === 'Projections' && <ProjectionsSection />}
      {section === 'Sales vs Expenses' && <SalesVsExpensesSection />}
      {section === 'Machine Revenue' && <MachineRevenueSection />}
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('Cashflow');
  const [financials, setFinancials] = useState(null);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.financialReport('month'),
      api.invoiceStats(),
      api.jobs('?per_page=500'),
      api.expenses('?per_page=500'),
    ])
      .then(([financialReport, stats, jobResponse, expenseResponse]) => {
        setFinancials(financialReport);
        setInvoiceStats(stats);
        setJobs(jobResponse.items || []);
        setExpenses(expenseResponse.items || []);
      })
      .catch(() => setError('Could not load reports. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  // Cash-basis by-month figures only (revenue_by_month / expenses_by_month).
  // Deliberately NOT using financials.revenue / financials.profit here — those
  // top-level fields are booked-basis (a known, separate reconciliation issue
  // documented in reports.py) and would be inconsistent with this tab if mixed in.
  const monthKeys = financials?.revenue_by_month ? Object.keys(financials.revenue_by_month) : [];
  const latestMonth = monthKeys[monthKeys.length - 1];
  const moneyIn = latestMonth ? Number(financials.revenue_by_month[latestMonth] || 0) : 0;
  const moneyOut = latestMonth ? Number(financials.expenses_by_month?.[latestMonth] || 0) : 0;
  const netCashflow = moneyIn - moneyOut;

  const cashflowStats = [
    { label: 'Money In This Month', value: money(moneyIn), sub: 'Cash received', icon: D_CASH, color: 'teal' },
    { label: 'Money Out This Month', value: money(moneyOut), sub: 'Cash paid out', icon: D_EXPENSES, color: 'warning' },
    { label: 'Net Cashflow', value: money(netCashflow), sub: netCashflow >= 0 ? 'Positive this month' : 'Negative this month', icon: D_CASH, color: netCashflow >= 0 ? 'teal' : 'red' },
    { label: 'Months Tracked', value: String(monthKeys.length), sub: 'Trailing window', icon: D_INVOICES, color: 'secondary' },
  ];

  const activeJobsCount = jobs.filter(job => ACTIVE_JOB_STATUSES.includes(job.status)).length;
  const outstandingPayablesTotal = expenses
    .filter(expense => OUTSTANDING_EXPENSE_STATUSES.includes(expense.status))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const snapshotStats = [
    { label: 'Jobs In Progress', value: String(activeJobsCount), sub: 'Queued or printing', icon: D_JOBS, color: 'primary' },
    { label: 'Unpaid Receivables', value: money(invoiceStats?.outstanding || 0), sub: 'Owed to the business', icon: D_INVOICES, color: 'warning' },
    { label: 'Unpaid Payables', value: money(outstandingPayablesTotal), sub: 'Owed by the business', icon: D_EXPENSES, color: 'red' },
    { label: "This Month's Net Cashflow", value: money(netCashflow), sub: netCashflow >= 0 ? 'Positive' : 'Negative', icon: D_CASH, color: netCashflow >= 0 ? 'teal' : 'red' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Reports" subtitle="Cashflow and at-a-glance financial snapshot" actionLabel={null} />

      <div className="chart-filters" style={{ marginBottom: '14px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} className={`filter-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {loading && <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>}
      {!loading && error && <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--red)' }}>{error}</div>}

      {!loading && !error && tab === 'Cashflow' && (
        <>
          <StatsGrid stats={cashflowStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <PulseChart financials={financials} />
          </div>
        </>
      )}

      {!loading && !error && tab === 'Snapshot' && (
        <StatsGrid stats={snapshotStats} />
      )}

      {tab === 'Analytics' && <AnalyticsTab />}
    </main>
  );
}