#!/bin/sh
# Run the app locally (requires: pip install -r requirements.txt)
cd "$(dirname "$0")"
uvicorn app.main:app --reload --port 8000
