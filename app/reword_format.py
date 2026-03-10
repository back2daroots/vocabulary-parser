"""
Format word pairs as Reword-compatible UTF-8 text.
Format: "word";"translation" with CSV-like quote escaping.
"""

from .parsing import WordPair


def escape_field(value: str) -> str:
    """Escape double quotes inside a field: " -> ""."""
    return value.replace('"', '""')


def format_line(pair: WordPair) -> str:
    """Format a single pair as "word";"translation"."""
    source = escape_field(pair.source)
    translation = escape_field(pair.translation)
    return f'"{source}";"{translation}"'


def format_output(pairs: list[WordPair]) -> str:
    """
    Format all pairs as UTF-8 text with \\n line endings.
    Each line: "word";"translation"
    """
    lines = [format_line(p) for p in pairs]
    return "\n".join(lines)
