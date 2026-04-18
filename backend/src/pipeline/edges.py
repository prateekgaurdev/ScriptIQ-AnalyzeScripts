"""
Edges — conditional routing logic for the LangGraph state machine.
Keeps retry decisions out of node functions (separation of concerns).
"""

from src.pipeline.state import ScriptAnalysisState

MAX_RETRIES = 3


def after_validate_parse(state: ScriptAnalysisState) -> str:
    """
    After validate_parse:
    - If parsed_script is valid → proceed to story_analyst
    - If failed but retries remain → go back to script_parser
    - If retries exhausted → END with error
    """
    parsed = state.get("parsed_script")
    retry_count = state.get("parse_retry_count", 0)

    if parsed is not None and parsed.scenes:
        return "story_analyst"

    if retry_count < MAX_RETRIES:
        return "script_parser"

    return "END"


def after_validate_analysis(state: ScriptAnalysisState) -> str:
    """
    After validate_analysis:
    - If analysis is valid → END (success)
    - If failed but retries remain → go back to story_analyst
    - If retries exhausted → END with error
    """
    analysis = state.get("analysis")
    retry_count = state.get("analysis_retry_count", 0)

    if analysis is not None and analysis.emotional_arc.points:
        return "END"

    if retry_count < MAX_RETRIES:
        return "story_analyst"

    return "END"
