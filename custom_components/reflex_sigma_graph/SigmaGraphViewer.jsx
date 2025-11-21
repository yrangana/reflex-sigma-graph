import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { SigmaContainer, useLoadGraph, ControlsContainer, ZoomControl, FullScreenControl, useSigma, useRegisterEvents, useSetSettings } from '@react-sigma/core';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import { bidirectional } from 'graphology-shortest-path';
import EdgeCurveProgram from '@sigma/edge-curve';
import '@react-sigma/core/lib/style.css';

// Custom CSS to remove border from controls and customize hover behavior
const customStyles = `
  /* Override CSS variables for cleaner appearance */
  :root {
    --sigma-controls-border-color: transparent !important;
    --sigma-controls-background-color-hover: transparent !important;
  }

  /* Remove borders from controls container */
  .react-sigma-controls {
    border: none !important;
    box-shadow: none !important;
  }

  /* Remove borders from individual control divs */
  .react-sigma-controls > div {
    border: none !important;
  }

  /* Target the actual buttons inside controls - this is the key fix */
  .react-sigma-control > button {
    cursor: pointer !important;
  }

  .react-sigma-control > button:hover {
    background-color: transparent !important;
  }

  .react-sigma-control > button:disabled {
    cursor: not-allowed !important;
  }

  /* Also target our custom refresh button directly */
  .react-sigma-control {
    cursor: pointer !important;
  }

  .react-sigma-control:hover {
    background: transparent !important;
  }

  .react-sigma-control:disabled {
    cursor: not-allowed !important;
  }
`;

/**
 * Simple circular layout - positions nodes in a circle
 */
function circularLayout(graph) {
    const nodes = graph.nodes();
    const n = nodes.length;
    const radius = Math.max(100, n * 10); // Scale radius with number of nodes

    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / n;
        graph.setNodeAttribute(node, 'x', radius * Math.cos(angle));
        graph.setNodeAttribute(node, 'y', radius * Math.sin(angle));
    });
}

/**
 * Simple random layout - positions nodes randomly
 */
function randomLayout(graph) {
    graph.forEachNode((node) => {
        graph.setNodeAttribute(node, 'x', (Math.random() - 0.5) * 1000);
        graph.setNodeAttribute(node, 'y', (Math.random() - 0.5) * 1000);
    });
}

/**
 * Apply selected layout algorithm to graph with anti-collision
 *
 * Uses ForceAtlas2 for initial layout with improved spacing settings,
 * then applies Noverlap to remove any remaining node overlaps.
 */
function applyLayout(graph, layoutType) {
    if (!graph || graph.order === 0) return;

    console.log(`Applying layout: ${layoutType}`);

    switch (layoutType) {
        case 'forceAtlas2':
            // Apply ForceAtlas2 with optimized settings for better spacing
            forceAtlas2.assign(graph, {
                iterations: 100,
                settings: {
                    // Increase repulsion for more spacing between nodes
                    scalingRatio: 50,

                    // Reduce gravity to let nodes spread out more
                    gravity: 0.05,

                    // Use edge weights for layout
                    edgeWeightInfluence: 1,

                    // Use Barnes-Hut optimization for large graphs
                    barnesHutOptimize: true,
                    barnesHutTheta: 0.5,

                    // Enable strong gravity mode
                    strongGravityMode: true,
                }
            });
            console.log('Applied ForceAtlas2 layout with improved spacing');

            // Apply Noverlap to remove any remaining overlaps
            noverlap.assign(graph, {
                maxIterations: 200,
                ratio: 10,     // Node spacing ratio
                margin: 200,   // Minimum margin between nodes
            });
            console.log('Applied Noverlap anti-collision');
            break;

        case 'circular':
            // Arrange nodes in a circle
            circularLayout(graph);
            console.log('Applied circular layout');
            break;

        case 'random':
            // Random positioning
            randomLayout(graph);
            console.log('Applied random layout');
            break;

        default:
            console.warn(`Unknown layout type: ${layoutType}`);
            // Default to ForceAtlas2 + Noverlap
            forceAtlas2.assign(graph, {
                iterations: 100,
                settings: {
                    scalingRatio: 50,
                    gravity: 0.05,
                    edgeWeightInfluence: 1,
                    barnesHutOptimize: true,
                    barnesHutTheta: 0.5,
                    strongGravityMode: true,
                }
            });
            noverlap.assign(graph, {
                maxIterations: 200,
                ratio: 10,
                margin: 200,
            });
    }
}

/**
 * Node Reducer for Search/Filter Highlighting
 * Implements client-side search that highlights matching nodes
 */
function SearchNodeReducer({ searchQuery, showNodeLabels }) {
    const sigma = useSigma();
    const setSettings = useSetSettings();
    const graph = sigma.getGraph();

    useEffect(() => {
        // Update node rendering based on search query
        const normalizedQuery = searchQuery.toLowerCase().trim();

        if (!normalizedQuery) {
            // No search - show all nodes normally
            graph.forEachNode((node) => {
                graph.setNodeAttribute(node, 'hidden', false);
                graph.setNodeAttribute(node, 'highlighted', false);
            });
        } else {
            // Search active - highlight matches, grey out non-matches
            graph.forEachNode((node) => {
                const attrs = graph.getNodeAttributes(node);
                const label = (attrs.label || '').toLowerCase();
                const nodeType = (attrs.nodeType || '').toLowerCase();
                const entityType = (attrs.entity_type || '').toLowerCase();

                // Check if node matches search query
                const matches = label.includes(normalizedQuery) ||
                    nodeType.includes(normalizedQuery) ||
                    entityType.includes(normalizedQuery);

                if (matches) {
                    // Highlight matching nodes
                    graph.setNodeAttribute(node, 'highlighted', true);
                    graph.setNodeAttribute(node, 'hidden', false);
                } else {
                    // Grey out non-matching nodes
                    graph.setNodeAttribute(node, 'highlighted', false);
                    graph.setNodeAttribute(node, 'hidden', false);
                    // Optionally hide non-matches:
                    // graph.setNodeAttribute(node, 'hidden', true);
                }
            });
        }

        // Update label visibility based on showNodeLabels prop
        setSettings({
            renderLabels: showNodeLabels,
        });
    }, [searchQuery, showNodeLabels, graph, setSettings]);

    // Add node reducer for visual styling based on highlighted state
    useEffect(() => {
        const nodeReducer = (node, data) => {
            const res = { ...data };

            if (data.highlighted) {
                // Highlighted nodes (being dragged or hovered) - make them stand out
                res.size = data.size * 1.5;
                res.borderColor = '#000';
                res.borderSize = 2;
            } else if (searchQuery.trim()) {
                // Non-highlighted during search - make them subtle
                res.color = '#ccc';
                res.size = data.size * 0.7;
            }

            return res;
        };

        sigma.setSetting('nodeReducer', nodeReducer);

        // Cleanup
        return () => {
            sigma.setSetting('nodeReducer', null);
        };
    }, [searchQuery, sigma]);

    return null;
}

