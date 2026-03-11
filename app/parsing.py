"""
Pair detection and cleaning from extracted document text.
Recognizes dash-separated word-translation pairs.
"""

import re
from dataclasses import dataclass
from typing import Literal

# Dash variants: hyphen, en dash, em dash, minus
DASH_PATTERN = re.compile(r"[\-\u2013\u2014\u2212]")

# URL detection: we skip these lines entirely (they often contain '-' inside domains/paths).
URL_MARKER = re.compile(r"(https?://|www\.)", re.IGNORECASE)

# Bullets/numbering prefixes to strip
BULLET_PREFIX = re.compile(
    r"^\s*(?:[\u2022\u2023\u25E6\u2043\u2219\-\*\•]|\d+[\.\)]|\(\d+\))\s*",
    re.UNICODE,
)

# Trailing punctuation to remove from translation
TRAILING_PUNCT = re.compile(r"[\s\.;:]+$")


@dataclass
class WordPair:
    """A source word/phrase and its translation."""

    source: str
    translation: str


def _split_synonyms(translation: str) -> list[str]:
    """Split translation by comma and/or slash, trim each part."""
    parts = re.split(r"[,/]", translation)
    parts = [p.strip() for p in parts if p.strip()]
    return parts if parts else [translation.strip()] if translation.strip() else []


def _looks_like_split_hyphenated(left: str, right: str) -> bool:
    """Both sides are short, single words, all-ASCII alpha - likely 'well - being'."""
    if " " in left or " " in right or "," in right or "/" in right:
        return False
    if len(left) > 8 or len(right) > 8:
        return False
    return left.isalpha() and right.isalpha() and left.isascii() and right.isascii()


def _is_likely_false_positive(
    line: str, left: str, right: str, dash_match: re.Match
) -> bool:
    """
    Heuristic to ignore hyphenated words like "well - being" (split compound).
    - If no spaces around dash: require right has sep and left short to keep.
    - If spaces around dash: also skip when both sides look like split hyphenated.
    """
    start, end = dash_match.span()
    space_before = start > 0 and line[start - 1].isspace()
    space_after = end < len(line) and line[end].isspace()

    if space_before or space_after:
        if _looks_like_split_hyphenated(left.strip(), right.strip()):
            return True  # "well - being" style
        return False  # spaces around dash - keep

    # No spaces around dash - could be hyphenated word
    right_has_sep = any(c in right for c in " ,/")
    left_short = len(left.strip()) <= 20
    if right_has_sep and left_short:
        return False  # keep (e.g. "word - a, b")
    return True  # likely false positive (e.g. "well-being")


def _clean_translation(s: str) -> str:
    """Trim and remove trailing punctuation."""
    s = s.strip()
    s = TRAILING_PUNCT.sub("", s)
    return s.strip()


def _clean_source(s: str) -> str:
    """Remove bullet/numbering prefix and trim."""
    s = BULLET_PREFIX.sub("", s)
    return s.strip()


def parse_pairs(
    text: str,
    mode: Literal["keep", "explode"] = "keep",
) -> tuple[list[WordPair], int]:
    """
    Extract word pairs from text where a dash separates source and translation.
    Returns (pairs, skipped_count).
    """
    pairs: list[WordPair] = []
    skipped = 0

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Skip link-like lines (common in worksheets/exports); these frequently contain hyphens
        # that would be misinterpreted as "word - translation".
        if URL_MARKER.search(line):
            skipped += 1
            continue

        # Strip bullets/numbering from the whole line before searching for the separator dash.
        # This prevents cases like "- elderberry - бузина" from being mis-split on the bullet.
        line = BULLET_PREFIX.sub("", line).strip()
        if not line:
            continue

        # Find dash (prefer one with spaces around)
        dash_match = DASH_PATTERN.search(line)
        if not dash_match:
            continue

        idx = dash_match.start()
        left = line[:idx].strip()
        right = line[dash_match.end() :].strip()

        if not left or not right:
            skipped += 1
            continue

        # Heuristic: avoid hyphenated words
        if _is_likely_false_positive(line, left, right, dash_match):
            skipped += 1
            continue

        left = _clean_source(left)
        right = _clean_translation(right)

        if not left or not right:
            skipped += 1
            continue

        if mode == "keep":
            pairs.append(WordPair(source=left, translation=right))
        else:
            synonyms = _split_synonyms(right)
            if synonyms:
                for syn in synonyms:
                    if syn:
                        pairs.append(WordPair(source=left, translation=syn))
            else:
                pairs.append(WordPair(source=left, translation=right))

    return pairs, skipped
