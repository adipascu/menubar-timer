#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$ROOT"/site/* "$STAGE/"
cp "$ROOT/docs/popup-selection.png" "$STAGE/card.png"
wrangler pages deploy "$STAGE" --project-name timerbar --branch main --commit-dirty=true
