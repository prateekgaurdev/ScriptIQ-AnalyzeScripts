# Bullet Script Analyzer

AI-powered script analysis system built for the Bullet AI Engineer take-home assignment.

**Stack:** React + Vite · FastAPI · LangGraph · Gemini 2.5 Flash · Pydantic · Recharts

---

## What It Does

Paste or upload a script (.txt or .pdf) and get:

- **Story overview** — narrative summary, detected genre, scene breakdown
- **Emotional arc** — beat-by-beat intensity line chart + 6-emotion radar chart
- **Engagement score** — composite 0–10 score with genre-specific factor breakdown
- **Improvement suggestions** — prioritized, area-tagged, actionable
- **Cliffhanger detection** — presence + effectiveness rating
- **Comparison mode** — two scripts side by side with overlaid radar chart
- **Cost tracker** — token usage + estimated USD cost per analysis

---

## Architecture

```
React Frontend (Vite + Tailwind)
        │
        │ HTTP / Server-Sent Events
        ▼
FastAPI Backend
        │
        ▼
LangGraph State Machine
        │
   ┌────┴─────────────────────────────────────┐
   │                                          │
[genre_detector] → [prompt_router]            │
        │                                     │
[script_parser]  → [validate_parse] ──retry──┤
        │                                     │
[story_analyst]  → [validate_analysis] ─retry┤
        │                                     │
      [END]                                   │
   └──────────────────────────────────────────┘
        │
   Gemini 1.5 Pro
```

### Why LangGraph?

A two-stage pipeline with conditional retry logic maps naturally to a state graph. LangGraph gives:

- **Typed state** — every node reads/writes a `ScriptAnalysisState` TypedDict. No implicit coupling between stages.
- **Retry edges** — `validate_parse` and `validate_analysis` nodes route back on failure without any manual loop logic.
- **Observability** — streaming via `graph.stream()` lets the React frontend show node-by-node progress via SSE.

A bare Python function chain could work for a happy-path demo. LangGraph is the right choice when you need retry, validation gating, and streaming without writing that plumbing yourself.

### Why Two Stages?

LLMs analyze better when given structured input rather than raw text. Stage 1 turns the script into a clean JSON breakdown (scenes, beats, characters). Stage 2 receives that structure and focuses entirely on analysis — not parsing.

Giving the analyst raw text produces generic, surface-level observations. Giving it a structured breakdown produces specific, beat-referenced analysis.

### Why Genre-Specific Prompts?

Engagement is genre-dependent. A thriller's engagement levers — stakes, tension cycles, danger escalation — are meaningless rubrics for a romance. Genre-specific prompts produce scores that are actually useful for content intelligence.

See [`backend/src/prompts/PROMPT_CHANGELOG.md`](backend/src/prompts/PROMPT_CHANGELOG.md) for full prompt iteration history.

---

## Project Structure

```
bullet-script-analyzer/
│
├── backend/
│   ├── main.py                        # FastAPI entry point + CORS
│   ├── routers/
│   │   ├── analyze.py                 # POST /analyze · POST /analyze/stream (SSE)
│   │   ├── compare.py                 # POST /compare (concurrent dual analysis)
│   │   └── samples.py                 # GET /samples · GET /samples/{filename}
│   │
│   └── src/
│       ├── pipeline/
│       │   ├── state.py               # ScriptAnalysisState TypedDict
│       │   ├── nodes.py               # 6 pure node functions
│       │   ├── edges.py               # Conditional retry routing
│       │   └── graph.py               # LangGraph builder + run_pipeline()
│       │
│       ├── prompts/
│       │   ├── genre_detector.py      # Single-word genre classifier
│       │   ├── parser_prompt.py       # Stage 1 prompt (v3)
│       │   ├── analyst_prompts.py     # 4 genre-specific prompts + router
│       │   └── PROMPT_CHANGELOG.md   # Prompt iteration history
│       │
│       ├── models/
│       │   ├── input_models.py        # ParsedScript, Scene, Beat, Character
│       │   └── output_models.py       # FullAnalysis, EmotionalArc, EngagementScore
│       │
│       ├── services/
│       │   └── gemini_client.py       # Gemini wrapper (swappable provider)
│       │
│       └── utils/
│           └── preprocessor.py        # Text cleaning + validation
│
├── frontend/
│   └── src/
│       ├── api/analyzeApi.js          # All fetch/axios calls
│       ├── hooks/useAnalysis.js       # Streaming state + compare state
│       └── components/
│           ├── UploadSection.jsx      # Paste / upload / sample picker
│           ├── StreamingLoader.jsx    # Live pipeline progress
│           ├── Sidebar.jsx            # Node status + cost + export
│           └── tabs/
│               ├── OverviewTab.jsx
│               ├── EmotionTab.jsx     # Line chart + radar
│               ├── EngagementTab.jsx  # Score ring + factor cards
│               ├── SuggestionsTab.jsx
│               └── CompareTab.jsx     # Dual input + comparison radar
│
├── Makefile
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Gemini API key ([get one here](https://aistudio.google.com/))

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### Frontend

```bash
cd frontend
npm install
```

### Run

```bash
# From repo root — starts both servers
make dev

