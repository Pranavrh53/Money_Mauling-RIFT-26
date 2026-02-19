import React from 'react';
import './FraudRingsTable.css';

function FraudRingsTable({ rings }) {
  if (!rings || rings.length === 0) {
    return (
      <div className="no-rings-message">
        <div className="no-rings-icon">✓</div>
        <h3>No Fraud Rings Detected</h3>
        <p>All transaction patterns appear normal</p>
      </div>
    );
  }

  const getPatternIcon = (patternType) => {
    const icons = {
      'cycle': '🔄',
      'fan_in': '📥',
      'fan_out': '📤',
      'shell_chain': '🔗'
    };
    return icons[patternType] || '⚠️';
  };

  const getPatternColor = (patternType) => {
    const colors = {
      'cycle': 'pattern-cycle',
      'fan_in': 'pattern-fanin',
      'fan_out': 'pattern-fanout',
      'shell_chain': 'pattern-shell'
    };
    return colors[patternType] || 'pattern-default';
  };

  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'CRITICAL', class: 'risk-critical' };
    if (score >= 40) return { level: 'HIGH', class: 'risk-high' };
    return { level: 'MEDIUM', class: 'risk-medium' };
  };

  return (
    <div className="fraud-rings-section">
      <div className="section-header-fancy">
        <div className="header-content">
          <div className="header-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="5" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="19" r="2" fill="currentColor"/>
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h2>Detected Fraud Rings</h2>
            <p className="header-subtitle">Coordinated fraud networks and suspicious patterns</p>
          </div>
        </div>
        <div className="rings-count-badge">
          {rings.length} {rings.length === 1 ? 'Ring' : 'Rings'}
        </div>
      </div>

      <div className="rings-table-container">
        <div className="rings-table-scroll">
          <table className="rings-table-modern">
            <thead>
              <tr>
                <th className="col-ring-id">Ring ID</th>
                <th className="col-pattern">Pattern Type</th>
                <th className="col-members">Member Count</th>
                <th className="col-risk">Risk Score</th>
                <th className="col-member-accounts">Member Account IDs</th>
                <th className="col-expand"></th>
              </tr>
            </thead>
            <tbody>
              {rings.map((ring) => {
                const risk = getRiskLevel(ring.risk_score);
                const memberAccountsStr = ring.member_accounts.join(', ');
                
                return (
                    <tr key={ring.ring_id} className="ring-row">
                      <td className="col-ring-id">
                        <div className="ring-id-cell">
                          <span className="ring-id-badge">{ring.ring_id}</span>
                        </div>
                      </td>
                      <td className="col-pattern">
                        <div className={`pattern-badge ${getPatternColor(ring.pattern_type)}`}>
                          <span className="pattern-icon">{getPatternIcon(ring.pattern_type)}</span>
                          <span className="pattern-label">
                            {ring.pattern_type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="col-members">
                        <div className="members-count-cell">
                          <span className="count-number">{ring.member_count}</span>
                          <span className="count-label">accounts</span>
                        </div>
                      </td>
                      <td className="col-risk">
                        <div className={`risk-badge ${risk.class}`}>
                          <div className="risk-score-large">{ring.risk_score.toFixed(1)}</div>
                          <div className="risk-level-text">{risk.level}</div>
                        </div>
                      </td>
                      <td className="col-member-accounts">
                        <div className="member-accounts-cell">
                          {memberAccountsStr}
                        </div>
                      </td>
                      <td className="col-expand"></td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FraudRingsTable;
