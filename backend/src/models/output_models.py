"""
Output models — represent the full analysis produced by Stage 2 (story_analyst node).
These are what the FastAPI response returns to the React frontend.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Emotional Arc
# ---------------------------------------------------------------------------

class EmotionPoint(BaseModel):
    beat_number: int
    scene_number: int
    dominant_emotion: str = Field(..., description="e.g. tension, joy, grief, suspense, love, fear")
    intensity: float = Field(..., ge=0.0, le=10.0, description="Emotion intensity 0-10")
    note: Optional[str] = Field(None, description="Why this beat has this emotion")


class EmotionalArc(BaseModel):
    points: list[EmotionPoint]
    dominant_overall: str = Field(..., description="Single dominant emotion across entire script")
    arc_shape: str = Field(
        ...,
        description="Shape of emotional journey: rising / falling / flat / wave / climactic"
    )


# ---------------------------------------------------------------------------
# Engagement Score
# ---------------------------------------------------------------------------

class EngagementFactor(BaseModel):
    factor: str = Field(..., description="hook / conflict / tension / cliffhanger / character_depth / pacing")
    score: float = Field(..., ge=0.0, le=10.0)
    explanation: str = Field(..., description="Why this score was given")


class EngagementScore(BaseModel):
    overall: float = Field(..., ge=0.0, le=10.0, description="Composite engagement score")
    factors: list[EngagementFactor]
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence in this score")
    low_confidence_reason: Optional[str] = Field(
        None,
        description="Populated if confidence < 0.7, explains why"
    )


# ---------------------------------------------------------------------------
# Suggestions
# ---------------------------------------------------------------------------

class ImprovementSuggestion(BaseModel):
    index: int
    area: str = Field(..., description="pacing / dialogue / character / structure / hook / ending")
    suggestion: str = Field(..., description="Concrete, actionable suggestion")
    impact: str = Field(..., description="high / medium / low")


# ---------------------------------------------------------------------------
# Cliffhanger
# ---------------------------------------------------------------------------

class CliffhangerMoment(BaseModel):
    present: bool
    beat_number: Optional[int] = None
    scene_number: Optional[int] = None
    description: Optional[str] = None
    effectiveness: Optional[str] = Field(
        None,
        description="strong / moderate / weak — how effective the cliffhanger is"
    )


# ---------------------------------------------------------------------------
# Full Analysis — root output model
# ---------------------------------------------------------------------------

class FullAnalysis(BaseModel):
    """
    Root output of Stage 2 (story_analyst node).
    This is what FastAPI serializes and sends to React.
    """
    summary: str = Field(..., description="3-4 line narrative summary of the script")
    genre: str = Field(..., description="Detected genre: thriller / romance / drama / comedy")
    emotional_arc: EmotionalArc
    engagement: EngagementScore
    suggestions: list[ImprovementSuggestion]
    cliffhanger: CliffhangerMoment
    token_usage: Optional[dict] = Field(
        None,
        description="{'stage1_tokens': int, 'stage2_tokens': int, 'total': int}"
    )
    estimated_cost_usd: Optional[float] = Field(
        None,
        description="Estimated API cost in USD for this analysis"
    )
