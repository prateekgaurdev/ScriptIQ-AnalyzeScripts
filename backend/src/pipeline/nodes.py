"""
Pipeline nodes — pure functions, one per LangGraph node.
Each function receives the full state, does one job, returns updated state slice.

Node execution order:
  genre_detector → prompt_router → script_parser → validate_parse
  → story_analyst → validate_analysis → END
"""

import json
import logging

from src.models.input_models import ParsedScript
from src.models.output_models import FullAnalysis
from src.pipeline.state import ScriptAnalysisState
from src.prompts.analyst_prompts import get_analyst_prompt
from src.prompts.genre_detector import GENRE_DETECTOR_PROMPT
from src.prompts.parser_prompt import PARSER_PROMPT
from src.services.gemini_client import call_gemini, extract_json, calculate_cost

logger = logging.getLogger(__name__)

VALID_GENRES = {"thriller", "romance", "drama", "comedy"}
MAX_RETRIES = 3


# ---------------------------------------------------------------------------
# Node 1 — Genre Detector
# ---------------------------------------------------------------------------

def genre_detector(state: ScriptAnalysisState) -> dict:
    """
    Detects script genre using a lightweight single-word Gemini call.
    Falls back to 'drama' if detection fails or returns unexpected value.
    """
    logger.info("[genre_detector] Starting genre detection")

    prompt = GENRE_DETECTOR_PROMPT.format(raw_script=state["raw_script"])

    try:
        raw, input_tokens, output_tokens = call_gemini(prompt, temperature=0.0)
        genre = raw.strip().lower()

        if genre not in VALID_GENRES:
            logger.warning(f"[genre_detector] Unexpected genre '{genre}', falling back to 'drama'")
            genre = "drama"

        logger.info(f"[genre_detector] Detected genre: {genre}")
        return {
            "detected_genre": genre,
            "current_node": "genre_detector",
        }

    except Exception as e:
        logger.error(f"[genre_detector] Failed: {e}")
        return {
            "detected_genre": "drama",
            "current_node": "genre_detector",
            "errors": state.get("errors", []) + [f"genre_detector: {str(e)}"],
        }


# ---------------------------------------------------------------------------
# Node 2 — Prompt Router (no LLM call — pure logic)
# ---------------------------------------------------------------------------

def prompt_router(state: ScriptAnalysisState) -> dict:
    """
    Selects the correct analyst prompt based on detected genre.
    No LLM call — pure routing logic.
    """
    genre = state.get("detected_genre", "drama")
    logger.info(f"[prompt_router] Routing to '{genre}' analyst prompt")
    return {"current_node": "prompt_router"}


# ---------------------------------------------------------------------------
# Node 3 — Script Parser (Stage 1)
# ---------------------------------------------------------------------------

def script_parser(state: ScriptAnalysisState) -> dict:
    """
    Stage 1: Converts raw script text → structured ParsedScript JSON.
    This structured output is what the analyst receives — not raw text.
    """
    logger.info("[script_parser] Starting Stage 1 parse")

    prompt = PARSER_PROMPT.format(raw_script=state["raw_script"])

    try:
        raw, input_tokens, output_tokens = call_gemini(prompt, temperature=0.1)
        parsed_dict = extract_json(raw)
        parsed_script = ParsedScript(**parsed_dict)

        logger.info(
            f"[script_parser] Parsed {parsed_script.total_scenes} scenes, "
            f"{parsed_script.total_beats} beats"
        )

        return {
            "parsed_script": parsed_script,
            "stage1_tokens": state.get("stage1_tokens", 0) + input_tokens + output_tokens,
            "parse_error": None,
            "current_node": "script_parser",
        }

    except Exception as e:
        logger.error(f"[script_parser] Failed: {e}")
        return {
            "parsed_script": None,
            "parse_retry_count": state.get("parse_retry_count", 0) + 1,
            "parse_error": str(e),
            "current_node": "script_parser",
            "errors": state.get("errors", []) + [f"script_parser (attempt {state.get('parse_retry_count', 0) + 1}): {str(e)}"],
        }


