import sys
import os

# Resolve absolute path to backend/
_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend_dir = os.path.join(_repo_root, "backend")

if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from main import app as _fastapi_app  # FastAPI app with all routers

# Vercel calls this function with the FULL path (e.g. /api/samples).
# FastAPI only knows /samples, /analyze, etc. — no /api prefix.
# We mount the FastAPI app at /api so Starlette strips the prefix before routing.
from starlette.applications import Starlette
from starlette.routing import Mount

app = Starlette(routes=[Mount("/api", app=_fastapi_app)])
