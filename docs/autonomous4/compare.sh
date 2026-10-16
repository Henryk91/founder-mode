#!/bin/sh
# Plan 4: compares a protected-game bot report with the step 0 baseline, timings left out.
# Usage: docs/autonomous4/compare.sh <baseline.md> <new.md>
strip() {
  sed -E \
    -e 's/\([0-9.]+ s for [0-9]+ runs\)//' \
    -e 's/[0-9.]+ s per [0-9]+ runs/T s per runs/' \
    -e 's/engine [0-9.]+/engine X/' \
    -e '/^Main: /d' "$1"
}
strip "$1" > /tmp/plan4-a.$$; strip "$2" > /tmp/plan4-b.$$
if diff /tmp/plan4-a.$$ /tmp/plan4-b.$$; then echo "IDENTICAL (timings aside): $2"; rc=0; else rc=1; fi
rm -f /tmp/plan4-a.$$ /tmp/plan4-b.$$
exit $rc
