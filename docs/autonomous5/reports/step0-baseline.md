# Plan 5, step 0: setup and protected-game baseline

## Setup

Both prerequisite annotated milestones exist: `plan4-complete` and `tuning1-complete`.
No plan 5 status file existed. All six plan/spec documents were already tracked.

The pre-existing CLAUDE.md clarification about running the full report one scenario per
process was preserved in `299c9ee` (`Work in progress found before plan 5`). Initial lint
found three formatting-only issues: labels.ts, Rückenwind's scenario YAML, and cruise.test.ts.
They were formatted and committed with the initial status in `33e6be2`. No values changed.

Verification on this game code: `pnpm lint` passed (including typechecks); `pnpm test`
passed all 76 files, with 1,396 tests passed and 18 skipped. The sandbox-only test attempt
had passed 1,106 tests but could not bind the browser servers. The successful rerun had
local server permission and exercised Chromium and WebKit.

## Measured baseline

Engine **0.14.0**. Every listed strategy plays **1,000 seeds**, prefix **test**;
**only `--parts main`**, one scenario per process. Standard games run without `--mode`;
long games use `--mode long`. No event tables, wide parts or full report ran.

| Game | Strategies | Wall time | Snapshot |
|---|---|---|---|
| kantino, standard | 11 | 111 s | [report](../baseline/kantino-standard.md) |
| zollstock, standard | 11 | 37 s | [report](../baseline/zollstock-standard.md) |
| kantino, long | 24 | 220 s | [report](../baseline/kantino-long.md) |
| gratwanderung, long | 19 | 176 s | [report](../baseline/gratwanderung-long.md) |
| hinterhof, long | 22 | 297 s | [report](../baseline/hinterhof-long.md) |
| seeblick, long | 22 | 223 s | [report](../baseline/seeblick-long.md) |
| rueckenwind, long | 30 | 742 s | [report](../baseline/rueckenwind-long.md) |
| tiefgang, long | 27 | 529 s | [report](../baseline/tiefgang-long.md) |
| leinenlos, long | 29 | 429 s | [report](../baseline/leinenlos-long.md) |

Command pattern:

```sh
pnpm bots --scenario <id> --runs 1000 --seed-prefix test --parts main --jobs <2 or 3> --out docs/autonomous5/baseline/<id>-<mode>.md
# Add --mode long for a long game.
```

The first seven used two workers. The last two ran concurrently in independent processes,
three workers each. The serial scheduler was paused and then terminated after Rückenwind
finished so it could not repeat the last two games. All nine completed successfully.
Timings reflect that overlap and are diagnostic; comparison omits the timing target and
strategy timings, and preserves every outcome and the engine version.

## Regression evidence for later steps

- [Content fingerprints](../baseline/content-fingerprints.json) capture every protected mode,
  extending the existing locked 60-week tests to the long-mode content and save hashes.
- `sh docs/autonomous5/compare.sh <baseline> <candidate>` compares main-part reports apart
  from timings. Its shell syntax and comparison against a saved report were checked.
- Fingerprint capture refuses to overwrite existing files:

```sh
pnpm --filter @founder-mode/bots exec vite-node ../../docs/autonomous5/capture-fingerprints.ts /tmp/plan5-candidate-fingerprints.json
diff -u docs/autonomous5/baseline/content-fingerprints.json /tmp/plan5-candidate-fingerprints.json
```

No new scenario or target exists yet. Existing failing targets in the protected games remain
outside this plan's tuning scope. Later steps compare against these exact snapshots.
The full bot report is reserved for step 6, once.

Milestone: `plan5-baseline`.