/**
 * Force Atlas 2 Layout Controller
 * Manages continuous Force Atlas 2 layout simulation
 */
function ForceAtlas2Controller({ layoutRunning }) {
    const sigma = useSigma();
    const graph = sigma.getGraph();
    const intervalRef = useRef(null);

    useEffect(() => {
        if (layoutRunning) {
            console.log('Starting Force Atlas 2 layout');

            // Configure Force Atlas 2 settings
            const settings = {
                iterations: 10,  // Iterations per frame
                settings: {
                    gravity: 1,
                    scalingRatio: 10,
                    strongGravityMode: false,
                    barnesHutOptimize: graph.order > 100,  // Use Barnes-Hut for large graphs
                }
            };

            // Run layout in intervals
            intervalRef.current = setInterval(() => {
                forceAtlas2.assign(graph, settings);
                sigma.refresh();
            }, 100);  // Update every 100ms
        } else {
            // Stop layout
            if (intervalRef.current) {
                console.log('Stopping Force Atlas 2 layout');
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [layoutRunning, graph, sigma]);

    return null;
}

/**
 * Text Formatting Helper
 * Processes text for tooltip display with line breaks and truncation
 *
 * @param {string} text - Text to format
 * @param {number} maxLength - Maximum character length per line
 * @returns {string[]} Array of lines to render
 */
function formatTooltipText(text, maxLength = 300) {
    if (!text) return [];

    // Split on <sep> or <SEP> tag (case-insensitive) to create line breaks
    const lines = text.split(/<sep>/i).map(line => line.trim()).filter(line => line.length > 0);

    // Truncate each line if it exceeds maxLength
    return lines.map(line => {
        if (line.length > maxLength) {
            return line.substring(0, maxLength) + '...';
        }
        return line;
    });
}

/**
 * Truncate text with ellipsis if it exceeds max length
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Node Hover Handler Component
 * Shows tooltips with enhanced node information on hover
 *
 * Displays: entity name (label), entity type, and description if available
 * Supports line breaks via <sep> tag and automatic text truncation
 */
function NodeHoverHandler() {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const unregister = registerEvents({
            enterNode: (e) => {
                setHoveredNode(e.node);
                sigma.getGraph().setNodeAttribute(e.node, 'highlighted', true);
            },
            leaveNode: (e) => {
                setHoveredNode(null);
                // Only remove highlight if not from search
                const attrs = sigma.getGraph().getNodeAttributes(e.node);
                if (!attrs.searchHighlighted) {
                    sigma.getGraph().removeNodeAttribute(e.node, 'highlighted');
                }
            },
        });

        return unregister;
    }, [sigma, registerEvents]);

    // Track mouse position for tooltip placement near cursor
    useEffect(() => {
        const container = sigma.getContainer();

        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            setTooltipPosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
        };
    }, [sigma]);

    // Render tooltip - only when node is hovered
    if (!hoveredNode) return null;

    const attrs = sigma.getGraph().getNodeAttributes(hoveredNode);

    // Format description text with line breaks and truncation
    const descriptionLines = attrs.description ? formatTooltipText(attrs.description, 300) : [];

    // Truncate entity name (label) if too long
    const displayLabel = truncateText(attrs.label || hoveredNode, 50);

    return (
        <div
            style={{
                position: 'absolute',
                left: `${tooltipPosition.x + 15}px`,
                top: `${tooltipPosition.y - 10}px`,
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                pointerEvents: 'none',
                zIndex: 1000,
                maxWidth: '320px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Entity Name (Label) - Truncated to 50 chars */}
            <div style={{
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#fff'
            }}>
                {displayLabel}
            </div>

            {/* Entity Type */}
            {attrs.entity_type && (
                <div style={{
                    fontSize: '11px',
                    color: '#a8dadc',
                    marginBottom: '4px'
                }}>
                    <span style={{ opacity: 0.7 }}>Type:</span> {attrs.entity_type}
                </div>
            )}

            {/* Description (if available) - With line breaks on <sep> and truncation */}
            {descriptionLines.length > 0 && (
                <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word'
                }}>
                    {descriptionLines.map((line, index) => (
                        <div key={index} style={{ marginBottom: index < descriptionLines.length - 1 ? '4px' : '0' }}>
                            {line}
                        </div>
                    ))}
                </div>
            )}

            {/* Additional Info */}
            <div style={{
                fontSize: '10px',
                color: '#888',
                marginTop: '6px',
                paddingTop: '4px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                Connections: {sigma.getGraph().degree(hoveredNode)}
                {attrs.importance && ` • Importance: ${attrs.importance}`}
            </div>
        </div>
    );
}

/**
 * Edge Hover Handler Component
 * Shows tooltips with enhanced edge information on hover
 *
 * Displays:
 * - Edge type/label
 * - Source and target node names
 * - Weight (if available)
 * - Description with <sep> tag support (if available)
 * - Keywords (if available)
 *
 * Uses Sigma.js enterEdge/leaveEdge events for proper edge detection
 */
function EdgeHoverHandler() {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const [hoveredEdge, setHoveredEdge] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // Register edge hover events
    useEffect(() => {
        // CRITICAL FIX: useRegisterEvents returns a cleanup function, we need to call it on unmount
        const unregister = registerEvents({
            enterEdge: (e) => {
                console.log('Edge hover enter:', e.edge);
                setHoveredEdge(e.edge);
            },
            leaveEdge: (e) => {
                console.log('Edge hover leave:', e.edge);
                setHoveredEdge(null);
            },
        });

        // Return cleanup function to unregister events on unmount
        return unregister;
    }, [registerEvents]);

    // Track mouse position for tooltip placement near cursor
    useEffect(() => {
        const container = sigma.getContainer();

        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            setTooltipPosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
        };
    }, [sigma]);

    // Render tooltip - only when edge is hovered
    if (!hoveredEdge) return null;

    const graph = sigma.getGraph();

    // Check if edge exists in graph before attempting to get attributes
    if (!graph.hasEdge(hoveredEdge)) {
        console.warn('EdgeHoverHandler: Edge not found in graph:', hoveredEdge);
        return null;
    }

    const attrs = graph.getEdgeAttributes(hoveredEdge);

    // Get source and target node information with safety checks
    let source, target;
    try {
        const extremities = graph.extremities(hoveredEdge);
        // CRITICAL FIX: extremities returns an ARRAY [source, target], not an object {source, target}
        [source, target] = extremities;
    } catch (error) {
        console.warn('EdgeHoverHandler: Failed to get edge extremities:', error);
        return null;
    }

    // Verify both nodes exist before getting attributes
    if (!source || !target || !graph.hasNode(source) || !graph.hasNode(target)) {
        console.warn('EdgeHoverHandler: Source or target node not found:', {
            source,
            target,
            hasSource: source ? graph.hasNode(source) : false,
            hasTarget: target ? graph.hasNode(target) : false,
            allNodes: graph.nodes()
        });
        return null;
    }

    // Format description text with line breaks and truncation (same as node tooltips)
    const descriptionLines = attrs.description ? formatTooltipText(attrs.description, 300) : [];

    // Get edge type/label (priority: edgeType > label)
    const edgeLabel = attrs.edgeType || attrs.label || 'Relationship';

    return (
        <div
            style={{
                position: 'absolute',
                left: `${tooltipPosition.x + 15}px`,
                top: `${tooltipPosition.y - 10}px`,
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                pointerEvents: 'none',
                zIndex: 1000,
                maxWidth: '320px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Edge Type/Label */}
            <div style={{
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#fff'
            }}>
                {edgeLabel}
            </div>

            {/* Weight (if available) */}
            {attrs.weight !== undefined && (
                <div style={{
                    fontSize: '11px',
                    color: '#a8dadc',
                    marginBottom: descriptionLines.length > 0 ? '6px' : '0'
                }}>
                    <span style={{ opacity: 0.7 }}>Weight:</span> {attrs.weight.toFixed(2)}
                </div>
            )}

            {/* Description (if available) - With line breaks on <sep> and truncation */}
            {descriptionLines.length > 0 && (
                <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word'
                }}>
                    {descriptionLines.map((line, index) => (
                        <div key={index} style={{ marginBottom: index < descriptionLines.length - 1 ? '4px' : '0' }}>
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Edge Click Handler Component
 * Shows a modal dialog with full relationship details when an edge is clicked
 *
 * Displays in modal:
 * - Relationship type (edge label)
 * - Source entity → Target entity (full names with line breaks preserved)
 * - Weight (if available)
 * - Keywords (if available)
 * - Full description (with <SEP> line breaks, NOT truncated)
 * - All other relationship metadata
 *
 * Modal interaction:
 * - Click edge: Opens modal with details
 * - Click outside modal: Closes modal
 * - Press ESC key: Closes modal
 */
function EdgeClickHandler() {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const [clickedEdge, setClickedEdge] = useState(null);

    // Register edge click events
    useEffect(() => {
        // CRITICAL FIX: useRegisterEvents returns a cleanup function, we need to call it on unmount
        const unregister = registerEvents({
            clickEdge: (e) => {
                console.log('Edge clicked:', e.edge);
                setClickedEdge(e.edge);
                // Prevent default to avoid triggering stage click
                e.preventSigmaDefault();
            },
        });

        // Return cleanup function to unregister events on unmount
        return unregister;
    }, [registerEvents]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && clickedEdge) {
                console.log('ESC pressed - closing edge details modal');
                setClickedEdge(null);
            }
        };

        if (clickedEdge) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [clickedEdge]);

    // Handle click outside modal to close
    const handleBackdropClick = useCallback((e) => {
        // Close modal if clicking directly on backdrop (not on modal content)
        if (e.target === e.currentTarget) {
            console.log('Backdrop clicked - closing edge details modal');
            setClickedEdge(null);
        }
    }, []);

    // Render modal - only when edge is clicked
    if (!clickedEdge) return null;

    const graph = sigma.getGraph();

    // Check if edge exists in graph before attempting to get attributes
    if (!graph.hasEdge(clickedEdge)) {
        console.warn('EdgeClickHandler: Edge not found in graph:', clickedEdge);
        return null;
    }

    const attrs = graph.getEdgeAttributes(clickedEdge);

    // Get source and target node information with safety checks
    let source, target;
    try {
        const extremities = graph.extremities(clickedEdge);
        // CRITICAL FIX: extremities returns an ARRAY [source, target], not an object {source, target}
        [source, target] = extremities;
    } catch (error) {
        console.warn('EdgeClickHandler: Failed to get edge extremities:', error);
        return null;
    }

    // Verify both nodes exist before getting attributes
    if (!source || !target || !graph.hasNode(source) || !graph.hasNode(target)) {
        console.warn('EdgeClickHandler: Source or target node not found:', { source, target });
        return null;
    }

    const sourceAttrs = graph.getNodeAttributes(source);
    const targetAttrs = graph.getNodeAttributes(target);

    // Get full node names (NO truncation for modal)
    const sourceName = sourceAttrs.label || source;
    const targetName = targetAttrs.label || target;

    // Format description text with line breaks (NO truncation for modal)
    // Split on <sep> or <SEP> tag to preserve line breaks
    const descriptionLines = attrs.description
        ? attrs.description.split(/<sep>/i).map(line => line.trim()).filter(line => line.length > 0)
        : [];

    // Get edge type/label (priority: edgeType > label)
    const edgeLabel = attrs.edgeType || attrs.label || 'Relationship';

    // Extract all other metadata (excluding common display fields and created_at)
    const excludedKeys = ['edgeType', 'label', 'description', 'weight', 'keywords', 'color', 'size', 'type', 'created_at'];
    const otherMetadata = Object.entries(attrs)
        .filter(([key]) => !excludedKeys.includes(key))
        .filter(([, value]) => value !== undefined && value !== null && value !== '');

    return (
        <>
            {/* Modal backdrop - semi-transparent overlay */}
            <div
                onClick={handleBackdropClick}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                }}
            >
                {/* Modal content - centered dialog */}
                <div
                    style={{
                        background: 'rgba(20, 20, 30, 0.98)',
                        color: 'white',
                        padding: '16px 20px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        maxWidth: '400px',
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        position: 'relative',
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking modal content
                >
                    {/* Close button */}
                    <button
                        onClick={() => setClickedEdge(null)}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'transparent',
                            border: 'none',
                            color: '#999',
                            fontSize: '24px',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#999';
                        }}
                        title="Close (ESC)"
                    >
                        ×
                    </button>

                    {/* Modal title - Relationship Type */}
                    <div style={{
                        fontWeight: '700',
                        marginBottom: '12px',
                        fontSize: '16px',
                        color: '#fff',
                        paddingRight: '40px', // Space for close button
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                        paddingBottom: '8px',
                    }}>
                        Relationship Details
                    </div>

                    {/* Edge Type/Label */}
                    <div style={{
                        marginBottom: '10px',
                        padding: '8px 10px',
                        background: 'rgba(100, 100, 255, 0.15)',
                        borderRadius: '6px',
                        borderLeft: '2px solid #6366f1',
                    }}>
                        <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '3px', opacity: 0.8 }}>
                            Type
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                            {edgeLabel}
                        </div>
                    </div>

                    {/* Source → Target with full names and line breaks */}
                    <div style={{
                        marginBottom: '10px',
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                    }}>
                        <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '6px', opacity: 0.8 }}>
                            Connection
                        </div>
                        <div style={{
                            fontSize: '12px',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}>
                            <div>
                                <span style={{ color: '#4ade80', fontWeight: '600' }}>Source:</span>
                                <div style={{ color: '#e0e0e0', marginTop: '2px', marginLeft: '6px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                    {sourceName}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>↓</div>
                            <div>
                                <span style={{ color: '#f87171', fontWeight: '600' }}>Target:</span>
                                <div style={{ color: '#e0e0e0', marginTop: '2px', marginLeft: '6px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                    {targetName}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weight (if available) */}
                    {attrs.weight !== undefined && (
                        <div style={{
                            marginBottom: '10px',
                            padding: '8px 10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                        }}>
                            <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '3px', opacity: 0.8 }}>
                                Weight
                            </div>
                            <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                                {attrs.weight.toFixed(4)}
                            </div>
                        </div>
                    )}

                    {/* Keywords (if available) */}
                    {attrs.keywords && (
                        <div style={{
                            marginBottom: '10px',
                            padding: '8px 10px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            borderRadius: '6px',
                            borderLeft: '2px solid #fbbf24',
                        }}>
                            <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '3px', opacity: 0.8 }}>
                                Keywords
                            </div>
                            <div style={{ fontSize: '12px', color: '#fbbf24', fontStyle: 'italic', lineHeight: '1.4' }}>
                                {attrs.keywords}
                            </div>
                        </div>
                    )}

                    {/* Full Description (if available) - With line breaks on <sep>, NO truncation */}
                    {descriptionLines.length > 0 && (
                        <div style={{
                            marginBottom: '10px',
                            padding: '8px 10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                        }}>
                            <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '6px', opacity: 0.8 }}>
                                Description
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: '#e0e0e0',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                            }}>
                                {descriptionLines.map((line, index) => (
                                    <div key={index} style={{ marginBottom: index < descriptionLines.length - 1 ? '6px' : '0' }}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other metadata (if any) */}
                    {otherMetadata.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        }}>
                            <div style={{ fontSize: '10px', color: '#a8dadc', marginBottom: '8px', opacity: 0.8, fontWeight: '600' }}>
                                Additional Metadata
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                gap: '6px 12px',
                                fontSize: '11px',
                            }}>
                                {otherMetadata.map(([key, value]) => (
                                    <React.Fragment key={key}>
                                        <div style={{ color: '#888', fontWeight: '500' }}>
                                            {key}:
                                        </div>
                                        <div style={{ color: '#e0e0e0', wordWrap: 'break-word' }}>
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer hint */}
                    <div style={{
                        marginTop: '20px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '11px',
                        color: '#666',
                        textAlign: 'center',
                    }}>
                        Click outside or press ESC to close
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Calculate distance/depth from dragged node to all other nodes using BFS
 * Returns a map: node -> depth (0 = dragged node, 1 = neighbor, 2 = neighbor's neighbor, etc.)
 */
function calculateNodeDepths(graph, sourceNode) {
    const depths = new Map();
    const queue = [[sourceNode, 0]];
    depths.set(sourceNode, 0);

    while (queue.length > 0) {
        const [node, depth] = queue.shift();

        // Get all neighbors (both incoming and outgoing edges)
        graph.forEachNeighbor(node, (neighbor) => {
            if (!depths.has(neighbor)) {
                depths.set(neighbor, depth + 1);
                queue.push([neighbor, depth + 1]);
            }
        });
    }

    return depths;
}

/**
 * Calculate influence factor based on depth
 * Depth 0 (dragged): 1.0 (100% movement)
 * Depth 1 (1st degree): 0.6 (60% movement)
 * Depth 2 (2nd degree): 0.3 (30% movement)
 * Depth 3+: 0.1 (10% movement)
 */
function getInfluenceFactor(depth) {
    if (depth === 0) return 1.0;
    if (depth === 1) return 0.6;
    if (depth === 2) return 0.3;
    return 0.1;
}

/**
 * Node Drag Handler Component - Hierarchical Cluster Drag with Ripple Effect
 *
 * Implements smooth, animated node dragging with neighbor influence:
 * - Dragged node: Follows cursor with spring animation (100% movement)
 * - 1st-degree neighbors: Follow at 60% of dragged node's movement
 * - 2nd-degree neighbors: Follow at 30% of dragged node's movement
 * - 3rd+ degree neighbors: Follow at 10% of dragged node's movement
 * - Creates a "ripple effect" where influence decreases with distance
 * - Scale animation on grab/release for visual feedback
 * - Optional position locking via dragNeighbors prop:
 *   - When false: Layout algorithm continues to adjust node after drag
 *   - When true: Node position is fixed after drag (layout forces disabled on that node)
 *
 * Animation parameters:
 * - Spring stiffness: 0.3 (how responsive the animation is)
 * - Grab scale: 1.5x (node enlarges when grabbed)
 * - Release bounce: Smooth spring-back to normal size
 */
function NodeDragHandler({ dragNeighbors = false, selectedNode = null, onNodeClick = null }) {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const [draggedNode, setDraggedNode] = useState(null);
    const dragStartPosRef = useRef(null);
    const animationFrameRef = useRef(null);
    const targetPosRef = useRef(null);
    const currentPosRef = useRef(null);
    const nodeDepthsRef = useRef(null);
    const affectedNodesRef = useRef(null);

    // Animation loop for smooth dragging with spring physics and neighbor influence
    const animateDrag = useCallback((node, graph) => {
        if (!targetPosRef.current || !currentPosRef.current || !nodeDepthsRef.current || !affectedNodesRef.current) return;

        const spring = 0.3; // Spring stiffness (0-1, higher = more responsive)
        const damping = 0.8; // Damping factor (0-1, lower = more bounce)

        // Calculate spring force for main dragged node
        const dx = targetPosRef.current.x - currentPosRef.current.x;
        const dy = targetPosRef.current.y - currentPosRef.current.y;

        // Apply spring physics to dragged node
        currentPosRef.current.vx = (currentPosRef.current.vx || 0) * damping + dx * spring;
        currentPosRef.current.vy = (currentPosRef.current.vy || 0) * damping + dy * spring;

        currentPosRef.current.x += currentPosRef.current.vx;
        currentPosRef.current.y += currentPosRef.current.vy;

        // Update dragged node position
        graph.setNodeAttribute(node, 'x', currentPosRef.current.x);
        graph.setNodeAttribute(node, 'y', currentPosRef.current.y);

        // Calculate how much the dragged node moved in this frame
        const movementDx = currentPosRef.current.vx;
        const movementDy = currentPosRef.current.vy;

        // Apply ripple effect to all affected neighbors based on depth
        affectedNodesRef.current.forEach((affectedNode) => {
            if (affectedNode === node) return; // Skip dragged node itself

            const depth = nodeDepthsRef.current.get(affectedNode);
            const influence = getInfluenceFactor(depth);

            // Move neighbor proportional to influence
            const currentX = graph.getNodeAttribute(affectedNode, 'x');
            const currentY = graph.getNodeAttribute(affectedNode, 'y');

            graph.setNodeAttribute(affectedNode, 'x', currentX + movementDx * influence);
            graph.setNodeAttribute(affectedNode, 'y', currentY + movementDy * influence);
        });

        // Continue animation if still moving
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) { // Continue until very close to target
            animationFrameRef.current = requestAnimationFrame(() => animateDrag(node, graph));
        }
    }, []);

    useEffect(() => {
        let isDragging = false;
        let currentNode = null;
        let originalSize = null;

        // Register event handlers for node dragging
        registerEvents({
            downNode: (e) => {
                console.log('Node down:', e.node);

                // Start potential drag
                currentNode = e.node;
                setDraggedNode(e.node);
                isDragging = false; // Not dragging yet, waiting for movement

                const graph = sigma.getGraph();

                // Store initial position to detect drag vs click
                const nodeX = graph.getNodeAttribute(e.node, 'x');
                const nodeY = graph.getNodeAttribute(e.node, 'y');

                dragStartPosRef.current = { x: nodeX, y: nodeY };
                currentPosRef.current = { x: nodeX, y: nodeY, vx: 0, vy: 0 };
                targetPosRef.current = { x: nodeX, y: nodeY };

                // Calculate depths of all connected nodes using BFS
                nodeDepthsRef.current = calculateNodeDepths(graph, e.node);

                // Store all affected nodes (all nodes up to depth 3)
                affectedNodesRef.current = Array.from(nodeDepthsRef.current.keys()).filter(
                    node => nodeDepthsRef.current.get(node) <= 3
                );

                console.log(`Dragging ${e.node}: ${affectedNodesRef.current.length} nodes affected`);

                // Highlight the node and animate scale up
                graph.setNodeAttribute(e.node, 'highlighted', true);

                // Store original size and scale up node on grab
                originalSize = graph.getNodeAttribute(e.node, 'size');
                graph.setNodeAttribute(e.node, 'size', originalSize * 1.5);

                // Prevent camera drag when interacting with a node
                e.preventSigmaDefault();
            },
            mousemovebody: (e) => {
                // Only update position if we're actively dragging
                if (!currentNode) return;

                // Get current mouse position in graph coordinates
                const pos = sigma.viewportToGraph(e);

                const graph = sigma.getGraph();

                // Check if mouse moved significantly (threshold for drag vs click)
                const dx = pos.x - dragStartPosRef.current.x;
                const dy = pos.y - dragStartPosRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) { // Threshold: 5 units of movement = drag
                    isDragging = true;
                }

                if (isDragging) {
                    // Update target position for smooth animation
                    targetPosRef.current = { x: pos.x, y: pos.y };

                    // Cancel previous animation frame and start new one
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                    }
                    animationFrameRef.current = requestAnimationFrame(() => animateDrag(currentNode, graph));
                }

                // Prevent camera drag
                e.preventSigmaDefault();
            },
            mouseup: (e) => {
                console.log('Node mouse up, isDragging:', isDragging);

                // Handle drag end or click
                if (currentNode) {
                    const graph = sigma.getGraph();

                    // Cancel animation
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                        animationFrameRef.current = null;
                    }

                    // Remove highlight from node
                    graph.removeNodeAttribute(currentNode, 'highlighted');

                    // Animate scale back to original size (bounce effect)
                    if (originalSize) {
                        graph.setNodeAttribute(currentNode, 'size', originalSize);
                    }

                    if (isDragging) {
                        // This was a drag operation
                        console.log('Node drag ended');

                        // If dragNeighbors is true, mark node as fixed (position locked)
                        if (dragNeighbors) {
                            graph.setNodeAttribute(currentNode, 'fixed', true);
                            console.log('Node position locked:', currentNode);
                        }
                    } else {
                        // This was a click (no significant movement)
                        console.log('Node clicked:', currentNode);

                        // Trigger click handler if provided
                        if (onNodeClick) {
                            onNodeClick(currentNode);
                        }
                    }

                    setDraggedNode(null);
                    isDragging = false;
                    currentNode = null;
                    originalSize = null;
                    dragStartPosRef.current = null;
                    targetPosRef.current = null;
                    currentPosRef.current = null;
                    nodeDepthsRef.current = null;
                    affectedNodesRef.current = null;
                }
            },
            // Also handle mouse leaving the canvas
            mouseout: (e) => {
                if (currentNode) {
                    console.log('Mouse left canvas while interacting');

                    const graph = sigma.getGraph();

                    // Cancel animation
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                        animationFrameRef.current = null;
                    }

                    // Remove highlight from node
                    graph.removeNodeAttribute(currentNode, 'highlighted');

                    // Restore original size
                    if (originalSize) {
                        graph.setNodeAttribute(currentNode, 'size', originalSize);
                    }

                    // Lock position if dragNeighbors is true and we were dragging
                    if (isDragging && dragNeighbors) {
                        graph.setNodeAttribute(currentNode, 'fixed', true);
                    }

                    setDraggedNode(null);
                    isDragging = false;
                    currentNode = null;
                    originalSize = null;
                    dragStartPosRef.current = null;
                    targetPosRef.current = null;
                    currentPosRef.current = null;
                    nodeDepthsRef.current = null;
                    affectedNodesRef.current = null;
                }
            },
        });

        // Cleanup on unmount
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [sigma, registerEvents, dragNeighbors, onNodeClick, animateDrag]); // Re-register when props change

    return null;
}

/**
 * Node Click Highlighting Component
 * Highlights clicked node and its 1st-degree neighbors, dims all other nodes
 *
 * Interaction:
 * - Click node: Highlight it + neighbors, dim others
 * - Click same node or background: Reset to normal
 */
function NodeClickHighlighter({ selectedNode, onNodeClick }) {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();

    // Register click on stage (background) to clear selection
    useEffect(() => {
        registerEvents({
            clickStage: () => {
                console.log('Stage clicked - clearing selection');
                onNodeClick(null);
            }
        });
    }, [registerEvents, onNodeClick]);

    // Apply highlighting effect based on selected node
    useEffect(() => {
        const graph = sigma.getGraph();

        if (selectedNode) {
            console.log('Applying highlight to node:', selectedNode, 'and neighbors');

            // Get all neighbors of selected node
            const neighbors = new Set(graph.neighbors(selectedNode));
            neighbors.add(selectedNode); // Include the selected node itself

            console.log('Highlighted nodes count:', neighbors.size);

            // Set node reducer to dim non-highlighted nodes
            sigma.setSetting('nodeReducer', (node, data) => {
                if (neighbors.has(node)) {
                    // Keep highlighted nodes normal (or slightly emphasized)
                    return {
                        ...data,
                        zIndex: 1, // Bring to front
                    };
                } else {
                    // Dim non-highlighted nodes
                    return {
                        ...data,
                        color: '#E2E2E2',
                        label: data.label, // Keep label but it will be dimmed
                        zIndex: 0,
                    };
                }
            });

            // Set edge reducer to only show edges connected to highlighted nodes
            sigma.setSetting('edgeReducer', (edge, data) => {
                const graph = sigma.getGraph();
                const [source, target] = graph.extremities(edge);

                if (neighbors.has(source) || neighbors.has(target)) {
                    // Keep edges to/from highlighted nodes visible
                    return data;
                } else {
                    // Hide or dim edges between non-highlighted nodes
                    return {
                        ...data,
                        hidden: true,
                    };
                }
            });
        } else {
            // No selection - reset to normal rendering
            console.log('Clearing highlight - showing all nodes normally');
            sigma.setSetting('nodeReducer', null);
            sigma.setSetting('edgeReducer', null);
        }

        // Refresh the display
        sigma.refresh();
    }, [sigma, selectedNode]);

    return null;
}

/**
 * Shortest Path Highlighter Component
 * Allows users to select two nodes and visualizes the shortest path between them
 *
 * Interaction:
 * - Click first node: Marks as path start (green border)
 * - Click second node: Calculates and highlights shortest path (orange)
 * - Click outside (not on path nodes/edges): Resets and shows everything
 */
function ShortestPathHighlighter({ pathStart, pathEnd, onPathStartChange, onPathEndChange }) {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const [path, setPath] = useState(null);

    // Calculate shortest path when both nodes are selected
    useEffect(() => {
        if (!pathStart || !pathEnd || pathStart === pathEnd) {
            setPath(null);
            return;
        }

        const graph = sigma.getGraph();

        try {
            // Calculate shortest path using bidirectional search (fastest)
            const shortestPath = bidirectional(graph, pathStart, pathEnd);

            if (shortestPath) {
                console.log(`Shortest path found: ${shortestPath.length} nodes, distance: ${shortestPath.length - 1} hops`);
                setPath(shortestPath);
            } else {
                console.log('No path found between selected nodes');
                setPath(null);
            }
        } catch (error) {
            console.warn('Error calculating shortest path:', error);
            setPath(null);
        }
    }, [pathStart, pathEnd, sigma]);

    // Register click on background to clear path
    useEffect(() => {
        if (!path || path.length === 0) return;

        registerEvents({
            clickStage: () => {
                // Clicked on empty space - reset path
                console.log('Clicked outside - clearing path');
                onPathStartChange(null);
                onPathEndChange(null);
            }
        });
    }, [path, registerEvents, onPathStartChange, onPathEndChange]);

    // Apply visual highlighting based on path
    useEffect(() => {
        const graph = sigma.getGraph();

        if (!path || path.length === 0) {
            // Clear all path highlighting
            sigma.setSetting('nodeReducer', null);
            sigma.setSetting('edgeReducer', null);
            sigma.refresh();
            return;
        }

        // Create sets for fast lookup
        const pathNodes = new Set(path);
        const pathEdges = new Set();

        // Find all edges in the path
        for (let i = 0; i < path.length - 1; i++) {
            const source = path[i];
            const target = path[i + 1];

            // Find the edge between these nodes (check both directions)
            graph.forEachEdge((edge, attrs, edgeSource, edgeTarget) => {
                if ((edgeSource === source && edgeTarget === target) ||
                    (edgeSource === target && edgeTarget === source)) {
                    pathEdges.add(edge);
                }
            });
        }

        // Node reducer - HIDE non-path nodes completely
        sigma.setSetting('nodeReducer', (node, data) => {
            if (node === pathStart) {
                // Start node - green border
                return {
                    ...data,
                    size: data.size * 1.5,
                    borderColor: '#10b981',  // Green
                    borderSize: 4,
                    zIndex: 2,
                };
            } else if (node === pathEnd) {
                // End node - red border
                return {
                    ...data,
                    size: data.size * 1.5,
                    borderColor: '#ef4444',  // Red
                    borderSize: 4,
                    zIndex: 2,
                };
            } else if (pathNodes.has(node)) {
                // Path nodes - orange highlight
                return {
                    ...data,
                    size: data.size * 1.2,
                    borderColor: '#f97316',  // Orange
                    borderSize: 2,
                    zIndex: 1,
                };
            } else {
                // Non-path nodes - HIDE completely
                return {
                    ...data,
                    hidden: true,
                };
            }
        });

        // Edge reducer - HIDE non-path edges completely
        sigma.setSetting('edgeReducer', (edge, data) => {
            if (pathEdges.has(edge)) {
                // Path edges - bright orange and thicker
                return {
                    ...data,
                    color: '#f97316',  // Orange
                    size: data.size * 2,
                    zIndex: 1,
                };
            } else {
                // Non-path edges - HIDE completely
                return {
                    ...data,
                    hidden: true,
                };
            }
        });

        sigma.refresh();

        // Cleanup
        return () => {
            sigma.setSetting('nodeReducer', null);
            sigma.setSetting('edgeReducer', null);
        };
    }, [path, pathStart, pathEnd, sigma]);

    return null;
}


/**
 * Graph Data Loader Component
 * Loads graph data into Sigma using the useLoadGraph hook
 *
 * CRITICAL FIX: Uses useMemo and stable data key to prevent unnecessary reloads
 * that would reset node positions during dragging.
 */
function GraphDataLoader({ data, layoutType }) {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const graphInstanceRef = useRef(null);
    const cameraCenteredRef = useRef(false);

    // Create a stable data key based on actual content
    const dataKey = useMemo(() => {
        if (!data || !data.nodes || data.nodes.length === 0) {
            return null;
        }
        // Use node count + edge count + first node ID to detect changes
        const firstNodeId = data.nodes[0]?.key || '';
        return `${data.nodes.length}-${data.edges?.length || 0}-${firstNodeId}`;
    }, [data]);

    // Memoize the graph creation to avoid recreating on every render
    const graphData = useMemo(() => {
        if (!data || !data.nodes || data.nodes.length === 0) {
            return null;
        }

        console.log('GraphDataLoader processing new data:', {
            nodes: data.nodes.length,
            edges: data.edges?.length || 0
        });

        try {
            // Create new Graphology graph
            const graph = new Graph(data.options || { type: 'directed' });

            // Add all nodes first (with random initial positions for force-directed layout)
            const nodeCount = data.nodes.length;
            const spreadArea = Math.sqrt(nodeCount) * 30; // Spread based on node count

            data.nodes.forEach((node, index) => {
                // Support both Graphology format {key, attributes} and simplified format {id, ...attributes}
                let key, attributes;

                if (node.key && node.attributes) {
                    key = node.key;
                    attributes = node.attributes;
                } else if (node.id) {
                    key = node.id;
                    const { id, ...rest } = node;
                    attributes = rest;
                }

                if (key) {
                    // Random initial positions (will be adjusted by force-directed layout)
                    const x = (Math.random() - 0.5) * spreadArea;
                    const y = (Math.random() - 0.5) * spreadArea;

                    graph.addNode(key, {
                        ...attributes,
                        x: attributes.x !== undefined ? attributes.x : x,
                        y: attributes.y !== undefined ? attributes.y : y,
                        size: attributes.size || 15,  // Node size
                    });
                }
            });
            console.log(`Created graph with ${graph.order} nodes`);

            // Add all edges with default size for better hover detection
            data.edges?.forEach(edge => {
                if (edge && edge.source && edge.target) {
                    try {
                        // CRITICAL FIX: Add default size attribute to edges for better hover detection
                        // Without size, edges are too thin to hover over in Sigma.js
                        const attributes = edge.attributes || {};
                        // If using simplified format, edge properties might be at top level
                        if (!edge.attributes) {
                            Object.keys(edge).forEach(k => {
                                if (k !== 'source' && k !== 'target' && k !== 'key') {
                                    attributes[k] = edge[k];
                                }
                            });
                        }

                        const edgeAttrs = {
                            size: 3,  // Default edge thickness (makes edges easier to hover)
                            ...attributes,
                        };
                        // CRITICAL FIX: Use edge.key if provided, otherwise let Graphology auto-generate
                        // This ensures graph.extremities() works correctly with the edge key
                        if (edge.key) {
                            graph.addEdgeWithKey(edge.key, edge.source, edge.target, edgeAttrs);
                        } else {
                            graph.addEdge(edge.source, edge.target, edgeAttrs);
                        }
                    } catch (e) {
                        console.warn('Failed to add edge:', edge, e);
                    }
                }
            });
            console.log(`Added ${graph.size} edges to graph`);

            // Apply selected layout
            applyLayout(graph, layoutType);

            return { graph, nodeCount };
        } catch (error) {
            console.error('Error creating graph:', error);
            return null;
        }
    }, [dataKey, layoutType]); // Recreate when layout changes

    // Load graph only when graphData changes
    useEffect(() => {
        if (!graphData) {
            console.warn('No graph data to load');
            return;
        }

        const { graph, nodeCount } = graphData;

        // Reset camera centered flag when new data arrives
        cameraCenteredRef.current = false;

        // Store reference to current graph
        graphInstanceRef.current = graph;

        // Load the graph into Sigma
        loadGraph(graph);
        console.log('Graph loaded into Sigma successfully');

        // Let Sigma handle auto-fit
        console.log('Letting Sigma handle camera auto-fit');
    }, [graphData, loadGraph]);

    return null; // This component doesn't render anything
}

/**
 * Sigma Cleanup Component
 * Handles proper cleanup of Sigma instance when component unmounts
 * Prevents "Container has no width" errors during navigation
 */
function SigmaCleanupHandler() {
    const sigma = useSigma();

    useEffect(() => {
        // Cleanup function runs when component unmounts
        return () => {
            try {
                console.log('Cleaning up Sigma instance...');
                // Clear the graph to release all nodes and edges
                const graph = sigma.getGraph();
                graph.clear();
                // Refresh to ensure rendering stops
                sigma.refresh();
                console.log('Sigma instance cleaned up successfully');
            } catch (error) {
                console.warn('Error during Sigma cleanup:', error);
            }
        };
    }, [sigma]);

    return null;
}

/**
 * Refresh Layout Control Component
 * Adds a refresh icon to the controls panel that reapplies the current layout algorithm
 */
function RefreshLayoutControl({ layoutType }) {
    const sigma = useSigma();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        console.log('Refreshing graph layout...');

        const graph = sigma.getGraph();

        // Reapply the layout algorithm
        applyLayout(graph, layoutType);

        // Refresh the display
        sigma.refresh();

        // Reset the camera to fit the new layout
        setTimeout(() => {
            sigma.getCamera().animatedReset();
            setIsRefreshing(false);
            console.log('Layout refreshed successfully');
        }, 100);
    }, [sigma, layoutType]);

    return (
        <>
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="react-sigma-control"
                title="Refresh graph layout"
                style={{
                    cursor: isRefreshing ? 'not-allowed' : 'pointer',
                    opacity: isRefreshing ? 0.6 : 1,
                }}
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    }}
                >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
            </button>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}

