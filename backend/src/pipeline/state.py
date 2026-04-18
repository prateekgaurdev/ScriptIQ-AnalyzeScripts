"""
Pipeline state — the single object passed between all LangGraph nodes.
Every node reads from and writes to this state.
"""

from typing import Optional, TypedDict
from src.models.input_models import ParsedScript
from src.models.output_models import FullAnalysis


class ScriptAnalysisState(TypedDict):
    # ── Input ──────────────────────────────────────────────────────────────
    raw_script: str                          # Original script text
    filename: Optional[str]                  # Original filename if uploaded

    # ── Stage 0: Genre Detection ───────────────────────────────────────────
    detected_genre: Optional[str]            # thriller / romance / drama / comedy

    # ── Stage 1: Parsing ───────────────────────────────────────────────────
    parsed_script: Optional[ParsedScript]    # Structured breakdown from Stage 1
    parse_retry_count: int                   # How many times parse was retried
    parse_error: Optional[str]               # Last parse error message if any

    # ── Stage 2: Analysis ──────────────────────────────────────────────────
    analysis: Optional[FullAnalysis]         # Full analysis from Stage 2
    analysis_retry_count: int                # How many times analysis was retried
    analysis_error: Optional[str]            # Last analysis error message if any

    # ── Token Tracking ─────────────────────────────────────────────────────
    stage1_tokens: int                       # Tokens used in Stage 1
    stage2_tokens: int                       # Tokens used in Stage 2

    # ── Control Flow ───────────────────────────────────────────────────────
    current_node: Optional[str]              # Which node is currently executing
    errors: list[str]                        # Accumulated error log
    is_complete: bool                        # Pipeline finished successfully
