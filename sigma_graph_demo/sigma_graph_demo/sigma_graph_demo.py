import reflex as rx
from reflex_sigma_graph import sigma_graph_viewer


class DemoState(rx.State):
    """Demo state with sample graph data"""

    nodes: list[dict] = [
        {"id": "1", "label": "Node 1", "color": "#ff6b6b", "size": 20},
        {"id": "2", "label": "Node 2", "color": "#4ecdc4", "size": 15},
        {"id": "3", "label": "Node 3", "color": "#45b7d1", "size": 15},
        {"id": "4", "label": "Node 4", "color": "#ff9f43", "size": 15},
        {"id": "5", "label": "Node 5", "color": "#5f27cd", "size": 15},
    ]

    edges: list[dict] = [
        {"source": "1", "target": "2", "label": "connects", "size": 3},
        {"source": "2", "target": "3", "label": "links", "size": 3},
        {"source": "3", "target": "1", "label": "back", "size": 3},
        {"source": "1", "target": "4", "label": "relates", "size": 3},
        {"source": "4", "target": "5", "label": "depends", "size": 3},
    ]


def index():
    return rx.container(
        rx.heading("Sigma Graph Demo", size="9", margin_bottom="1em"),

        sigma_graph_viewer(
            graph_data={"nodes": DemoState.nodes, "edges": DemoState.edges},
            layout_type="forceAtlas2",
            show_node_labels=True,
            show_edge_labels=True,
            style={"width": "100%", "height": "600px", "border": "1px solid #ddd", "borderRadius": "8px"},
        ),

        padding="2em",
    )


app = rx.App()
app.add_page(index)
