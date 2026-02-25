# Vocabulary Parser

Parse vocabulary pairs from uploaded **PDF**, **DOC**, and **DOCX** files and download a UTF-8 `.txt` file. Pairs are expected in the form <code>word - translation</code> (hyphen, usually with spaces). Two synonyms can be given as <code>word - trans1, trans2</code> or <code>word - trans1 / trans2</code>.

## Publishing to GitHub

1. **Create a new repository** on GitHub: [github.com/new](https://github.com/new)  
   - Name it e.g. `vocabulary-parser`, leave it empty (no README).

2. **From your machine**, open a terminal in this project and run:

```bash
cd /Users/rutz/vocabulary-parser

# If this folder is not yet a git repo (no .git, or you want a fresh repo):
git init
git add -A
git commit -m "Initial commit: vocabulary parser app (PDF/DOC/DOCX to .txt pairs)"

# Add your GitHub repo (replace YOUR_USER with your GitHub username)
git remote add origin https://github.com/YOUR_USER/vocabulary-parser.git
git branch -M main
git push -u origin main
```

Or use the script (after creating the repo on GitHub):

```bash
cd /Users/rutz/vocabulary-parser
chmod +x push-to-github.sh
./push-to-github.sh YOUR_USER/vocabulary-parser
```

If `vocabulary-parser` is inside another git repo (e.g. your home directory), run the commands above from a copy of the project outside that repo, or use `git init` only inside `vocabulary-parser` so the inner `.git` is used.

## Quick start

```bash
docker compose up --build
```

Then open **http://localhost:3000** in your browser.

- **Upload** a file (PDF, DOC, or DOCX).
- Click **Parse** to extract pairs.
- Review the **preview table** and **Download .txt** for the result.

The app runs on **port 3000** (configurable via `PORT`).

## Supported formats and limitations

| Format | Support |
|--------|--------|
| **PDF** | Text-based PDFs only. Extracted via `pdf-parse`. |
| **DOCX** | Full support via Mammoth (raw text extraction). |
| **DOC** | Converted to DOCX using LibreOffice headless inside the container, then parsed. |

**Known limitations:**

- **Scanned PDFs** do not work (no OCR in this MVP). Only PDFs with selectable/copyable text are supported.
- **Handwriting** is not supported (no OCR).
- **DOC** conversion depends on LibreOffice installed in the container; complex or very old .doc layouts may differ after conversion.

## Output format

The downloaded `.txt` file is UTF-8 encoded. Each line is one vocabulary pair:

- One translation:  
  `"word";"translation"`
- Two translations (synonyms):  
  `"word";"translation1";"translation2"`

Double quotes inside a field are escaped by doubling them (CSV-style). Example:

```
"a dog";"собака"
"say ""hi""";"сказать ""привет"""
"hello";"привет";"здравствуй"
```

## Parsing rules (summary)

- **Separator** between word and translation: hyphen <code>-</code> only (with flexible spaces around it).
- **Word side**: may include articles (a/an/the), multi-word phrases, apostrophes, hyphens, slashes.
- **Translation side**: single word or two synonyms separated by a comma or slash (<code>,</code> or <code>/</code>); more than two items are truncated to the first two (a warning is shown).
- **Deduplication**: exact same normalized pair (same word + same translation(s)) is kept only once (first occurrence).
- **Skipped**: empty lines, page numbers only, lines without a valid separator or without letters on both sides.

## API

- **`POST /api/parse`**  
  - Content-Type: `multipart/form-data` with a `file` field.  
  - Response: JSON with `pairs`, `txt`, `warnings`, and `stats` (e.g. `totalFound`, `kept`, `duplicatesRemoved`, `skippedLines`, `truncatedSynonyms`).  
  - The UI triggers download of the `.txt` from the `txt` field.

- **`GET /health`**  
  - Returns `{ "status": "ok" }` for health checks.

## Tech stack

- **Backend**: Node.js 20, Fastify, TypeScript.
- **Parsing**: `pdf-parse` (PDF), `mammoth` (DOCX), LibreOffice headless (DOC → DOCX).
- **Frontend**: Static HTML + vanilla JS, no framework.
- **Docker**: `node:20-bookworm-slim` with LibreOffice; multi-arch (linux/amd64 and linux/arm64 for Apple Silicon).

## Development (without Docker)

```bash
npm install
npm run dev    # listen on http://localhost:3000
npm run test   # run unit tests
```

## Troubleshooting

### DOC conversion fails or produces empty text

- Ensure the container has LibreOffice (`soffice`). The Dockerfile installs `libreoffice-writer` and `libreoffice-common`.
- If you run without Docker, DOC conversion will fail unless LibreOffice is installed on the host (e.g. `brew install --cask libreoffice` on macOS). For local dev, use DOCX or PDF to avoid relying on LibreOffice.
- Very old or corrupted .doc files may not convert correctly; try re-saving as DOCX and upload that.

### Apple Silicon (M1/M2)

- Use `docker compose up --build`. The base image `node:20-bookworm-slim` is multi-arch; Docker will pull the correct image for your platform.
- If you see platform errors, ensure Docker Desktop is set to use the native architecture for the image.

### Port already in use

- Change the port: `PORT=8080 docker compose up --build` or set `ports: ["8080:3000"]` in `docker-compose.yml` and use http://localhost:8080.

## Example input → output

**Input (in your PDF/DOC/DOCX):**

```
a dog - собака
the cat - кот
hello - привет, здравствуй
```

**Output (.txt):**

```
"a dog";"собака"
"the cat";"кот"
"hello";"привет";"здравствуй"
```
