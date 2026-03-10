"""Extract text from PDF files using pdfplumber, with pypdf fallback."""

from pathlib import Path

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
        with pdfplumber.open(file_path) as pdf:
            parts: list[str] = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    parts.append(text)
            return "\n".join(parts) if parts else ""
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
