#!/bin/sh
# Compare main-part reports on the same seeds, ignoring timings and their target judgement.
# Usage: sh docs/autonomous5/compare.sh baseline.md candidate.md
set -eu
scratch=$(mktemp -d "${TMPDIR:-/tmp}/plan5-compare.XXXXXX")
trap 'rm -rf "$scratch"' EXIT HUP INT TERM
strip() {
  sed -E \
    -e 's/\([0-9.]+ s for [0-9]+ runs\)//g' \
    -e '/^\|.*runs complete in under [0-9]+ seconds/d' \
    -e '/^Main: /d' "$1"
}
strip "$1" > "$scratch/baseline"
strip "$2" > "$scratch/candidate"
diff -u "$scratch/baseline" "$scratch/candidate"
echo "IDENTICAL (timings aside): $2"
