import React, { useState, useEffect } from 'react';
import './styles.css';

function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: 'Revenue Overview',
      metric1: 'Revenue',
      metric2: 'Profit',
      data: [
        { month: 'Jan', revenue: 2400, profit: 1800 },
        { month: 'Feb', revenue: 2800, profit: 2100 },
        { month: 'Mar', revenue: 3200, profit: 2400 },
        { month: 'Apr', revenue: 3600, profit: 2700 },
        { month: 'May', revenue: 4100, profit: 3200 },
        { month: 'Jun', revenue: 4500, profit: 3600 },
      ]
    }
  ];

  const currentData = slides[currentSlide];

  return (
    <div className="app-container">
      {/* FLOATING TOP BAR */}
      <header className="top-bar">
        <div className="top-left">
          <span className="logo">PrintOps</span>
          <span className="user-badge">Wayne - Admin</span>
        </div>
        <div className="top-center">
          <span className="icon">🔍</span>
          <span>Print Queue: 3 Jobs Active</span>
        </div>
        <div className="top-right">
          <span className="icon">💰</span>
          <span>Today's Revenue: $1,240</span>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <button className="new-quote-btn">+ New Quote</button>
        
        <div className="profile-section">
          <h3>Wayne,</h3>
          <p>Printing Admin</p>
        </div>
        
        <nav className="nav-menu">
          <a href="#" className="nav-item active">Dashboard</a>
          <a href="#" className="nav-item">Invoices</a>
          <a href="#" className="nav-item">Proposals</a>
          <a href="#" className="nav-item">Reports</a>
          <a href="#" className="nav-item">Settings</a>
        </nav>
        
        <div className="sidebar-footer">
          <div className="footer-title">📁 Business Records</div>
          <a href="#" className="footer-link">Expenses</a>
          <a href="#" className="footer-link">Inventory</a>
          <a href="#" className="footer-link">Tax Summary</a>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        
        {/* ROW 1: Business Pulse + Job Snapshot */}
        <div className="charts-row">
          <section className="business-pulse">
            <div className="pulse-header">
              <h2>Business Pulse</h2>
              <div className="pulse-controls">
                <select className="control-select">
                  <option>Select Date Range</option>
                  <option>Last 30 Days</option>
                  <option>Last 6 Months</option>
                </select>
                <select className="control-select">
                  <option>Filter by Product</option>
                  <option>Stickers</option>
                  <option>Flyers</option>
                </select>
                <div className="metric-tabs">
                  <span>Revenue</span>
                  <span className="divider">|</span>
                  <span>Profit</span>
                  <span className="divider">|</span>
                  <span className="active-tab">Job Count</span>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <svg className="main-chart" viewBox="0 0 700 280">
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#059669" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                {[0, 70, 140, 210].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="700" y2={y} stroke="#E5E7EB" strokeWidth="1" />
                ))}
                
                {/* Green line (Revenue) */}
                <path
                  d="M 0,220 L 100,200 L 200,185 L 300,170 L 400,140 L 500,120 L 600,90 L 700,60"
                  fill="url(#greenGrad)"
                  stroke="#059669"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Yellow line (Profit) */}
                <path
                  d="M 0,240 L 100,225 L 200,210 L 300,195 L 400,175 L 500,160 L 600,145 L 700,130"
                  fill="url(#yellowGrad)"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* X-axis labels */}
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month, i) => (
                  <text key={i} x={i * 100 + 50} y="270" textAnchor="middle" fontSize="13" fill="#6B7280">{month}</text>
                ))}
              </svg>
            </div>
          </section>

          <section className="job-snapshot">
            <h3>Job Snapshot</h3>
            <div className="mini-chart">
              <svg viewBox="0 0 200 120">
                <path
                  d="M 0,100 L 40,85 L 80,90 L 120,60 L 160,70 L 200,40"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 0,100 L 40,85 L 80,90 L 120,60 L 160,70 L 200,40 L 200,120 L 0,120 Z"
                  fill="#059669"
                  opacity="0.1"
                />
              </svg>
            </div>
            <div className="snapshot-stats">
              <div className="stat-number">7</div>
              <div className="stat-label">Active Jobs</div>
            </div>
          </section>
        </div>

        {/* ROW 2: Quick Actions (Floating Pills - No Container) */}
        <div className="quick-actions-section">
          <h3 className="section-title">Quick Actions</h3>
          <div className="quick-actions-row">
            <button className="action-pill">⏳ Pending Approvals</button>
            <button className="action-pill">💰 Overdue Invoices</button>
            <button className="action-pill">👥 New Clients</button>
            <button className="action-pill">📄 Quote Expirations</button>
            <button className="action-pill">⚠️ Equipment Alerts</button>
          </div>
        </div>

        {/* ROW 3: Recent Activity (No Container - Clean List) */}
        <div className="activity-section">
          <h3 className="section-title">Recent Activity Feed</h3>
          <div className="feed-list">
            <div className="feed-item">
              <span className="feed-time">10:23 AM</span>
              <span className="feed-text">Invoice #1024 sent to Client A</span>
            </div>
            <div className="feed-item">
              <span className="feed-time">09:45 AM</span>
              <span className="feed-text">Proposal approved: Wedding Flyers</span>
            </div>
            <div className="feed-item">
              <span className="feed-time">09:45 AM</span>
              <span className="feed-text">Proposal approved: Wedding Flyers</span>
            </div>
            <div className="feed-item">
              <span className="feed-time">09:25 AM</span>
              <span className="feed-text">Proposal approved: Wedding Flyers</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;