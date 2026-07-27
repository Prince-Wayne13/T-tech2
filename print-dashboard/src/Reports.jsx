import React, { useEffect, useState } from 'react';
import './styles.css';
import { api } from './api/client';
import { money } from './utils/format';
import { ModuleHeader, StatsGrid } from './components/ModuleStandard';
import { PrintPreviewModal } from './components/PrintLayouts';

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
const TABS = ['Cashflow', 'Income Statement', 'Analytics'];
const ANALYTICS_SECTIONS = ['Vendor Spend', 'Client Performance', 'Projections', 'Sales vs Expenses', 'Machine Revenue', 'Quantity Made', 'Job Throughput', 'Materials'];

function formatMonthLabel(month) {
  if (!month || month === 'All') return 'All Months';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

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

// ── Monthly filter (Reports tab, Cashflow/Snapshot) ──────────────────────
// financialReport() already returns 13 trailing months of revenue_by_month /
// expenses_by_month in one call (services/reports.py::trailing_month_keys()).
// That data was already being fetched and thrown away — only the latest
// month was ever read. This is a pure frontend selector over data already
// in memory, no new endpoint, no new backend call per month switch.
function MonthSelector({ monthKeys, selectedMonth, setSelectedMonth }) {
  if (!monthKeys.length) return null;
  return (
    <select
      value={selectedMonth}
      onChange={e => setSelectedMonth(e.target.value)}
      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)', marginBottom: '14px' }}
    >
      {[...monthKeys].reverse().map(key => (
        <option key={key} value={key}>{formatMonthLabel(key)}</option>
      ))}
    </select>
  );
}

// ── Plain-English translation card ────────────────────────────────────────
// Not a replacement for the stat boxes or the Business Pulse chart — sits
// alongside them. Purpose: a one-line verdict plus a money-in / money-out /
// left-over story, in everyday words, for a reader who doesn't want to parse
// "revenue" vs "receivables" vs "booked" vs "cash-basis." Uses the same
// selected month's moneyIn/moneyOut the stat boxes use, so the two can never
// disagree with each other.
function PlainEnglishCard({ moneyIn, moneyOut, netCashflow, monthLabel }) {
  const madeMoney = netCashflow > 0;
  const brokeEven = netCashflow === 0;
  const verdict = brokeEven
    ? "You broke even this month — what came in matched what went out."
    : madeMoney
    ? "You made money this month."
    : "You spent more than you brought in this month.";

  const verdictColor = brokeEven ? 'var(--text-muted)' : madeMoney ? 'var(--teal)' : 'var(--red)';

  // Simple proportional bar: money out and what's left as shares of money in
  // (or, if money out exceeded money in, the bar shows the shortfall instead
  // of a share of nothing). Kept as one bar, not a pie or multi-series chart
  // — the goal is "glance and understand," not another chart to interpret.
  const total = Math.max(moneyIn, moneyOut, 1);
  const outPct = Math.min(100, (moneyOut / total) * 100);
  const leftPct = Math.max(0, 100 - outPct);

  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderTop: '2px solid var(--secondary)' }}>
      <div className="card-header" style={{ marginBottom: '8px' }}>
        <div>
          <h2 className="card-title">What This Means For The Business</h2>
          <p className="card-sub">{monthLabel} — in plain terms</p>
        </div>
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, color: verdictColor, marginBottom: '16px' }}>
        {verdict}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          Money that came in: <strong>{money(moneyIn)}</strong>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          Money that went out: <strong>{money(moneyOut)}</strong>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          That leaves you with: <strong style={{ color: verdictColor }}>{money(netCashflow)}</strong>
        </div>
      </div>

      <div style={{ height: '20px', borderRadius: '10px', overflow: 'hidden', display: 'flex', background: 'var(--bg-canvas)' }}>
        <div style={{ width: `${outPct}%`, background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        <div style={{ width: `${leftPct}%`, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: 'var(--warning)', marginRight: '5px' }} />Spent</span>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: 'var(--teal)', marginRight: '5px' }} />Kept</span>
      </div>

      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.5 }}>
        This reflects cash actually received and paid out for {monthLabel.toLowerCase()} only. Amounts still owed to or by the business (unpaid invoices, unpaid bills) are shown separately in Unpaid Receivables / Unpaid Payables and are not part of this figure.
      </div>
    </div>
  );
}

