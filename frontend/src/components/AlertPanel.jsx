import React, { useState, useEffect } from 'react';
import './AlertPanel.css';

const AlertPanel = ({ alerts = [], onAlertClick, onAcknowledge, onClearAll, autoRefresh = true }) => {
  const [filter, setFilter] = useState('all'); // all, CRITICAL, HIGH, MEDIUM, LOW
  const [expanded, setExpanded] = useState(true);
  
  // Filter alerts by severity
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter);
  
  // Count alerts by severity
  const counts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW: alerts.filter(a => a.severity === 'LOW').length
  };
  
  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };
  
  // Get alert type icon
  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'NEW_RING': return '🚨';
      case 'RISK_SPIKE': return '⚠️';
      case 'VELOCITY_ANOMALY': return '⚡';
      case 'NEW_CYCLE': return '🔄';
      case 'VOLUME_ANOMALY': return '💰';
      case 'CRITICAL_NODE': return '🔴';
      default: return '📢';
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const handleAlertClick = (alert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };
  
  const handleAcknowledge = (e, alertId) => {
    e.stopPropagation();
    if (onAcknowledge) {
      onAcknowledge(alertId);
    }
  };
  
  return (
    <div className={`alert-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="alert-panel-header">
        <div className="alert-panel-title">
          <span className="alert-icon">🔔</span>
          <h3>Real-Time Alerts</h3>
          <span className="alert-count-badge">{alerts.length}</span>
        </div>
        <div className="alert-panel-actions">
          {alerts.length > 0 && (
            <button 
              className="clear-all-btn" 
              onClick={onClearAll}
              title="Clear all alerts"
            >
              Clear All
            </button>
          )}
          <button 
            className="toggle-panel-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▲'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <>
          <div className="alert-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({alerts.length})
            </button>
            <button 
              className={`filter-btn critical ${filter === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setFilter('CRITICAL')}
            >
              🔴 Critical ({counts.CRITICAL})
            </button>
            <button 
              className={`filter-btn high ${filter === 'HIGH' ? 'active' : ''}`}
              onClick={() => setFilter('HIGH')}
            >
              🟠 High ({counts.HIGH})
            </button>
            <button 
              className={`filter-btn medium ${filter === 'MEDIUM' ? 'active' : ''}`}
              onClick={() => setFilter('MEDIUM')}
            >
              🟡 Medium ({counts.MEDIUM})
            </button>
          </div>
          
          <div className="alert-list">
            {filteredAlerts.length === 0 ? (
              <div className="no-alerts">
                <div className="no-alerts-icon">✅</div>
                <p>No alerts</p>
                <span className="no-alerts-subtitle">
                  {filter === 'all' ? 'All clear!' : `No ${filter.toLowerCase()} alerts`}
                </span>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`alert-item ${alert.severity.toLowerCase()} ${alert.acknowledged ? 'acknowledged' : ''}`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="alert-item-header">
                    <div className="alert-item-icons">
                      <span className="alert-severity-icon">
                        {getSeverityIcon(alert.severity)}
                      </span>
                      <span className="alert-type-icon">
                        {getAlertTypeIcon(alert.type)}
                      </span>
                    </div>
                    <div className="alert-item-severity">
                      {alert.severity}
                    </div>
                    <div className="alert-item-time">
                      {formatTime(alert.timestamp)}
                    </div>
                  </div>
                  
                  <div className="alert-item-message">
                    {alert.message}
                  </div>
                  
                  {alert.account_id && (
                    <div className="alert-item-details">
                      <span className="alert-detail-label">Account:</span>
                      <span className="alert-detail-value">{alert.account_id}</span>
                      {alert.risk_score && (
                        <>
                          <span className="alert-detail-separator">•</span>
                          <span className="alert-detail-label">Risk:</span>
                          <span className="alert-detail-value risk-score">
                            {alert.risk_score.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {alert.ring_id && (
                    <div className="alert-item-details">
                      <span className="alert-detail-label">Ring:</span>
                      <span className="alert-detail-value">{alert.ring_id}</span>
                      {alert.metadata?.member_count && (
                        <>
                          <span className="alert-detail-separator">•</span>
                          <span className="alert-detail-value">
                            {alert.metadata.member_count} members
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="alert-item-actions">
                    {!alert.acknowledged && (
                      <button 
                        className="acknowledge-btn"
                        onClick={(e) => handleAcknowledge(e, alert.id)}
                      >
                        ✓ Acknowledge
                      </button>
                    )}
                    <button className="investigate-btn">
                      🔍 Investigate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AlertPanel;
