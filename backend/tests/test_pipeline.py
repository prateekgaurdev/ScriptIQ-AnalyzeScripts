"""
Pipeline tests — validate state machine behavior without calling the real API.
Uses monkeypatching to replace Gemini calls with deterministic fixtures.
"""

import pytest
from unittest.mock import patch, MagicMock

from src.pipeline.edges import after_validate_parse, after_validate_analysis
from src.models.input_models import ParsedScript, Scene, DialogueBeat, Character
from src.models.output_models import (
    FullAnalysis, EmotionalArc, EmotionPoint,
    EngagementScore, EngagementFactor, CliffhangerMoment
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_parsed_script() -> ParsedScript:
    return ParsedScript(
        title="Test Script",
        genre_hint="thriller",
        total_scenes=2,
        total_beats=4,
        characters=[Character(name="Alice", role="protagonist")],
        scenes=[
            Scene(
                scene_number=1,
                heading="INT. ROOM - DAY",
                summary="Alice discovers a clue.",
                characters_present=["Alice"],
                emotional_note="tension",
                beats=[
                    DialogueBeat(beat_number=1, speaker="Alice", content="What is this?", beat_type="dialogue"),
                    DialogueBeat(beat_number=2, speaker=None, content="She reaches for the envelope.", beat_type="action"),
                ],
            ),
            Scene(
                scene_number=2,
                heading="EXT. STREET - NIGHT",
                summary="Alice runs.",
                characters_present=["Alice"],
                emotional_note="fear",
                beats=[
                    DialogueBeat(beat_number=3, speaker=None, content="Footsteps behind her.", beat_type="action"),
                    DialogueBeat(beat_number=4, speaker="Alice", content="Don't look back.", beat_type="dialogue"),
                ],
            ),
        ],
    )


def make_full_analysis() -> FullAnalysis:
    return FullAnalysis(
        summary="A tense thriller about discovery and pursuit.",
        genre="thriller",
        emotional_arc=EmotionalArc(
            points=[
                EmotionPoint(beat_number=2, scene_number=1, dominant_emotion="tension", intensity=6.5),
                EmotionPoint(beat_number=4, scene_number=2, dominant_emotion="fear", intensity=8.5),
            ],
            dominant_overall="tension",
            arc_shape="rising",
        ),
        engagement=EngagementScore(
            overall=7.5,
            confidence=0.88,
            factors=[
                EngagementFactor(factor="hook", score=8.0, explanation="Strong opening hook."),
                EngagementFactor(factor="tension", score=7.0, explanation="Sustained tension."),
            ],
        ),
        suggestions=[],
        cliffhanger=CliffhangerMoment(present=False),
    )


# ---------------------------------------------------------------------------
# Edge logic tests
# ---------------------------------------------------------------------------

class TestEdges:
    def test_after_validate_parse_success(self):
        state = {
            "parsed_script": make_parsed_script(),
            "parse_retry_count": 0,
        }
        assert after_validate_parse(state) == "story_analyst"

    def test_after_validate_parse_retry(self):
        state = {
            "parsed_script": None,
            "parse_retry_count": 1,
        }
        assert after_validate_parse(state) == "script_parser"

    def test_after_validate_parse_exhausted(self):
        state = {
            "parsed_script": None,
            "parse_retry_count": 3,
        }
        assert after_validate_parse(state) == "END"

    def test_after_validate_analysis_success(self):
        state = {
            "analysis": make_full_analysis(),
            "analysis_retry_count": 0,
        }
        assert after_validate_analysis(state) == "END"

    def test_after_validate_analysis_retry(self):
        state = {
            "analysis": None,
            "analysis_retry_count": 1,
        }
        assert after_validate_analysis(state) == "story_analyst"

    def test_after_validate_analysis_exhausted(self):
        state = {
            "analysis": None,
            "analysis_retry_count": 3,
        }
        assert after_validate_analysis(state) == "END"


# ---------------------------------------------------------------------------
# Model validation tests
# ---------------------------------------------------------------------------

class TestModels:
    def test_parsed_script_valid(self):
        ps = make_parsed_script()
        assert ps.total_scenes == 2
        assert len(ps.scenes) == 2
        assert ps.scenes[0].beats[0].beat_number == 1

    def test_full_analysis_valid(self):
        fa = make_full_analysis()
        assert fa.engagement.overall == 7.5
        assert len(fa.emotional_arc.points) == 2
        assert fa.emotional_arc.arc_shape == "rising"

    def test_engagement_score_out_of_range(self):
        with pytest.raises(Exception):
            EngagementScore(
                overall=11.0,  # > 10, should fail
                confidence=0.9,
                factors=[],
            )

    def test_emotion_intensity_out_of_range(self):
        with pytest.raises(Exception):
            EmotionPoint(
                beat_number=1,
                scene_number=1,
                dominant_emotion="joy",
                intensity=11.0,  # > 10, should fail
            )


# ---------------------------------------------------------------------------
# Preprocessor tests
# ---------------------------------------------------------------------------

class TestPreprocessor:
    def test_basic_clean(self):
        from src.utils.preprocessor import preprocess_script
        raw = "  Hello world.  \r\n\r\nThis is a script.\n\n\n\nMore content here.  "
        result = preprocess_script(raw)
        assert "\r" not in result
        assert result == result.strip()

    def test_too_short(self):
        from src.utils.preprocessor import preprocess_script
        with pytest.raises(ValueError, match="too short"):
            preprocess_script("hi")

    def test_empty(self):
        from src.utils.preprocessor import preprocess_script
        with pytest.raises(ValueError):
            preprocess_script("   ")

    def test_word_count(self):
        from src.utils.preprocessor import count_words
        assert count_words("hello world foo") == 3
