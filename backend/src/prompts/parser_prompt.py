"""
Parser prompt — Stage 1.
Converts raw script text into structured JSON breakdown.
This structured output is what Stage 2 receives — NOT the raw script.

Prompt version history: see PROMPT_CHANGELOG.md
Current version: v3
"""

PARSER_PROMPT = """You are a professional script analyst. Your job is to parse a raw script into a clean structured breakdown.

TASK:
Parse the provided script and return a JSON object that strictly follows the schema below.

OUTPUT SCHEMA:
{{
  "title": string or null,
  "genre_hint": string or null,
  "total_scenes": integer,
  "total_beats": integer,
  "characters": [
    {{
      "name": string,
      "role": "protagonist" | "antagonist" | "supporting",
      "description": string or null
    }}
  ],
  "scenes": [
    {{
      "scene_number": integer,
      "heading": string or null,
      "summary": string,
      "characters_present": [string],
      "emotional_note": string or null,
      "beats": [
        {{
          "beat_number": integer,
          "speaker": string or null,
          "content": string,
          "beat_type": "dialogue" | "action" | "narration" | "transition"
        }}
      ]
    }}
  ],
  "raw_word_count": integer or null
}}

RULES:
1. beat_number must be globally sequential across ALL scenes (not reset per scene)
2. If there are no clear scene breaks, treat the entire script as one scene
3. speaker is null for action lines and narration
4. Do not summarize or skip beats — capture every line
5. emotional_note should be a single emotion word: joy / grief / tension / fear / love / anger / suspense / hope / despair / calm
6. Return ONLY valid JSON. No markdown fences, no explanation, no preamble.

SCRIPT:
{raw_script}
"""
