# Plan 2, step 0: take stock and baseline

## Working tree

The tourism fixes session left `docs/balancing.md` (its Gratwanderung part regenerated), `docs/decisions.md` and `docs/autonomous/STATUS.md` changed and uncommitted: generated docs, kept and committed as found. No code was left uncommitted. Tests and lint passed (930 tests).

## Appendix A against the commits

Every item A1 to D18 has its change in the commits "Tourism fixes A" to "Tourism fixes D 17-18". Missing were only the report (`docs/autonomous/reports/tourism-fixes.md`, now written) and the results of items 17 and 18 (now measured, below and in that report). Item 8's gaps against the specs are plan 2 step 1a.

## The gate

`pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --events` (both 60 week scenarios), `--scenario kantino --mode long --parts main,paired,inbox,team,funding,events` and `--scenario <id> --mode long --events` for the three tourism scenarios; about 1 h 45 min on 9 processes.

- Kantino and Zollstock, 60 weeks: identical to the committed report number for number apart from timings. One text change: the event table's heading names the reading run `validate_then_build inbox:reader` (the fixes session reuses that run's seeds); the numbers are the same.
- Kantino long: identical apart from timings. (The run first included the freelance part, which the long report never had; that section was removed again.)
- Gratwanderung, Hinterhof, Seeblick: identical to the step 8 numbers apart from timings and the new naive careful row.

## Baseline targets (report seeds)

| Scenario | Pass | Fail |
|---|---|---|
| Kantino, 60 weeks | 1 to 11, 13 to 19 | none |
| Zollstock, 60 weeks | 1 to 11, 13 to 19 | none |
| Kantino, long | as in the first plan's final report | 20, 27 (at the limit), 31, 32, 33, 36 |
| Gratwanderung | T1 to T5, T7 to T12 | T6 (reading +14.6, blind effort +9.3) |
| Hinterhof | T1 to T5, T7 to T13, T16 | T6 (+5.6, +3.7), T14 L2 (-0.2), T15 L3 (reckless 2.6%) |
| Seeblick | T1, T2, T4, T5, T8 to T10, T12, T13, T16 | T3 (spread 22.4), T6 (+6.4, +5.7), T7 (-1.1), T11 (strict +4.3), T14 L2 (+0.6), T15 L3 (2.1%) |

Naive careful (T13 of this plan, not yet a target): Gratwanderung 32.8% (careful 44.2), Hinterhof 20.9% (24.4), Seeblick 15.3% (31.4). Event tables: see `docs/autonomous/reports/tourism-fixes.md`.

Tag: `plan2-baseline`.
