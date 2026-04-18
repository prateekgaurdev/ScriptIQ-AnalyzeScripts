"""
Preprocessor — cleans raw script text before passing to the pipeline.
Handles paste input, .txt files, and extracted PDF text.
"""

import re


def preprocess_script(raw_text: str) -> str:
    """
    Clean raw script text:
    - Normalize line endings
    - Remove excessive blank lines (max 2 consecutive)
    - Strip leading/trailing whitespace per line
    - Remove null bytes and non-printable characters
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("Script text is empty")

    # Normalize line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove null bytes and non-printable chars (except newline and tab)
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", "", text)

    # Strip each line
    lines = [line.rstrip() for line in text.split("\n")]

    # Collapse runs of more than 2 blank lines into 2
    cleaned_lines = []
    blank_count = 0
    for line in lines:
        if line.strip() == "":
            blank_count += 1
            if blank_count <= 2:
                cleaned_lines.append(line)
        else:
            blank_count = 0
            cleaned_lines.append(line)

    result = "\n".join(cleaned_lines).strip()

    if len(result) < 50:
        raise ValueError(
            f"Script too short after preprocessing ({len(result)} chars). "
            "Please provide a complete script."
        )

    return result


def count_words(text: str) -> int:
    return len(text.split())
