import React from 'react';
import './ResultsSummary.css';

function ResultsSummary({ summary }) {
  if (!summary) return null;

  const {
    total_accounts_analyzed,
    suspicious_accounts_flagged,
    fraud_rings_detected,
    processing_time_seconds
  } = summary;

  const suspiciousPercentage = ((suspicious_accounts_flagged / total_accounts_analyzed) * 100).toFixed(1);

  return (
    <div className="results-summary-grid">
      <div className="summary-card-modern total-accounts">
        <div className="card-header-modern">
          <div className="icon-wrapper icon-blue">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </div>
          <span className="card-label-modern">Total Accounts</span>
        </div>
        <div className="card-value-modern">{total_accounts_analyzed.toLocaleString()}</div>
        <div className="card-footer-modern">
          <span className="footer-badge badge-neutral">Analyzed</span>
        </div>
      </div>

      <div className="summary-card-modern suspicious-accounts">
        <div className="card-header-modern">
          <div className="icon-wrapper icon-red">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="card-label-modern">Suspicious</span>
        </div>
        <div className="card-value-modern">{suspicious_accounts_flagged}</div>
        <div className="card-footer-modern">
          <span className="footer-badge badge-danger">{suspiciousPercentage}% of total</span>
          <div className="progress-bar">
            <div 
              className="progress-fill progress-danger" 
              style={{width: `${Math.min(suspiciousPercentage, 100)}%`}}
            />
          </div>
        </div>
      </div>

      <div className="summary-card-modern fraud-rings">
        <div className="card-header-modern">
          <div className="icon-wrapper icon-purple">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="5" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="19" r="2" fill="currentColor"/>
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <line x1="12" y1="7" x2="12" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="17" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="17" x2="12" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="7" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <span className="card-label-modern">Fraud Rings</span>
        </div>
        <div className="card-value-modern">{fraud_rings_detected}</div>
        <div className="card-footer-modern">
          <span className="footer-badge badge-warning">Coordinated Groups</span>
        </div>
      </div>

      <div className="summary-card-modern processing-time">
        <div className="card-header-modern">
          <div className="icon-wrapper icon-green">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="card-label-modern">Processing Time</span>
        </div>
        <div className="card-value-modern">
          {processing_time_seconds}
          <span className="value-unit">s</span>
        </div>
        <div className="card-footer-modern">
          <span className="footer-badge badge-success">
            {processing_time_seconds < 5 ? '⚡ Lightning Fast' : '✓ Complete'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ResultsSummary;
