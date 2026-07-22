// T-Tech BMS Dashboard — App.jsx (Mobile-Ready)
import React, { useState, useEffect } from 'react';
import './styles.css';
import Jobs from './Jobs';
import Proposals from './Proposals';
import Invoices from './Invoices';
import Expenses from './Expenses';
import Vendors from './Vendors';
import Advances from './Advances';
import Reports from './Reports';
import AuditLog from './AuditLog';
import Archive from './Archive';
import ExportData from './ExportData';
import Settings from './Settings';
import { api } from './api/client';
import { compactDate, money } from './utils/format';
import PreviewModal from './components/PreviewModal';
import { downloadPreviewPdf, recordToPdfHtml, shareText } from './utils/downloads';
import {
  AddExpenseModal,
  ActivityPreviewModal,
  NewJobModal,
  NewProposalModal,
  NewVendorModal,
  QuickEntryModal,
  SearchResultsModal,
} from './components/Modals';
import { PrintPreviewModal } from './components/PrintLayouts';







/* ═══════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════ */
function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
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
  menu:       'M3 12h18M3 6h18M3 18h18',
  close:      'M18 6L6 18M6 6l12 12',
};

/* ═══════════════════════════════════════
   DATA (unchanged - keeping your NAV_GROUPS, FIN_CARDS, etc.)
═══════════════════════════════════════ */
const NAV_GROUPS = [
  {
    label: 'Primary',
    items: [
      { id: 'Dashboard',   icon: 'dashboard'  },
      { id: 'Jobs',        icon: 'jobs'       },
      { id: 'Proposals',   icon: 'proposals'  },
      { id: 'Invoices',    icon: 'invoices'   },
      { id: 'Expenses',    icon: 'expenses'   },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'More',
    items: [
      { id: 'Vendors',     icon: 'vendors'    },
      { id: 'Advances',    icon: 'advances'   },
      { id: 'Audit Log',   icon: 'reports'    },
      { id: 'Archive',     icon: 'reports'    },
      { id: 'Export Data', icon: 'reports'    },
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
  { label: 'New Job',        color: 'teal',      icon: 'jobs'      },
  { label: 'New Proposal',   color: 'purple',    icon: 'proposals' },
  { label: 'Add Expense',    color: 'warning',   icon: 'expenses'  },
  { label: 'New Vendor',     color: 'red',       icon: 'vendors'   },
];

const ACTION_FIELDS = {
  'New Job': ['Client name', 'Job title', 'Due date'],
  'New Proposal': ['Client name', 'Proposal title', 'Estimated value'],
  'Add Expense': ['Expense title', 'Category', 'Amount'],
  'New Vendor': ['Vendor name', 'Category', 'Contact'],
  'Quick Entry': ['Type', 'Name', 'Amount'],
};

const VENDORS = [
  { name: 'Paper Plus Co.',   cat: 'Supplies',    balance: '$340',   status: 'current' },
  { name: 'Ink Masters',      cat: 'Consumables', balance: '$890',   status: 'due'     },
  { name: 'Swift Delivery',   cat: 'Logistics',   balance: '$150',   status: 'current' },
  { name: 'PrintTech Parts',  cat: 'Equipment',   balance: '$1,200', status: 'overdue' },
  { name: 'Office Depot',     cat: 'General',     balance: '$220',   status: 'current' },
];

const MONTHS   = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const REVENUE  = [12000, 15200, 13800, 18500, 16200, 21000, 19800, 24200];
const EXPENSES = [8000,  9800,  10200, 11500, 9600,  12800, 11200, 13800];

const DATASETS = [
  { title: 'Revenue vs Expenses', a: REVENUE, b: EXPENSES },
  { title: 'Profit', a: REVENUE.map((r, i) => r - EXPENSES[i]), b: REVENUE.map(() => 0) },
  { title: 'Cash Flow', a: REVENUE, b: EXPENSES.map(v => -v) }
];

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

/* ═══════════════════════════════════════
   COMPONENT: PulseChart (unchanged - keeping your existing code)
═══════════════════════════════════════ */
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
    <div className="card pulse-chart">
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
          <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="url(#hex)" />
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

/* ═══════════════════════════════════════
   COMPONENT: TopBar — WITH HAMBURGER MENU
═══════════════════════════════════════ */
function TopBar({ onMenuToggle, search, setSearch, onSearchOpen }) {
  return (
    <header className="topbar">
      {/* Hamburger Menu Button (Mobile Only) */}
      <button className="menu-toggle" onClick={onMenuToggle} title="Toggle menu">
        <Icon d={D.menu} size={16} />
      </button>
      
      <div className="topbar-logo">
        <div className="logo-mark">
          <Icon d={D.printer} size={14} />
        </div>
        <span>T-Tech</span>
      </div>

      <div className="topbar-search">
        <input
          type="text"
          placeholder="Search invoices, jobs, vendors..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={onSearchOpen}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearchOpen();
          }}
        />
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
   COMPONENT: Sidebar — WITH OPEN/CLOSE STATE
═══════════════════════════════════════ */
function Sidebar({ active, setActive, isOpen, onClose }) {
  return (
    <>
      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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

        {NAV_GROUPS.map(group => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActive(item.id);
                  if (window.innerWidth <= 768) onClose();
                }}
              >
                <Icon d={D[item.icon]} size={13} />
                {item.id}
              </button>
            ))}
          </div>
        ))}

        <button className="logout-btn">Logout</button>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════
   COMPONENT: FinCard, QuickActions, ActivityFeed, VendorList
   (Keeping your existing implementations unchanged)
