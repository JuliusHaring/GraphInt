#!/bin/sh
set -e

npm run test:unit
npm run fl

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo ""
  echo "Release aborted: format/lint modified files."
  echo "Review the changes, commit them, and re-run the release."
  exit 1
fi