# ---------------------------------------------------------------------------
# Node 4 — Validate Parse
# ---------------------------------------------------------------------------

def validate_parse(state: ScriptAnalysisState) -> dict:
    """
    Validates that the parsed script is usable.
    Conditional edge logic (retry vs proceed) lives in edges.py.
    """
    parsed = state.get("parsed_script")

    if parsed is None:
        logger.warning("[validate_parse] parsed_script is None — will retry")
        return {"current_node": "validate_parse"}

    if not parsed.scenes:
        logger.warning("[validate_parse] No scenes found — will retry")
        return {
            "parsed_script": None,
            "parse_retry_count": state.get("parse_retry_count", 0) + 1,
            "parse_error": "No scenes found in parsed output",
            "current_node": "validate_parse",
        }

    logger.info("[validate_parse] Parse validation passed")
    return {"current_node": "validate_parse"}


# ---------------------------------------------------------------------------
# Node 5 — Story Analyst (Stage 2)
# ---------------------------------------------------------------------------

def story_analyst(state: ScriptAnalysisState) -> dict:
    """
    Stage 2: Analyzes structured ParsedScript → FullAnalysis.
    Uses genre-specific prompt selected by prompt_router.
    """
    logger.info("[story_analyst] Starting Stage 2 analysis")

    genre = state.get("detected_genre", "drama")
    parsed_script = state["parsed_script"]

    prompt_template = get_analyst_prompt(genre)
    prompt = prompt_template.format(
        parsed_script=parsed_script.model_dump_json(indent=2)
    )

    try:
        raw, input_tokens, output_tokens = call_gemini(prompt, temperature=0.2)
        analysis_dict = extract_json(raw)

        # Inject token/cost data before validation
        total_stage1 = state.get("stage1_tokens", 0)
        total_stage2 = input_tokens + output_tokens
        total_tokens = total_stage1 + total_stage2
        cost = calculate_cost(total_stage1, total_stage2)

        analysis_dict["token_usage"] = {
            "stage1_tokens": total_stage1,
            "stage2_tokens": total_stage2,
            "total": total_tokens,
        }
        analysis_dict["estimated_cost_usd"] = cost

        analysis = FullAnalysis(**analysis_dict)

        logger.info(
            f"[story_analyst] Analysis complete. "
            f"Score: {analysis.engagement.overall}/10, "
            f"Cost: ${cost}"
        )

        return {
            "analysis": analysis,
            "stage2_tokens": total_stage2,
            "analysis_error": None,
            "current_node": "story_analyst",
        }

    except Exception as e:
        logger.error(f"[story_analyst] Failed: {e}")
        return {
            "analysis": None,
            "analysis_retry_count": state.get("analysis_retry_count", 0) + 1,
            "analysis_error": str(e),
            "current_node": "story_analyst",
            "errors": state.get("errors", []) + [f"story_analyst (attempt {state.get('analysis_retry_count', 0) + 1}): {str(e)}"],
        }


# ---------------------------------------------------------------------------
# Node 6 — Validate Analysis
# ---------------------------------------------------------------------------

def validate_analysis(state: ScriptAnalysisState) -> dict:
    """
    Final validation. Conditional edge logic in edges.py.
    """
    analysis = state.get("analysis")

    if analysis is None:
        logger.warning("[validate_analysis] analysis is None — will retry")
        return {"current_node": "validate_analysis"}

    if not analysis.emotional_arc.points:
        logger.warning("[validate_analysis] No emotional arc points — will retry")
        return {
            "analysis": None,
            "analysis_retry_count": state.get("analysis_retry_count", 0) + 1,
            "analysis_error": "Empty emotional arc in output",
            "current_node": "validate_analysis",
        }

    logger.info("[validate_analysis] Analysis validation passed ✓")
    return {
        "is_complete": True,
        "current_node": "validate_analysis",
    }
