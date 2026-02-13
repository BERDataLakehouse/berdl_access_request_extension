"""
BERDL Access Request JupyterLab Extension.

This extension provides a toolbar button and modal for tenant access requests.
"""

try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'berdl_access_request' outside a proper installation.")
    __version__ = "dev"

from .handlers import setup_handlers


def _jupyter_labextension_paths():
    """Return paths for labextension."""
    return [{"src": "labextension", "dest": "berdl-access-request"}]


def _jupyter_server_extension_points():
    """Return server extension configuration."""
    return [{"module": "berdl_access_request"}]


def _load_jupyter_server_extension(server_app):
    """Load the Jupyter server extension."""
    setup_handlers(server_app.web_app)
    server_app.log.info("BERDL Access Request extension loaded")
