"""
Input models — represent the structured breakdown of a raw script
produced by Stage 1 (script_parser node).
"""

from typing import Optional
from pydantic import BaseModel, Field


class Character(BaseModel):
    name: str = Field(..., description="Character name as it appears in the script")
    role: str = Field(..., description="protagonist / antagonist / supporting")
    description: Optional[str] = Field(None, description="Brief character description if inferable")


class DialogueBeat(BaseModel):
    beat_number: int = Field(..., description="Sequential beat index starting from 1")
    speaker: Optional[str] = Field(None, description="Character speaking, None if narration/action")
    content: str = Field(..., description="Dialogue or action line content")
    beat_type: str = Field(..., description="dialogue / action / narration / transition")


class Scene(BaseModel):
    scene_number: int = Field(..., description="Sequential scene index starting from 1")
    heading: Optional[str] = Field(None, description="Scene heading / slug line if present")
    summary: str = Field(..., description="1-2 line summary of what happens in this scene")
    characters_present: list[str] = Field(default_factory=list)
    beats: list[DialogueBeat] = Field(default_factory=list)
    emotional_note: Optional[str] = Field(None, description="Dominant emotion of this scene")


class ParsedScript(BaseModel):
    """
    Output of Stage 1 (script_parser node).
    Passed as structured input to Stage 2 (story_analyst node).
    """
    title: Optional[str] = None
    genre_hint: Optional[str] = None
    total_scenes: int
    total_beats: int
    characters: list[Character] = Field(default_factory=list)
    scenes: list[Scene]
    raw_word_count: Optional[int] = None
