#!/bin/sh
# Run this from the vocabulary-parser directory to prepare and push to GitHub.
# Usage:
#   cd /Users/rutz/vocabulary-parser
#   chmod +x push-to-github.sh
#   ./push-to-github.sh
#
# You must create the repository on GitHub first (e.g. github.com/YOUR_USER/vocabulary-parser)
# and set GITHUB_REPO below, or pass it: ./push-to-github.sh YOUR_USER/vocabulary-parser

set -e
cd "$(dirname "$0")"

GITHUB_REPO="${1:-}"

if [ -z "$GITHUB_REPO" ]; then
  echo "Usage: $0 GITHUB_USER/REPO_NAME"
  echo "Example: $0 myusername/vocabulary-parser"
  echo ""
  echo "Create the repo on GitHub first: https://github.com/new (empty repo, no README)"
  exit 1
fi

if [ ! -d .git ]; then
  git init
  git add -A
  git commit -m "Initial commit: vocabulary parser app (PDF/DOC/DOCX to .txt pairs)"
else
  git add -A
  if git diff --cached --quiet 2>/dev/null; then
    echo "Nothing to commit."
  else
    git commit -m "Update vocabulary parser"
  fi
fi

if ! git remote get-url origin 2>/dev/null; then
  git remote add origin "https://github.com/${GITHUB_REPO}.git"
  echo "Added remote origin: https://github.com/${GITHUB_REPO}.git"
fi

echo "Pushing to GitHub..."
git branch -M main
git push -u origin main
echo "Done. Open https://github.com/${GITHUB_REPO}"