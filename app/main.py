"""
FastAPI app for Doc-to-Reword conversion.
"""

import tempfile
from pathlib import Path
from typing import Callable

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .extractors import extract_text_from_doc, extract_text_from_docx, extract_text_from_pdf
from .parsing import parse_pairs
from .reword_format import format_output

# Limit upload size: 20MB
MAX_UPLOAD_SIZE = 20 * 1024 * 1024

app = FastAPI(title="Doc to Reword Converter")
_templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def _get_extractor_and_ext(original_filename: str) -> tuple[Callable[[Path], str], str]:
    """Return (extractor_func, expected_extension)."""
    lower = original_filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf, ".pdf"
    if lower.endswith(".docx"):
        return extract_text_from_docx, ".docx"
    if lower.endswith(".doc"):
        return lambda p: extract_text_from_doc(p, Path(tempfile.gettempdir())), ".doc"
    raise HTTPException(
        status_code=400,
        detail="Unsupported format. Use PDF, DOCX, or DOC.",
    )


def _convert(
    file_path: Path,
    mode: str,
    extractor,
) -> tuple[str, int, int]:
    """
    Extract text, parse pairs, format output.
    Returns (formatted_text, pairs_count, skipped_count).
    """
    text = extractor(file_path)
    pairs, skipped = parse_pairs(text, mode=mode)
    formatted = format_output(pairs)
    return formatted, len(pairs), skipped


@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main UI. HEAD allowed for health checks."""
    if request.method == "HEAD":
        return Response(status_code=200)
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
@app.head("/health")
async def health():
    """Health check for load balancers and monitors."""
    return {"status": "ok"}


@app.post("/api/convert")
async def convert(
    file: UploadFile = File(...),
    mode: str = Form("keep"),
):
    """
    Convert uploaded document to Reword format.
    Returns JSON with file content, stats, and preview.
    """
    if mode not in ("keep", "explode"):
        raise HTTPException(status_code=400, detail="mode must be 'keep' or 'explode'")

    # Check size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
        )

    try:
        extractor, _ = _get_extractor_and_ext(file.filename or "")
    except HTTPException:
        raise

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        ext = Path(file.filename or "doc").suffix.lower()
        upload_path = tmp / f"upload{ext}"
        upload_path.write_bytes(content)

        try:
            formatted, pairs_count, skipped = _convert(upload_path, mode, extractor)
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

    # Preview: first 20 lines
    lines = formatted.split("\n")
    preview_lines = lines[:20]
    preview = "\n".join(preview_lines)

    return {
        "file_content": formatted,
        "pairs_count": pairs_count,
        "skipped_count": skipped,
        "preview": preview,
    }


# Mount static files if present
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
