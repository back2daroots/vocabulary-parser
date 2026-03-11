"""Extract text from PDF files using pdfplumber, with pypdf fallback."""

from pathlib import Path
import warnings

from pypdf import PdfReader


def extract_text_from_pdf(file_path: Path) -> str:
    """
    Extract text from a PDF file.
    Uses pdfplumber first for better extraction; falls back to pypdf if needed.
    """
    try:
        import pdfplumber
    except ImportError:
        return _extract_with_pypdf(file_path)

    try:
        # pdfplumber uses pdfminer.six under the hood which can emit noisy warnings for
        # some PDFs with malformed font descriptors (e.g. missing/invalid FontBBox).
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message=r".*FontBBox.*",
            )
            with pdfplumber.open(file_path) as pdf:
                parts: list[str] = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        parts.append(text)
                extracted = "\n".join(parts) if parts else ""

        # Some broken PDFs don't raise, but extraction returns empty/partial text.
        # In that case, try the pypdf extractor as a fallback.
        if not extracted.strip():
            return _extract_with_pypdf(file_path)
        return extracted
    except Exception:
        return _extract_with_pypdf(file_path)


def _extract_with_pypdf(file_path: Path) -> str:
    """Fallback extraction using pypdf."""
    reader = PdfReader(str(file_path))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts) if parts else ""
