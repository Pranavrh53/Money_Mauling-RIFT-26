import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './components/LandingPage';
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
  const [showLanding, setShowLanding] = useState(true);
  // Page flow: 'upload' → 'results'
  const [currentPage, setCurrentPage] = useState('upload');
  const [graphData, setGraphData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fraudResults, setFraudResults] = useState(null);
  const [detectingFraud, setDetectingFraud] = useState(false);
  const [riskIntelligence, setRiskIntelligence] = useState(null);
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'visualization', 'table', 'ranking'
  const [resultsSummary, setResultsSummary] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  // Monitoring system state
  const [alerts, setAlerts] = useState([]);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [detectionStrategy, setDetectionStrategy] = useState('all_patterns');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  
  // JSON viewer state
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [jsonContent, setJsonContent] = useState(null);

  // Transition state
  const [pageTransition, setPageTransition] = useState('');
  const autoDetectRan = useRef(false);

  // Processing pipeline steps
  const [processingSteps, setProcessingSteps] = useState([
    { id: 'upload', label: 'Dataset uploaded', detail: 'CSV parsed and validated', status: 'pending', icon: '📄' },
    { id: 'graph', label: 'Building transaction graph', detail: 'Constructing node & edge network', status: 'pending', icon: '🔗' },
    { id: 'detect', label: 'Running fraud detection', detail: 'Cycle detection, smurfing & shell analysis', status: 'pending', icon: '🔍' },
    { id: 'risk', label: 'Analyzing risk intelligence', detail: 'Scoring accounts & ranking threats', status: 'pending', icon: '⚡' },
    { id: 'results', label: 'Generating results', detail: 'Compiling detection summary', status: 'pending', icon: '📊' },
  ]);

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

  // Run processing pipeline when we enter processing page
  useEffect(() => {
    if (currentPage === 'processing' && uploadStatus && !autoDetectRan.current) {
      autoDetectRan.current = true;
      runProcessingPipeline();
    }
  }, [currentPage, uploadStatus]);

  const navigateToPage = (page) => {
    setPageTransition('page-exit');
    setTimeout(() => {
      setCurrentPage(page);
      setPageTransition('page-enter');
      setTimeout(() => setPageTransition(''), 400);
    }, 300);
  };

  const updateStep = (stepId, status, detail) => {
    setProcessingSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, status, ...(detail ? { detail } : {}) } : s
    ));
  };

  const runProcessingPipeline = async () => {
    try {
      // Step 1: Upload already done
      updateStep('upload', 'done', `${uploadStatus?.total_transactions?.toLocaleString() || ''} transactions validated`);

      // Step 2: Build graph
      updateStep('graph', 'running');
      const gData = await fetchGraphData();
      updateStep('graph', 'done', `${gData?.summary?.total_nodes || 'Network'} nodes mapped`);
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Fraud detection
      updateStep('detect', 'running');
      const fResults = await detectFraudOnly();
      const ringCount = fResults?.fraud_rings?.length || 0;
      updateStep('detect', 'done', `${ringCount} fraud ring${ringCount !== 1 ? 's' : ''} identified`);
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Risk intelligence
      updateStep('risk', 'running');
      await fetchRiskIntelligence();
      updateStep('risk', 'done', 'Risk scores computed');
      await new Promise(r => setTimeout(r, 400));

      // Step 5: Results summary
      updateStep('results', 'running');
      await fetchResultsSummary();
      updateStep('results', 'done', 'Report ready');

      // Wait a beat then transition to results
      await new Promise(r => setTimeout(r, 800));
      navigateToPage('results');
    } catch (err) {
      console.error('Processing pipeline error:', err);
    }
  };

  const handleUploadSuccess = (summary) => {
    console.log('Upload successful, summary:', summary);
    setUploadStatus(summary);
    setError(null);
    // Reset processing steps
    setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'pending', detail: s.id === 'upload' ? 'CSV parsed and validated' : s.detail })));
    // Navigate to processing page
    navigateToPage('processing');
  };

  const handleUploadError = (errorMessage) => {
    if (errorMessage) {
      console.error('Upload error:', errorMessage);
    }
    setError(errorMessage);
    setUploadStatus(null);
    setGraphData(null);
  };

  const handleNewAnalysis = () => {
    setUploadStatus(null);
    setGraphData(null);
    setFraudResults(null);
    setRiskIntelligence(null);
    setResultsSummary(null);
    setJsonContent(null);
    setError(null);
    autoDetectRan.current = false;
    setSelectedView('overview');
    setProcessingSteps([
      { id: 'upload', label: 'Dataset uploaded', detail: 'CSV parsed and validated', status: 'pending', icon: '\ud83d\udcc4' },
      { id: 'graph', label: 'Building transaction graph', detail: 'Constructing node & edge network', status: 'pending', icon: '\ud83d\udd17' },
      { id: 'detect', label: 'Running fraud detection', detail: 'Cycle detection, smurfing & shell analysis', status: 'pending', icon: '\ud83d\udd0d' },
      { id: 'risk', label: 'Analyzing risk intelligence', detail: 'Scoring accounts & ranking threats', status: 'pending', icon: '\u26a1' },
      { id: 'results', label: 'Generating results', detail: 'Compiling detection summary', status: 'pending', icon: '\ud83d\udcca' },
    ]);
    navigateToPage('upload');
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
      return data;
    } catch (err) {
      console.error('Fetch graph data error:', err);
      setError(err.message);
      setGraphData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Detect fraud — standalone (used from manual button on results page)
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
      return results;
    } catch (err) {
      console.error('Fraud detection error:', err);
      setError(err.message);
      setFraudResults(null);
      return null;
    } finally {
      setDetectingFraud(false);
    }
  };

  // Detect fraud — pipeline version (no side-fetches, called from processing page)
  const detectFraudOnly = async () => {
    console.log('Starting fraud detection (pipeline)...');
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
      return results;
    } catch (err) {
      console.error('Fraud detection error:', err);
      setError(err.message);
      setFraudResults(null);
      return null;
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

  const fetchJsonResults = async () => {
    try {
      const response = await fetch('http://localhost:8000/download-results');
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const data = await response.json();
      setJsonContent(data);
      return data;
    } catch (err) {
      console.error('Fetch JSON error:', err);
      setError('Failed to fetch results');
      return null;
    }
  };

  const viewJson = async () => {
    if (!jsonContent) {
      await fetchJsonResults();
    }
    setShowJsonViewer(true);
  };

  const downloadResults = () => {
    if (!jsonContent) {
      fetchJsonResults().then((data) => {
        if (data) downloadJsonFile(data);
      });
    } else {
      downloadJsonFile(jsonContent);
    }
  };

  const downloadJsonFile = (data) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraud_detection_results.json';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyJsonToClipboard = () => {
    if (jsonContent) {
      navigator.clipboard.writeText(JSON.stringify(jsonContent, null, 2));
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

  // Show landing page first
  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // ── Sidebar nav items ──
  const sidebarItems = [
    { id: 'overview', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ), label: 'Overview' },
    { id: 'visualization', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/>
        <circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/>
        <line x1="7" y1="7" x2="10" y2="10"/><line x1="14" y1="10" x2="17" y2="7"/>
        <line x1="7" y1="17" x2="10" y2="14"/><line x1="14" y1="14" x2="17" y2="17"/>
      </svg>
    ), label: 'Graph View' },
    { id: 'table', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    ), label: 'Investigation', disabled: !riskIntelligence },
    { id: 'ranking', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
    ), label: 'Risk Rankings', disabled: !riskIntelligence },
    { id: 'monitoring', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ), label: 'Monitoring' },
  ];

  // ── UPLOAD PAGE ──
  const renderUploadPage = () => (
    <div className={`upload-page ${pageTransition}`}>
      <div className="upload-page-inner">
        <div className="upload-page-header">
          <div className="upload-page-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#uploadGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="uploadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4FF" />
                  <stop offset="100%" stopColor="#00FFD1" />
                </linearGradient>
              </defs>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2 className="upload-page-title">Upload Transaction Data</h2>
          <p className="upload-page-subtitle">
            Import your CSV file to build a transaction network graph and detect financial crime patterns
          </p>
        </div>
        <FileUpload 
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />
        <div className="upload-page-features">
          <div className="upload-feature">
            <span className="upload-feature-icon">🔄</span>
            <div>
              <strong>Cycle Detection</strong>
              <p>Identify circular money flows</p>
            </div>
          </div>
          <div className="upload-feature">
            <span className="upload-feature-icon">💸</span>
            <div>
              <strong>Smurfing Patterns</strong>
              <p>Detect structuring behavior</p>
            </div>
          </div>
          <div className="upload-feature">
            <span className="upload-feature-icon">🏢</span>
            <div>
              <strong>Shell Networks</strong>
              <p>Find layering chains</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── PROCESSING PAGE ──
  const renderProcessingPage = () => {
    const doneCount = processingSteps.filter(s => s.status === 'done').length;
    const progressPct = (doneCount / processingSteps.length) * 100;

    return (
      <div className={`processing-page ${pageTransition}`}>
        <div className="processing-inner">
          {/* Animated logo */}
          <div className="processing-logo">
            <div className="processing-rings">
              <div className="proc-ring proc-ring-1" />
              <div className="proc-ring proc-ring-2" />
              <div className="proc-ring proc-ring-3" />
            </div>
            <span className="processing-brand-icon">◈</span>
          </div>

          <h2 className="processing-title">Analyzing Your Data</h2>
          <p className="processing-subtitle">
            Graphora is processing {uploadStatus?.total_transactions?.toLocaleString() || ''} transactions
          </p>

          {/* Progress bar */}
          <div className="processing-progress">
            <div className="processing-progress-track">
              <div
                className="processing-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="processing-progress-label">{Math.round(progressPct)}%</span>
          </div>

          {/* Steps */}
          <div className="processing-steps">
            {processingSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`proc-step proc-step-${step.status}`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="proc-step-indicator">
                  {step.status === 'done' && (
                    <svg className="proc-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FFD1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {step.status === 'running' && <div className="proc-spinner" />}
                  {step.status === 'pending' && <div className="proc-dot" />}
                </div>
                <div className="proc-step-content">
                  <div className="proc-step-row">
                    <span className="proc-step-icon">{step.icon}</span>
                    <span className="proc-step-label">{step.label}</span>
                  </div>
                  <span className="proc-step-detail">{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── RESULTS PAGE ──
  const renderResultsPage = () => (
    <div className={`results-layout ${pageTransition}`}>
      {/* Sidebar */}
      <aside className="results-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand" onClick={() => setShowLanding(true)} title="Back to Home">
            <span className="sidebar-brand-icon">◈</span>
            <span className="sidebar-brand-text">Graphora</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${selectedView === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => !item.disabled && setSelectedView(item.id)}
              disabled={item.disabled}
              title={item.label}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
              {item.id === 'monitoring' && monitoringActive && (
                <span className="sidebar-live-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-action-btn new-analysis-btn" onClick={handleNewAnalysis} title="New Analysis">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>New Analysis</span>
          </button>
          <button className="sidebar-action-btn theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="results-main">
        {/* Top bar */}
        <header className="results-topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">
              {selectedView === 'overview' && 'Analysis Overview'}
              {selectedView === 'visualization' && 'Network Graph'}
              {selectedView === 'table' && 'Investigation Table'}
              {selectedView === 'ranking' && 'Risk Rankings'}
              {selectedView === 'monitoring' && 'Live Monitoring'}
            </h2>
            {uploadStatus && (
              <span className="topbar-badge">
                {uploadStatus.total_transactions?.toLocaleString()} transactions
              </span>
            )}
          </div>
          <div className="topbar-right">
            {fraudResults && (
              <div className="topbar-actions">
                <button onClick={viewJson} className="topbar-btn" title="View JSON">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  JSON
                </button>
                <button onClick={downloadResults} className="topbar-btn topbar-btn-primary" title="Download">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-btn">×</button>
          </div>
        )}

        {/* Content area */}
        <div className="results-content">
          {/* Loading state for fraud detection */}
          {detectingFraud && (
            <div className="detection-loading">
              <div className="detection-loader">
                <div className="loader-ring" />
                <div className="loader-ring ring-2" />
                <div className="loader-ring ring-3" />
                <svg className="loader-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h3 className="detection-loading-title">Analyzing Transaction Patterns</h3>
              <p className="detection-loading-sub">Running cycle detection, smurfing analysis & shell network identification...</p>
              <div className="detection-progress-bar">
                <div className="detection-progress-fill" />
              </div>
            </div>
          )}

          {/* OVERVIEW VIEW */}
          {selectedView === 'overview' && !detectingFraud && (
            <div className="overview-view">
              {/* Stats cards */}
              {uploadStatus && (
                <Dashboard summary={uploadStatus} graphSummary={graphData?.summary} />
              )}

              {/* Detection results summary */}
              {fraudResults && (
                <>
                  <ResultsSummary summary={resultsSummary} />
                  <FraudRingsTable rings={fraudResults.fraud_rings} />
                </>
              )}

              {/* If no fraud results yet and not detecting, show run button */}
              {!fraudResults && !detectingFraud && (
                <div className="action-panel">
                  <button 
                    onClick={detectFraud}
                    disabled={detectingFraud}
                    className="detect-fraud-btn"
                  >
                    🔍 Run Fraud Detection
                  </button>
                  <p className="action-hint">
                    Detect money muling rings, smurfing patterns, and suspicious activity
                  </p>
                </div>
              )}

              {/* Quick nav cards to other views */}
              {fraudResults && (
                <div className="quick-nav-grid">
                  <button className="quick-nav-card" onClick={() => setSelectedView('visualization')}>
                    <div className="qnav-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/>
                        <circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/>
                        <line x1="7" y1="7" x2="10" y2="10"/><line x1="14" y1="10" x2="17" y2="7"/>
                        <line x1="7" y1="17" x2="10" y2="14"/><line x1="14" y1="14" x2="17" y2="17"/>
                      </svg>
                    </div>
                    <div className="qnav-text">
                      <strong>Network Graph</strong>
                      <span>Interactive force-directed visualization</span>
                    </div>
                    <span className="qnav-arrow">→</span>
                  </button>
                  {riskIntelligence && (
                    <>
                      <button className="quick-nav-card" onClick={() => setSelectedView('table')}>
                        <div className="qnav-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                            <line x1="9" y1="3" x2="9" y2="21"/>
                          </svg>
                        </div>
                        <div className="qnav-text">
                          <strong>Investigation Table</strong>
                          <span>Detailed account-level analysis</span>
                        </div>
                        <span className="qnav-arrow">→</span>
                      </button>
                      <button className="quick-nav-card" onClick={() => setSelectedView('ranking')}>
                        <div className="qnav-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                          </svg>
                        </div>
                        <div className="qnav-text">
                          <strong>Risk Rankings</strong>
                          <span>Prioritized risk scores</span>
                        </div>
                        <span className="qnav-arrow">→</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GRAPH VIEW */}
          {selectedView === 'visualization' && !detectingFraud && (
            <div className="graph-view">
              {loading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading graph visualization...</p>
                </div>
              )}
              {graphData && !loading && (
                <GraphVisualization 
                  data={graphData} 
                  fraudResults={fraudResults} 
                  riskIntelligence={riskIntelligence}
                />
              )}
            </div>
          )}

          {/* TABLE VIEW */}
          {selectedView === 'table' && !detectingFraud && riskIntelligence && (
            <div className="table-view">
              <InvestigationTable 
                riskIntelligence={riskIntelligence} 
                onAccountSelect={(accountId) => {
                  setSelectedView('visualization');
                }}
              />
            </div>
          )}

          {/* RANKING VIEW */}
          {selectedView === 'ranking' && !detectingFraud && riskIntelligence && (
            <div className="ranking-view">
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

          {/* MONITORING VIEW */}
          {selectedView === 'monitoring' && !detectingFraud && (
            <div className="monitoring-view">
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

              {monitoringActive && alerts.length > 0 && (
                <AlertPanel
                  alerts={alerts}
                  onAlertClick={handleAlertClick}
                  onAcknowledge={acknowledgeAlert}
                  onClearAll={clearAllAlerts}
                  autoRefresh={monitoringActive}
                />
              )}

              {(!monitoringActive || alerts.length === 0) && (
                <div className="monitoring-empty">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="1.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <p>{monitoringActive ? 'Listening for alerts...' : 'Start monitoring to receive real-time alerts'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {currentPage === 'upload' && (
        <>
          <header className="app-header">
            <div className="header-brand" onClick={() => setShowLanding(true)} title="Back to Home" style={{ cursor: 'pointer' }}>
              <span className="brand-icon">◈</span>
              <h1>Graphora</h1>
            </div>
            <p className="subtitle">AI-Powered Graph-Based Transaction Analysis</p>
            <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </header>

          {error && (
            <div className="error-banner" style={{ margin: '1.5rem 2rem' }}>
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="close-btn">×</button>
            </div>
          )}

          {renderUploadPage()}
        </>
      )}

      {currentPage === 'processing' && renderProcessingPage()}

      {currentPage === 'results' && renderResultsPage()}

      {/* JSON Viewer Modal */}
      {showJsonViewer && jsonContent && (
        <div className="json-modal-overlay" onClick={() => setShowJsonViewer(false)}>
          <div className="json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="json-modal-header">
              <h3>📄 JSON Output</h3>
              <div className="json-modal-actions">
                <button onClick={copyJsonToClipboard} className="json-copy-btn" title="Copy to clipboard">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </button>
                <button onClick={downloadResults} className="json-download-btn" title="Download JSON">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </button>
                <button onClick={() => setShowJsonViewer(false)} className="json-close-btn" title="Close">
                  ✕
                </button>
              </div>
            </div>
            <div className="json-modal-body">
              <pre className="json-content">{JSON.stringify(jsonContent, null, 2)}</pre>
            </div>
            <div className="json-modal-footer">
              <span className="json-stats">
                {jsonContent.suspicious_accounts?.length || 0} suspicious accounts • 
                {jsonContent.fraud_rings?.length || 0} fraud rings • 
                {jsonContent.summary?.total_accounts_analyzed || 0} total analyzed
              </span>
            </div>
          </div>
        </div>
      )}

      <ChatBot 
        isOpen={chatOpen} 
        onToggle={() => setChatOpen(prev => !prev)} 
        theme={theme}
      />
    </div>
  );
}

export default App;
