# Prompt Changelog

This file tracks iteration history for all prompts in the pipeline.
Prompt engineering is treated as a first-class engineering discipline here —
changes are reasoned, versioned, and their impact is documented.

---

## Parser Prompt (`parser_prompt.py`)

### v1 → v2
**Problem:** LLM was resetting `beat_number` to 1 at the start of each scene.
This broke the emotional arc chart since beat numbers weren't globally unique.

**Fix:** Added explicit rule — *"beat_number must be globally sequential across ALL scenes (not reset per scene)"*

**Result:** Consistent beat indexing across all test scripts.

---

### v2 → v3
**Problem:** On short scripts (< 300 words), the model returned a single
vague `emotional_note` like "mixed emotions" for every scene.

**Fix:** Constrained `emotional_note` to a fixed vocabulary:
`joy / grief / tension / fear / love / anger / suspense / hope / despair / calm`

**Result:** Consistent, chart-renderable emotion labels. Eliminated
free-text values that broke Plotly color mapping.

---

## Analyst Prompts (`analyst_prompts.py`)

### v1 — Single universal prompt
Used one prompt for all genres with generic engagement factors.

**Problem:** A romance script scored low on "tension" and high on "conflict"
in ways that were technically correct but meaningless for the genre.
The scores weren't useful for a content intelligence tool.

**Root cause:** Engagement is genre-dependent. A thriller's engagement
levers (stakes, danger escalation) are entirely different from a
romance's (chemistry, emotional pull).

---

### v1 → v2 — Genre-specific rubrics
Split into 4 genre-specific prompts, each with a tailored engagement rubric.

| Genre | Key factors added |
|---|---|
| Thriller | `stakes`, `tension` (with release-rebuild framing) |
| Romance | `chemistry`, `emotional_pull`, `resolution_setup` |
| Drama | `authenticity`, `character_depth`, `emotional_impact` |
| Comedy | `timing`, `subversion`, `escalation` |

**Result:** Engagement scores became meaningfully differentiated across genres.
A 7.2 on a romance now means something different — and more useful —
than a 7.2 on a thriller.

---

## Genre Detector Prompt (`genre_detector.py`)

### v1 — Current version
Deliberately minimal — single-word output only.

**Design decision:** Kept this prompt as a lightweight classifier, not an analyzer.
Explanation was explicitly removed to force a clean label output.
This avoids JSON parsing on a detection step that doesn't need it.

**Known limitation:** Hybrid genre scripts (e.g., romantic thriller) will
lose secondary genre signal. Acceptable tradeoff for pipeline simplicity.
A future improvement would be a confidence-weighted multi-label classifier.
