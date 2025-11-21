import reflex as rx

config = rx.Config(
    app_name="sigma_graph_demo",
    plugins=[
        rx.plugins.SitemapPlugin(),
        rx.plugins.TailwindV4Plugin(),
    ]
)