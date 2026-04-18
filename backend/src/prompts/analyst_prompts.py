"""
Analyst prompts — Stage 2.
One prompt per genre — each uses a different engagement rubric.

Why genre-specific prompts?
  Thriller engagement = tension + stakes
  Romance engagement  = emotional resonance + chemistry
  Drama engagement    = character depth + authenticity
  Comedy engagement   = timing + subversion

Prompt version history: see PROMPT_CHANGELOG.md
Current version: v2
"""

# ---------------------------------------------------------------------------
# Shared output schema injected into every prompt
# ---------------------------------------------------------------------------

_OUTPUT_SCHEMA = """
{{
  "summary": string,
  "genre": string,
  "emotional_arc": {{
    "points": [
      {{
        "beat_number": integer,
        "scene_number": integer,
        "dominant_emotion": string,
        "intensity": float (0.0 - 10.0),
        "note": string or null
      }}
    ],
    "dominant_overall": string,
    "arc_shape": "rising" | "falling" | "flat" | "wave" | "climactic"
  }},
  "engagement": {{
    "overall": float (0.0 - 10.0),
    "confidence": float (0.0 - 1.0),
    "low_confidence_reason": string or null,
    "factors": [
      {{
        "factor": string,
        "score": float (0.0 - 10.0),
        "explanation": string
      }}
    ]
  }},
  "suggestions": [
    {{
      "index": integer,
      "area": "pacing" | "dialogue" | "character" | "structure" | "hook" | "ending",
      "suggestion": string,
      "impact": "high" | "medium" | "low"
    }}
  ],
  "cliffhanger": {{
    "present": boolean,
    "beat_number": integer or null,
    "scene_number": integer or null,
    "description": string or null,
    "effectiveness": "strong" | "moderate" | "weak" | null
  }}
}}
"""

_SHARED_RULES = """
RULES:
1. emotional_arc.points should capture key emotional shifts. Provide at least 5 points for scripts > 10 beats (ideally one per scene, but add more for long scenes).
2. engagement.overall must be a weighted average of factor scores — not arbitrary
3. engagement.confidence below 0.7 MUST include low_confidence_reason
4. suggestions must be actionable and specific — never generic like "improve dialogue"
5. Return ONLY valid JSON. No markdown fences, no explanation, no preamble.
"""

# ---------------------------------------------------------------------------
# Thriller
# ---------------------------------------------------------------------------

ANALYST_PROMPT_THRILLER = (
    """You are an expert script analyst specializing in THRILLER scripts.

ENGAGEMENT RUBRIC FOR THRILLER (use exactly these factors):
- hook:            How immediately does the script grab attention? Is danger/mystery established early?
- conflict:        Is the central threat clear, credible, and escalating?
- tension:         Does tension build consistently? Are there effective release-and-rebuild cycles?
- stakes:          Are the consequences of failure real and personal?
- cliffhanger:     Does each scene end with unresolved danger or revelation?
- pacing:          Is the rhythm tight? Are there momentum-killing lulls?

TASK:
Analyze the structured script breakdown below and return a JSON object.

OUTPUT SCHEMA:
"""
    + _OUTPUT_SCHEMA
    + _SHARED_RULES
    + """
SCRIPT BREAKDOWN:
{parsed_script}
"""
)

# ---------------------------------------------------------------------------
# Romance
# ---------------------------------------------------------------------------

ANALYST_PROMPT_ROMANCE = (
    """You are an expert script analyst specializing in ROMANCE scripts.

ENGAGEMENT RUBRIC FOR ROMANCE (use exactly these factors):
- hook:              Does the script make you care about the central relationship immediately?
- emotional_pull:    Do the characters' feelings feel real and earned?
- chemistry:         Is there convincing tension or spark between the leads?
- conflict:          Is the obstacle to the relationship meaningful (not contrived)?
- resolution_setup:  Does the script build toward a satisfying emotional payoff?
- pacing:            Does the emotional journey breathe — not rushed, not dragging?

TASK:
Analyze the structured script breakdown below and return a JSON object.

OUTPUT SCHEMA:
"""
    + _OUTPUT_SCHEMA
    + _SHARED_RULES
    + """
SCRIPT BREAKDOWN:
{parsed_script}
"""
)

# ---------------------------------------------------------------------------
# Drama
# ---------------------------------------------------------------------------

ANALYST_PROMPT_DRAMA = (
    """You are an expert script analyst specializing in DRAMA scripts.

ENGAGEMENT RUBRIC FOR DRAMA (use exactly these factors):
- hook:              Does the opening situation feel urgent or emotionally loaded?
- character_depth:   Are characters multi-dimensional with believable motivations?
- conflict:          Is the central conflict layered (internal + external)?
- authenticity:      Does the dialogue and behavior feel true to real human experience?
- emotional_impact:  Does the script produce genuine emotional response?
- pacing:            Does the script give scenes room to breathe without losing momentum?

TASK:
Analyze the structured script breakdown below and return a JSON object.

OUTPUT SCHEMA:
"""
    + _OUTPUT_SCHEMA
    + _SHARED_RULES
    + """
SCRIPT BREAKDOWN:
{parsed_script}
"""
)

# ---------------------------------------------------------------------------
# Comedy
# ---------------------------------------------------------------------------

ANALYST_PROMPT_COMEDY = (
    """You are an expert script analyst specializing in COMEDY scripts.

ENGAGEMENT RUBRIC FOR COMEDY (use exactly these factors):
- hook:          Does the script establish comedic tone and premise immediately?
- timing:        Do jokes land at the right beat? Is comedic rhythm well-constructed?
- subversion:    Does the script successfully subvert expectations?
- character:     Are characters distinct enough to generate comedic contrast?
- escalation:    Do comedic situations escalate naturally and payoff satisfyingly?
- pacing:        Is the joke density right — not too sparse, not exhausting?

TASK:
Analyze the structured script breakdown below and return a JSON object.

OUTPUT SCHEMA:
"""
    + _OUTPUT_SCHEMA
    + _SHARED_RULES
    + """
SCRIPT BREAKDOWN:
{parsed_script}
"""
)

# ---------------------------------------------------------------------------
# Router — returns correct prompt by genre
# ---------------------------------------------------------------------------

ANALYST_PROMPTS: dict[str, str] = {
    "thriller": ANALYST_PROMPT_THRILLER,
    "romance": ANALYST_PROMPT_ROMANCE,
    "drama": ANALYST_PROMPT_DRAMA,
    "comedy": ANALYST_PROMPT_COMEDY,
}

DEFAULT_GENRE = "drama"


def get_analyst_prompt(genre: str) -> str:
    """Return the analyst prompt for the given genre. Falls back to drama."""
    return ANALYST_PROMPTS.get(genre.lower(), ANALYST_PROMPTS[DEFAULT_GENRE])
