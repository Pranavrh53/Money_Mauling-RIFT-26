import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './GraphVisualization.css';

function GraphVisualization({ data, fraudResults, riskIntelligence }) {
  const graphRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRing, setSelectedRing] = useState(null); // New: for fraud ring investigation
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [neighborDepth, setNeighborDepth] = useState(1); // 1-hop or 2-hop neighbors
  const [clusterByRing, setClusterByRing] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [showFlowAnimation, setShowFlowAnimation] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Memoize suspicious accounts map for performance
  const suspiciousAccountsMap = useMemo(() => {
    if (!fraudResults || !fraudResults.suspicious_accounts) return new Map();

    const map = new Map();
    fraudResults.suspicious_accounts.forEach(acc => {
      map.set(acc.account_id, {
        suspicion_score: acc.suspicion_score,
        ring_id: acc.ring_id,
        detected_patterns: acc.detected_patterns
      });
    });
    return map;
  }, [fraudResults]);

  // Memoize risk intelligence map for enhanced scoring
  const riskIntelligenceMap = useMemo(() => {
    if (!riskIntelligence || !riskIntelligence.risk_scores) return new Map();

    const map = new Map();
    riskIntelligence.risk_scores.forEach(acc => {
      map.set(acc.account_id, acc);
    });
    return map;
  }, [riskIntelligence]);

  // Assign unique colors to fraud rings
  const ringColors = useMemo(() => {
    if (!fraudResults || !fraudResults.fraud_rings) return {};

    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // amber
      '#84cc16', // lime
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#f43f5e', // rose
    ];

    const ringColorMap = {};
    fraudResults.fraud_rings.forEach((ring, idx) => {
      ringColorMap[ring.ring_id] = colors[idx % colors.length];
    });
    return ringColorMap;
  }, [fraudResults]);

  // ─── ADAPTIVE LAYOUT ANALYSIS ──────────────────────────────────────────────
  //
  // Classifies the graph into one of three layout modes:
  //   ISOLATED_RINGS             – 1 ring, few cross-ring edges
  //   MULTIPLE_DISCONNECTED_RINGS – many rings, rings not bridged to each other
  //   INTERCONNECTED_MIXED       – rings share edges or touch legitimate accounts
  //
  const layoutAnalysis = useMemo(() => {
    const rings = fraudResults?.fraud_rings ?? [];
    const ringCount = rings.length;
    const suspiciousCount = fraudResults?.suspicious_accounts?.length ?? 0;

    if (ringCount === 0 || !data?.edges) {
      return { mode: 'INTERCONNECTED_MIXED', ringCount: 0, suspiciousCount };
    }

    // Build a quick lookup: accountId → ringIndex
    const accountRing = new Map();
    rings.forEach((ring, idx) => {
      ring.member_accounts.forEach(acc => accountRing.set(acc, idx));
    });

    let crossRingEdges = 0;
    let ringToLegitEdges = 0;

    data.edges.forEach(edge => {
      const sr = accountRing.get(edge.source) ?? -1;
      const tr = accountRing.get(edge.target) ?? -1;
      if (sr !== -1 && tr !== -1 && sr !== tr) crossRingEdges++;
      else if ((sr !== -1) !== (tr !== -1)) ringToLegitEdges++;
    });

    let mode;
    if (ringCount === 1 && crossRingEdges === 0 && ringToLegitEdges < 4) {
      mode = 'ISOLATED_RINGS';
    } else if (crossRingEdges === 0 && ringToLegitEdges < 6) {
      mode = 'MULTIPLE_DISCONNECTED_RINGS';
    } else {
      mode = 'INTERCONNECTED_MIXED';
    }

    console.log(`[AdaptiveLayout] mode=${mode} rings=${ringCount} crossRing=${crossRingEdges} legitEdges=${ringToLegitEdges} suspicious=${suspiciousCount}`);
    return { mode, ringCount, suspiciousCount, crossRingEdges, ringToLegitEdges };
  }, [fraudResults, data]);

  // Physics parameters per layout mode
  const physicsSettings = useMemo(() => {
    switch (layoutAnalysis.mode) {
      case 'ISOLATED_RINGS':
        return { repulsion: -600, linkDistance: 70, collision: 14, alphaDecay: 0.012, velocityDecay: 0.3, warmup: 100, cooldown: 250 };
      case 'MULTIPLE_DISCONNECTED_RINGS':
        return { repulsion: -800, linkDistance: 90, collision: 18, alphaDecay: 0.009, velocityDecay: 0.25, warmup: 130, cooldown: 300 };
      case 'INTERCONNECTED_MIXED':
      default:
        return { repulsion: -1100, linkDistance: 130, collision: 26, alphaDecay: 0.007, velocityDecay: 0.22, warmup: 180, cooldown: 350 };
    }
  }, [layoutAnalysis.mode]);

  // Animation loop for flow effects
  useEffect(() => {
    if (!showFlowAnimation) return;

    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, [showFlowAnimation]);

  // Reheat simulation and refit whenever layout mode or data changes
  useEffect(() => {
    if (!graphRef.current) return;
    try {
      graphRef.current.d3ReheatSimulation();
      setTimeout(() => {
        if (graphRef.current?.zoomToFit) graphRef.current.zoomToFit(800, 60);
      }, (physicsSettings.warmup / (physicsSettings.alphaDecay * 60)) * 16 + 600);
    } catch (err) {
      console.warn('[AdaptiveLayout] reheat failed:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutAnalysis.mode, data]);

  useEffect(() => {
    console.log('GraphVisualization received data:', data);

    // Center graph on load with smooth animation
    if (data && data.nodes && data.nodes.length > 0) {
      setTimeout(() => {
        if (graphRef.current && graphRef.current.zoomToFit) {
          try {
            graphRef.current.zoomToFit(600, 80);
          } catch (err) {
            console.warn('Failed to zoom to fit:', err);
          }
        }
      }, 1500);
    }
  }, [data]);

  if (!data) {
    console.log('No data provided to GraphVisualization');
    return (
      <div className="graph-container">
        <div className="no-data">
          <p>⏳ Waiting for data... Please upload a CSV file first.</p>
        </div>
      </div>
    );
  }

  if (!data.nodes || data.nodes.length === 0) {
    console.log('Data exists but no nodes found:', data);
    return (
      <div className="graph-container">
        <div className="no-data">
          <p>❌ No transaction data to visualize</p>
        </div>
      </div>
    );
  }

  console.log(`Rendering graph with ${data.nodes.length} nodes and ${data.edges.length} edges`);

  // NODE SIZES — shrink proportionally when many suspicious nodes to avoid clutter
  const maxTransactions = Math.max(...data.nodes.map(n => n.total_transactions), 1);
  const minSize = 7;
  const maxSize = layoutAnalysis.suspiciousCount > 10 ? 20 : 28;

  // Format graph data with fraud detection integration
  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map(node => {
        const suspiciousData = suspiciousAccountsMap.get(node.id);
        const isSuspicious = !!suspiciousData;
        const ringId = suspiciousData?.ring_id;
        const suspicionScore = suspiciousData?.suspicion_score || 0;

        // Node size based on transaction volume
        const sizeRatio = node.total_transactions / maxTransactions;
        const nodeSize = minSize + (sizeRatio * (maxSize - minSize));

        // Node color: suspicious = red/orange gradient, normal = blue
        let nodeColor;
        if (heatmapMode && isSuspicious) {
          // Heatmap mode: pure gradient based on suspicion score
          const intensity = Math.min(suspicionScore / 100, 1);
          const hue = (1 - intensity) * 60; // 60 = yellow, 0 = red
          nodeColor = `hsl(${hue}, 100%, 50%)`;
        } else if (isSuspicious) {
          // Normal mode: orange to red gradient
          const intensity = Math.min(suspicionScore / 100, 1);
          const red = Math.floor(239 + (220 - 239) * intensity);
          const green = Math.floor(68 + (38 - 68) * intensity);
          const blue = Math.floor(68 + (38 - 68) * intensity);
          nodeColor = `rgb(${red}, ${green}, ${blue})`;
        } else {
          nodeColor = '#58a6ff'; // Soft blue for normal
        }

        return {
          ...node,
          size: nodeSize,
          color: nodeColor,
          isSuspicious,
          ringId,
          ringColor: ringId ? ringColors[ringId] : null,
          suspicionScore,
          detectedPatterns: suspiciousData?.detected_patterns || []
        };
      }),
      links: data.edges.map(edge => {
        // Check if both source and target are in same ring
        const sourceSusp = suspiciousAccountsMap.get(edge.source);
        const targetSusp = suspiciousAccountsMap.get(edge.target);
        const sameRing = sourceSusp?.ring_id && targetSusp?.ring_id &&
          sourceSusp.ring_id === targetSusp.ring_id;

        return {
          source: edge.source,
          target: edge.target,
          value: edge.amount,
          label: edge.transaction_count,
          sameRing,
          ringColor: sameRing ? ringColors[sourceSusp.ring_id] : null
        };
      }),
    };
  }, [data, suspiciousAccountsMap, ringColors, maxTransactions, heatmapMode]);

  console.log('Formatted graph data:', {
    nodesCount: graphData.nodes.length,
    linksCount: graphData.links.length,
    suspiciousCount: graphData.nodes.filter(n => n.isSuspicious).length
  });

  // Apply clustering forces when cluster mode is enabled
  useEffect(() => {
    if (!graphRef.current || !graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return;
    }

    console.log('Cluster mode changed:', clusterByRing);

    if (clusterByRing && fraudResults && fraudResults.fraud_rings && fraudResults.fraud_rings.length > 0) {
      // Create ring-based attraction links
      const ringLinks = [];
      const nodesByRing = {};

      // Group nodes by ring
      graphData.nodes.forEach(node => {
        if (node.ringId) {
          if (!nodesByRing[node.ringId]) {
            nodesByRing[node.ringId] = [];
          }
          nodesByRing[node.ringId].push(node);
        }
      });

      // Create attractive links between nodes in same ring
      // Only create links if we have nodes grouped by ring
      if (Object.keys(nodesByRing).length > 0) {
        Object.values(nodesByRing).forEach(ringNodes => {
          for (let i = 0; i < ringNodes.length; i++) {
            for (let j = i + 1; j < ringNodes.length; j++) {
              ringLinks.push({
                source: ringNodes[i].id,
                target: ringNodes[j].id,
                strength: 0.3
              });
            }
          }
        });
      }

      console.log('Created ring links for clustering:', ringLinks.length);

      // Apply custom force for clustering only if we have ring links
      if (ringLinks.length > 0) {
        try {
          const forceLink = graphRef.current.d3Force('link');
          if (forceLink) {
            // Don't add ring links to the actual graph data, just use them for force simulation
            // This prevents "node not found" errors
            graphRef.current.d3ReheatSimulation();
          }
        } catch (err) {
          console.warn('Failed to apply clustering forces:', err);
        }
      }
    } else {
      // Reset to normal simulation
      try {
        if (graphRef.current.d3ReheatSimulation) {
          graphRef.current.d3ReheatSimulation();
        }
      } catch (err) {
        console.warn('Failed to reset clustering:', err);
      }
    }
  }, [clusterByRing, fraudResults, graphData]);

  // Force canvas redraw when heatmap or animation modes change
  useEffect(() => {
    if (graphRef.current && graphRef.current.zoom) {
      try {
        // Trigger a redraw by nudging the camera slightly
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom);
      } catch (err) {
        console.warn('Failed to redraw canvas:', err);
      }
    }
  }, [heatmapMode, showFlowAnimation]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setHoverNode(null); // Clear hover tooltip when selecting a node

    // Zoom in and center on the clicked node
    if (graphRef.current) {
      const distance = 200;
      graphRef.current.centerAt(node.x, node.y, 1000); // Center on node with 1s animation
      graphRef.current.zoom(3, 1000); // Zoom to 3x with 1s animation
    }

    // Highlight connected nodes and links with depth support
    const neighbors = new Set();
    const links = new Set();
    const depth1 = new Set();
    const depth2 = new Set();

    // Find 1-hop neighbors
    graphData.links.forEach(link => {
      if (link.source.id === node.id || link.source === node.id) {
        const targetId = link.target.id || link.target;
        depth1.add(targetId);
        links.add(link);
      }
      if (link.target.id === node.id || link.target === node.id) {
        const sourceId = link.source.id || link.source;
        depth1.add(sourceId);
        links.add(link);
      }
    });

    // Find 2-hop neighbors if enabled
    if (neighborDepth === 2) {
      depth1.forEach(nodeId => {
        graphData.links.forEach(link => {
          if (link.source.id === nodeId || link.source === nodeId) {
            const targetId = link.target.id || link.target;
            if (targetId !== node.id) {
              depth2.add(targetId);
            }
          }
          if (link.target.id === nodeId || link.target === nodeId) {
            const sourceId = link.source.id || link.source;
            if (sourceId !== node.id) {
              depth2.add(sourceId);
            }
          }
        });
      });
    }

    // Combine all neighbors
    neighbors.add(node.id);
    depth1.forEach(id => neighbors.add(id));
    depth2.forEach(id => neighbors.add(id));

    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  };

  const handleNodeHover = (node) => {
    setHoverNode(node);
  };

  // Calculate smart tooltip position that stays within viewport
  const getTooltipPosition = (node) => {
    if (!node) return { left: 0, top: 0, transform: 'translate(-50%, -100%)' };

    // Get actual canvas dimensions from the graph ref
    let graphWidth = 800;  // fallback
    let graphHeight = 900; // fallback

    if (graphRef.current) {
      try {
        const canvas = graphRef.current.renderer().domElement;
        if (canvas) {
          graphWidth = canvas.width;
          graphHeight = canvas.height;
        }
      } catch (err) {
        // Use fallback dimensions
      }
    }

    const tooltipWidth = 300;  // Approximate tooltip width
    const tooltipHeight = 180; // Approximate tooltip height
    const padding = 30;        // Padding from edges
    const offsetY = 60;        // Distance from node

    // Start with centered position above the node
    let left = node.x;
    let top = node.y - offsetY;
    let transform = 'translate(-50%, -100%)';

    // Adjust horizontal position if going off edges
    if (node.x + tooltipWidth / 2 > graphWidth - padding) {
      // Too far right - align to right edge of tooltip
      transform = 'translate(-100%, -100%)';
      left = node.x - 15;
    } else if (node.x - tooltipWidth / 2 < padding) {
      // Too far left - align to left edge of tooltip
      transform = 'translate(0%, -100%)';
      left = node.x + 15;
    }

    // Adjust vertical position if going off edges
    if (node.y - tooltipHeight - offsetY < padding) {
      // Too close to top - show below node instead
      top = node.y + offsetY;
      transform = transform.replace('-100%', '0%');
    } else if (node.y + tooltipHeight > graphHeight - padding) {
      // Too close to bottom - force above
      top = node.y - offsetY;
      transform = transform.replace('0%', '-100%');
    }

    return { left, top, transform };
  };

  const handleBackgroundClick = () => {
    setSelectedNode(null);
    setSelectedRing(null); // Also clear ring selection
    setHoverNode(null); // Clear hover tooltip as well
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());

    // Zoom out and fit all nodes when deselecting
    if (graphRef.current) {
      graphRef.current.zoomToFit(1000, 80); // Fit all nodes with 1s animation
    }
  };

  // Handle fraud ring selection
  const handleRingSelect = (ring) => {
    setSelectedRing(ring);
    setSelectedNode(null); // Clear node selection when selecting ring
    setHoverNode(null);

    // Highlight all nodes in the ring
    const ringNodes = new Set(ring.member_accounts);
    setHighlightNodes(ringNodes);

    // Highlight all edges between ring members
    const ringLinks = new Set();
    graphData.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      if (ringNodes.has(sourceId) && ringNodes.has(targetId)) {
        ringLinks.add(link);
      }
    });
    setHighlightLinks(ringLinks);

    // Zoom to fit ring nodes
    if (graphRef.current && graphData) {
      setTimeout(() => {
        const ringNodeObjects = graphData.nodes.filter(n => ringNodes.has(n.id));
        if (ringNodeObjects.length > 0) {
          // Calculate center of ring nodes
          const centerX = ringNodeObjects.reduce((sum, n) => sum + (n.x || 0), 0) / ringNodeObjects.length;
          const centerY = ringNodeObjects.reduce((sum, n) => sum + (n.y || 0), 0) / ringNodeObjects.length;
          graphRef.current.centerAt(centerX, centerY, 1000);
          graphRef.current.zoom(2.5, 1000);
        }
      }, 100);
    }
  };

  // Helper function to convert any color format to rgba
  const colorToRGBA = (color, alpha) => {
    // If it's already rgb/rgba, convert it
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`).replace('rgba', 'rgba').replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }
    // If it's HSL, convert to rgba (approximate method)
    if (color.startsWith('hsl')) {
      // For HSL, we'll use a canvas context to convert
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      const rgbColor = ctx.fillStyle; // Browser converts to rgb
      return rgbColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    // If it's hex, convert to rgba
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  };

  const nodeCanvasObject = (node, ctx, globalScale) => {
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' ||
      !isFinite(node.x) || !isFinite(node.y)) return;

    const isHighlighted = highlightNodes.has(node.id);
    const isDimmed = highlightNodes.size > 0 && !isHighlighted;
    const isHovered = hoverNode && hoverNode.id === node.id;
    const nodeSize = isHovered ? node.size * 1.2 : node.size;

    // ── Node circle ──────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    if (isDimmed) {
      ctx.fillStyle = 'rgba(120,130,150,0.18)';
    } else {
      ctx.fillStyle = node.color;
    }
    ctx.fill();

    // Border: ring members → ring colour; highlighted → white; else thin white
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    if (!isDimmed && node.ringId && node.ringColor) {
      ctx.strokeStyle = node.ringColor;
      ctx.lineWidth = 2 / globalScale;
    } else if (isHighlighted && !isDimmed) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2 / globalScale;
    } else {
      ctx.strokeStyle = isDimmed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.8 / globalScale;
    }
    ctx.stroke();

    // ── Label ────────────────────────────────────────────────
    const fontSize = Math.min(Math.max(10 / globalScale, 1.5), 11);
    const label = node.id;
    const labelY = node.y + nodeSize + 2 / globalScale;

    ctx.font = `500 ${fontSize}px 'Inter','Segoe UI',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (!isDimmed) {
      // Dark pill behind text for contrast
      const tw = ctx.measureText(label).width;
      const ph = 2 / globalScale;
      const pv = 1 / globalScale;
      ctx.fillStyle = 'rgba(8,10,16,0.82)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(node.x - tw / 2 - ph, labelY - pv, tw + ph * 2, fontSize + pv * 2, 2 / globalScale);
      } else {
        ctx.rect(node.x - tw / 2 - ph, labelY - pv, tw + ph * 2, fontSize + pv * 2);
      }
      ctx.fill();
      ctx.fillStyle = isHighlighted || isHovered ? '#ffffff' : '#d0d7de';
    } else {
      ctx.fillStyle = 'rgba(180,190,200,0.22)';
    }
    ctx.fillText(label, node.x, labelY);
  };

  const linkCanvasObject = (link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    if (!start || !end ||
      typeof start.x !== 'number' || typeof start.y !== 'number' ||
      typeof end.x !== 'number' || typeof end.y !== 'number' ||
      !isFinite(start.x) || !isFinite(start.y) ||
      !isFinite(end.x) || !isFinite(end.y)) return;

    const isHighlighted = highlightLinks.has(link);
    const isDimmed = highlightLinks.size > 0 && !isHighlighted;
    const isRingEdge = link.sameRing && link.ringColor;

    // ── Choose style ─────────────────────────────────────────
    let color, lineWidth, alpha;
    if (isDimmed) { color = '#6e7681'; lineWidth = 0.8; alpha = 0.15; }
    else if (isRingEdge) { color = link.ringColor; lineWidth = 2.5; alpha = 0.9; }
    else if (isHighlighted) { color = '#58a6ff'; lineWidth = 2; alpha = 0.9; }
    else { color = '#6e7681'; lineWidth = 1; alpha = 0.45; }

    // ── Straight line ─────────────────────────────────────────
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    // Stop line at node perimeter so arrow tip is visible
    const endNodeSize = end.size || 6;
    const ratio = (dist - endNodeSize - 1) / dist;
    const ex = start.x + dx * ratio;
    const ey = start.y + dy * ratio;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.stroke();

    // ── Arrowhead ─────────────────────────────────────────────
    if (!isDimmed) {
      const angle = Math.atan2(dy, dx);
      const arrowLen = Math.min(7 / globalScale, 7);
      const arrowWid = arrowLen * 0.45;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-arrowLen, -arrowWid);
      ctx.lineTo(0, 0);
      ctx.lineTo(-arrowLen, arrowWid);
      ctx.closePath();
      ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
      ctx.restore();
    }
  };

  // Calculate detailed ring metrics for investigation
  const ringMetrics = useMemo(() => {
    if (!fraudResults || !fraudResults.fraud_rings || !data || !data.edges) {
      return new Map();
    }

    const metrics = new Map();

    fraudResults.fraud_rings.forEach(ring => {
      const members = new Set(ring.member_accounts);

      // Find all transactions involving ring members
      const ringTransactions = data.edges.filter(edge =>
        members.has(edge.source) && members.has(edge.target)
      );

      // Calculate total transaction volume
      const totalVolume = ringTransactions.reduce((sum, edge) => sum + edge.amount, 0);
      const transactionCount = ringTransactions.length;

      // Calculate time span if timestamps are available
      let timeSpan = null;
      let earliestDate = null;
      let latestDate = null;

      if (ringTransactions.length > 0 && ringTransactions[0].timestamp) {
        const timestamps = ringTransactions.map(t => new Date(t.timestamp).getTime());
        const earliest = Math.min(...timestamps);
        const latest = Math.max(...timestamps);
        earliestDate = new Date(earliest);
        latestDate = new Date(latest);

        // Calculate time span in days
        const spanMs = latest - earliest;
        const spanDays = Math.floor(spanMs / (1000 * 60 * 60 * 24));
        const spanHours = Math.floor((spanMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (spanDays > 0) {
          timeSpan = `${spanDays} day${spanDays > 1 ? 's' : ''}${spanHours > 0 ? ` ${spanHours}h` : ''}`;
        } else if (spanHours > 0) {
          const spanMinutes = Math.floor((spanMs % (1000 * 60 * 60)) / (1000 * 60));
          timeSpan = `${spanHours} hour${spanHours > 1 ? 's' : ''}${spanMinutes > 0 ? ` ${spanMinutes}m` : ''}`;
        } else {
          timeSpan = 'Less than 1 hour';
        }
      }

      // Pattern explanation based on pattern type
      const patternExplanations = {
        'cycle': `This ring exhibits circular fund routing behavior, where money flows in a loop through ${ring.member_count} accounts. This is a classic money laundering technique used to obscure the origin of funds through layering.`,
        'fan_in': `This ring shows smurfing collection pattern with multiple sender accounts consolidating funds into a central collector account. This is commonly used to aggregate structuring deposits below reporting thresholds.`,
        'fan_out': `This ring demonstrates smurfing distribution pattern where a central account disperses funds to ${ring.member_count - 1} receiver accounts. This technique is used to break large sums into smaller amounts to evade detection.`,
        'shell_chain': `This ring reveals a layered shell network with ${ring.member_count} accounts forming a chain. Each hop adds complexity to make tracking difficult, typical of sophisticated money laundering operations.`
      };

      metrics.set(ring.ring_id, {
        totalVolume,
        transactionCount,
        timeSpan,
        earliestDate,
        latestDate,
        explanation: patternExplanations[ring.pattern_type] || 'Suspicious coordinated activity detected across multiple accounts.'
      });
    });

    return metrics;
  }, [fraudResults, data]);

  return (
    <div className="graph-section">
      <div className="graph-header-modern">
        <div className="header-left">
          <h2>🕸️ Transaction Network Intelligence</h2>
          <div className="graph-subtitle-row">
            <p className="graph-subtitle">Interactive Financial Crime Investigation Dashboard</p>
            {fraudResults && (
              <span className={`layout-mode-badge layout-mode-${layoutAnalysis.mode.toLowerCase().replace(/_/g, '-')}`}>
                {{
                  'ISOLATED_RINGS': '◉ Isolated Rings',
                  'MULTIPLE_DISCONNECTED_RINGS': '◉ Multiple Rings',
                  'INTERCONNECTED_MIXED': '◉ Interconnected',
                }[layoutAnalysis.mode]}
              </span>
            )}
          </div>
        </div>
        <div className="graph-controls-top">
          <button
            className={`depth-toggle ${neighborDepth === 1 ? 'active' : ''}`}
            onClick={() => {
              console.log('Setting neighbor depth to 1');
              setNeighborDepth(1);
            }}
            title="Show 1-hop neighbors"
          >
            1-Hop
          </button>
          <button
            className={`depth-toggle ${neighborDepth === 2 ? 'active' : ''}`}
            onClick={() => {
              console.log('Setting neighbor depth to 2');
              setNeighborDepth(2);
            }}
            title="Show 2-hop neighbors"
          >
            2-Hop
          </button>
          <button
            className={`depth-toggle ${clusterByRing ? 'active' : ''}`}
            onClick={() => {
              console.log('Toggling cluster mode:', !clusterByRing);
              setClusterByRing(!clusterByRing);
            }}
            title="Group nodes by fraud ring"
          >
            🔗 Cluster
          </button>
          <button
            className={`depth-toggle ${heatmapMode ? 'active' : ''}`}
            onClick={() => {
              console.log('Toggling heatmap mode:', !heatmapMode);
              setHeatmapMode(!heatmapMode);
            }}
            title="Toggle suspicion score heatmap"
          >
            🔥 Heatmap
          </button>
          <button
            className={`depth-toggle ${showFlowAnimation ? 'active' : ''}`}
            onClick={() => setShowFlowAnimation(!showFlowAnimation)}
            title="Toggle edge flow animation"
          >
            ⚡ Flow
          </button>
          <button
            className="zoom-fit-btn"
            onClick={() => graphRef.current?.zoomToFit(400)}
            title="Fit graph to view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Fit View
          </button>
        </div>
      </div>

      <div className="graph-legend-modern">
        <div className="legend-section">
          <span className="legend-title">Node Types:</span>
          <div className="legend-items">
            <div className="legend-item-modern">
              <span className="legend-dot-modern normal"></span>
              <span>Normal Account</span>
            </div>
            <div className="legend-item-modern">
              <span className="legend-dot-modern suspicious"></span>
              <span>Suspicious Account</span>
            </div>
            <div className="legend-item-modern">
              <span className="legend-dot-modern ring"></span>
              <span>Fraud Ring Member</span>
            </div>
          </div>
        </div>
        <div className="legend-section">
          <span className="legend-title">Edges:</span>
          <div className="legend-items">
            <div className="legend-item-modern">
              <span className="legend-line-modern normal"></span>
              <span>Transaction</span>
            </div>
            <div className="legend-item-modern">
              <span className="legend-line-modern ring"></span>
              <span>Ring Transaction</span>
            </div>
          </div>
        </div>
        {fraudResults && fraudResults.fraud_rings && fraudResults.fraud_rings.length > 0 && (
          <div className="legend-section fraud-rings-legend">
            <span className="legend-title">🔍 Fraud Rings (Click to Investigate):</span>
            <div className="rings-legend-grid">
              {fraudResults.fraud_rings.slice(0, 5).map(ring => (
                <div
                  key={ring.ring_id}
                  className={`ring-legend-item ${selectedRing?.ring_id === ring.ring_id ? 'active' : ''}`}
                  onClick={() => handleRingSelect(ring)}
                  title={`${ring.description} - Click to investigate`}
                >
                  <span
                    className="ring-color-dot"
                    style={{ backgroundColor: ringColors[ring.ring_id] }}
                  ></span>
                  <span className="ring-legend-id">{ring.ring_id}</span>
                  <span className="ring-legend-type">{ring.pattern_type.replace('_', ' ')}</span>
                  <span className="ring-legend-score">{ring.risk_score.toFixed(0)}</span>
                </div>
              ))}
              {fraudResults.fraud_rings.length > 5 && (
                <div className="ring-legend-more">
                  +{fraudResults.fraud_rings.length - 5} more rings
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="graph-layout">
        <div className="graph-main">
          <div className="graph-wrapper-modern">
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={window.innerWidth * 0.65}
              height={900}
              nodeId="id"
              nodeVal="size"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node, color, ctx) => {
                if (
                  !node ||
                  typeof node.x !== 'number' || !isFinite(node.x) ||
                  typeof node.y !== 'number' || !isFinite(node.y)
                ) return;
                // Generous hit-zone: drawn radius + comfortable click tolerance
                const r = Math.max(node.size || 8, 8) * 1.4 + 8;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fill();
              }}
              linkCanvasObject={linkCanvasObject}
              linkDirectionalArrowLength={0}
              linkWidth={1.5}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onBackgroundClick={handleBackgroundClick}
              cooldownTicks={physicsSettings.cooldown}
              d3AlphaDecay={physicsSettings.alphaDecay}
              d3VelocityDecay={physicsSettings.velocityDecay}
              d3Force="charge"
              d3ForceStrength={physicsSettings.repulsion}
              linkDistance={physicsSettings.linkDistance}
              d3ForceCollision={node => node.size + physicsSettings.collision}
              backgroundColor="#0a0e14"
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              warmupTicks={physicsSettings.warmup}
              onEngineStop={() => {
                console.log(`[AdaptiveLayout] layout stabilised (mode=${layoutAnalysis.mode})`);
                if (graphRef.current?.zoomToFit) graphRef.current.zoomToFit(600, 60);
              }}
            />

            {/* Floating Tooltip for Hover */}
            {hoverNode && !selectedNode && (() => {
              const tooltipPos = getTooltipPosition(hoverNode);
              return (
                <div
                  className="node-tooltip-float"
                  style={{
                    position: 'absolute',
                    left: `${tooltipPos.left}px`,
                    top: `${tooltipPos.top}px`,
                    pointerEvents: 'none',
                    transform: tooltipPos.transform,
                    zIndex: 1000
                  }}
                >
                  <div className="tooltip-modern">
                    <div className="tooltip-header">
                      <strong>{hoverNode.id}</strong>
                      {hoverNode.isSuspicious && (
                        <span className="tooltip-badge suspicious">⚠️ Suspicious</span>
                      )}
                    </div>
                    {hoverNode.suspicionScore > 0 && (
                      <div className="tooltip-row">
                        <span className="tooltip-label">Risk Score:</span>
                        <span className="tooltip-value suspicion-score">
                          {Math.round(hoverNode.suspicionScore)}%
                        </span>
                      </div>
                    )}
                    {hoverNode.ringId && (
                      <div className="tooltip-row">
                        <span className="tooltip-label">Fraud Ring:</span>
                        <span
                          className="tooltip-value"
                          style={{ color: hoverNode.ringColor }}
                        >
                          #{hoverNode.ringId}
                        </span>
                      </div>
                    )}
                    <div className="tooltip-row">
                      <span className="tooltip-label">Sent:</span>
                      <span className="tooltip-value">${hoverNode.total_sent?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Received:</span>
                      <span className="tooltip-value">${hoverNode.total_received?.toFixed(2) || '0.00'}</span>
                    </div>
                    {hoverNode.detectedPatterns && hoverNode.detectedPatterns.length > 0 && (
                      <div className="tooltip-patterns">
                        {hoverNode.detectedPatterns.slice(0, 2).map((pattern, idx) => (
                          <span key={idx} className="pattern-chip-small">{pattern}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="investigation-panel">
          {selectedRing ? (
            /* Fraud Ring Investigation Panel */
            <>
              <div className="panel-header ring-header">
                <h3>🔗 Fraud Ring Investigation</h3>
                <button onClick={handleBackgroundClick} className="close-panel">×</button>
              </div>

              <div className="ring-id-display" style={{ borderColor: ringColors[selectedRing.ring_id] }}>
                <span className="ring-id-badge-large" style={{ backgroundColor: ringColors[selectedRing.ring_id] }}>
                  {selectedRing.ring_id}
                </span>
                <span className="ring-pattern-type">
                  {selectedRing.pattern_type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="ring-risk-alert">
                <div className="risk-icon-wrapper">
                  <svg className="ring-alert-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div className="risk-content">
                  <span className="risk-label">COORDINATED FRAUD DETECTED</span>
                  <span className="ring-risk-score-large">{selectedRing.risk_score.toFixed(1)}</span>
                </div>
              </div>

              <div className="ring-stats-grid">
                <div className="ring-stat-card">
                  <div className="ring-stat-icon">👥</div>
                  <div className="ring-stat-content">
                    <div className="ring-stat-value">{selectedRing.member_count}</div>
                    <div className="ring-stat-label">Accounts Involved</div>
                  </div>
                </div>
                <div className="ring-stat-card">
                  <div className="ring-stat-icon">💰</div>
                  <div className="ring-stat-content">
                    <div className="ring-stat-value">
                      ${ringMetrics.get(selectedRing.ring_id)?.totalVolume?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                    </div>
                    <div className="ring-stat-label">Total Volume</div>
                  </div>
                </div>
                <div className="ring-stat-card">
                  <div className="ring-stat-icon">🔄</div>
                  <div className="ring-stat-content">
                    <div className="ring-stat-value">
                      {ringMetrics.get(selectedRing.ring_id)?.transactionCount || 0}
                    </div>
                    <div className="ring-stat-label">Transactions</div>
                  </div>
                </div>
                <div className="ring-stat-card">
                  <div className="ring-stat-icon">⏱️</div>
                  <div className="ring-stat-content">
                    <div className="ring-stat-value time-span">
                      {ringMetrics.get(selectedRing.ring_id)?.timeSpan || 'N/A'}
                    </div>
                    <div className="ring-stat-label">Activity Span</div>
                  </div>
                </div>
              </div>

              {ringMetrics.get(selectedRing.ring_id)?.earliestDate && (
                <div className="ring-timeline">
                  <div className="timeline-header">📅 Activity Timeline</div>
                  <div className="timeline-dates">
                    <div className="timeline-date">
                      <span className="date-label">First Transaction:</span>
                      <span className="date-value">
                        {ringMetrics.get(selectedRing.ring_id).earliestDate.toLocaleDateString()}
                        {' '}
                        {ringMetrics.get(selectedRing.ring_id).earliestDate.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="timeline-date">
                      <span className="date-label">Last Transaction:</span>
                      <span className="date-value">
                        {ringMetrics.get(selectedRing.ring_id).latestDate.toLocaleDateString()}
                        {' '}
                        {ringMetrics.get(selectedRing.ring_id).latestDate.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="ring-explanation">
                <div className="explanation-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>Why This Ring Was Flagged</span>
                </div>
                <p className="explanation-text">
                  {ringMetrics.get(selectedRing.ring_id)?.explanation || selectedRing.description}
                </p>
              </div>

              <div className="ring-members-section">
                <div className="members-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>Member Accounts ({selectedRing.member_count})</span>
                </div>
                <div className="ring-members-list">
                  {selectedRing.member_accounts.map(accountId => {
                    const node = graphData.nodes.find(n => n.id === accountId);
                    return (
                      <div
                        key={accountId}
                        className="ring-member-item"
                        onClick={() => {
                          const memberNode = graphData.nodes.find(n => n.id === accountId);
                          if (memberNode) {
                            setSelectedRing(null);
                            handleNodeClick(memberNode);
                          }
                        }}
                        title="Click to view account details"
                      >
                        <span className="member-id">{accountId}</span>
                        {node && (
                          <>
                            <span className="member-score">{node.suspicionScore?.toFixed(0) || '0'}</span>
                            <span className="member-arrow">→</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="panel-footer">
                <p className="hint-text-ring">💡 Click a member account to view individual details, or click background to deselect</p>
              </div>
            </>
          ) : selectedNode ? (
            <>
              <div className="panel-header">
                <h3>🔍 Account Investigation</h3>
                <button onClick={handleBackgroundClick} className="close-panel">×</button>
              </div>

              <div className="panel-account-id">
                <span className="account-label">Account ID:</span>
                <span className="account-id-value">{selectedNode.id}</span>
              </div>

              {(() => {
                const riskData = riskIntelligenceMap.get(selectedNode.id);
                if (riskData) {
                  return (
                    <>
                      <div className="risk-intelligence-alert" style={{
                        background: riskData.risk_level === 'CRITICAL' ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(185, 28, 28, 0.1))' :
                          riskData.risk_level === 'HIGH' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))' :
                            riskData.risk_level === 'MEDIUM' ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1))' :
                              'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                        border: `2px solid ${riskData.risk_level === 'CRITICAL' ? 'rgba(220, 38, 38, 0.4)' :
                          riskData.risk_level === 'HIGH' ? 'rgba(245, 158, 11, 0.4)' :
                            riskData.risk_level === 'MEDIUM' ? 'rgba(234, 179, 8, 0.4)' :
                              'rgba(16, 185, 129, 0.4)'}`
                      }}>
                        <svg className="alert-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div className="alert-content">
                          <span className="alert-title risk-level-{riskData.risk_level.toLowerCase()}">{riskData.risk_level} RISK</span>
                          <span className="risk-score-large">{riskData.risk_score.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Risk Factors Breakdown */}
                      <div className="risk-factors-section">
                        <div className="section-header-small">📊 Risk Factor Analysis</div>
                        <div className="risk-factors-mini-grid">
                          {Object.entries(riskData.risk_factors).map(([factor, score]) => (
                            <div key={factor} className="risk-factor-mini">
                              <span className="factor-label-mini">{factor.replace('_', ' ')}</span>
                              <div className="factor-bar-mini-bg">
                                <div className="factor-bar-mini-fill" style={{ width: `${score}%` }} />
                              </div>
                              <span className="factor-score-mini">{score.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customized Explanation */}
                      <div className="explanation-section">
                        <div className="section-header-small">⚠️ Risk Assessment</div>
                        <div className="explanation-text-box">
                          <p>{riskData.explanation}</p>
                        </div>
                      </div>
                    </>
                  );
                } else if (selectedNode.isSuspicious) {
                  return (
                    <div className="suspicion-alert">
                      <svg className="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <div className="alert-content">
                        <span className="alert-title">SUSPICIOUS ACTIVITY DETECTED</span>
                        <span className="suspicion-score-large">{selectedNode.suspicionScore.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {selectedNode.ringId && (
                <div className="ring-info" style={{ borderColor: selectedNode.ringColor }}>
                  <svg className="ring-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                  </svg>
                  <div>
                    <span className="ring-label">Fraud Ring:</span>
                    <span className="ring-id-text" style={{ color: selectedNode.ringColor }}>
                      {selectedNode.ringId}
                    </span>
                  </div>
                </div>
              )}

              {selectedNode.detectedPatterns && selectedNode.detectedPatterns.length > 0 && (
                <div className="patterns-section">
                  <span className="section-label">Detected Patterns:</span>
                  <div className="pattern-chips">
                    {selectedNode.detectedPatterns.map((pattern, idx) => (
                      <span key={idx} className="pattern-chip">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel-stats">
                <div className="stat-card">
                  <span className="stat-icon">📥</span>
                  <div className="stat-content">
                    <span className="stat-label">Incoming</span>
                    <span className="stat-value">{selectedNode.in_degree}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">📤</span>
                  <div className="stat-content">
                    <span className="stat-label">Outgoing</span>
                    <span className="stat-value">{selectedNode.out_degree}</span>
                  </div>
                </div>
              </div>

              <div className="panel-details">
                <div className="detail-item">
                  <span className="detail-label">Total Transactions:</span>
                  <span className="detail-value">{selectedNode.total_transactions}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount Sent:</span>
                  <span className="detail-value amount">${selectedNode.total_amount_sent.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount Received:</span>
                  <span className="detail-value amount">${selectedNode.total_amount_received.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Net Flow:</span>
                  <span className={`detail-value amount ${selectedNode.net_flow >= 0 ? 'positive' : 'negative'}`}>
                    ${selectedNode.net_flow.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="panel-footer">
                <p className="hint-text">💡 Click another node or background to deselect</p>
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <svg className="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
                <circle cx="11" cy="11" r="3"></circle>
              </svg>
              <h4>Investigation Mode</h4>
              <p>Click any node to view account details, or select a fraud ring from the legend to begin investigation.</p>
            </div>
          )}
        </div>
      </div>

      {hoverNode && (
        <div
          className="tooltip-modern"
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-account-id">{hoverNode.id}</span>
            {hoverNode.isSuspicious && (
              <span className="tooltip-badge suspicious">
                ⚠ {hoverNode.suspicionScore.toFixed(0)}
              </span>
            )}
            {hoverNode.ringId && (
              <span className="tooltip-badge ring" style={{ backgroundColor: hoverNode.ringColor }}>
                {hoverNode.ringId}
              </span>
            )}
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Connections:</span>
              <span className="tooltip-value">↓{hoverNode.in_degree} / ↑{hoverNode.out_degree}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Transactions:</span>
              <span className="tooltip-value">{hoverNode.total_transactions}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Volume:</span>
              <span className="tooltip-value">${(hoverNode.total_amount_sent + hoverNode.total_amount_received).toLocaleString()}</span>
            </div>
            {hoverNode.detectedPatterns && hoverNode.detectedPatterns.length > 0 && (
              <div className="tooltip-patterns">
                {hoverNode.detectedPatterns.slice(0, 2).map((pattern, idx) => (
                  <span key={idx} className="tooltip-pattern-tag">{pattern}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="graph-footer-modern">
        <div className="footer-hints">
          <span className="hint-item">💡 Click nodes to investigate</span>
          <span className="hint-item">🖱️ Drag to reposition</span>
          <span className="hint-item">🔍 Scroll to zoom</span>
          <span className="hint-item">↔️ Drag background to pan</span>
        </div>
      </div>
    </div>
  );
}

export default GraphVisualization;
