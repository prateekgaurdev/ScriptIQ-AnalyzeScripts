"""
FastAPI entry point — mounts all routers, configures CORS for React dev server.
"""

import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, compare, samples, voice

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Bullet Script Analyzer API",
    description="AI-powered script analysis pipeline using Gemini + LangGraph",
    version="1.0.0",
)

# Allow React dev server (Vite default: 5173) and production origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(analyze.router)
app.include_router(compare.router)
app.include_router(samples.router)
app.include_router(voice.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "bullet-script-analyzer"}


@app.get("/")
def root():
    return {
        "message": "Bullet Script Analyzer API",
        "docs": "/docs",
        "health": "/health",
    }
