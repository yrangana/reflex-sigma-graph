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
4. Run the linter:
```bash
ruff check .
```

## Technical Implementation Notes

### How This Component Differs from Standard Reflex Components

This component uses a **non-standard approach** to resolve JSX files due to Vite build constraints. Understanding these differences is important for maintenance and troubleshooting.

#### Standard Reflex Component Approach

Typically, Reflex custom components:
1. Use `reflex component init` to scaffold the project
2. Place JSX files in the package directory
3. Reference components with just the module name in the `library` attribute
4. Build with `reflex component build` to generate type stubs and package metadata
5. Vite automatically resolves component imports from `node_modules`

**Example:**
```python
class MyComponent(rx.Component):
    library = "my-component"  # Simple name, resolved from node_modules
    tag = "MyComponent"
```

#### Our Approach (reflex-sigma-graph)

Due to Vite's inability to resolve our local JSX files from the package, we use:

**1. Runtime File Copying (`ensure_custom_component`)**
```python
def ensure_custom_component():
    """Copy JSX files to .web/utils/ at runtime"""
    # Copies SigmaGraphWrapper.jsx and SigmaGraphViewer.jsx
    # to the running app's .web directory
```

**2. Relative Path in Library Attribute**
```python
class SigmaGraphViewer(rx.Component):
    library = "../../utils/SigmaGraphWrapper.jsx"  # Relative path to copied file
    tag = "SigmaGraphViewer"
```

**3. Standard Python Build Instead of `reflex component build`**
- We use `python -m build` instead of `reflex component build`
- `reflex component build` fails with `ModuleNotFoundError: No module named 'custom_components'`
- The standard build still creates a valid, installable package

#### Why This Approach?

**The Problem:**
- Vite (Reflex's frontend bundler) couldn't resolve our local JSX component files
- Standard `library = "reflex-sigma-graph"` caused Vite to look in `node_modules`
- Our JSX files aren't npm packages, so this failed

**The Solution:**
- Copy JSX files to `.web/utils/` at runtime (before app starts)
- Use a relative path that Vite can resolve from the generated route files
- This works but deviates from Reflex conventions

#### Known Limitations

- ⚠️ JSX files are copied on every app start (minimal overhead)
- ⚠️ Cannot use `reflex component build` (use `python -m build` instead)
- ⚠️ Type stub generation may not work as expected
- ⚠️ Different from examples in Reflex custom component documentation

#### Future Improvements

To align with standard Reflex components, we could:
1. Investigate proper Vite configuration for local JSX resolution
2. Fix the `reflex component build` module resolution issue
3. Potentially wrap the component differently to avoid runtime copying

For now, the current approach **works reliably** and users can install and use the package without issues.

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