═══════════════════════════════════════ */
function FinCard({ title, value, change, up, color, sub, fill, icon }) {
  return (
    <div className="card fin-card">
      <div className="fin-top">
        <div className="fin-label">{title}</div>
        <div className={`fin-icon ${color}`}><Icon d={D[icon]} size={15} /></div>
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

function QuickActions({ onAction }) {
  return (
    <div className="card quick-actions">
      <div className="card-header"><h2 className="card-title">Quick Actions</h2></div>
      <div className="actions-grid">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} className={`action-btn ${a.color}`} onClick={() => onAction(a.label)}>
            <div className="action-icon"><Icon d={D[a.icon]} size={15} /></div>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <button className="cta-quick-entry" onClick={() => onAction('Quick Entry')}><Icon d={D.plus} size={14} /> Quick Entry</button>
    </div>
  );
}

function ActivityFeed({ items = [], onSeeAll }) {
  return (
    <div className="card activity-feed">
      <div className="card-header">
        <div><h2 className="card-title">Recent Activity</h2><p className="card-sub">Last 7 days</p></div>
        <button className="see-all-btn" onClick={onSeeAll}>See all</button>
      </div>
      <div className="activity-list">
        {items.length === 0 ? (
          <div className="activity-item">
            <div className="activity-info">
              <div className="activity-client">No recent activity</div>
              <div className="activity-type">Backend audit log has no entries yet</div>
            </div>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="activity-item">
            <div className={`activity-icon ${item.icon}`}><Icon d={D[item.icon]} size={13} /></div>
            <div className="activity-info">
              <div className="activity-client">{item.client}</div>
              <div className="activity-type">{item.type}</div>
            </div>
            <span className={`status-badge ${item.status}`}>{item.statusLabel || item.status}</span>
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

function mapRecentActivity(entry) {
  const entity = entry.entity_type || 'system';
  const iconByEntity = {
    invoice: 'invoices',
    job: 'printer',
    proposal: 'proposals',
    expense: 'expenses',
    vendor: 'vendors',
    advance: 'advances',
    export: 'reports',
    system: 'reports',
  };
  const badgeByEntity = {
    invoice: 'current',
    job: 'active',
    proposal: 'pending',
    expense: 'overdue',
    vendor: 'paid',
    advance: 'pending',
    export: 'current',
    system: 'paid',
  };
  return {
    id: `audit-${entry.id}`,
    type: entity === 'system' ? 'System' : `${entity.charAt(0).toUpperCase()}${entity.slice(1)} #${entry.entity_id || '-'}`,
    client: entry.action || 'Recorded activity',
    amount: entry.actor || 'System',
    status: badgeByEntity[entity] || 'current',
    statusLabel: entity,
    time: compactDate(entry.created_at),
    icon: iconByEntity[entity] || 'reports',
    raw: entry,
  };
}

function VendorList({ vendors = VENDORS, expenses = [] }) {
  const [tab, setTab] = useState('Vendors');
  const rows = tab === 'Vendors' ? vendors : expenses;
  return (
    <div className="card vendor-list">
      <div className="card-header">
        <div><h2 className="card-title">Vendor Overview</h2><p className="card-sub">Outstanding balances</p></div>
        <div className="vendor-tabs">
          {['Vendors', 'Expenses'].map(t => (
            <button key={t} className={`vendor-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="vendor-items">
        {rows.map((v, i) => {
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

function ActionModal({ action, onClose, onSubmit }) {
  const fields = ACTION_FIELDS[action] || ['Name', 'Notes'];
  const [values, setValues] = useState({});

  if (!action) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(5, 12, 18, 0.62)' }} onClick={onClose}>
      <section className="card" style={{ width: 'min(520px, 94vw)', borderTop: '2px solid var(--primary)' }} onClick={(event) => event.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">{action}</h3>
          <button className="filter-btn active" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {fields.map(field => (
            <label key={field} style={{ display: 'grid', gap: '5px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {field}
              <input
                value={values[field] || ''}
                onChange={(event) => setValues(current => ({ ...current, [field]: event.target.value }))}
                style={{ padding: '9px 10px', borderRadius: '7px', border: '1px solid var(--border-faint)', color: 'var(--text-body)', outline: 'none' }}
              />
            </label>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button className="filter-btn" onClick={() => downloadPreviewPdf(`${action} Draft`, recordToPdfHtml(`${action} Draft`, values))}>Download PDF</button>
            <button className="filter-btn" onClick={() => shareText(action, JSON.stringify(values, null, 2))}>Share</button>
            <button className="filter-btn active" onClick={() => onSubmit(action, values)}>Create</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MainCanvas({ onAction, onPreview }) {
  const [summary, setSummary] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [activity, setActivity] = useState([]);
  const [vendors, setVendors] = useState(VENDORS);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.dashboardReport(),
      api.financialReport('month'),
      api.audit('?per_page=6'),
      api.expenses('?per_page=3'),
      api.vendors('?per_page=5'),
    ])
      .then(([dashboard, financialReport, auditResponse, expenseResponse, vendorResponse]) => {
        if (!active) return;
        setSummary(dashboard);
        setFinancials(financialReport);
        setActivity((auditResponse.items || []).map(mapRecentActivity));
        setVendors((vendorResponse.items || []).map(vendor => ({
          name: vendor.name,
          cat: vendor.category || 'Supplier',
          balance: money(vendor.balance),
          status: vendor.status === 'current' ? 'current' : 'overdue',
        })));
        setExpenses((expenseResponse.items || []).map(expense => ({
          name: expense.title,
          cat: expense.category,
          balance: money(expense.amount),
          status: expense.status === 'reimbursed' ? 'current' : 'due',
        })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const liveCards = summary ? [
    { title: 'Cash Balance', value: money(summary.cash_balance), change: 'Live', up: summary.cash_balance >= 0, color: 'primary', sub: 'from backend', fill: 82, icon: 'ar' },
    { title: 'Receivables', value: money(summary.receivables), change: `${summary.overdue_invoices} overdue`, up: summary.overdue_invoices === 0, color: 'secondary', sub: 'open balances', fill: 45, icon: 'invoices' },
    { title: 'Expenses', value: money(summary.expenses), change: 'Live', up: false, color: 'warning', sub: 'approved spend', fill: 38, icon: 'expenses' },
    { title: 'Gross Profit', value: money(summary.gross_profit), change: `${summary.active_jobs} jobs`, up: summary.gross_profit >= 0, color: 'teal', sub: 'active production', fill: 68, icon: 'jobs' },
  ] : [
    { title: 'Cash Balance', value: money(0), change: 'Loading', up: true, color: 'primary', sub: 'from backend', fill: 0, icon: 'ar' },
    { title: 'Receivables', value: money(0), change: 'Loading', up: true, color: 'secondary', sub: 'open balances', fill: 0, icon: 'invoices' },
    { title: 'Expenses', value: money(0), change: 'Loading', up: false, color: 'warning', sub: 'approved spend', fill: 0, icon: 'expenses' },
    { title: 'Gross Profit', value: money(0), change: 'Loading', up: true, color: 'teal', sub: 'active production', fill: 0, icon: 'jobs' },
  ];

  return (
    <main className="main-canvas">
      {liveCards.map(c => <FinCard key={c.title} {...c} />)}
      <PulseChart financials={financials} />
      <QuickActions onAction={onAction} />
      <ActivityFeed items={activity} onSeeAll={() => onPreview('Recent Activity', activity)} />
      <VendorList vendors={vendors} expenses={expenses} />
    </main>
  );
}

/* ═══════════════════════════════════════
   ROOT COMPONENT — WITH MOBILE STATE
═══════════════════════════════════════ */
export default function App() {
  const [active, setActive] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printPreview, setPrintPreview] = useState(null);
  const [activityPreview, setActivityPreview] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const openSearch = () => {
    const query = globalSearch.trim();
    if (!query) return;
    api.search(query)
      .then((results) => setSearchResults(results))
      .catch(() => setSearchResults({ query, error: 'Search failed. Backend may be offline.' }));
  };

  const submitAction = async (action, values) => {
    try {
      if (action === 'New Job') {
        const created = await api.createJob({
          client_name: values.client || values.client_name || 'Walk-in Client',
          title: values.title || 'New print job',
          priority: values.priority || 'medium',
          due_date: values.due || values.due_date || null,
          service_category: values.printer || values.service_category || values.specs?.[0],
          notes: [values.notes, values.specs?.join(', ')].filter(Boolean).join('\n'),
        });
        setPrintPreview({ type: 'job', title: `Job Added: ${created.job_ref}`, data: created });
      } else if (action === 'Add Expense') {
        const created = await api.createExpense({
          category: values.category || 'Other',
          title: values.title || 'Expense',
          amount: Number(values.amount || 0),
          expense_date: values.date || values.expense_date || new Date().toISOString().slice(0, 10),
          notes: values.notes,
        });
        setPreview({ title: `Expense Added: ${created.expense_ref}`, data: created });
      } else if (action === 'New Vendor') {
        const created = await api.createVendor(values);
        setPreview({ title: `Vendor Added: ${created.name}`, data: created });
      } else {
        const type = action.includes('Proposal') ? 'proposal' : null;
        if (type) setPrintPreview({ type, title: `${action} Preview`, data: { id: 'Draft', ...values } });
        else setPreview({ title: `${action} Preview`, data: { action, values, status: 'Draft ready' } });
      }
    } catch (error) {
      setPreview({ title: `${action} Failed`, data: { error: error.message, values } });
    } finally {
      setActionModal(null);
    }
  };

  const handleSearchSelect = (row) => {
    setSearchResults(null);
    const type = row.type === 'Invoice' ? 'invoice' : row.type === 'Job' ? 'job' : null;
    if (type) {
      setPrintPreview({ type, title: `${row.type} Preview`, data: row.raw });
    } else {
      setPreview({ title: `${row.type} Preview`, data: row.raw });
    }
  };

  const renderPage = () => {
    switch(active) {
      case 'Jobs': return <Jobs />;
      case 'Proposals': return <Proposals />;
      case 'Invoices': return <Invoices />;
      case 'Expenses': return <Expenses />;
      case 'Vendors': return <Vendors />;
      case 'Advances': return <Advances />;
      case 'Reports': return <Reports />;
      case 'Audit Log': return <AuditLog />;
      case 'Archive': return <Archive />;
      case 'Export Data': return <ExportData />;
      case 'Settings': return <Settings />;
      case 'Dashboard':
      default: return <MainCanvas onAction={setActionModal} onPreview={(title, data) => setActivityPreview({ title, data })} />;
    }
  };

  return (
    <div className="app">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} search={globalSearch} setSearch={setGlobalSearch} onSearchOpen={openSearch} />
      <Sidebar 
        active={active} 
        setActive={setActive} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      {renderPage()}
      <NewJobModal isOpen={actionModal === 'New Job'} onClose={() => setActionModal(null)} onSave={(values) => submitAction('New Job', values)} />
      <NewProposalModal isOpen={actionModal === 'New Proposal'} onClose={() => setActionModal(null)} onSave={(values) => submitAction('New Proposal', values)} />
      <AddExpenseModal isOpen={actionModal === 'Add Expense'} onClose={() => setActionModal(null)} onSave={(values) => submitAction('Add Expense', values)} />
      <NewVendorModal isOpen={actionModal === 'New Vendor'} onClose={() => setActionModal(null)} onSave={(values) => submitAction('New Vendor', values)} />
      <QuickEntryModal isOpen={actionModal === 'Quick Entry'} onClose={() => setActionModal(null)} onSave={(values) => submitAction('Quick Entry', values)} />
      <ActivityPreviewModal isOpen={Boolean(activityPreview)} activity={activityPreview?.data} onClose={() => setActivityPreview(null)} />
      <PreviewModal title={preview?.title} data={preview?.data} onClose={() => setPreview(null)} />
      <PrintPreviewModal type={printPreview?.type} title={printPreview?.title} data={printPreview?.data} onClose={() => setPrintPreview(null)} />
      <SearchResultsModal isOpen={Boolean(searchResults)} results={searchResults} onSelect={handleSearchSelect} onClose={() => setSearchResults(null)} />
    </div>
  );
}
