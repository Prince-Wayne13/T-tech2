// PrintOps BMS Dashboard — App.jsx
// Inspired by modern flight booking UI aesthetic
import React, { useState } from 'react';
import './styles.css';

/* ═══════════════════════════════════════
   ICON SYSTEM — inline SVG, 1.5px stroke
═══════════════════════════════════════ */
function Icon({ d, size = 14 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

const D = {
  dashboard:  'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  proposals:  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  invoices:   'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2M12 12v4M10 14h4',
  jobs:       'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  ar:         'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  ap:         'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  expenses:   'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-5 6',
  vendors:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  advances:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  reports:    'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  settings:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  bell:       'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  printer:    'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  check:      'M20 6L9 17l-5-5',
  trendUp:    'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  trendDown:  'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
  alert:      'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  chevron:    'M6 9l6 6 6-6',
  plus:       'M12 5v14M5 12h14',
  payment:    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z',
};

/* ═══════════════════════════════════════
   DATA
═══════════════════════════════════════ */
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'Dashboard',   icon: 'dashboard'  },
      { id: 'Proposals',   icon: 'proposals'  },
      { id: 'Invoices',    icon: 'invoices'   },
      { id: 'Jobs',        icon: 'jobs'       },
    ],
  },
  {
    label: 'Financials',
    items: [
      { id: 'Receivables', icon: 'ar'         },
      { id: 'Payables',    icon: 'ap'         },
      { id: 'Expenses',    icon: 'expenses'   },
      { id: 'Vendors',     icon: 'vendors'    },
      { id: 'Advances',    icon: 'advances'   },
    ],
  },
  {
    label: 'Records',
    items: [
      { id: 'Reports',     icon: 'reports'    },
      { id: 'Settings',    icon: 'settings'   },
    ],
  },
];

const FIN_CARDS = [
  { title: 'Cash Balance',  value: '$12,450', change: '+8.2%',  up: true,  color: 'primary',   sub: 'vs last month',     fill: 82, icon: 'ar'       },
  { title: 'Receivables',   value: '$3,200',  change: '+12.5%', up: true,  color: 'secondary', sub: '4 open invoices',   fill: 45, icon: 'invoices' },
  { title: 'Payables',      value: '$1,800',  change: '-3.1%',  up: false, color: 'warning',   sub: '2 due this week',   fill: 38, icon: 'ap'       },
  { title: 'Budget Burn',   value: '68%',     change: '+4.0%',  up: false, color: 'teal',      sub: 'of monthly budget', fill: 68, icon: 'expenses' },
];

const QUICK_ACTIONS = [
  { label: 'New Invoice',    color: 'secondary', icon: 'invoices'  },
  { label: 'New Job',        color: 'teal',      icon: 'jobs'      },
  { label: 'New Proposal',   color: 'purple',    icon: 'proposals' },
  { label: 'Record Payment', color: 'primary',   icon: 'payment'   },
  { label: 'Add Expense',    color: 'warning',   icon: 'expenses'  },
  { label: 'New Vendor',     color: 'red',       icon: 'vendors'   },
];

const ACTIVITY = [
  { id: 1, type: 'Invoice',  client: 'TechCorp Ltd',   amount: '$1,200', status: 'paid',     time: '2h ago', icon: 'invoices'  },
  { id: 2, type: 'Job',      client: 'BrandX Agency',  amount: '$850',   status: 'active',   time: '4h ago', icon: 'printer'   },
  { id: 3, type: 'Proposal', client: 'City Council',   amount: '$3,400', status: 'pending',  time: '6h ago', icon: 'proposals' },
  { id: 4, type: 'Payment',  client: 'MediaGroup',     amount: '$560',   status: 'paid',     time: '1d ago', icon: 'check'     },
  { id: 5, type: 'Expense',  client: 'Paper Supplies', amount: '$240',   status: 'approved', time: '1d ago', icon: 'expenses'  },
  { id: 6, type: 'Invoice',  client: 'StartupHub',     amount: '$2,100', status: 'overdue',  time: '2d ago', icon: 'alert'     },
];

