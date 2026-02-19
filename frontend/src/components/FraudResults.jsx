import React from 'react';
import './FraudResults.css';

function FraudResults({ results }) {
  if (!results) return null;

  const { suspicious_accounts, fraud_rings, detection_summary } = results;

  // Get high and medium risk accounts
  const highRiskAccounts = suspicious_accounts.filter(acc => acc.risk_level === 'HIGH');
  const mediumRiskAccounts = suspicious_accounts.filter(acc => acc.risk_level === 'MEDIUM');

  return (
    <div className="fraud-results-container">
      <div className="results-header">
        <h2>🔍 Fraud Detection Results</h2>
        <div className="detection-badge">
          <span className="badge-label">Analysis Complete</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card high-risk">
          <div className="card-icon">🚨</div>
          <div className="card-content">
            <div className="card-value">{detection_summary.high_risk_accounts}</div>
            <div className="card-label">High Risk</div>
          </div>
        </div>

        <div className="summary-card medium-risk">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-value">{detection_summary.medium_risk_accounts}</div>
            <div className="card-label">Medium Risk</div>
          </div>
        </div>

        <div className="summary-card rings">
          <div className="card-icon">🔗</div>
          <div className="card-content">
            <div className="card-value">{detection_summary.total_rings}</div>
            <div className="card-label">Fraud Rings</div>
          </div>
        </div>

        <div className="summary-card patterns">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-value">
              {detection_summary.cycles_detected + 
               detection_summary.fanin_detected + 
               detection_summary.fanout_detected + 
               detection_summary.chains_detected}
            </div>
            <div className="card-label">Patterns Detected</div>
          </div>
        </div>
      </div>

      {/* Pattern Breakdown */}
      <div className="pattern-breakdown">
        <h3>Pattern Breakdown</h3>
        <div className="pattern-list">
          <div className="pattern-item">
            <span className="pattern-name">🔄 Circular Routing</span>
            <span className="pattern-count">{detection_summary.cycles_detected}</span>
          </div>
          <div className="pattern-item">
            <span className="pattern-name">📥 Smurfing (Fan-In)</span>
            <span className="pattern-count">{detection_summary.fanin_detected}</span>
          </div>
          <div className="pattern-item">
            <span className="pattern-name">📤 Smurfing (Fan-Out)</span>
            <span className="pattern-count">{detection_summary.fanout_detected}</span>
          </div>
          <div className="pattern-item">
            <span className="pattern-name">🔗 Shell Chains</span>
            <span className="pattern-count">{detection_summary.chains_detected}</span>
          </div>
        </div>
      </div>

      {/* High Risk Accounts */}
      {highRiskAccounts.length > 0 && (
        <div className="accounts-section">
          <h3 className="section-title high">
            <span className="title-icon">🚨</span>
            High Risk Accounts
          </h3>
          <div className="accounts-list">
            {highRiskAccounts.map(account => (
              <div key={account.account_id} className="account-card high-risk-card">
                <div className="account-header">
                  <span className="account-id">{account.account_id}</span>
                  <span className="account-score">{account.score.toFixed(1)}</span>
                </div>
                <div className="account-patterns">
                  {account.patterns.map(pattern => (
                    <span key={pattern} className="pattern-tag">
                      {pattern.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <div className="account-factors">
                  {account.factors.map(factor => (
                    <span key={factor} className="factor-tag">
                      {factor.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medium Risk Accounts */}
      {mediumRiskAccounts.length > 0 && (
        <div className="accounts-section">
          <h3 className="section-title medium">
            <span className="title-icon">⚠️</span>
            Medium Risk Accounts
          </h3>
          <div className="accounts-list">
            {mediumRiskAccounts.slice(0, 5).map(account => (
              <div key={account.account_id} className="account-card medium-risk-card">
                <div className="account-header">
                  <span className="account-id">{account.account_id}</span>
                  <span className="account-score">{account.score.toFixed(1)}</span>
                </div>
                <div className="account-patterns">
                  {account.patterns.map(pattern => (
                    <span key={pattern} className="pattern-tag">
                      {pattern.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {mediumRiskAccounts.length > 5 && (
              <div className="more-accounts">
                +{mediumRiskAccounts.length - 5} more accounts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fraud Rings */}
      {fraud_rings.length > 0 && (
        <div className="rings-section">
          <h3 className="section-title">
            <span className="title-icon">🔗</span>
            Detected Fraud Rings
          </h3>
          <div className="rings-list">
            {fraud_rings.slice(0, 5).map(ring => (
              <div key={ring.ring_id} className="ring-card">
                <div className="ring-header">
                  <span className="ring-id">{ring.ring_id}</span>
                  <span className="ring-type">{ring.pattern_type.replace('_', ' ')}</span>
                  <span className="ring-score">{ring.risk_score.toFixed(1)}</span>
                </div>
                <div className="ring-description">{ring.description}</div>
                <div className="ring-members">
                  <span className="members-label">Members ({ring.member_count}):</span>
                  <div className="members-list">
                    {ring.member_accounts.slice(0, 5).map(member => (
                      <span key={member} className="member-tag">{member}</span>
                    ))}
                    {ring.member_accounts.length > 5 && (
                      <span className="member-tag more">+{ring.member_accounts.length - 5} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {fraud_rings.length > 5 && (
              <div className="more-rings">
                +{fraud_rings.length - 5} more fraud rings detected
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Suspicious Activity */}
      {suspicious_accounts.length === 0 && fraud_rings.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">✅</div>
          <h3>No Suspicious Activity Detected</h3>
          <p>The transaction network appears to have normal patterns.</p>
        </div>
      )}
    </div>
  );
}

export default FraudResults;
