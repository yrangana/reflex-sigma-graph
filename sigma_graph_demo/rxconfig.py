import reflex as rx

config = rx.Config(
    app_name="sigma_graph_demo",
    frontend_packages=[
        "@react-sigma/core@5.0.4",
        "@sigma/edge-curve@3.1.0",
        "sigma@3.0.2",
        "graphology@0.26.0",
        "graphology-layout-forceatlas2@0.10.1",
        "graphology-layout-noverlap@0.4.2",
        "graphology-shortest-path@2.0.2",
    ],
    plugins=[
        rx.plugins.SitemapPlugin(),
        rx.plugins.TailwindV4Plugin(),
    ]
)