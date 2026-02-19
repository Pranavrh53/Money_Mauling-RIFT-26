import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import GraphVisualization from './components/GraphVisualization';
import Dashboard from './components/Dashboard';
import ResultsSummary from './components/ResultsSummary';
import FraudRingsTable from './components/FraudRingsTable';
import RiskRankingPanel from './components/RiskRankingPanel';
import InvestigationTable from './components/InvestigationTable';
import AlertPanel from './components/AlertPanel';
import ChatBot from './components/ChatBot';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fraudResults, setFraudResults] = useState(null);
  const [detectingFraud, setDetectingFraud] = useState(false);
  const [riskIntelligence, setRiskIntelligence] = useState(null);
  const [selectedView, setSelectedView] = useState('visualization'); // 'visualization', 'table', 'ranking'
  const [resultsSummary, setResultsSummary] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  // Monitoring system state
  const [alerts, setAlerts] = useState([]);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [detectionStrategy, setDetectionStrategy] = useState('all_patterns');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleUploadSuccess = (summary) => {
    console.log('Upload successful, summary:', summary);
    setUploadStatus(summary);
    setError(null);
    // Fetch graph data after successful upload
    fetchGraphData();
  };

  const handleUploadError = (errorMessage) => {
    console.error('Upload error:', errorMessage);
    setError(errorMessage);
    setUploadStatus(null);
    setGraphData(null);
  };

  const fetchGraphData = async () => {
    console.log('Fetching graph data...');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/graph-data');
      console.log('Graph data response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Graph data error:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch graph data. Please upload a CSV file first.');
      }
      const data = await response.json();
      console.log('Graph data received:', data);
      console.log('Nodes count:', data.nodes?.length);
      console.log('Edges count:', data.edges?.length);
      
      setGraphData(data);
      setError(null);
    } catch (err) {
      console.error('Fetch graph data error:', err);
      setError(err.message);
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  };

  const detectFraud = async () => {
    console.log('Starting fraud detection...');
    setDetectingFraud(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/detect-fraud', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to run fraud detection');
      }
      
      const results = await response.json();
      console.log('Fraud detection results:', results);
      setFraudResults(results);
      setError(null);
      
      // Fetch the formatted results summary from download endpoint
      await fetchResultsSummary();
      
      // Fetch risk intelligence data
      await fetchRiskIntelligence();
    } catch (err) {
      console.error('Fraud detection error:', err);
      setError(err.message);
      setFraudResults(null);
    } finally {
      setDetectingFraud(false);
    }
  };

  const fetchRiskIntelligence = async () => {
    console.log('Fetching risk intelligence...');
    try {
      const response = await fetch('http://localhost:8000/risk-intelligence');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch risk intelligence');
      }
      
      const data = await response.json();
      console.log('Risk intelligence data received:', data);
      setRiskIntelligence(data);
    } catch (err) {
      console.error('Risk intelligence error:', err);
      // Don't show error to user, just log it
      console.warn('Risk intelligence unavailable, continuing with basic fraud detection');
    }
  };

  const fetchResultsSummary = async () => {
    console.log('Fetching results summary...');
    try {
      const response = await fetch('http://localhost:8000/download-results');
      if (response.ok) {
        const data = await response.json();
        console.log('Results summary received:', data.summary);
        setResultsSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Results summary fetch error:', err);
    }
  };
  const downloadResults = async () => {
    try {
      const response = await fetch('http://localhost:8000/download-results');
      
      if (!response.ok) {
        throw new Error('Failed to download results');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fraud_detection_results.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download results');
    }
  };

  // Monitoring system functions
  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/alerts?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const toggleMonitoring = async () => {
    try {
      const newState = !monitoringActive;
      const response = await fetch(`http://localhost:8000/monitoring/toggle?enabled=${newState}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setMonitoringActive(newState);
        
        // Start auto-refresh if monitoring is enabled
        if (newState) {
          const interval = setInterval(() => {
            fetchAlerts();
          }, 10000); // Refresh every 10 seconds
          setAutoRefreshInterval(interval);
        } else {
          // Stop auto-refresh
          if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            setAutoRefreshInterval(null);
          }
        }
      }
    } catch (err) {
      console.error('Error toggling monitoring:', err);
    }
  };

  const handleStrategyChange = async (strategy) => {
    try {
      const response = await fetch(`http://localhost:8000/monitoring/strategy?strategy=${strategy}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setDetectionStrategy(strategy);
        console.log('Detection strategy changed to:', strategy);
      }
    } catch (err) {
      console.error('Error changing strategy:', err);
    }
  };

  const handleAlertClick = (alert) => {
    console.log('Alert clicked:', alert);
    
    // If alert has account_id, switch to graph view and select that node
    if (alert.account_id) {
      setSelectedView('visualization');
      // The graph visualization will handle the selection
      // You could pass the account_id as a prop to GraphVisualization
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`http://localhost:8000/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update local alerts state
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const clearAllAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/alerts', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Error clearing alerts:', err);
    }
  };

  // Auto-refresh alerts when monitoring is active
  useEffect(() => {
    if (monitoringActive) {
      fetchAlerts();
    }
  }, [fraudResults, monitoringActive]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>💰 Financial Crime Detection</h1>
        <p className="subtitle">Graph-Based Transaction Analysis</p>
        <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      <main className="main-content">
        <FileUpload 
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />

        {uploadStatus && (
          <Dashboard summary={uploadStatus} graphSummary={graphData?.summary} />
        )}

        {uploadStatus && !loading && (
          <>
            {/* Monitoring Controls */}
            <div className="monitoring-controls">
              <div className="monitoring-header">
                <div className="monitoring-status">
                  <div className={`status-indicator ${monitoringActive ? 'active' : 'inactive'}`}></div>
                  <span className="status-label">
                    {monitoringActive ? '🟢 Live Monitoring Active' : '⚫ Monitoring Inactive'}
                  </span>
                </div>
                <button 
                  className={`toggle-monitoring-btn ${monitoringActive ? 'active' : ''}`}
                  onClick={toggleMonitoring}
                >
                  {monitoringActive ? '⏸ Pause Monitoring' : '▶ Start Monitoring'}
                </button>
              </div>

              <div className="strategy-selector">
                <label htmlFor="strategy">Detection Strategy:</label>
                <select 
                  id="strategy"
                  value={detectionStrategy}
                  onChange={(e) => handleStrategyChange(e.target.value)}
                  className="strategy-dropdown"
                >
                  <option value="all_patterns">🎯 All Patterns</option>
                  <option value="cycles_only">🔄 Cycles Only</option>
                  <option value="fan_patterns">📥📤 Fan Patterns</option>
                  <option value="shells_only">🏢 Shell Chains Only</option>
                </select>
              </div>
            </div>

            {/* Alert Panel */}
            {monitoringActive && alerts.length > 0 && (
              <AlertPanel
                alerts={alerts}
                onAlertClick={handleAlertClick}
                onAcknowledge={acknowledgeAlert}
                onClearAll={clearAllAlerts}
                autoRefresh={monitoringActive}
              />
            )}

            <div className="action-panel">
            <button 
              onClick={detectFraud}
              disabled={detectingFraud}
              className="detect-fraud-btn"
            >
              {detectingFraud ? (
                <>
                  <span className="spinner-small"></span>
                  Analyzing Patterns...
                </>
              ) : (
                <>
                  🔍 Run Fraud Detection
                </>
              )}
            </button>
            <p className="action-hint">
              Detect money muling rings, smurfing patterns, and suspicious activity
            </p>
          </div>
          </>
        )}

        {detectingFraud && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Running fraud detection algorithms...</p>
            <p className="loading-subtext">Analyzing cycles, fan patterns, and shell chains</p>
          </div>
        )}

        {fraudResults && !detectingFraud && (
          <div className="fraud-results-section">
            <div className="results-header-new">
              <h2 className="results-title-gradient">🔍 Fraud Detection Results</h2>
              <div className="view-switcher">
                <button 
                  className={`view-btn ${selectedView === 'visualization' ? 'active' : ''}`}
                  onClick={() => setSelectedView('visualization')}
                >
                  🌐 Graph
                </button>
                <button 
                  className={`view-btn ${selectedView === 'table' ? 'active' : ''}`}
                  onClick={() => setSelectedView('table')}
                  disabled={!riskIntelligence}
                >
                  📋 Table
                </button>
                <button 
                  className={`view-btn ${selectedView === 'ranking' ? 'active' : ''}`}
                  onClick={() => setSelectedView('ranking')}
                  disabled={!riskIntelligence}
                >
                  🎯 Rankings
                </button>
              </div>
              <button onClick={downloadResults} className="download-btn">
                <svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download JSON Results
              </button>
            </div>
            
            {selectedView === 'visualization' && (
              <>
                <ResultsSummary summary={resultsSummary} />
                <FraudRingsTable rings={fraudResults.fraud_rings} />
              </>
            )}
            
            {selectedView === 'table' && riskIntelligence && (
              <InvestigationTable 
                riskIntelligence={riskIntelligence} 
                onAccountSelect={(accountId) => {
                  // Switch to visualization and select node
                  setSelectedView('visualization');
                  // Trigger node selection in graph (you'd need to pass this down)
                }}
              />
            )}
            
            {selectedView === 'ranking' && riskIntelligence && (
              <div className="ranking-panel-container">
                <RiskRankingPanel 
                  riskIntelligence={riskIntelligence}
                  onAccountSelect={(accountId) => {
                    setSelectedView('visualization');
                  }}
                  onRingSelect={(ring) => {
                    setSelectedView('visualization');
                  }}
                />
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading graph visualization...</p>
          </div>
        )}

        {graphData && !loading && selectedView === 'visualization' && (
          <GraphVisualization 
            data={graphData} 
            fraudResults={fraudResults} 
            riskIntelligence={riskIntelligence}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Step 4: Advanced Fraud Detection Results & JSON Export | Version 4.0.0</p>
      </footer>

      <ChatBot 
        isOpen={chatOpen} 
        onToggle={() => setChatOpen(prev => !prev)} 
        theme={theme}
      />
    </div>
  );
}

export default App;
