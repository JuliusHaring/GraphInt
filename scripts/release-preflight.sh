#!/bin/sh
set -e

npm run test:unit

tree_before=$(git diff HEAD)
staged_before=$(git diff --cached)

npm run fl

tree_after=$(git diff HEAD)
staged_after=$(git diff --cached)

if [ "$tree_before" != "$tree_after" ] || [ "$staged_before" != "$staged_after" ]; then
  echo ""
  echo "Release aborted: format/lint modified files."
  echo "Review the changes, commit them, and re-run the release."
  exit 1
fi
