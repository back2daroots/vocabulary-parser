"""Tests for DOCX extraction including tables."""

import pytest

from app.extractors import extract_text_from_docx


def test_docx_table_extraction(docx_with_table):
    """Extract text from table cells."""
    text = extract_text_from_docx(docx_with_table)
    assert "word" in text
    assert "перевод" in text
    assert "phrase" in text
    assert "фраза" in text
    assert "item" in text
    assert "элемент" in text
