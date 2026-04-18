"""
Analyze router — two endpoints:
  POST /analyze        → full pipeline run, returns JSON
  GET  /analyze/stream → SSE stream, emits node-by-node progress
"""

import asyncio
import json
import logging
from typing import Optional

import fitz  # PyMuPDF
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from src.pipeline.graph import run_pipeline
from src.pipeline.state import ScriptAnalysisState
from src.utils.preprocessor import preprocess_script

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def _state_to_response(state: ScriptAnalysisState) -> dict:
    """Serialize final pipeline state into API response dict."""
    if not state.get("is_complete") or state.get("analysis") is None:
        errors = state.get("errors", [])
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Pipeline failed to produce a valid analysis.",
                "errors": errors,
            },
        )

    analysis = state["analysis"]
    return {
        "success": True,
        "genre": state.get("detected_genre"),
        "analysis": analysis.model_dump(),
    }


# ---------------------------------------------------------------------------
# POST /analyze — standard JSON response
# ---------------------------------------------------------------------------

@router.post("")
async def analyze_script(
    script_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Accepts either:
      - script_text: pasted script string (form field)
      - file: uploaded .txt or .pdf file

    Returns full FullAnalysis JSON.
    """
    raw_text = await _resolve_input(script_text, file)

    try:
        clean_text = preprocess_script(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = file.filename if file else None

    try:
        final_state = run_pipeline(clean_text, filename=filename)
    except Exception as e:
        logger.exception("[analyze] Unhandled pipeline error")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    return _state_to_response(final_state)


# ---------------------------------------------------------------------------
# GET /analyze/stream — SSE streaming with live node progress
# ---------------------------------------------------------------------------

@router.post("/stream")
async def analyze_script_stream(
    script_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Same as POST /analyze but streams progress via Server-Sent Events.

    SSE event format:
      data: {"event": "node_start",    "node": "genre_detector", "message": "..."}
      data: {"event": "node_complete", "node": "genre_detector", "result": {...}}
      data: {"event": "complete",      "analysis": {...}}
      data: {"event": "error",         "message": "..."}
    """
    raw_text = await _resolve_input(script_text, file)

    try:
        clean_text = preprocess_script(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = file.filename if file else None

    async def event_generator():
        node_messages = {
            "genre_detector":    "Detecting script genre...",
            "prompt_router":     "Selecting analysis strategy...",
            "script_parser":     "Parsing scenes and beats (Stage 1)...",
            "validate_parse":    "Validating parsed structure...",
            "story_analyst":     "Analysing story, tone and engagement (Stage 2)...",
            "validate_analysis": "Validating final analysis...",
        }

        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        # Use an asyncio queue to communicate between the sync graph execution and the async generator
        queue = asyncio.Queue()

        def producer():
            """Runs in a separate thread to avoid blocking the event loop."""
            from src.pipeline.graph import get_graph
            graph = get_graph()
            
            initial_state: ScriptAnalysisState = {
                "raw_script": clean_text,
                "filename": filename,
                "detected_genre": None,
                "parsed_script": None,
                "parse_retry_count": 0,
                "parse_error": None,
                "analysis": None,
                "analysis_retry_count": 0,
                "analysis_error": None,
                "stage1_tokens": 0,
                "stage2_tokens": 0,
                "current_node": None,
                "errors": [],
                "is_complete": False,
            }

            try:
                # Iterate through graph updates as they happen
                for chunk in graph.stream(initial_state):
                    loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk))
                
                # We need the final accumulated state. 
                # LangGraph stream() usually provides the final state or we can infer it.
                # Since graph.invoke is easier for final state, we'll rely on the cumulative nature.
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

        try:
            loop = asyncio.get_event_loop()
            loop.run_in_executor(None, producer)

            final_accumulated_state = None
            
            # The sequence of nodes for better UX flow
            pipeline_order = [
                "genre_detector",
                "prompt_router",
                "script_parser",
                "validate_parse",
                "story_analyst",
                "validate_analysis"
            ]
            
            # Start the first node immediately
            yield sse({"event": "node_start", "node": pipeline_order[0], "message": node_messages[pipeline_order[0]]})

            while True:
                status, data = await queue.get()
                
                if status == "chunk":
                    for node_name, state_update in data.items():
                        if final_accumulated_state is None:
                            final_accumulated_state = state_update
                        else:
                            final_accumulated_state.update(state_update)
                        
                        # Node complete
                        msg = node_messages.get(node_name, f"Running {node_name}...")
                        yield sse({"event": "node_complete", "node": node_name, "message": msg})
                        
                        # Start next node in sequence if any
                        try:
                            idx = pipeline_order.index(node_name)
                            if idx < len(pipeline_order) - 1:
                                next_node = pipeline_order[idx + 1]
                                yield sse({"event": "node_start", "node": next_node, "message": node_messages[next_node]})
                        except ValueError:
                            pass # Unknown node, skip sequence logic
                
                elif status == "done":
                    # Final result
                    if final_accumulated_state and final_accumulated_state.get("is_complete") and final_accumulated_state.get("analysis"):
                        analysis = final_accumulated_state["analysis"]
                        yield sse({
                            "event": "complete",
                            "genre": final_accumulated_state.get("detected_genre"),
                            "analysis": analysis.model_dump(),
                        })
                    else:
                        errors = final_accumulated_state.get("errors", []) if final_accumulated_state else []
                        yield sse({
                            "event": "error",
                            "message": "Pipeline failed to produce a valid analysis.",
                            "errors": errors,
                        })
                    break
                
                elif status == "error":
                    yield sse({"event": "error", "message": data})
                    break

        except Exception as e:
            logger.exception("[stream] Unhandled error")
            yield sse({"event": "error", "message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# ---------------------------------------------------------------------------
# Shared input resolver
# ---------------------------------------------------------------------------

async def _resolve_input(
    script_text: Optional[str],
    file: Optional[UploadFile],
) -> str:
    if script_text and script_text.strip():
        return script_text

    if file:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            return extract_text_from_pdf(content)
        return content.decode("utf-8", errors="replace")

    raise HTTPException(
        status_code=400,
        detail="Provide either script_text or a file upload (.txt or .pdf).",
    )
