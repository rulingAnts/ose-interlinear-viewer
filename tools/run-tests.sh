#!/bin/sh
# ============================================================
# run-tests.sh — every test in tools/test/
# ============================================================
#
# Plain scripts, no framework, no npm install. Each test exits non-zero on
# failure and prints why. Called from .githooks/pre-commit alongside the
# checkers, and runnable by hand:
#
#     sh tools/run-tests.sh
#
# *.test.mjs runs under node. *.test.py needs python3 and is SKIPPED (not
# failed) when python3 is absent — the XSLT test is the only one, and it
# exists because node has no XSLT engine while two of the four exporters
# are XSLT. A skip is announced loudly so it is never silent.

cd "$(dirname "$0")/.." || exit 1

fail=0
ran=0

for t in tools/test/*.test.mjs; do
  [ -e "$t" ] || continue
  ran=$((ran + 1))
  echo "=== $t"
  node "$t" || fail=1
done

for t in tools/test/*.test.py; do
  [ -e "$t" ] || continue
  if command -v python3 >/dev/null 2>&1; then
    ran=$((ran + 1))
    echo "=== $t"
    python3 "$t" || fail=1
  else
    echo "=== $t"
    echo "  SKIP: python3 not found — XSLT exporter coverage not run"
  fi
done

if [ "$ran" -eq 0 ]; then
  echo "run-tests: no tests found in tools/test/ — that is almost certainly wrong" >&2
  exit 1
fi

[ "$fail" -eq 0 ] && echo "run-tests: all suites passed"
exit $fail
