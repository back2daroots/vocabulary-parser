"""API tests for FastAPI convert endpoint."""

from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_index():
    """GET / returns HTML."""
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "Doc to Reword" in r.text


def test_convert_requires_file():
    """POST /api/convert without file returns 422."""
    r = client.post("/api/convert", data={"mode": "keep"})
    assert r.status_code == 422


def test_convert_unsupported_format():
    """POST /api/convert with unsupported format returns 400."""
    r = client.post(
        "/api/convert",
        files={"file": ("test.xyz", BytesIO(b"x"), "application/octet-stream")},
        data={"mode": "keep"},
    )
    assert r.status_code == 400


def _make_docx_bytes(*paragraphs: str) -> bytes:
    from docx import Document
    from io import BytesIO

    doc = Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_convert_txt_returns_pairs():
    """Convert a simple DOCX and get pairs."""
    content = _make_docx_bytes("hello - привет", "world – мир")
    r = client.post(
        "/api/convert",
        files={"file": ("test.docx", BytesIO(content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"mode": "keep"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["pairs_count"] == 2
    assert "file_content" in data
    assert '"hello";"привет"' in data["preview"]
    assert '"world";"мир"' in data["preview"]


def test_convert_returns_file_content():
    """Convert response includes full file content for download."""
    content = _make_docx_bytes("test - тест")
    r = client.post(
        "/api/convert",
        files={"file": ("test.docx", BytesIO(content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"mode": "keep"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "file_content" in data
    assert '"test";"тест"' in data["file_content"]
