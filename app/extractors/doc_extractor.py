"""Convert DOC to DOCX using LibreOffice, then extract text."""

import subprocess
from pathlib import Path

from .docx_extractor import extract_text_from_docx


def extract_text_from_doc(file_path: Path, outdir: Path) -> str:
    """
    Convert DOC to DOCX using LibreOffice headless, then extract text.
    outdir: directory for the converted file (e.g. /tmp).
    """
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            "soffice",
            "--headless",
            "--convert-to",
            "docx",
            "--outdir",
            str(outdir),
            str(file_path),
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        stderr = result.stderr or "(no stderr)"
        raise RuntimeError(
            f"LibreOffice conversion failed (exit {result.returncode}): {stderr}"
        )

    docx_name = file_path.stem + ".docx"
    docx_path = outdir / docx_name

    if not docx_path.exists():
        raise RuntimeError(
            f"LibreOffice did not produce expected file: {docx_path}"
        )

    try:
        return extract_text_from_docx(docx_path)
    finally:
        docx_path.unlink(missing_ok=True)
