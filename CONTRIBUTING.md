# Contributing to Reflex Sigma Graph

Thank you for your interest in contributing to reflex-sigma-graph!

## Development Setup

**With uv (recommended - faster):**

1. Clone the repository:
```bash
git clone https://github.com/yrangana/reflex-sigma-graph.git
cd reflex-sigma-graph
```

2. Create a virtual environment and install:
```bash
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
```

**With pip:**

1. Clone the repository:
```bash
git clone https://github.com/yrangana/reflex-sigma-graph.git
cd reflex-sigma-graph
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

3. Test with the demo app:
```bash
cd sigma_graph_demo
reflex run
```

## Project Structure

```
reflex-sigma-graph/
├── custom_components/reflex_sigma_graph/  # Main component
│   ├── __init__.py
│   ├── sigma_graph.py                     # Python wrapper
│   ├── SigmaGraphViewer.jsx               # Main React component
│   └── SigmaGraphWrapper.jsx              # NoSSR wrapper
├── sigma_graph_demo/                       # Demo application
├── pyproject.toml                          # Package configuration
├── MANIFEST.in                             # Include JSX files
└── README.md
```

## Making Changes

1. Make your changes in the `custom_components/reflex_sigma_graph/` directory
2. Test with the demo app
3. Update documentation if needed
4. Submit a pull request

## Code Style

- Follow PEP 8 for Python code
- Use meaningful variable names
- Add docstrings to functions
- Keep functions focused and small

## Testing

Currently, testing is done manually with the demo app. We welcome contributions to add automated testing!

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Questions?

Feel free to open an issue for any questions or clarifications.
