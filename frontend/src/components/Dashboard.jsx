import React from 'react';
import './Dashboard.css';

function Dashboard({ summary, graphSummary }) {
  if (!summary) return null;

  return (
    <div className="dashboard">
      <h2>📊 Analysis Summary</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-label">Total Transactions</div>
            <div className="stat-value">{summary.total_transactions.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Unique Accounts</div>
            <div className="stat-value">{summary.unique_accounts.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">Date Range</div>
            <div className="stat-value date-range">
              {summary.date_range.start.split(' ')[0]}
              <span className="arrow">→</span>
              {summary.date_range.end.split(' ')[0]}
            </div>
          </div>
        </div>

        {graphSummary && (
          <>
            <div className="stat-card">
              <div className="stat-icon">🔗</div>
              <div className="stat-content">
                <div className="stat-label">Network Edges</div>
                <div className="stat-value">{graphSummary.total_edges.toLocaleString()}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🌐</div>
              <div className="stat-content">
                <div className="stat-label">Network Density</div>
                <div className="stat-value">{(graphSummary.density * 100).toFixed(2)}%</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-label">Connected Network</div>
                <div className="stat-value">
                  {graphSummary.is_connected ? '✅ Yes' : '❌ No'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
