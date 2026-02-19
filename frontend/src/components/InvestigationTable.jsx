import React, { useState, useMemo } from 'react';
import './InvestigationTable.css';

function InvestigationTable({ riskIntelligence, onAccountSelect }) {
  const [sortColumn, setSortColumn] = useState('risk_score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterLevel, setFilterLevel] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  if (!riskIntelligence || !riskIntelligence.risk_scores) {
    return <div className="investigation-table-placeholder">No risk intelligence data available</div>;
  }

  const { risk_scores } = riskIntelligence;

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = risk_scores;

    // Filter by risk level
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(acc => acc.risk_level === filterLevel);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(acc => 
        acc.account_id.toLowerCase().includes(query) ||
        acc.patterns.some(p => p.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      if (sortColumn === 'risk_score') {
        aVal = a.risk_score;
        bVal = b.risk_score;
      } else if (sortColumn === 'account_id') {
        aVal = a.account_id;
        bVal = b.account_id;
      } else if (sortColumn === 'risk_level') {
        const levelOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        aVal = levelOrder[a.risk_level] || 0;
        bVal = levelOrder[b.risk_level] || 0;
      } else if (sortColumn in a.risk_factors) {
        aVal = a.risk_factors[sortColumn];
        bVal = b.risk_factors[sortColumn];
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [risk_scores, sortColumn, sortDirection, filterLevel, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getRiskLevelColor = (level) => {
    switch(level) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const exportToCSV = () => {
    const headers = ['Account ID', 'Risk Score', 'Risk Level', 'Centrality', 'Velocity', 'Cycle Involvement', 'Ring Density', 'Volume Anomaly', 'Patterns'];
    const rows = filteredAndSortedData.map(acc => [
      acc.account_id,
      acc.risk_score.toFixed(2),
      acc.risk_level,
      acc.risk_factors.centrality.toFixed(2),
      acc.risk_factors.velocity.toFixed(2),
      acc.risk_factors.cycle_involvement.toFixed(2),
      acc.risk_factors.ring_density.toFixed(2),
      acc.risk_factors.volume_anomaly.toFixed(2),
      acc.patterns.join('; ')
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'risk_intelligence_report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="investigation-table-container">
      {/* Table Header with Controls */}
      <div className="table-controls-header">
        <div className="table-title">
          <span className="table-icon">📋</span>
          <h3>Investigation Table</h3>
          <span className="table-count">({filteredAndSortedData.length} accounts)</span>
        </div>
        
        <div className="table-actions">
          <button className="export-btn" onClick={exportToCSV}>
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="table-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text"
            placeholder="Search by Account ID or Pattern..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="level-filters">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <button
              key={level}
              className={`level-filter-btn ${filterLevel === level ? 'active' : ''}`}
              onClick={() => {
                setFilterLevel(level);
                setCurrentPage(1);
              }}
              style={{ 
                borderColor: level === 'ALL' ? '#58a6ff' : getRiskLevelColor(level),
                backgroundColor: filterLevel === level ? (level === 'ALL' ? 'rgba(88, 166, 255, 0.2)' : `${getRiskLevelColor(level)}33`) : 'transparent'
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="investigation-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('account_id')}>
                Account ID {getSortIcon('account_id')}
              </th>
              <th onClick={() => handleSort('risk_score')}>
                Risk Score {getSortIcon('risk_score')}
              </th>
              <th onClick={() => handleSort('risk_level')}>
                Level {getSortIcon('risk_level')}
              </th>
              <th onClick={() => handleSort('centrality')}>
                Centrality {getSortIcon('centrality')}
              </th>
              <th onClick={() => handleSort('velocity')}>
                Velocity {getSortIcon('velocity')}
              </th>
              <th onClick={() => handleSort('cycle_involvement')}>
                Cycles {getSortIcon('cycle_involvement')}
              </th>
              <th onClick={() => handleSort('ring_density')}>
                Ring Density {getSortIcon('ring_density')}
              </th>
              <th onClick={() => handleSort('volume_anomaly')}>
                Vol. Anomaly {getSortIcon('volume_anomaly')}
              </th>
              <th>Patterns</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(account => (
              <tr key={account.account_id} className="table-row">
                <td className="account-id-cell">
                  <span className="account-id-text">{account.account_id}</span>
                </td>
                <td className="risk-score-cell">
                  <div className="score-bar-cell">
                    <div 
                      className="score-bar-fill"
                      style={{ 
                        width: `${account.risk_score}%`,
                        backgroundColor: getRiskLevelColor(account.risk_level)
                      }}
                    />
                    <span className="score-text">{account.risk_score.toFixed(1)}</span>
                  </div>
                </td>
                <td className="risk-level-cell">
                  <span 
                    className="level-badge"
                    style={{ backgroundColor: getRiskLevelColor(account.risk_level) }}
                  >
                    {account.risk_level}
                  </span>
                </td>
                <td className="factor-cell">{account.risk_factors.centrality.toFixed(1)}</td>
                <td className="factor-cell">{account.risk_factors.velocity.toFixed(1)}</td>
                <td className="factor-cell">{account.risk_factors.cycle_involvement.toFixed(1)}</td>
                <td className="factor-cell">{account.risk_factors.ring_density.toFixed(1)}</td>
                <td className="factor-cell">{account.risk_factors.volume_anomaly.toFixed(1)}</td>
                <td className="patterns-cell">
                  <div className="patterns-inline">
                    {account.patterns.slice(0, 2).map(pattern => (
                      <span key={pattern} className="pattern-badge-small">{pattern}</span>
                    ))}
                    {account.patterns.length > 2 && (
                      <span className="pattern-more">+{account.patterns.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="action-cell">
                  <button
                    className="view-details-btn"
                    onClick={() => onAccountSelect && onAccountSelect(account.account_id)}
                    title="View Full Investigation"
                  >
                    📄
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
            <span className="items-range">
              ({(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length})
            </span>
          </div>
          
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedData.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>No accounts match your search criteria</p>
        </div>
      )}
    </div>
  );
}

export default InvestigationTable;
