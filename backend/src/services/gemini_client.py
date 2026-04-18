"""
Gemini client — wraps google-generativeai for use across all pipeline nodes.
Designed to be swappable: replace this file to switch LLM providers.
"""

import json
import os
import re
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GEMINI_MODEL = "gemini-2.5-flash"

# Pricing as of mid-2024 (per 1M tokens) — update if pricing changes
PRICE_PER_1M_INPUT_TOKENS = 3.50   # USD
PRICE_PER_1M_OUTPUT_TOKENS = 10.50  # USD


def init_gemini() -> None:
    """Initialize Gemini with API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY not found in environment. "
            "Copy .env.example to .env and set your key."
        )
    genai.configure(api_key=api_key)


# ---------------------------------------------------------------------------
# Core call
# ---------------------------------------------------------------------------

def call_gemini(
    prompt: str,
    temperature: float = 0.2,
    max_output_tokens: int = 8192,
) -> tuple[str, int, int]:
    """
    Call Gemini and return (response_text, input_tokens, output_tokens).

    Low temperature (0.2) is intentional — we want consistent structured
    JSON output, not creative variation.
    """
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type="text/plain",
        ),
    )

    response: GenerateContentResponse = model.generate_content(prompt)

    text = response.text or ""

    # Token counts — Gemini returns usage_metadata
    input_tokens = 0
    output_tokens = 0
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        input_tokens = response.usage_metadata.prompt_token_count or 0
        output_tokens = response.usage_metadata.candidates_token_count or 0

    return text, input_tokens, output_tokens


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------

def extract_json(raw_text: str) -> dict:
    """
    Robustly extract JSON from LLM output.
    Handles markdown fences (```json ... ```) and bare JSON.
    Raises ValueError if no valid JSON found.
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", raw_text).strip()
    cleaned = cleaned.rstrip("`").strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object within surrounding text
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM response. Raw: {raw_text[:300]}")


# ---------------------------------------------------------------------------
# Cost calculation
# ---------------------------------------------------------------------------

def calculate_cost(input_tokens: int, output_tokens: int) -> float:
    """Return estimated cost in USD for a Gemini API call."""
    input_cost = (input_tokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS
    output_cost = (output_tokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS
    return round(input_cost + output_cost, 6)