const VENDORS = [
  { name: 'Paper Plus Co.',   cat: 'Supplies',    balance: '$340',   status: 'current' },
  { name: 'Ink Masters',      cat: 'Consumables', balance: '$890',   status: 'due'     },
  { name: 'Swift Delivery',   cat: 'Logistics',   balance: '$150',   status: 'current' },
  { name: 'PrintTech Parts',  cat: 'Equipment',   balance: '$1,200', status: 'overdue' },
  { name: 'Office Depot',     cat: 'General',     balance: '$220',   status: 'current' },
];

/* Chart — 8 months of data */
const MONTHS   = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const REVENUE  = [12000, 15200, 13800, 18500, 16200, 21000, 19800, 24200];
const EXPENSES = [8000,  9800,  10200, 11500, 9600,  12800, 11200, 13800];

/* ═══════════════════════════════════════
   SVG CHART HELPERS
   Smooth cubic bezier through data points
═══════════════════════════════════════ */
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

/* ═══════════════════════════════════════
   COMPONENT: Business Pulse Chart
   Dark inner panel — like the flight map
═══════════════════════════════════════ */
function PulseChart() {
  const [filter, setFilter] = useState('3M');
  const FILTERS = ['1W', '1M', '3M', 'YTD'];

  /* SVG coordinate system */
  const W = 600, H = 190;
  const PAD = { t: 18, r: 20, b: 30, l: 46 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const all = [...REVENUE, ...EXPENSES];
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const range = maxV - minV || 1;

  const toX = i => PAD.l + (i / (REVENUE.length - 1)) * pw;
  const toY = v => PAD.t + ph - ((v - minV) / range) * ph;

  const revPts  = REVENUE.map((v, i)  => [toX(i), toY(v)]);
  const expPts  = EXPENSES.map((v, i) => [toX(i), toY(v)]);
  const revLine = smoothPath(revPts);
  const expLine = smoothPath(expPts);

  const baseY = PAD.t + ph;
  const revArea = `${revLine} L ${toX(REVENUE.length - 1)} ${baseY} L ${toX(0)} ${baseY} Z`;
  const expArea = `${expLine} L ${toX(EXPENSES.length - 1)} ${baseY} L ${toX(0)} ${baseY} Z`;

  const yTicks = [minV, minV + range / 3, minV + (2 * range) / 3, maxV].map(v => ({
    label: v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
    y: toY(v),
  }));

  const lastRevY = toY(REVENUE[REVENUE.length - 1]);
  const lastExpY = toY(EXPENSES[EXPENSES.length - 1]);
  const lastX    = toX(REVENUE.length - 1) + 6;

  return (
    <div className="card pulse-chart">
      <div className="card-header">
        <div>
          <h2 className="card-title">Business Pulse</h2>
          <p className="card-sub">Revenue vs Expenses · Apr 2026</p>
        </div>
        <div className="chart-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Dark chart area — the visual centerpiece */}
      <div className="chart-area">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0"   />
            </linearGradient>
            <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"    />
            </linearGradient>
            {/* Glow filter for revenue line */}
            <filter id="glowGreen" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Glow filter for expense line */}
            <filter id="glowAmber" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y-axis gridlines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.l} y1={tick.y}
                x2={W - PAD.r} y2={tick.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.l - 7} y={tick.y + 4}
                textAnchor="end"
                fontSize="8.5"
                fill="rgba(255,255,255,0.28)"
              >{tick.label}</text>
            </g>
          ))}

          {/* X-axis month labels */}
          {MONTHS.map((m, i) => (
            <text
              key={m}
              x={toX(i)} y={H - 8}
              textAnchor="middle"
              fontSize="8.5"
              fill="rgba(255,255,255,0.28)"
            >{m}</text>
          ))}

          {/* Area fills */}
          <path d={revArea} fill="url(#gRev)" />
          <path d={expArea} fill="url(#gExp)" />

          {/* Stroke lines with glow */}
          <path
            d={revLine} fill="none"
            stroke="#10B981" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#glowGreen)"
          />
          <path
            d={expLine} fill="none"
            stroke="#F59E0B" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#glowAmber)"
          />

          {/* Data dots */}
          {revPts.map(([x, y], i) => (
            <circle
              key={i} cx={x} cy={y}
              r={i === revPts.length - 1 ? 4.5 : 2.5}
              fill={i === revPts.length - 1 ? '#10B981' : '#0B1E1A'}
              stroke="#10B981"
              strokeWidth={i === revPts.length - 1 ? 0 : 1.5}
            />
          ))}
          {expPts.map(([x, y], i) => (
            <circle
              key={i} cx={x} cy={y}
              r={i === expPts.length - 1 ? 4 : 2}
              fill={i === expPts.length - 1 ? '#F59E0B' : '#0B1E1A'}
              stroke="#F59E0B"
              strokeWidth={i === expPts.length - 1 ? 0 : 1.5}
            />
          ))}

          {/* End-point value labels */}
          <text x={lastX} y={lastRevY + 4} fontSize="9" fontWeight="700" fill="#10B981">$24.2k</text>
          <text x={lastX} y={lastExpY + 4} fontSize="9" fontWeight="700" fill="#F59E0B">$13.8k</text>
        </svg>
      </div>

      {/* Legend row */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10B981' }} />
          Revenue
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#F59E0B' }} />
          Expenses
        </div>
        <div className="legend-net">
          Net Profit <strong>$10,400</strong>
          <span className="trend-badge">↑ 12.3%</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Top Bar
═══════════════════════════════════════ */
function TopBar() {
  const PILLS = [
    { emoji: '💰', label: 'Cash',        value: '$12,450', cls: 'green' },
    { emoji: '📥', label: 'Receivables', value: '$3,200',  cls: 'blue'  },
    { emoji: '📤', label: 'Payables',    value: '$1,800',  cls: 'amber' },
    { emoji: '🖨️', label: 'Active Jobs', value: '7',       cls: 'teal'  },
  ];

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <div className="logo-mark">
          <Icon d={D.printer} size={14} />
        </div>
        <span>PrintOps</span>
      </div>

      <div className="topbar-metrics">
        {PILLS.map(p => (
          <div key={p.label} className={`metric-pill ${p.cls}`}>
            <span className="pill-emoji">{p.emoji}</span>
            <span className="pill-label">{p.label}</span>
            <span className="pill-value">{p.value}</span>
          </div>
        ))}
      </div>

      <div className="topbar-right">
        <div className="notif-btn">
          <Icon d={D.bell} size={14} />
          <span className="notif-dot" />
        </div>
        <div className="topbar-avatar">W</div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Sidebar
═══════════════════════════════════════ */
function Sidebar({ active, setActive }) {
  return (
    <aside className="sidebar">
      {/* Decorative glow — inspired by flight UI's yellow blob */}
      <div className="sidebar-glow" />

      {/* Profile section */}
      <div className="sidebar-profile">
        <div className="profile-avatar">
          W
          <span className="profile-status" />
        </div>
        <div className="profile-info">
          <div className="profile-name">Wayne</div>
          <div className="profile-role">Administrator</div>
        </div>
      </div>

      {/* Navigation groups */}
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="nav-group">
          <div className="nav-group-label">{group.label}</div>
          {group.items.map(item => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <Icon d={D[item.icon]} size={13} />
              {item.id}
            </button>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-label">
          Business Records
          <Icon d={D.chevron} size={11} />
        </div>
        <div className="sidebar-footer-links">
          <a href="#audit">Audit Log</a>
          <a href="#archive">Archive</a>
          <a href="#export">Export Data</a>
        </div>
        <div className="sidebar-active-jobs">
          <span className="sj-pulse" />
          7 Active Jobs Running
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Financial Card (×4)
═══════════════════════════════════════ */
function FinCard({ title, value, change, up, color, sub, fill, icon }) {
  return (
    <div className="card fin-card">
      <div className="fin-top">
        <div className="fin-label">{title}</div>
        <div className={`fin-icon ${color}`}>
          <Icon d={D[icon]} size={15} />
        </div>
      </div>
      <div className="fin-metric">{value}</div>
      <div className="fin-footer">
        <span className={`fin-change ${up ? 'up' : 'down'}`}>
          <Icon d={up ? D.trendUp : D.trendDown} size={11} />
          {change}
        </span>
        <span className="fin-sub">{sub}</span>
      </div>
      <div className="fin-bar">
        <div className={`fin-bar-fill ${color}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Quick Actions
═══════════════════════════════════════ */
function QuickActions() {
  return (
    <div className="card quick-actions">
      <div className="card-header">
        <h2 className="card-title">Quick Actions</h2>
      </div>
      <div className="actions-grid">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} className={`action-btn ${a.color}`}>
            <div className="action-icon">
              <Icon d={D[a.icon]} size={15} />
            </div>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      {/* Inspired by flight UI "SEARCH" button */}
      <button className="cta-quick-entry">
        <Icon d={D.plus} size={14} />
        Quick Entry
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Activity Feed
═══════════════════════════════════════ */
function ActivityFeed() {
  return (
    <div className="card activity-feed">
      <div className="card-header">
        <div>
          <h2 className="card-title">Recent Activity</h2>
          <p className="card-sub">Last 7 days</p>
        </div>
        <button className="see-all-btn">See all →</button>
      </div>

      <div className="activity-list">
        {ACTIVITY.map(item => (
          <div key={item.id} className="activity-item">
            <div className={`activity-icon ${item.icon}`}>
              <Icon d={D[item.icon]} size={13} />
            </div>
            <div className="activity-info">
              <div className="activity-client">{item.client}</div>
              <div className="activity-type">{item.type}</div>
            </div>
            <span className={`status-badge ${item.status}`}>{item.status}</span>
            <div className="activity-right">
              <div className="activity-amount">{item.amount}</div>
              <div className="activity-time">{item.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Vendor / Expense List
═══════════════════════════════════════ */
function VendorList() {
  const [tab, setTab] = useState('Vendors');

  return (
    <div className="card vendor-list">
      <div className="card-header">
        <div>
          <h2 className="card-title">Vendor Overview</h2>
          <p className="card-sub">Outstanding balances</p>
        </div>
        <div className="vendor-tabs">
          {['Vendors', 'Expenses'].map(t => (
            <button
              key={t}
              className={`vendor-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="vendor-items">
        {VENDORS.map((v, i) => {
          const initials = v.name.split(' ').map(w => w[0]).slice(0, 2).join('');
          const badgeCls = v.status === 'current' ? 'paid' : v.status === 'due' ? 'pending' : 'overdue';
          return (
            <div key={i} className="vendor-item">
              <div className="vendor-avatar">{initials}</div>
              <div className="vendor-info">
                <div className="vendor-name">{v.name}</div>
                <div className="vendor-cat">{v.cat}</div>
              </div>
              <div className="vendor-right">
                <div className="vendor-balance">{v.balance}</div>
                <span className={`status-badge ${badgeCls}`}>{v.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: Main Canvas (grid layout)
═══════════════════════════════════════ */
function MainCanvas() {
  return (
    <main className="main-canvas">
      {/* Row 1 — Financial overview (4 × 1fr) */}
      {FIN_CARDS.map(c => <FinCard key={c.title} {...c} />)}

      {/* Row 2 — Chart (3fr) + Quick Actions (1fr) */}
      <PulseChart />
      <QuickActions />

      {/* Row 3 — Activity (2fr) + Vendors (2fr) */}
      <ActivityFeed />
      <VendorList />
    </main>
  );
}

/* ═══════════════════════════════════════
   ROOT
═══════════════════════════════════════ */
export default function App() {
  const [active, setActive] = useState('Dashboard');

  return (
    <div className="app">
      <TopBar />
      <Sidebar active={active} setActive={setActive} />
      <MainCanvas />
    </div>
  );
}