// ── Receivables / Payables translation card ───────────────────────────────
// Separate from PlainEnglishCard on purpose: receivables/payables are
// balances (what's owed right now), not a flow for a selected month, so they
// need their own plain-English framing rather than being folded into the
// money-in/money-out story above, which would blur two different questions
// ("how did this month go" vs "where do I stand today").
function ReceivablesPayablesCard({ receivables, payables }) {
  const net = receivables - payables;
  const owedMoreThanOwing = net > 0;
  const evenOut = net === 0;

  let verdict;
  if (receivables === 0 && payables === 0) {
    verdict = "Nobody owes you, and you don't owe anybody. Clean slate.";
  } else if (evenOut) {
    verdict = "What's owed to you and what you owe balance out exactly.";
  } else if (owedMoreThanOwing) {
    verdict = "Clients owe you more than you owe your vendors — money is on its way in.";
  } else {
    verdict = "You owe vendors more than clients owe you — keep an eye on when those bills are due.";
  }
  const verdictColor = evenOut ? 'var(--text-muted)' : owedMoreThanOwing ? 'var(--teal)' : 'var(--warning)';

  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderTop: '2px solid var(--secondary)' }}>
      <div className="card-header" style={{ marginBottom: '8px' }}>
        <div>
          <h2 className="card-title">What You're Owed vs. What You Owe</h2>
          <p className="card-sub">Right now, not tied to a specific month</p>
        </div>
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, color: verdictColor, marginBottom: '16px' }}>
        {verdict}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '4px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          Clients still owe you (unpaid invoices): <strong>{money(receivables)}</strong>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          You still owe vendors/bills (unpaid expenses): <strong>{money(payables)}</strong>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
          Difference: <strong style={{ color: verdictColor }}>{money(Math.abs(net))}</strong> {evenOut ? '' : owedMoreThanOwing ? 'more owed to you' : 'more owed by you'}
        </div>
      </div>

      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.5 }}>
        This is not the same as cash in hand — it's money that hasn't moved yet in either direction. A large "owed to you" figure looks good on paper, but only helps if clients actually pay. A large "you owe" figure isn't a problem by itself, but it becomes one if those bills come due before enough client payments land.
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
                <td style={{ padding: '8px' }}>{formatMonthLabel(row.month)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--teal)' }}>{money(row.sales)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--warning)' }}>{money(row.expenses)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: Number(row.balance || 0) >= 0 ? 'var(--teal)' : 'var(--red)' }}>{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function MachineRevenueSection() {
  const [month, setMonth] = useState('All');
  const [serviceType, setServiceType] = useState('All');
  const params = new URLSearchParams();
  if (month !== 'All') params.set('month', month);
  if (serviceType !== 'All') params.set('service_type', serviceType);
  const query = params.toString() ? `?${params.toString()}` : '';
  const { data, loading, error } = useAnalyticsData(() => api.analyticsMachineRevenue(query), [query]);
  const rows = data?.items || [];
  const monthOptions = ['All', ...(data?.available_months || [])].sort((a, b) => (a === 'All' ? -1 : b < a ? -1 : 1));
  const serviceOptions = ['All', ...(data?.available_service_types || [])].sort();
  return (
    <SectionShell title="Machine Revenue" loading={loading} error={error} empty={rows.length === 0}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)' }}
        >
          {monthOptions.map(option => <option key={option} value={option}>{formatMonthLabel(option)}</option>)}
        </select>
        <select
          value={serviceType}
          onChange={e => setServiceType(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)' }}
        >
          {serviceOptions.map(option => <option key={option} value={option}>{option === 'All' ? 'All Service Types' : option}</option>)}
        </select>
      </div>
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

function QuantityMadeSection() {
  const [month, setMonth] = useState('All');
  const { data, loading, error } = useAnalyticsData(() => api.analyticsQuantityProduced());
  const byMonth = data?.quantity_by_month || {};
  const byMonthAndType = data?.quantity_by_month_and_type || {};
  const byType = data?.quantity_by_type || {};
  const monthKeys = Object.keys(byMonth);
  const monthOptions = ['All', ...monthKeys].sort((a, b) => (a === 'All' ? -1 : b < a ? 1 : -1));
  const latestMonth = monthKeys[monthKeys.length - 1];

  const isAllMonths = month === 'All';
  const activeMonth = isAllMonths ? latestMonth : month;
  const statLabel = isAllMonths ? `This Month (${formatMonthLabel(latestMonth)})` : formatMonthLabel(month);
  const statTotal = activeMonth ? (byMonth[activeMonth] || 0) : 0;

  const typeRows = isAllMonths
    ? Object.entries(byType).sort((a, b) => b[1] - a[1])
    : Object.entries(byMonthAndType[month] || {}).sort((a, b) => b[1] - a[1]);
  const tableLabel = isAllMonths ? 'Quantity (Trailing 13 Months)' : `Quantity (${formatMonthLabel(month)})`;

  return (
    <SectionShell title="Quantity Made" loading={loading} error={error} empty={monthKeys.length === 0}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Quantity invoiced, grouped by month issued. Uses invoice issue date as a proxy for
        production date, since no separate production date is tracked yet.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)' }}
        >
          {monthOptions.map(option => <option key={option} value={option}>{option === 'All' ? 'All Months' : formatMonthLabel(option)}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <div style={{ padding: '12px', background: 'rgba(196, 163, 90, 0.08)', borderRadius: '8px', border: '1px solid rgba(196, 163, 90, 0.2)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{statLabel}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#C4A35A' }}>{statTotal.toLocaleString()} units</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Product Type</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>{tableLabel}</th>
            </tr>
          </thead>
          <tbody>
            {typeRows.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No quantity recorded for this month.</td>
              </tr>
            )}
            {typeRows.map(([type, qty]) => (
              <tr key={type} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                <td style={{ padding: '8px' }}>{type}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{qty.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function JobThroughputSection() {
  const [month, setMonth] = useState('All');
  const { data, loading, error } = useAnalyticsData(() => api.analyticsJobThroughput());
  const byMonth = data?.units_completed_by_month || {};
  const machineRows = data?.units_completed_by_machine || [];
  const inProgress = data?.in_progress_summary || { job_count: 0, units_completed: 0, units_total: 0, units_remaining: 0 };
  const monthKeys = Object.keys(byMonth);
  const monthOptions = ['All', ...monthKeys].sort((a, b) => (a === 'All' ? -1 : b < a ? 1 : -1));
  const latestMonth = monthKeys[monthKeys.length - 1];

  const isAllMonths = month === 'All';
  const activeMonth = isAllMonths ? latestMonth : month;
  const statLabel = isAllMonths ? `This Month (${formatMonthLabel(latestMonth)})` : formatMonthLabel(month);
  const statTotal = activeMonth ? (byMonth[activeMonth] || 0) : 0;

  return (
    <SectionShell title="Job Throughput" loading={loading} error={error} empty={monthKeys.length === 0}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Units actually completed on the shop floor (Job.completed_count), grouped by the date the
        job was created — there's no separate "completed on" date tracked yet, so this is the
        closest proxy available. Cancelled jobs are excluded. This is the production-side
        counterpart to "Quantity Made," which counts billed units instead.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-faint)', background: '#fff', fontSize: '10px', color: 'var(--text-body)' }}
        >
          {monthOptions.map(option => <option key={option} value={option}>{option === 'All' ? 'All Months' : formatMonthLabel(option)}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <div style={{ padding: '12px', background: 'rgba(196, 163, 90, 0.08)', borderRadius: '8px', border: '1px solid rgba(196, 163, 90, 0.2)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{statLabel}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#C4A35A' }}>{statTotal.toLocaleString()} units completed</div>
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-canvas)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{inProgress.units_completed.toLocaleString()} of {inProgress.units_total.toLocaleString()}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{inProgress.job_count} active job{inProgress.job_count === 1 ? '' : 's'}, {inProgress.units_remaining.toLocaleString()} units remaining</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Machine / Category</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Units Completed (Lifetime)</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Jobs</th>
            </tr>
          </thead>
          <tbody>
            {machineRows.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No completed units recorded yet.</td>
              </tr>
            )}
            {machineRows.map(row => (
              <tr key={row.machine} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                <td style={{ padding: '8px' }}>{row.machine}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{row.units_completed.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>{row.job_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

// Reads the same GET /api/reports/materials month-end reconciliation the
// full Materials page's "Month-End Report" view uses (Materials.jsx) - not a
// re-implementation, just a second, lighter-weight place to see it from,
// since Wayne wanted the bought/used/made picture visible from Reports
// without having to know the Materials nav item has its own report tab
// buried inside it. The full per-material transaction log, physical-count
// logging, and material CRUD still live only on the Materials page - this
// section is deliberately read-only and links there for that.
function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function MaterialsSection() {
  const [month, setMonth] = useState(currentMonthValue());
  const { data, loading, error } = useAnalyticsData(() => api.materialsReconciliationReport(month), [month]);
  const rows = data?.materials || [];
  const unreconciledCount = data?.flags?.unreconciled_count?.length || 0;
  const varianceCount = data?.flags?.count_variance?.length || 0;
  // Item 3 (flagged gap, fixed this pass): print/export for this report.
  // preview holds the same payload useAnalyticsData already fetched -
  // PrintPreviewModal's 'materials_reconciliation' type (PrintLayouts.jsx)
  // renders it, and the browser's native print dialog (triggered by
  // window.print(), same mechanism every other print layout in this app
  // uses) handles the actual PDF/paper output.
  const [preview, setPreview] = useState(null);

  return (
    <SectionShell title="Materials - Month-End Reconciliation" loading={loading} error={error} empty={false}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Periodic inventory method: Opening Stock + Purchased - Consumed + Adjusted = Closing Stock, per
        material, cross-checked against a physical count where one was logged. "Output Produced" is what
        each material's usage was recorded as making (e.g. sqm of vinyl consumed to make N stickers).
        For full transaction history or to log a purchase/usage/count, use the Materials page.
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-faint)',
            background: '#fff',
            color: 'var(--text-head)',
            colorScheme: 'light',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          className="filter-btn"
          disabled={loading || !data}
          onClick={() => setPreview(data)}
          style={{ fontSize: '11px' }}
        >
          Print / Export
        </button>
        {(unreconciledCount > 0 || varianceCount > 0) && !loading && (
          <span style={{ fontSize: '10px' }}>
            {varianceCount > 0 && <span style={{ marginRight: '12px' }}><strong style={{ color: 'var(--red)' }}>{varianceCount}</strong> with a count variance</span>}
            {unreconciledCount > 0 && <span><strong style={{ color: 'var(--warning)' }}>{unreconciledCount}</strong> not yet counted this month</span>}
          </span>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Material</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Opening</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Purchased</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Consumed</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Closing</th>
              <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Output Produced</th>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Count Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No materials on record.</td>
              </tr>
            )}
            {rows.map(row => {
              const variance = row.physical_count_check?.variance;
              const hasVariance = row.physical_count_check && Math.abs(variance) > 0.001;
              const outputEntries = Object.entries(row.output_produced || {});
              return (
                <tr key={row.material_id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{row.name}<div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>{row.material_ref}</div></td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{row.opening_stock.toLocaleString()}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--teal)' }}>+{row.purchased.toLocaleString()}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--red)' }}>-{row.consumed.toLocaleString()}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{row.closing_stock.toLocaleString()} {row.unit}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                    {outputEntries.length === 0 ? '-' : outputEntries.map(([label, qty]) => (
                      <div key={label}>{qty.toLocaleString()} {label}</div>
                    ))}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {!row.physical_count_check ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Not counted</span>
                    ) : (
                      <span className={`status-badge ${hasVariance ? 'overdue' : 'active'}`}>
                        {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PrintPreviewModal
        type="materials_reconciliation"
        title={`Materials Reconciliation - ${month}`}
        data={preview}
        onClose={() => setPreview(null)}
        actions={
          <button className="filter-btn active" onClick={() => window.print()}>Print</button>
        }
      />
    </SectionShell>
  );
}

function AnalyticsTab() {
  const [section, setSection] = useState(ANALYTICS_SECTIONS[0]);
  return (
    <>
      <div className="chart-filters on-canvas" style={{ marginBottom: '14px', width: 'fit-content', flexWrap: 'wrap' }}>
        {ANALYTICS_SECTIONS.map(s => (
          <button key={s} className={`filter-btn on-canvas ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>{s}</button>
        ))}
      </div>
      {section === 'Vendor Spend' && <VendorSpendSection />}
      {section === 'Client Performance' && <ClientPerformanceSection />}
      {section === 'Projections' && <ProjectionsSection />}
      {section === 'Sales vs Expenses' && <SalesVsExpensesSection />}
      {section === 'Machine Revenue' && <MachineRevenueSection />}
      {section === 'Quantity Made' && <QuantityMadeSection />}
      {section === 'Job Throughput' && <JobThroughputSection />}
      {section === 'Materials' && <MaterialsSection />}
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
  // Selected month for Cashflow/Snapshot. Starts empty; set to the latest
  // available month once financials load (see effect below), then stays
  // wherever the user leaves it if they pick an earlier one from the dropdown.
  const [selectedMonth, setSelectedMonth] = useState('');

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
        const keys = financialReport?.revenue_by_month ? Object.keys(financialReport.revenue_by_month) : [];
        if (keys.length) setSelectedMonth(keys[keys.length - 1]);
      })
      .catch(() => setError('Could not load reports. Check the backend connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  // Cash-basis by-month figures only (revenue_by_month / expenses_by_month).
  // Deliberately NOT using financials.revenue / financials.profit here — those
  // top-level fields are booked-basis (a known, separate reconciliation issue
  // documented in reports.py) and would be inconsistent with this tab if mixed in.
  const monthKeys = financials?.revenue_by_month ? Object.keys(financials.revenue_by_month) : [];
  const activeMonth = selectedMonth || monthKeys[monthKeys.length - 1];
  const isLatestMonth = activeMonth === monthKeys[monthKeys.length - 1];
  const moneyIn = activeMonth ? Number(financials.revenue_by_month[activeMonth] || 0) : 0;
  const moneyOut = activeMonth ? Number(financials.expenses_by_month?.[activeMonth] || 0) : 0;
  const netCashflow = moneyIn - moneyOut;
  const monthLabel = formatMonthLabel(activeMonth);

  const cashflowStats = [
    { label: 'Money In', value: money(moneyIn), sub: 'Cash received', icon: D_CASH, color: 'teal' },
    { label: 'Money Out', value: money(moneyOut), sub: 'Cash paid out', icon: D_EXPENSES, color: 'warning' },
    { label: 'Net Cashflow', value: money(netCashflow), sub: netCashflow >= 0 ? 'Positive' : 'Negative', icon: D_CASH, color: netCashflow >= 0 ? 'teal' : 'red' },
    { label: 'Months Tracked', value: String(monthKeys.length), sub: 'Trailing window', icon: D_INVOICES, color: 'secondary' },
  ];

  const activeJobsCount = jobs.filter(job => ACTIVE_JOB_STATUSES.includes(job.status)).length;
  const outstandingPayablesTotal = expenses
    .filter(expense => OUTSTANDING_EXPENSE_STATUSES.includes(expense.status))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  // Unpaid Receivables/Payables are current outstanding balances, not tied to
  // any single month (an invoice due today doesn't belong to "March"), so
  // they deliberately do NOT change with the month selector — only the flow
  // figures (money in/out, net cashflow) do. Labels reflect that.
  const snapshotStats = [
    { label: 'Jobs In Progress', value: String(activeJobsCount), sub: 'Queued or printing', icon: D_JOBS, color: 'primary' },
    { label: 'Unpaid Receivables', value: money(invoiceStats?.outstanding || 0), sub: 'Owed to the business (current)', icon: D_INVOICES, color: 'warning' },
    { label: 'Unpaid Payables', value: money(outstandingPayablesTotal), sub: 'Owed by the business (current)', icon: D_EXPENSES, color: 'red' },
    { label: 'Net Cashflow', value: money(netCashflow), sub: netCashflow >= 0 ? 'Positive' : 'Negative', icon: D_CASH, color: netCashflow >= 0 ? 'teal' : 'red' },
  ];

  return (
    <main className="main-canvas" style={{ display: 'block' }}>
      <ModuleHeader title="Reports" subtitle="Cashflow and income statement" actionLabel={null} />

      <div className="chart-filters on-canvas" style={{ marginBottom: '14px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} className={`filter-btn on-canvas ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab !== 'Analytics' && loading && <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>}
      {tab !== 'Analytics' && !loading && error && <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--red)' }}>{error}</div>}

      {!loading && !error && tab === 'Cashflow' && (
        <>
          <MonthSelector monthKeys={monthKeys} selectedMonth={activeMonth} setSelectedMonth={setSelectedMonth} />
          <StatsGrid stats={cashflowStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <PulseChart financials={financials} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <PlainEnglishCard moneyIn={moneyIn} moneyOut={moneyOut} netCashflow={netCashflow} monthLabel={monthLabel} />
          </div>
        </>
      )}

      {!loading && !error && tab === 'Income Statement' && (
        <>
          <MonthSelector monthKeys={monthKeys} selectedMonth={activeMonth} setSelectedMonth={setSelectedMonth} />
          <StatsGrid stats={snapshotStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <PlainEnglishCard moneyIn={moneyIn} moneyOut={moneyOut} netCashflow={netCashflow} monthLabel={monthLabel} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <ReceivablesPayablesCard receivables={invoiceStats?.outstanding || 0} payables={outstandingPayablesTotal} />
          </div>
        </>
      )}

      {tab === 'Analytics' && <AnalyticsTab />}
    </main>
  );
}