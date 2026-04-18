"""
Compare router — runs the full pipeline on two scripts and returns
both analyses side by side.

POST /compare
"""

import logging
import asyncio
from typing import Optional

import fitz
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.pipeline.graph import run_pipeline
from src.utils.preprocessor import preprocess_script

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compare", tags=["compare"])


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


async def _read_upload(file: Optional[UploadFile], text: Optional[str]) -> str:
    if text and text.strip():
        return text
    if file:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            return extract_text_from_pdf(content)
        return content.decode("utf-8", errors="replace")
    raise HTTPException(status_code=400, detail="Each script requires text or a file.")


@router.post("")
async def compare_scripts(
    script_a_text: Optional[str] = Form(None),
    script_b_text: Optional[str] = Form(None),
    file_a: Optional[UploadFile] = File(None),
    file_b: Optional[UploadFile] = File(None),
):
    """
    Run both scripts through the full pipeline concurrently.
    Returns side-by-side analysis for comparison mode in the UI.
    """
    raw_a = await _read_upload(file_a, script_a_text)
    raw_b = await _read_upload(file_b, script_b_text)

    try:
        clean_a = preprocess_script(raw_a)
        clean_b = preprocess_script(raw_b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Run both pipelines concurrently in thread pool
    loop = asyncio.get_event_loop()
    state_a, state_b = await asyncio.gather(
        loop.run_in_executor(None, run_pipeline, clean_a, getattr(file_a, "filename", None)),
        loop.run_in_executor(None, run_pipeline, clean_b, getattr(file_b, "filename", None)),
    )

    def serialize(state, label: str):
        if not state.get("is_complete") or state.get("analysis") is None:
            return {
                "label": label,
                "success": False,
                "errors": state.get("errors", []),
            }
        return {
            "label": label,
            "success": True,
            "genre": state.get("detected_genre"),
            "analysis": state["analysis"].model_dump(),
        }

    return {
        "script_a": serialize(state_a, "Script A"),
        "script_b": serialize(state_b, "Script B"),
    }
