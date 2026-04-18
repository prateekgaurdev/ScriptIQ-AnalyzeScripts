import sys
import os

# Resolve the repo root (parent of this api/ directory)
_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend_dir = os.path.join(_repo_root, "backend")

# Prepend backend/ so `routers`, `src`, etc. are all importable
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from main import app  # noqa: F401 — Vercel needs `app` exported from this module
