"""
Sigma.js Graph Visualization Components

Wrapper for SigmaGraphViewer.jsx component.
"""

import reflex as rx
from typing import Dict, Optional, Any
import shutil
from pathlib import Path
import os

def ensure_custom_component():
    """Copy custom component to the app's .web/utils directory"""
    # Source is in the package directory
    pkg_path = Path(__file__).parent
    files = ["SigmaGraphWrapper.jsx", "SigmaGraphViewer.jsx"]
    
    # Destination is in the .web/utils directory
    # We assume the app is running from its root
    dest_dir = Path.cwd() / ".web" / "utils"
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    for file in files:
        source = pkg_path / file
        dest = dest_dir / file
        
        if source.exists():
            # Always copy if destination doesn't exist or source is newer
            if not dest.exists() or os.path.getmtime(source) > os.path.getmtime(dest):
                shutil.copy2(source, dest)
                print(f"Copied {file} to {dest}")


class SigmaGraphViewer(rx.Component):
    """Sigma.js graph visualization component
    
    Wraps the custom SigmaGraphViewer.jsx React component that handles
    all Sigma.js integration including graph loading with useLoadGraph hook.
    """

    # Point to component relative to .web/app/routes/ where route files are
    # For a published component, this is just the filename without extension
    library = "../../utils/SigmaGraphWrapper.jsx"
    tag = "SigmaGraphWrapper"

    # Component is client-side only (uses WebGL)
    is_default = True

    # Props
    graph_data: rx.Var[Dict[str, Any]] = {}  # Graphology JSON format or generic node/edge lists
    settings: rx.Var[Dict[str, Any]] = {}  # Sigma settings
    
    # Display options
    show_edge_labels: rx.Var[bool] = False  # Whether to show edge labels
    show_node_labels: rx.Var[bool] = True  # Whether to show node labels
    
    # Interaction & Layout
    search_query: rx.Var[str] = ""  # Search query for highlighting nodes
    layout_type: rx.Var[str] = "forceAtlas2"  # Layout algorithm: forceAtlas2, circular, random, etc.
    layout_running: rx.Var[bool] = False  # Whether layout is running
    drag_neighbors: rx.Var[bool] = False  # Whether to drag connected neighbors together
    
    # Styling
    edge_type: rx.Var[str] = "arrow"  # Edge rendering type: "arrow", "line", "curve", "triangle"
    style: rx.Var[Dict[str, str]] = {"width": "100%", "height": "600px"}
    theme: rx.Var[str] = "light"  # "light" | "dark" | "custom"
    custom_theme: rx.Var[Dict[str, str]] = {}  # For custom color schemes

    # Event Handlers
    on_node_click: rx.EventHandler[lambda node_id, node_data: [node_id, node_data]]
    on_node_hover: rx.EventHandler[lambda node_id, node_data: [node_id, node_data]]
    on_edge_click: rx.EventHandler[lambda edge_id, edge_data: [edge_id, edge_data]]
    on_edge_hover: rx.EventHandler[lambda edge_id, edge_data: [edge_id, edge_data]]
    on_layout_complete: rx.EventHandler[lambda: []]

    @classmethod
    def create(cls, *children, **props):
        ensure_custom_component()
        return super().create(*children, **props)


# Convenience function
sigma_graph_viewer = SigmaGraphViewer.create
