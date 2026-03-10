# Doc to Reword Converter

A local-first web service that converts uploaded documents (PDF, DOCX, DOC) into UTF-8 `.txt` files formatted for [Reword](https://reword.com) app import.

## Quick Start

```bash
docker compose up --build
```

Then open **http://localhost:8000** in your browser.

## Usage

1. **Upload** a PDF, DOCX, or DOC file (max 20MB).
2. **Choose mode**:
   - **Keep** (default): Full translation string as-is (e.g. `"big, large/sizable"`).
   - **Explode**: One line per synonym (e.g. three lines for `big` → `large`, `huge`, `sizable`).
3. Click **Convert**.
4. **Download** the generated `vocabulary.txt`.

## Supported Input Formats

| Format | Extraction method |
|--------|-------------------|
| **PDF** | pdfplumber (fallback: pypdf) |
| **DOCX** | python-docx (paragraphs + tables) |
| **DOC** | LibreOffice headless conversion → DOCX |

## Parsing Rules

The tool extracts **word pairs** where a dash separates source and translation:

- **Dash variants**: `-`, `–`, `—`, `−` (hyphen, en dash, em dash, minus)
- **Patterns**: `word - translation`, `word – translation`, etc.
- **Bullets/numbering** are stripped: `•`, `1.`, `1)`, `(1)`, etc.
- **Hyphenated words** (e.g. `well-being`) are ignored to avoid false positives.

## Output Format (Reword)

- UTF-8 encoded `.txt`
- One vocabulary entry per line
- Format: `"word";"translation"`
- Quotes inside fields escaped as `""`
- Semicolons as separators (never commas)

## Limitations

- **DOC** conversion requires LibreOffice (included in Docker image).
- Complex PDF layouts may produce imperfect text extraction.
- Only dash-separated pairs are detected; other formats are not supported.

## Development

### Run locally (without Docker)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run tests

```bash
pytest
```

## Project Structure

```
doc-to-reword/
├── app/
│   ├── main.py           # FastAPI app + routes
│   ├── extractors/       # PDF, DOCX, DOC extractors
│   ├── parsing.py        # Pair detection + cleaning
│   ├── reword_format.py  # Output formatting
│   ├── templates/
│   └── static/
├── tests/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```
