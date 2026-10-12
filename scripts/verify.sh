#!/usr/bin/env bash
# Build-test-fix loop: runs every check the project has, prints one PASS/FAIL line per step, and keeps each step's log
# in .verify/ (gitignored). Exit status is non-zero if any step failed, so it can gate a commit or CI job.
set -u
cd "$(dirname "$0")/.."
LOG_DIR=.verify
mkdir -p "$LOG_DIR"
fail=0
step() {
  local name="$1"; shift
  if "$@" > "$LOG_DIR/$name.log" 2>&1; then
    echo "PASS $name"
  else
    echo "FAIL $name  (log: $LOG_DIR/$name.log)"
    fail=1
  fi
}
step typegen npx next typegen
step typecheck npm run --silent typecheck
step lint npm run --silent lint
step unit npx vitest run --hookTimeout 120000 --testTimeout 60000
step build npx next build
exit $fail
