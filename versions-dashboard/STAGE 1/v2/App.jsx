import React, { useState } from 'react';
import './styles.css';

function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');

  // Mock data for financial pills
  const metrics = [
    { label: 'Cash', value: '$12,450', color: '#10B981' },
    { label: 'Receivables', value: '$3,200', color: '#3B82F6' },
    { label: 'Payables', value: '$1,800', color: '#F59E0B' },
    { label: 'Active Jobs', value: '7', color: '#0D9488' }
  ];

  const navGroups = [
    { title: 'Operations', items: ['Dashboard', 'Proposals', 'Invoices', 'Jobs'] },
    { title: 'Financials', items: ['AR', 'AP', 'Expenses', 'Vendors', 'Advances'] },
    { title: 'Records', items: ['Reports', 'Settings'] }
  ];

  const recentActivity = [
    { time: '10:23 AM', text: 'Invoice #1024 sent to Client A' },
    { time: '09:45 AM', text: 'Proposal approved: Wedding Flyers' },
    { time: '09:17 AM', text: 'Print job #8821 completed on HP Indigo' },
    { time: '08:52 AM', text: 'New quote requested: Business Cards' }
  ];

  const vendorBills = [
    { vendor: 'Paper Co.', amount: '$450', due: 'Oct 15', status: 'Due' },
    { vendor: 'Ink Supply', amount: '$280', due: 'Oct 17', status: 'Pending' },
    { vendor: 'Courier Svc', amount: '$120', due: 'Oct 20', status: 'Paid' }
  ];

  return (
    <div className="app-container">
      {/* FIXED TOP BAR */}
      <header className="top-bar">
        <div className="top-left">
          <span className="logo">PrintOps</span>
          <div className="metric-pills">
            {metrics.map((m, i) => (
              <div key={i} className="pill">
                <span className="pill-label">{m.label}</span>
                <span className="pill-value" style={{ color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="top-right">
          <span className="icon">🔔</span>
          <div className="avatar-small"></div>
        </div>
      </header>

      {/* FIXED SIDEBAR */}
      <aside className="sidebar">
        <div className="profile-section">
          <div className="avatar-large"></div>
          <h3>Wayne</h3>
          <p>Printing Admin</p>
        </div>
        
        <nav className="nav-menu">
          {navGroups.map((group, i) => (
            <div key={i} className="nav-group">
              <span className="group-title">{group.title}</span>
              {group.items.map(item => (
                <button 
                  key={item} 
                  className={`nav-item ${activeNav === item ? 'active' : ''}`}
                  onClick={() => setActiveNav(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-title">Business Records</div>
          <a href="#" className="footer-link">Expenses</a>
          <a href="#" className="footer-link">Inventory</a>
          <a href="#" className="footer-link">Tax Summary</a>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="main-canvas">
        
        {/* ROW 1: Financial Overview */}
        <div className="grid-row financial-row">
          <div className="card metric-card">
            <div className="card-label">Cash Flow</div>
            <div className="metric-value">$12,450</div>
            <div className="metric-trend up">↑ 12% vs last month</div>
          </div>
          <div className="card metric-card">
            <div className="card-label">Accounts Receivable</div>
            <div className="metric-value">$3,200</div>
            <div className="metric-trend neutral">3 invoices pending</div>
          </div>
          <div className="card metric-card">
            <div className="card-label">Accounts Payable</div>
            <div className="metric-value">$1,800</div>
            <div className="metric-trend down">Due within 7 days</div>
          </div>
          <div className="card metric-card">
            <div className="card-label">Budget Burn</div>
            <div className="metric-value">68%</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>

        {/* ROW 2: Chart + Quick Actions */}
        <div className="grid-row chart-row">
          <div className="card chart-card">
            <div className="card-header">
              <h2 className="card-title">Business Pulse</h2>
              <div className="chart-toggles">
                <span className="toggle active">Revenue</span>
                <span className="toggle">Profit</span>
                <span className="toggle">Jobs</span>
              </div>
            </div>
            <div className="chart-container">
              <svg className="line-chart" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 50, 100, 150].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="600" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                ))}
                <path
                  d="M 0,160 L 100,140 L 200,150 L 300,110 L 400,90 L 500,100 L 600,60"
                  fill="url(#greenGrad)"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
                  <text key={i} x={i * 120 + 60} y="190" textAnchor="middle" fontSize="11" fill="#94A3B8">{m}</text>
                ))}
              </svg>
            </div>
          </div>

          <div className="card actions-card">
            <h2 className="card-title">Quick Actions</h2>
            <div className="action-pills">
              <button className="action-pill">⏳ Pending Approvals</button>
              <button className="action-pill">💰 Overdue Invoices</button>
              <button className="action-pill">👥 New Clients</button>
              <button className="action-pill">📄 Quote Expirations</button>
              <button className="action-pill">⚠️ Equipment Alerts</button>
            </div>
          </div>
        </div>

        {/* ROW 3: Activity + Vendors */}
        <div className="grid-row tracking-row">
          <div className="card activity-card">
            <h2 className="card-title">Recent Activity</h2>
            <div className="list">
              {recentActivity.map((item, i) => (
                <div key={i} className="list-item">
                  <span className="list-time">{item.time}</span>
                  <span className="list-text">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card vendor-card">
            <h2 className="card-title">Vendor & Expenses</h2>
            <div className="list">
              {vendorBills.map((bill, i) => (
                <div key={i} className="list-item vendor-item">
                  <div className="vendor-info">
                    <span className="vendor-name">{bill.vendor}</span>
                    <span className="vendor-due">Due: {bill.due}</span>
                  </div>
                  <div className="vendor-meta">
                    <span className="vendor-amount">{bill.amount}</span>
                    <span className={`vendor-status ${bill.status.toLowerCase()}`}>{bill.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;