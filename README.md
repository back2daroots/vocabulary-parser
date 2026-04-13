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

### 1. Prerequisites

- **Docker Desktop** for Mac ([docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)). Works on Apple Silicon (M1/M2) and Intel.
- No need to install Node.js or LibreOffice on your machine; they run inside the container.

### 2. Build and run

From the project directory:

```bash
cd /Users/rutz/vocabulary-parser
docker compose up --build
```

The first run will build the image (install Node, LibreOffice, dependencies, compile TypeScript). Later runs are quick.

When you see something like:

```
web  | Vocabulary parser listening on http://0.0.0.0:3000
```

the app is ready.

### 3. Open the app

In your browser go to: **http://localhost:3000**

- Choose a **PDF**, **DOC**, or **DOCX** file with lines like `word - translation`.
- Click **Parse**.
- Check the preview table and click **Download .txt** for the UTF-8 file.

### 4. Quick checks (testing)

**Health endpoint:**

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

**Parse API** (replace `sample.pdf` with a real file):

```bash
curl -X POST -F "file=@sample.pdf" http://localhost:3000/api/parse
# → JSON with pairs, txt, warnings, stats
```

**Stop the app:** `Ctrl+C` in the terminal, or in another terminal:

```bash
docker compose down
```

---

## Running unit tests

Unit tests use **Vitest** and don’t need Docker. Run them on your machine:

```bash
cd /Users/rutz/vocabulary-parser
npm install
npm run test
```

You need Node.js 18+ and npm. Tests cover parsing (hyphen separator, comma/slash synonyms, dedupe, skips, etc.).

To run tests **inside Docker** (e.g. same Node version as production), mount the project and install dev deps in the container:

```bash
docker compose run --rm -v "$(pwd)":/app web sh -c "npm install --include=dev && npx vitest run"
```

(Your image does not include test files by default, so the volume mount is needed.)

---

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

### Docker build fails at `npm install` (exit code 1)

- **See the real error:** Run a clean build and capture the log:
  ```bash
  docker compose build --no-cache --progress=plain 2>&1 | tee build.log
  ```
  Open `build.log` and search for the first `npm ERR!` or error line above the "exit code 1" message.

- **Network/timeout:** If the error mentions `EAI_AGAIN`, `ETIMEDOUT`, or registry, retry after a few minutes or check your network/VPN. In Docker Desktop, increase timeout or use a different DNS if needed.

- **Memory:** If the build dies during install (no clear error), give Docker more memory (Docker Desktop → Settings → Resources).

- **Build tools:** The Dockerfile already installs `python3`, `make`, and `g++` so optional native modules can compile. If your error is about "node-gyp" or "gyp", ensure you’re using the updated Dockerfile that includes those packages.

- **Reproducible install:** From the project root run `npm install` once on your machine to generate `package-lock.json`, commit it, and rebuild. That locks dependency versions and can avoid bad resolutions in Docker.

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
