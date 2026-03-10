"""Tests for parsing module: dash variants, bullets, synonyms."""

import pytest

from app.parsing import parse_pairs


def test_dash_variants():
    """Recognize hyphen, en dash, em dash, minus."""
    text = """
hello - привет
world – мир
test — тест
minus − минус
"""
    pairs, skipped = parse_pairs(text, mode="keep")
    assert len(pairs) == 4
    assert pairs[0].source == "hello" and pairs[0].translation == "привет"
    assert pairs[1].source == "world" and pairs[1].translation == "мир"
    assert pairs[2].source == "test" and pairs[2].translation == "тест"
    assert pairs[3].source == "minus" and pairs[3].translation == "минус"


def test_bullets_and_numbering():
    """Remove bullet and numbering prefixes."""
    text = """
• apple - яблоко
1. banana - банан
2) cherry - вишня
(3) date - финик
- elderberry - бузина
* fig - инжир
"""
    pairs, _ = parse_pairs(text, mode="keep")
    assert len(pairs) >= 5
    assert pairs[0].source == "apple"
    assert pairs[1].source == "banana"
    assert pairs[2].source == "cherry"
    assert pairs[3].source == "date"
    assert pairs[4].source == "elderberry"


def test_synonym_keep():
    """Mode keep: full translation as-is."""
    text = "big - large, huge/sizable"
    pairs, _ = parse_pairs(text, mode="keep")
    assert len(pairs) == 1
    assert pairs[0].source == "big"
    assert pairs[0].translation == "large, huge/sizable"


def test_synonym_explode():
    """Mode explode: one line per synonym."""
    text = "big - large, huge/sizable"
    pairs, _ = parse_pairs(text, mode="explode")
    assert len(pairs) == 3
    assert all(p.source == "big" for p in pairs)
    translations = {p.translation for p in pairs}
    assert translations == {"large", "huge", "sizable"}


def test_hyphenated_word_skipped():
    """Split hyphenated words like 'well - being' should be skipped."""
    text = "well - being"
    pairs, skipped = parse_pairs(text, mode="keep")
    assert len(pairs) == 0
    assert skipped >= 1


def test_trailing_punctuation_removed():
    """Trailing . ; : removed from translation."""
    text = "word - translation.;:"
    pairs, _ = parse_pairs(text, mode="keep")
    assert len(pairs) == 1
    assert pairs[0].translation == "translation"


def test_extra_whitespace():
    """Allow extra whitespace around dash."""
    text = "  word   -   translation  "
    pairs, _ = parse_pairs(text, mode="keep")
    assert len(pairs) == 1
    assert pairs[0].source == "word"
    assert pairs[0].translation == "translation"