/**
 * Sigma Graph Viewer Component
 * Main component that wraps SigmaContainer and handles graph visualization
 */
export default function SigmaGraphViewer({
    graphData,
    settings = {},
    showEdgeLabels = false,
    showNodeLabels = true,
    searchQuery = '',
    layoutType = 'forceAtlas2',
    layoutRunning = false,
    dragNeighbors = false,
    edgeType = 'arrow',
    showClusterBackgrounds = true,
    style = { width: '100%', height: '600px' }
}) {
    const containerRef = useRef(null);
    const [containerReady, setContainerReady] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);

    // Shortest path state
    const [pathStart, setPathStart] = useState(null);
    const [pathEnd, setPathEnd] = useState(null);

    // Generate a stable key for the SigmaContainer to force proper unmount/remount
    const dataKey = useMemo(() => {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            return 'empty';
        }
        const firstNodeKey = graphData.nodes[0]?.key || '';
        return `sigma-${graphData.nodes.length}-${graphData.edges?.length || 0}-${firstNodeKey.slice(0, 8)}`;
    }, [graphData]);

    // Ensure container has valid dimensions before rendering Sigma
    useEffect(() => {
        if (!containerRef.current) return;

        const checkDimensions = () => {
            const rect = containerRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setContainerReady(true);
                console.log('Sigma container ready:', { width: rect.width, height: rect.height });
            } else {
                // Retry after a short delay if dimensions aren't ready
                setTimeout(checkDimensions, 50);
            }
        };

        checkDimensions();

        // Cleanup: reset containerReady on unmount to handle React Strict Mode
        return () => {
            setContainerReady(false);
        };
    }, []);

    // Handle node click for path selection
    const handleNodeClick = useCallback((node) => {
        if (!pathStart) {
            // First click - set path start
            console.log('Path start:', node);
            setPathStart(node);
            setPathEnd(null);
            setSelectedNode(null);
        } else if (!pathEnd && node !== pathStart) {
            // Second click - set path end (calculate path)
            console.log('Path end:', node);
            setPathEnd(node);
            setSelectedNode(null);
        } else {
            // Third click or click on same node - reset
            console.log('Clearing path');
            setPathStart(null);
            setPathEnd(null);
            setSelectedNode(null);
        }
    }, [pathStart, pathEnd]);

    const sigmaSettings = {
        labelSize: 12,
        labelFont: 'Inter, sans-serif',
        renderEdgeLabels: showEdgeLabels,
        renderLabels: showNodeLabels,
        enableEdgeEvents: true,  // Enable edge events for hover tooltips
        enableEdgeClickEvents: true,  // Enable edge click events (Sigma.js v3.x)
        enableEdgeHoverEvents: true,  // Enable edge hover events (Sigma.js v3.x)
        edgeHoverPrecision: 5,  // Increase edge hover detection radius (pixels) - makes edges easier to hover
        defaultEdgeType: edgeType || 'arrow',  // Use prop or default to 'arrow'
        defaultNodeType: 'circle',  // Use circle renderer by default
        // Animation settings for smooth transitions
        animationsTime: 300,  // Animation duration in milliseconds
        allowInvalidContainer: true,  // Allow rendering even if container is invalid (prevents errors on unmount)
        // Register curve edge program - use edgeProgramClasses for custom edge renderers
        edgeProgramClasses: {
            curve: EdgeCurveProgram,
        },
        ...settings
    };

    return (
        <div ref={containerRef} style={style}>
            {/* Inject custom styles to remove control borders */}
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />

            {containerReady && (
                <SigmaContainer
                    key={dataKey}
                    settings={sigmaSettings}
                    style={{ width: '100%', height: '100%' }}
                >
                    <SigmaCleanupHandler />
                    <GraphDataLoader data={graphData} layoutType={layoutType} />
                    <SearchNodeReducer searchQuery={searchQuery} showNodeLabels={showNodeLabels} />
                    <ForceAtlas2Controller layoutRunning={layoutRunning} />
                    <NodeDragHandler
                        dragNeighbors={dragNeighbors}
                        selectedNode={selectedNode}
                        onNodeClick={handleNodeClick}
                    />
                    <ShortestPathHighlighter
                        pathStart={pathStart}
                        pathEnd={pathEnd}
                        onPathStartChange={setPathStart}
                        onPathEndChange={setPathEnd}
                    />
                    <NodeHoverHandler />
                    <EdgeHoverHandler />
                    <EdgeClickHandler />
                    <ControlsContainer position="top-right">
                        <ZoomControl />
                        <FullScreenControl />
                        <RefreshLayoutControl layoutType={layoutType} />
                    </ControlsContainer>
                </SigmaContainer>
            )}
        </div>
    );
}
