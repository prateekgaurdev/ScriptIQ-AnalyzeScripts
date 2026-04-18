from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import uuid
from src.services.gemini_client import transcribe_audio, init_gemini

router = APIRouter(prefix="/voice", tags=["voice"])

# Ensure temp directory exists
TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """
    Receives an audio blob, saves it temporarily, transcribes with Gemini, 
    and returns the diarized text.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Save temp file
    file_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1] if "." in file.filename else "webm"
    temp_path = os.path.join(TEMP_DIR, f"{file_id}.{extension}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Initialize Gemini if not already
        init_gemini()

        # Transcribe
        transcript = transcribe_audio(temp_path)
        
        return {"transcript": transcript}

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
