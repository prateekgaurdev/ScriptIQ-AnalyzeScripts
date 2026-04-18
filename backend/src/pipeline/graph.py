"""
Graph builder — assembles all nodes and edges into the LangGraph StateGraph.
Import `run_pipeline` to execute the full analysis from anywhere.
"""

import logging
from typing import Optional

from langgraph.graph import END, StateGraph

from src.models.output_models import FullAnalysis
from src.pipeline.edges import after_validate_analysis, after_validate_parse
from src.pipeline.nodes import (
    genre_detector,
    prompt_router,
    script_parser,
    story_analyst,
    validate_analysis,
    validate_parse,
)
from src.pipeline.state import ScriptAnalysisState
from src.services.gemini_client import init_gemini

logger = logging.getLogger(__name__)


def build_graph() -> StateGraph:
    """Build and compile the LangGraph pipeline."""
    graph = StateGraph(ScriptAnalysisState)

    # ── Register nodes ──────────────────────────────────────────────────────
    graph.add_node("genre_detector", genre_detector)
    graph.add_node("prompt_router", prompt_router)
    graph.add_node("script_parser", script_parser)
    graph.add_node("validate_parse", validate_parse)
    graph.add_node("story_analyst", story_analyst)
    graph.add_node("validate_analysis", validate_analysis)

    # ── Entry point ─────────────────────────────────────────────────────────
    graph.set_entry_point("genre_detector")

    # ── Fixed edges ─────────────────────────────────────────────────────────
    graph.add_edge("genre_detector", "prompt_router")
    graph.add_edge("prompt_router", "script_parser")
    graph.add_edge("script_parser", "validate_parse")
    graph.add_edge("story_analyst", "validate_analysis")

    # ── Conditional edges (retry logic) ─────────────────────────────────────
    graph.add_conditional_edges(
        "validate_parse",
        after_validate_parse,
        {
            "story_analyst": "story_analyst",
            "script_parser": "script_parser",
            "END": END,
        },
    )

    graph.add_conditional_edges(
        "validate_analysis",
        after_validate_analysis,
        {
            "END": END,
            "story_analyst": "story_analyst",
        },
    )

    return graph.compile()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

# Compiled graph — built once at import time
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        init_gemini()
        _compiled_graph = build_graph()
    return _compiled_graph


def run_pipeline(raw_script: str, filename: Optional[str] = None) -> ScriptAnalysisState:
    """
    Run the full analysis pipeline on a raw script string.
    Returns the final state — check state['analysis'] for results.
    """
    graph = get_graph()

    initial_state: ScriptAnalysisState = {
        "raw_script": raw_script,
        "filename": filename,
        "detected_genre": None,
        "parsed_script": None,
        "parse_retry_count": 0,
        "parse_error": None,
        "analysis": None,
        "analysis_retry_count": 0,
        "analysis_error": None,
        "stage1_tokens": 0,
        "stage2_tokens": 0,
        "current_node": None,
        "errors": [],
        "is_complete": False,
    }

    logger.info("[pipeline] Starting script analysis pipeline")
    final_state = graph.invoke(initial_state)
    logger.info(
        f"[pipeline] Pipeline complete. "
        f"Success: {final_state.get('is_complete')}, "
        f"Errors: {final_state.get('errors')}"
    )

    return final_state