# Or individually:
make dev-backend   # FastAPI on :8000
make dev-frontend  # Vite on :5173
```

Open [http://localhost:5173](http://localhost:5173)

### Test

```bash
make test
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Full analysis, returns JSON |
| `POST` | `/analyze/stream` | SSE stream, node-by-node progress |
| `POST` | `/compare` | Analyze two scripts concurrently |
| `GET`  | `/samples` | List preloaded sample scripts |
| `GET`  | `/samples/{filename}` | Get sample content |
| `GET`  | `/health` | Health check |

**Input:** `multipart/form-data` with either `script_text` (string) or `file` (.txt or .pdf).

**SSE events:**
```json
{"event": "node_complete", "node": "genre_detector", "message": "..."}
{"event": "complete", "genre": "thriller", "analysis": {...}}
{"event": "error", "message": "..."}
```

---

## Prompt Engineering

The prompts are the core of this system. Key decisions:

**Stage 1 (Parser):** Constrained `emotional_note` to a fixed vocabulary (`tension / joy / grief / ...`) rather than free text. Free text broke Recharts color mapping and produced vague outputs like "mixed feelings" on short scripts.

**Stage 2 (Analyst):** Separated into 4 genre-specific variants. A single universal prompt produced scores that were technically correct but practically useless — a romance scoring low on "stakes" tells you nothing useful about the script's actual quality.

**Genre detector:** Deliberately minimal — single-word output only. No JSON parsing on a step that doesn't need it. Falls back to `drama` on unexpected output.

Full iteration history with before/after examples: [`backend/src/prompts/PROMPT_CHANGELOG.md`](backend/src/prompts/PROMPT_CHANGELOG.md)

---

## Production Considerations

If this were a production system:

- **Caching** — Redis cache keyed on script hash. Same script = zero API cost on repeat.
- **Rate limiting** — Per-user limit on the `/analyze` endpoint to control Gemini spend.
- **Async pipeline** — `run_pipeline` is currently synchronous. Wrapping LangGraph in an async worker queue (Celery / ARQ) would allow concurrent requests without blocking FastAPI threads.
- **Model fallback** — `gemini_client.py` is a thin wrapper. Swapping to GPT-4o or Claude is a one-file change.
- **Structured output** — Gemini supports `response_schema` for enforced JSON. Currently using prompt-level JSON instructions + Pydantic validation + retry. Native schema enforcement would eliminate the retry loop in most cases.
- **Observability** — Add LangSmith or Langfuse tracing to capture per-node latency, token counts, and prompt versions in production runs.

---

## Sample Scripts

Three scripts are preloaded for demo purposes:

| Script | Genre | What it tests |
|--------|-------|---------------|
| `the_last_message.txt` | Thriller | Cliffhanger detection, tension arc |
| `same_time_next_year.txt` | Romance | Chemistry scoring, emotional pull |
| `what_we_dont_say.txt` | Drama | Character depth, authenticity scoring |
