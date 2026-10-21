# Step 2: protected-game proof

All nine protected games match their immutable step 0 baselines exactly apart from
timings. These are **main only, 1,000 seeds per strategy, prefix `test`**, one scenario
per process, at most two scenario processes with two workers each. No event tables,
wide parts or full report ran. Existing failures in those games remain unchanged.

The comparison helper retains engine version and every outcome row, removing only
strategy durations and their timing targets. Engine version remains 0.14.0. All nine
content/save fingerprints also match baseline/content-fingerprints.json, verified
against /tmp/plan5-step2-fingerprints.json. The new leisure branches are off in these
games; scoped leisure strategies are filtered out and preserve the old strategy order.

Snapshots are in protected-step2/. The raw progress/result records are
/tmp/plan5-protected-step2-progress.log and /tmp/plan5-protected-step2-results.json.
Each game has its own /tmp/plan5-protected-step2-<id>-<mode>.log, ending with the
exact comparison’s IDENTICAL result. Wall times overlap other bot and test activity.

| Game | Main strategies | Wall time | Outcome comparison |
|---|---:|---:|---|
| kantino-standard | 11 | 63.2 s | Identical |
| zollstock-standard | 11 | 61.7 s | Identical |
| kantino-long | 24 | 458.0 s | Identical |
| gratwanderung-long | 19 | 260.8 s | Identical |
| hinterhof-long | 22 | 756.6 s | Identical |
| seeblick-long | 22 | 548.0 s | Identical |
| rueckenwind-long | 30 | 1085.4 s | Identical |
| tiefgang-long | 27 | 906.0 s | Identical |
| leinenlos-long | 29 | 562.4 s | Identical |

This completes the protected proof for the gated slot prices, room-space/minimum-area
rules, leisure calendar/reservation caches and cancellation-deposit settlement added
in step 2. Later leisure-only bot corrections use the same explicit gate; no protected
branch’s rule or random draws changed. Any subsequent engine/shared change affecting
these paths requires a new main comparison under CLAUDE.md’s budget.

Ausgesperrt’s final target measurement and tuning remain in progress. Its own step 2
report and milestone tag follow that work. The full report remains reserved for step 6.
