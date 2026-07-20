import React, { useState } from 'react';
import './styles.css';

function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [chartMetric, setChartMetric] = useState('Revenue');
  const [expandedFeed, setExpandedFeed] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);

  const hexPattern = (
    <pattern id="hex" width="36" height="62.35" patternUnits="userSpaceOnUse">
      <path d="M18 0 L36 10.39 L36 31.17 L18 41.56 L0 31.17 L0 10.39 Z" 
            fill="none" stroke="#2A8A6E" strokeWidth="0.5" opacity="0.15" />
      <path d="M18 0 L36 10.39 L36 31.17 L18 41.56 L0 31.17 L0 10.39 Z" 
            fill="none" stroke="#A18D3F" strokeWidth="0.5" opacity="0.12" transform="translate(18, 31.17)" />
    </pattern>
  );

  const renderChart = () => {
    const paths = {
      Revenue: <path d="M 0,130 L 85,110 L 170,120 L 255,80 L 340,60 L 425,70 L 510,30" fill="url(#grad1)" stroke="#A18D3F" strokeWidth="2.5" strokeLinecap="round" />,
      Profit: <path d="M 0,120 L 85,130 L 170,100 L 255,110 L 340,80 L 425,90 L 510,50" fill="url(#grad2)" stroke="#2A8A6E" strokeWidth="2.5" strokeLinecap="round" />,
      Jobs: <path d="M 0,140 L 85,135 L 170,125 L 255,90 L 340,100 L 425,70 L 510,40" fill="url(#grad3)" stroke="#312B33" strokeWidth="2.5" strokeLinecap="round" />
    };
    return paths[chartMetric];
  };

  const activities = [
    { time: '10:23', text: 'Invoice #1024 sent to Client A' },
    { time: '09:45', text: 'Proposal approved: Wedding Flyers' },
    { time: '09:17', text: 'Print job #8821 completed' },
    { time: '08:52', text: 'New quote requested: Business Cards' },
    { time: '08:30', text: 'Vendor payment processed' }
  ];

  return (
    <div className="app-container">
      <svg width="0" height="0">
        <defs>
          {hexPattern}
          <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A18D3F" stopOpacity="0.2"/><stop offset="100%" stopColor="#A18D3F" stopOpacity="0"/></linearGradient>
          <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2A8A6E" stopOpacity="0.2"/><stop offset="100%" stopColor="#2A8A6E" stopOpacity="0"/></linearGradient>
          <linearGradient id="grad3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#312B33" stopOpacity="0.15"/><stop offset="100%" stopColor="#312B33" stopOpacity="0"/></linearGradient>
        </defs>
      </svg>

      {/* TOP BAR */}
      <header className="top-bar">
        <div className="top-left">
          <span className="logo">PrintOps</span>
        </div>
        <div className="top-center">
          <input type="text" className="search-input" placeholder="Search projects, invoices, clients..." />
        </div>
        <div className="top-right">
          <div className="metric-pill"><span>Cash</span><span className="val">$12,450</span></div>
          <div className="metric-pill"><span>Receivables</span><span className="val">$3,200</span></div>
          <div className="metric-pill"><span>Payables</span><span className="val">$1,800</span></div>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="profile-section">
          <div className="avatar-large"></div>
          <h3>Wayne</h3>
          <p>Printing Admin</p>
        </div>
        <nav className="nav-menu">
          {['Dashboard', 'Proposals', 'Invoices', 'Jobs', 'AR', 'AP', 'Expenses'].map(item => (
            <button key={item} className={`nav-item ${activeNav === item ? 'active' : ''}`} onClick={() => setActiveNav(item)}>
              {item}
            </button>
          ))}
          
          {/* Business Records Toggle */}
          <button className={`nav-toggle ${recordsOpen ? 'open' : ''}`} onClick={() => setRecordsOpen(!recordsOpen)}>
            <span>Business Records</span>
            <svg className="chevron" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d={recordsOpen ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"} />
            </svg>
          </button>
          <div className={`sub-menu ${recordsOpen ? 'open' : ''}`}>
            <a href="#" className="sub-link">Expenses</a>
            <a href="#" className="sub-link">Inventory</a>
            <a href="#" className="sub-link">Tax Summary</a>
          </div>
        </nav>
      </aside>

      {/* MAIN CANVAS */}
      <main className="main-canvas">
        {/* ROW 1: HORIZONTAL METRICS */}
        <div className="grid-row metric-row">
          <div className="card metric-card">
            <div className="card-header">
              <span className="card-label">CASH FLOW</span>
              <span className="badge gold">LIVE</span>
            </div>
            <div className="metric-value">$12,450</div>
            <div className="metric-trend positive">↑ 12% vs last month</div>
          </div>
          <div className="card metric-card">
            <div className="card-header"><span className="card-label">RECEIVABLES</span></div>
            <div className="metric-value">$3,200</div>
            <div className="hex-indicator green"></div>
          </div>
          <div className="card metric-card">
            <div className="card-header"><span className="card-label">PAYABLES</span></div>
            <div className="metric-value">$1,800</div>
            <div className="hex-indicator orange"></div>
          </div>
          <div className="card metric-card">
            <div className="card-header"><span className="card-label">ACTIVE JOBS</span></div>
            <div className="metric-value">7</div>
            <div className="metric-trend">2 due today</div>
          </div>
        </div>

        {/* ROW 2: CHART + ACTIONS */}
        <div className="grid-row chart-row">
          <div className="card chart-card">
            <div className="card-header">
              <span className="card-title">Business Pulse</span>
              <div className="chart-toggles">
                {['Revenue', 'Profit', 'Jobs'].map(m => (
                  <button key={m} className={`toggle ${chartMetric === m ? 'active' : ''}`} onClick={() => setChartMetric(m)}>{m}</button>
                ))}
              </div>
            </div>
            <div className="chart-container">
              <svg className="line-chart" viewBox="0 0 600 200">
                <rect width="100%" height="100%" fill="url(#hex)" />
                {[0,50,100,150].map((y,i) => <line key={i} x1="0" y1={y} x2="600" y2={y} stroke="#B0B5B7" strokeWidth="1" strokeDasharray="3 3"/>)}
                {renderChart()}
                {['Jan','Feb','Mar','Apr','May','Jun'].map((m,i) => <text key={i} x={i*120+60} y="190" textAnchor="middle" fontSize="11" fill="#6B7280">{m}</text>)}
              </svg>
            </div>
          </div>
          <div className="quick-actions-column">
            <button className="action-pill">⏳ Pending Approvals</button>
            <button className="action-pill">💰 Overdue Invoices</button>
            <button className="action-pill">👥 New Clients</button>
            <button className="action-pill">⚠️ Equipment Alerts</button>
          </div>
        </div>

        {/* ROW 3: FEED + VENDORS (NOTEBOOK LINES) */}
        <div className="grid-row tracking-row">
          <div className="card activity-card">
            <div className="card-header"><span className="card-title">Recent Activity</span></div>
            <div className="notebook-list">
              {activities.map((a,i) => (
                <div key={i} className="list-item"><span className="list-time">{a.time}</span><span className="list-text">{a.text}</span></div>
              ))}
            </div>
            <button className="view-all" onClick={() => setExpandedFeed(!expandedFeed)}>{expandedFeed ? 'Show Less' : 'View All Activity'}</button>
          </div>
          <div className="card vendor-card">
            <div className="card-header"><span className="card-title">Vendor & Expenses</span></div>
            <div className="notebook-list">
              {[{n:'Paper Co.',a:'$450',s:'Due'},{n:'Ink Supply',a:'$280',s:'Paid'},{n:'Courier',a:'$120',s:'Pending'}].map((v,i) => (
                <div key={i} className="list-item vendor-item">
                  <span className="vendor-name">{v.n}</span>
                  <div className="vendor-meta"><span className="vendor-amount">{v.a}</span><div className={`hex-indicator ${v.s.toLowerCase()}`}></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button className="fab-quote">+</button>
      </main>
    </div>
  );
}
export default App;