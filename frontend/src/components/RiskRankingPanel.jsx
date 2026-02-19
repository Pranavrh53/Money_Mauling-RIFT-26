import React, { useState, useMemo } from 'react';
import './RiskRankingPanel.css';

function RiskRankingPanel({ riskIntelligence, onAccountSelect, onRingSelect }) {
  const [selectedTab, setSelectedTab] = useState('accounts'); // 'accounts' or 'rings'
  const [sortBy, setSortBy] = useState('risk_score'); // risk_score, centrality, velocity, etc.
  const [filterThreshold, setFilterThreshold] = useState(0); // 0-100
  const [expandedAccount, setExpandedAccount] = useState(null);

  if (!riskIntelligence || !riskIntelligence.rankings) {
    return (
      <div className="risk-ranking-panel">
        <div className="risk-panel-placeholder">
          <div className="placeholder-icon">🎯</div>
          <h3>Risk Intelligence</h3>
          <p>Run fraud detection to see risk rankings</p>
        </div>
      </div>
    );
  }

  const { rankings } = riskIntelligence;
  const { top_accounts, top_rings, statistics } = rankings;

  // Filter and sort accounts based on user controls
  const filteredAccounts = useMemo(() => {
    let filtered = top_accounts.filter(acc => acc.risk_score >= filterThreshold);
    
    // Sort by selected factor
    filtered.sort((a, b) => {
      if (sortBy === 'risk_score') {
        return b.risk_score - a.risk_score;
      } else if (sortBy in a.risk_factors && sortBy in b.risk_factors) {
        return b.risk_factors[sortBy] - a.risk_factors[sortBy];
      }
      return 0;
    });
    
    return filtered;
  }, [top_accounts, sortBy, filterThreshold]);

  // Filter rings by threshold (using avg_risk_score)
  const filteredRings = useMemo(() => {
    return top_rings.filter(ring => ring.avg_risk_score >= filterThreshold);
  }, [top_rings, filterThreshold]);

  const getRiskLevelColor = (level) => {
    switch(level) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskBarWidth = (score) => {
    return `${Math.min(score, 100)}%`;
  };

  const formatVolume = (amount) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const toggleAccountExpansion = (accountId) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  return (
    <div className="risk-ranking-panel">
      {/* Header with Statistics */}
      <div className="risk-panel-header">
        <div className="risk-title">
          <span className="risk-icon">🎯</span>
          <h2>Risk Intelligence</h2>
        </div>
        <div className="risk-stats-badges">
          <div className="stat-badge critical">
            <span className="badge-value">{statistics.critical_risk}</span>
            <span className="badge-label">Critical</span>
          </div>
          <div className="stat-badge high">
            <span className="badge-value">{statistics.high_risk}</span>
            <span className="badge-label">High</span>
          </div>
          <div className="stat-badge medium">
            <span className="badge-value">{statistics.medium_risk}</span>
            <span className="badge-label">Medium</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="risk-tabs">
        <button 
          className={`risk-tab ${selectedTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setSelectedTab('accounts')}
        >
          <span>👤</span> Top Accounts ({filteredAccounts.length})
        </button>
        <button 
          className={`risk-tab ${selectedTab === 'rings' ? 'active' : ''}`}
          onClick={() => setSelectedTab('rings')}
        >
          <span>🔗</span> Top Rings ({filteredRings.length})
        </button>
      </div>

      {/* Controls */}
      <div className="risk-controls">
        {selectedTab === 'accounts' && (
          <div className="control-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="risk_score">Overall Risk</option>
              <option value="centrality">Network Centrality</option>
              <option value="velocity">Transaction Velocity</option>
              <option value="cycle_involvement">Cycle Involvement</option>
              <option value="ring_density">Ring Density</option>
              <option value="volume_anomaly">Volume Anomaly</option>
            </select>
          </div>
        )}
        
        <div className="control-group">
          <label>Min Risk: {filterThreshold}</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={filterThreshold}
            onChange={(e) => setFilterThreshold(parseInt(e.target.value))}
            className="risk-slider"
          />
        </div>
      </div>

      {/* Content */}
      <div className="risk-content">
        {selectedTab === 'accounts' ? (
          <div className="accounts-list">
            {filteredAccounts.length === 0 ? (
              <div className="no-results">
                <p>No accounts match the current filter (≥{filterThreshold})</p>
              </div>
            ) : (
              filteredAccounts.map((account, index) => (
                <div 
                  key={account.account_id} 
                  className={`account-risk-card ${expandedAccount === account.account_id ? 'expanded' : ''}`}
                >
                  <div className="account-card-header" onClick={() => toggleAccountExpansion(account.account_id)}>
                    <div className="account-rank">#{index + 1}</div>
                    <div className="account-info">
                      <div className="account-id-row">
                        <span className="account-id">{account.account_id}</span>
                        <span 
                          className="risk-level-tag"
                          style={{ backgroundColor: getRiskLevelColor(account.risk_level) }}
                        >
                          {account.risk_level}
                        </span>
                      </div>
                      <div className="risk-score-bar-container">
                        <div 
                          className="risk-score-bar"
                          style={{ 
                            width: getRiskBarWidth(account.risk_score),
                            backgroundColor: getRiskLevelColor(account.risk_level)
                          }}
                        >
                          <span className="risk-score-value">{account.risk_score.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="investigate-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccountSelect && onAccountSelect(account.account_id);
                      }}
                    >
                      🔍
                    </button>
                  </div>

                  {expandedAccount === account.account_id && (
                    <div className="account-card-details">
                      {/* Risk Factors Breakdown */}
                      <div className="risk-factors-grid">
                        {Object.entries(account.risk_factors).map(([factor, score]) => (
                          <div key={factor} className="risk-factor-item">
                            <span className="factor-label">{factor.replace('_', ' ')}</span>
                            <div className="factor-bar-bg">
                              <div 
                                className="factor-bar-fill"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="factor-score">{score.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Patterns */}
                      {account.patterns && account.patterns.length > 0 && (
                        <div className="account-patterns">
                          <span className="patterns-label">Patterns:</span>
                          <div className="patterns-tags">
                            {account.patterns.map(pattern => (
                              <span key={pattern} className="pattern-tag">{pattern}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation Preview */}
                      <div className="explanation-preview">
                        <p>{account.explanation.substring(0, 150)}...</p>
                        <button 
                          className="read-more-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAccountSelect && onAccountSelect(account.account_id);
                          }}
                        >
                          Read Full Report →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="rings-list">
            {filteredRings.length === 0 ? (
              <div className="no-results">
                <p>No rings match the current filter (≥{filterThreshold})</p>
              </div>
            ) : (
              filteredRings.map((ring, index) => (
                <div key={ring.ring_id} className="ring-risk-card">
                  <div className="ring-card-header">
                    <div className="ring-rank">#{index + 1}</div>
                    <div className="ring-info">
                      <div className="ring-id-row">
                        <span className="ring-id">{ring.ring_id}</span>
                        <span className="ring-pattern-badge">{ring.pattern_type}</span>
                      </div>
                      <div className="ring-metrics">
                        <span className="ring-metric">
                          <span className="metric-icon">👥</span>
                          {ring.member_count} accounts
                        </span>
                        <span className="ring-metric">
                          <span className="metric-icon">💰</span>
                          {formatVolume(ring.total_volume)}
                        </span>
                        <span className="ring-metric">
                          <span className="metric-icon">🔄</span>
                          {ring.transaction_count} txns
                        </span>
                      </div>
                      <div className="risk-score-bar-container">
                        <div 
                          className="risk-score-bar ring-bar"
                          style={{ width: getRiskBarWidth(ring.avg_risk_score) }}
                        >
                          <span className="risk-score-value">Avg: {ring.avg_risk_score.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="investigate-btn"
                      onClick={() => onRingSelect && onRingSelect(ring)}
                    >
                      🔍
                    </button>
                  </div>
                  <div className="ring-description">
                    {ring.description}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskRankingPanel;
