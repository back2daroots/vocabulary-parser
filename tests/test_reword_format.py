"""Tests for reword_format: quote escaping and output format."""

from app.parsing import WordPair
from app.reword_format import escape_field, format_line, format_output


def test_escape_field():
    """Quotes inside fields must be escaped as ""."""
    assert escape_field('hello') == 'hello'
    assert escape_field('say "hi"') == 'say ""hi""'
    assert escape_field('""') == '""""'


def test_format_line():
    """Each line: "word";"translation"."""
    p = WordPair(source="hello", translation="привет")
    assert format_line(p) == '"hello";"привет"'


def test_format_line_with_quotes():
    """Quotes in fields are escaped."""
    p = WordPair(source='say "hi"', translation='скажи "привет"')
    assert format_line(p) == '"say ""hi""";"скажи ""привет"""'


def test_format_output():
    """Output uses \\n line endings, UTF-8 compatible."""
    pairs = [
        WordPair("a", "1"),
        WordPair("b", "2"),
    ]
    out = format_output(pairs)
    assert out == '"a";"1"\n"b";"2"'
    assert "\r" not in out
