import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './GraphVisualization.css';

// ════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL FINANCIAL NETWORK GRAPH VISUALIZATION
// Clean, analytical dashboard for fraud detection
// ════════════════════════════════════════════════════════════════════════════

// Color palette - professional dark theme
const COLORS = {
  bg: '#0F172A',
  nodeLow: '#3B82F6',      // Blue - normal/low risk
  nodeMedium: '#F59E0B',   // Orange - medium risk
  nodeHigh: '#EF4444',     // Red - high risk
  nodeStroke: '#1E293B',
  nodeStrokeHover: '#60A5FA',
  edgeDefault: '#94A3B8',  // Lighter gray for better visibility
  edgeSuspicious: '#DC2626',
  edgeHighlight: '#60A5FA',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  panelBg: '#1E293B',
  panelBorder: '#334155',
};

function GraphVisualization({ data, fraudResults, riskIntelligence }) {
  const graphRef = useRef();
  const containerRef = useRef();

  // State
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [hoverLink, setHoverLink] = useState(null);
  const [neighborDepth, setNeighborDepth] = useState(1);
  const [showLowWeight, setShowLowWeight] = useState(true);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [minAmount, setMinAmount] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 });

  // ── Derived data maps ─────────────────────────────────────────────────────
  const suspiciousMap = useMemo(() => {
    const map = new Map();
    fraudResults?.suspicious_accounts?.forEach(acc => {
      map.set(acc.account_id, {
        score: acc.suspicion_score,
        ringId: acc.ring_id,
        patterns: acc.detected_patterns || []
      });
    });
    return map;
  }, [fraudResults]);

  const riskMap = useMemo(() => {
    const map = new Map();
    riskIntelligence?.risk_scores?.forEach(acc => {
      map.set(acc.account_id, acc);
    });
    return map;
  }, [riskIntelligence]);

  // ── Window resize handling ────────────────────────────────────────────────
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(600, rect.width - 360), // Leave room for panel
          height: Math.max(500, window.innerHeight - 250)
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // ── Auto-fit on data load ─────────────────────────────────────────────────
  useEffect(() => {
    if (data?.nodes?.length > 0) {
      const timer = setTimeout(() => {
        try {
          graphRef.current?.zoomToFit(600, 60);
        } catch (e) { /* ignore */ }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [data]);

  // ── Configure D3 forces for proper spacing ────────────────────────────────
  useEffect(() => {
    if (!graphRef.current || !data?.nodes?.length) return;
    
    const fg = graphRef.current;
    
    // Charge repulsion: -550 to -700 for optimal spread
    fg.d3Force('charge')?.strength(-600);
    
    // Link distance: 130-180px
    fg.d3Force('link')?.distance(150);
    
    // Weaker center force
    fg.d3Force('center')?.strength(0.05);
    
    // Velocity and alpha decay for smooth settling
    fg.d3VelocityDecay?.(0.4);
    fg.d3AlphaDecay?.(0.02);
    
    // Reheat to apply forces
    fg.d3ReheatSimulation?.();
  }, [data]);

  // ── Empty states ──────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="gv-container gv-empty">
        <div className="gv-empty-icon">📊</div>
        <p>Upload a CSV file to visualize the transaction network</p>
      </div>
    );
  }

  if (!data.nodes?.length) {
    return (
      <div className="gv-container gv-empty">
        <div className="gv-empty-icon">⚠️</div>
        <p>No transaction data available</p>
      </div>
    );
  }

  // ── Calculate graph statistics ────────────────────────────────────────────
  const stats = useMemo(() => {
    const maxVolume = Math.max(...data.nodes.map(n => 
      (n.total_amount_sent || 0) + (n.total_amount_received || 0)
    ), 1);
    const maxDegree = Math.max(...data.nodes.map(n => 
      (n.in_degree || 0) + (n.out_degree || 0)
    ), 1);
    const maxEdgeAmount = Math.max(...data.edges.map(e => e.amount || 0), 1);
    return { maxVolume, maxDegree, maxEdgeAmount };
  }, [data]);

  // ── Build graph data ──────────────────────────────────────────────────────
  const graphData = useMemo(() => {
    // Filter nodes
    let filteredNodes = data.nodes;
    if (showOnlySuspicious) {
      filteredNodes = filteredNodes.filter(n => suspiciousMap.has(n.id));
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));

    // Process nodes
    const nodes = filteredNodes.map(node => {
      const susp = suspiciousMap.get(node.id);
      const risk = riskMap.get(node.id);
      const score = susp?.score || risk?.risk_score || 0;
      
      // Size: reduced variation for cleaner look
      const degree = (node.in_degree || 0) + (node.out_degree || 0);
      const size = 8 + Math.sqrt(degree) * 2;

      // Color based on risk level
      let color = COLORS.nodeLow;
      if (score >= 70) color = COLORS.nodeHigh;
      else if (score >= 40) color = COLORS.nodeMedium;

      return {
        ...node,
        size,
        color,
        score,
        isSuspicious: !!susp,
        ringId: susp?.ringId,
        patterns: susp?.patterns || [],
        riskLevel: risk?.risk_level || (score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW')
      };
    });

    // Filter and process edges
    let filteredEdges = data.edges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    
    if (!showLowWeight) {
      const threshold = stats.maxEdgeAmount * 0.1;
      filteredEdges = filteredEdges.filter(e => e.amount >= threshold);
    }
    
    if (minAmount > 0) {
      filteredEdges = filteredEdges.filter(e => e.amount >= minAmount);
    }

    const links = filteredEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const isSuspicious = sourceNode?.isSuspicious || targetNode?.isSuspicious;
      
      // Edge width: thin lines (0.5-2px)
      const width = 0.5 + (edge.amount / stats.maxEdgeAmount) * 1.5;

      return {
        source: edge.source,
        target: edge.target,
        amount: edge.amount,
        txCount: edge.transaction_count || 1,
        width,
        isSuspicious,
        color: isSuspicious ? COLORS.edgeSuspicious : COLORS.edgeDefault
      };
    });

    return { nodes, links };
  }, [data, suspiciousMap, riskMap, stats, showOnlySuspicious, showLowWeight, minAmount]);

  // ── Node click: isolate ego network ───────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    if (selectedNode?.id === node.id) {
      // Double-click behavior: clear selection
      setSelectedNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      graphRef.current?.zoomToFit(500, 60);
      return;
    }

    setSelectedNode(node);
    
    // Find neighbors
    const neighbors = new Set([node.id]);
    const linkedEdges = new Set();
    const hop1 = new Set();

    graphData.links.forEach(link => {
      const sid = link.source?.id || link.source;
      const tid = link.target?.id || link.target;
      if (sid === node.id) {
        hop1.add(tid);
        neighbors.add(tid);
        linkedEdges.add(link);
      }
      if (tid === node.id) {
        hop1.add(sid);
        neighbors.add(sid);
        linkedEdges.add(link);
      }
    });

    // 2-hop neighbors if enabled
    if (neighborDepth === 2) {
      graphData.links.forEach(link => {
        const sid = link.source?.id || link.source;
        const tid = link.target?.id || link.target;
        if (hop1.has(sid) || hop1.has(tid)) {
          neighbors.add(sid);
          neighbors.add(tid);
          linkedEdges.add(link);
        }
      });
    }

    setHighlightNodes(neighbors);
    setHighlightLinks(linkedEdges);

    // Zoom to node
    graphRef.current?.centerAt(node.x, node.y, 500);
    graphRef.current?.zoom(2.5, 500);
  }, [selectedNode, graphData, neighborDepth]);

  // ── Background click: reset ───────────────────────────────────────────────
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHoverNode(null);
    setHoverLink(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    graphRef.current?.zoomToFit(500, 60);
  }, []);

  // ── Node hover ────────────────────────────────────────────────────────────
  const handleNodeHover = useCallback((node) => {
    setHoverNode(node);
    if (node && !selectedNode) {
      // Highlight connected edges on hover
      const linked = new Set();
      graphData.links.forEach(link => {
        const sid = link.source?.id || link.source;
        const tid = link.target?.id || link.target;
        if (sid === node.id || tid === node.id) {
          linked.add(link);
        }
      });
      setHighlightLinks(linked);
    } else if (!selectedNode) {
      setHighlightLinks(new Set());
    }
  }, [graphData, selectedNode]);

  // ── Link hover ────────────────────────────────────────────────────────────
  const handleLinkHover = useCallback((link) => {
    setHoverLink(link);
  }, []);

  // ── Canvas: Draw nodes ────────────────────────────────────────────────────
  const drawNode = useCallback((node, ctx, globalScale) => {
    if (!node || !isFinite(node.x) || !isFinite(node.y)) return;

    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightNodes.has(node.id);
    const isHovered = hoverNode?.id === node.id;
    const isDimmed = highlightNodes.size > 0 && !isHighlighted;

    const r = node.size * (isHovered ? 1.15 : 1);
    const alpha = isDimmed ? 0.2 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Node fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Node stroke
    ctx.strokeStyle = isSelected || isHovered ? COLORS.nodeStrokeHover : COLORS.nodeStroke;
    ctx.lineWidth = (isSelected ? 3 : isHovered ? 2.5 : 1.5) / globalScale;
    ctx.stroke();

    // Label (only on hover/select or zoomed in)
    if ((isHovered || isSelected || globalScale > 1.5) && !isDimmed) {
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(node.id, node.x, node.y + r + 4);
    }

    ctx.restore();
  }, [selectedNode, highlightNodes, hoverNode]);

  // ── Canvas: Draw edges ────────────────────────────────────────────────────
  const drawLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    if (!start || !end || !isFinite(start.x) || !isFinite(end.x)) return;

    const isHighlighted = highlightLinks.has(link);
    const isHovered = hoverLink === link;
    const isDimmed = highlightLinks.size > 0 && !isHighlighted;

    const color = isHighlighted || isHovered ? COLORS.edgeHighlight : link.color;
    const width = (isHighlighted ? link.width * 1.5 : link.width) / globalScale;
    const alpha = isDimmed ? 0.05 : isHighlighted ? 0.85 : 0.35;

    // Calculate curve for parallel edges
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const curve = 0.15;
    const mx = (start.x + end.x) / 2 + (-dy / dist) * dist * curve * 0.1;
    const my = (start.y + end.y) / 2 + (dx / dist) * dist * curve * 0.1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';

    // Draw curved edge
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(mx, my, end.x, end.y);
    ctx.stroke();

    // Draw arrowhead
    const arrowLen = Math.max(4, 6 * link.width) / globalScale;
    const t = 0.75;
    const ax = (1-t)*(1-t)*start.x + 2*(1-t)*t*mx + t*t*end.x;
    const ay = (1-t)*(1-t)*start.y + 2*(1-t)*t*my + t*t*end.y;
    const tx = 2*(1-t)*(mx - start.x) + 2*t*(end.x - mx);
    const ty = 2*(1-t)*(my - start.y) + 2*t*(end.y - my);
    const angle = Math.atan2(ty, tx);

    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLen, -arrowLen * 0.4);
    ctx.lineTo(-arrowLen * 0.6, 0);
    ctx.lineTo(-arrowLen, arrowLen * 0.4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }, [highlightLinks, hoverLink]);

  // ── Render ────────────────────────────────────────────────────────────────
  const suspiciousCount = graphData.nodes.filter(n => n.isSuspicious).length;
  const totalVolume = graphData.links.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="gv-container" ref={containerRef}>
      
      {/* ── Top Controls ── */}
      <div className="gv-toolbar">
        <div className="gv-toolbar-left">
          <h2 className="gv-title">Transaction Network Analysis</h2>
          <div className="gv-stats-bar">
            <span>{graphData.nodes.length} nodes</span>
            <span>{graphData.links.length} edges</span>
            {suspiciousCount > 0 && (
              <span className="gv-stat-alert">{suspiciousCount} suspicious</span>
            )}
          </div>
        </div>
        <div className="gv-toolbar-right">
          <div className="gv-control-group">
            <label>Neighbor Depth</label>
            <div className="gv-btn-group">
              <button 
                className={`gv-btn ${neighborDepth === 1 ? 'active' : ''}`}
                onClick={() => setNeighborDepth(1)}>1-hop</button>
              <button 
                className={`gv-btn ${neighborDepth === 2 ? 'active' : ''}`}
                onClick={() => setNeighborDepth(2)}>2-hop</button>
            </div>
          </div>
          <div className="gv-control-group">
            <label>Filters</label>
            <div className="gv-btn-group">
              <button 
                className={`gv-btn ${!showLowWeight ? 'active' : ''}`}
                onClick={() => setShowLowWeight(v => !v)}>
                Hide Low Value
              </button>
              <button 
                className={`gv-btn ${showOnlySuspicious ? 'active' : ''}`}
                onClick={() => setShowOnlySuspicious(v => !v)}>
                Suspicious Only
              </button>
            </div>
          </div>
          <button className="gv-btn gv-btn-fit" onClick={() => graphRef.current?.zoomToFit(400, 50)}>
            Fit View
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="gv-main">
        
        {/* ── Graph Canvas ── */}
        <div className="gv-graph-area">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor={COLORS.bg}
            nodeId="id"
            nodeVal="size"
            nodeCanvasObject={drawNode}
            linkCanvasObject={drawLink}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onLinkHover={handleLinkHover}
            onBackgroundClick={handleBackgroundClick}
            cooldownTicks={300}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.3}
            d3AlphaMin={0.001}
            d3Force="charge"
            d3ForceStrength={-400}
            linkDistance={120}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            minZoom={0.3}
            maxZoom={8}
          />

          {/* ── Hover Tooltip ── */}
          {hoverNode && !selectedNode && (
            <div 
              className="gv-tooltip"
              style={{
                left: Math.min(dimensions.width - 220, Math.max(10, hoverNode.x + 15)),
                top: Math.max(10, hoverNode.y - 10)
              }}>
              <div className="gv-tt-header">
                <span className="gv-tt-id">{hoverNode.id}</span>
                {hoverNode.isSuspicious && (
                  <span className={`gv-tt-badge ${hoverNode.riskLevel.toLowerCase()}`}>
                    {hoverNode.riskLevel}
                  </span>
                )}
              </div>
              <div className="gv-tt-body">
                <div className="gv-tt-row">
                  <span>In-degree</span><span>{hoverNode.in_degree || 0}</span>
                </div>
                <div className="gv-tt-row">
                  <span>Out-degree</span><span>{hoverNode.out_degree || 0}</span>
                </div>
                <div className="gv-tt-row">
                  <span>Total Volume</span>
                  <span>${((hoverNode.total_amount_sent || 0) + (hoverNode.total_amount_received || 0)).toLocaleString()}</span>
                </div>
                {hoverNode.score > 0 && (
                  <div className="gv-tt-row">
                    <span>Risk Score</span>
                    <span className="gv-tt-score">{hoverNode.score.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Edge Tooltip ── */}
          {hoverLink && (
            <div className="gv-edge-tooltip">
              <div className="gv-ett-row">
                <span>From</span><span>{hoverLink.source?.id || hoverLink.source}</span>
              </div>
              <div className="gv-ett-row">
                <span>To</span><span>{hoverLink.target?.id || hoverLink.target}</span>
              </div>
              <div className="gv-ett-row">
                <span>Amount</span><span>${hoverLink.amount?.toLocaleString()}</span>
              </div>
              <div className="gv-ett-row">
                <span>Transactions</span><span>{hoverLink.txCount}</span>
              </div>
            </div>
          )}

          {/* ── Legend ── */}
          <div className="gv-legend">
            <div className="gv-legend-title">Risk Level</div>
            <div className="gv-legend-item">
              <span className="gv-legend-dot" style={{background: COLORS.nodeLow}}></span>
              <span>Low Risk</span>
            </div>
            <div className="gv-legend-item">
              <span className="gv-legend-dot" style={{background: COLORS.nodeMedium}}></span>
              <span>Medium Risk</span>
            </div>
            <div className="gv-legend-item">
              <span className="gv-legend-dot" style={{background: COLORS.nodeHigh}}></span>
              <span>High Risk</span>
            </div>
            <div className="gv-legend-sep"></div>
            <div className="gv-legend-item">
              <span className="gv-legend-line" style={{background: COLORS.edgeDefault}}></span>
              <span>Normal</span>
            </div>
            <div className="gv-legend-item">
              <span className="gv-legend-line" style={{background: COLORS.edgeSuspicious}}></span>
              <span>Suspicious</span>
            </div>
          </div>
        </div>

        {/* ── Side Panel ── */}
        <div className="gv-panel">
          {selectedNode ? (
            <>
              <div className="gv-panel-header">
                <h3>Account Details</h3>
                <button className="gv-panel-close" onClick={handleBackgroundClick}>×</button>
              </div>

              <div className="gv-panel-section">
                <div className="gv-account-id">{selectedNode.id}</div>
                <div className={`gv-risk-badge ${selectedNode.riskLevel.toLowerCase()}`}>
                  {selectedNode.riskLevel} RISK
                  {selectedNode.score > 0 && <span className="gv-risk-score">{selectedNode.score.toFixed(1)}</span>}
                </div>
              </div>

              <div className="gv-panel-section">
                <h4>Connections</h4>
                <div className="gv-panel-stats">
                  <div className="gv-panel-stat">
                    <span className="gv-panel-stat-value">{selectedNode.in_degree || 0}</span>
                    <span className="gv-panel-stat-label">Incoming</span>
                  </div>
                  <div className="gv-panel-stat">
                    <span className="gv-panel-stat-value">{selectedNode.out_degree || 0}</span>
                    <span className="gv-panel-stat-label">Outgoing</span>
                  </div>
                  <div className="gv-panel-stat">
                    <span className="gv-panel-stat-value">{selectedNode.total_transactions || 0}</span>
                    <span className="gv-panel-stat-label">Total Tx</span>
                  </div>
                </div>
              </div>

              <div className="gv-panel-section">
                <h4>Transaction Volume</h4>
                <div className="gv-panel-detail">
                  <span>Amount Sent</span>
                  <span>${(selectedNode.total_amount_sent || 0).toLocaleString()}</span>
                </div>
                <div className="gv-panel-detail">
                  <span>Amount Received</span>
                  <span>${(selectedNode.total_amount_received || 0).toLocaleString()}</span>
                </div>
                <div className="gv-panel-detail">
                  <span>Net Flow</span>
                  <span className={selectedNode.net_flow >= 0 ? 'positive' : 'negative'}>
                    ${(selectedNode.net_flow || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedNode.patterns?.length > 0 && (
                <div className="gv-panel-section">
                  <h4>Detected Patterns</h4>
                  <div className="gv-pattern-list">
                    {selectedNode.patterns.map((p, i) => (
                      <span key={i} className="gv-pattern-tag">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.ringId && (
                <div className="gv-panel-section">
                  <h4>Fraud Ring</h4>
                  <div className="gv-ring-badge">{selectedNode.ringId}</div>
                </div>
              )}

              <div className="gv-panel-hint">
                Click node again or background to deselect
              </div>
            </>
          ) : (
            <div className="gv-panel-empty">
              <div className="gv-panel-empty-icon">🔍</div>
              <h4>Network Inspector</h4>
              <p>Click any node to view account details and isolate its network neighborhood.</p>
              <div className="gv-panel-tips">
                <div className="gv-tip">• Scroll to zoom in/out</div>
                <div className="gv-tip">• Drag to pan the view</div>
                <div className="gv-tip">• Click + drag nodes to reposition</div>
                <div className="gv-tip">• Hover for quick info</div>
              </div>
            </div>
          )}

          {/* ── Summary Stats ── */}
          <div className="gv-panel-footer">
            <div className="gv-summary-stat">
              <span className="gv-summary-label">Total Volume</span>
              <span className="gv-summary-value">${totalVolume.toLocaleString()}</span>
            </div>
            {fraudResults?.fraud_rings?.length > 0 && (
              <div className="gv-summary-stat">
                <span className="gv-summary-label">Fraud Rings</span>
                <span className="gv-summary-value gv-alert">{fraudResults.fraud_rings.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="gv-footer">
        <span>Zoom: scroll • Pan: drag background • Select: click node • Reset: click background</span>
      </div>
    </div>
  );
}

export default GraphVisualization;
