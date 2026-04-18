"""
Samples router — serves preloaded sample scripts for demo/testing.

GET /samples         → list of available samples
GET /samples/{name}  → content of a specific sample
"""

import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/samples", tags=["samples"])

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sample_scripts")


# Hardcoded metadata for demo samples to match frontend expectations
SAMPLE_METADATA = {
    "the_last_message.txt": {
        "genre": "thriller",
        "blurb": "A whistleblower faces off against a powerful executive in a dark parking garage.",
    },
    "same_time_next_year.txt": {
        "genre": "romance",
        "blurb": "Two people meet at the same cabin every year, despite their separate lives.",
    },
    "what_we_dont_say.txt": {
        "genre": "drama",
        "blurb": "A family reunion uncovers secrets that have been buried for decades.",
    },
}

@router.get("")
def list_samples():
    """Return list of available sample script names with metadata."""
    try:
        files = [f for f in os.listdir(SAMPLES_DIR) if f.endswith(".txt")]
        samples = []
        for f in sorted(files):
            meta = SAMPLE_METADATA.get(f, {"genre": "drama", "blurb": "A sample script."})
            samples.append({
                "id": f,
                "name": f,
                "title": f.replace("_", " ").replace(".txt", "").title(),
                "genre": meta["genre"],
                "blurb": meta["blurb"],
            })
        return {"samples": samples}
    except FileNotFoundError:
        return {"samples": []}


@router.get("/{filename}")
def get_sample(filename: str):
    """Return the text content of a sample script."""
    if not filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt sample files are served.")

    # Prevent path traversal
    safe_name = os.path.basename(filename)
    path = os.path.join(SAMPLES_DIR, safe_name)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Sample '{safe_name}' not found.")

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    return {"filename": safe_name, "content": content}
