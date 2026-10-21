# Ausgesperrt tuning budget

The plan permits **up to two scenario-value rounds, then one formula round per
failing target**. A result within its own 95% margin of a target boundary passes
at the limit. Paired effects smaller than their margins are not evidence of a
strategy advantage. Every round must retain believable Munich money and record
its changed values in the spec and decisions log.

## Current allocation

| Targets | Value rounds used / allowed | Formula rounds used / allowed |
|---|---:|---:|
| T1–T18 | 0 / 2 | 0 / 1 |
| E1 | 0 / 2 | 0 / 1 |
| X1–X4 | 0 / 2 | 0 / 1 |

No game-value or formula tuning round has run yet. Main-4 measures the corrected
bot baseline on main only, all 28 strategies, 1,000 seeds each, prefix `test`.
Expand this table per failing target when the complete baseline is available,
then log each attempted change and its result. Do not treat new target failures
as a reason to exceed the assigned budget.

## Corrections before tuning

The plan requires sensible bots before values. Earlier measurements diagnosed
shared rebuild budgets, retained advances on cancellations, accepted-loan caps,
forgotten unfinished rooms, a blind portfolio that omitted its stated VR purchase,
late rebuilds with no remaining service window, and duplicate seasonal coverage
on top of permanent staff. These correctness repairs are recorded in decisions
and the explicitly labelled intermediate reports. No report of them is the final
scenario balance, and none consumed a game-value/formula round.

## Report budget and remaining work

- Protected proof: complete, main only, nine games, 1,000 `test` seeds per strategy;
  every outcome and content/save fingerprint matches baseline.
- Ausgesperrt event table: **not run**; run once after its tuning.
- Full bot report: **not run**; exactly once in step 6.
- Seed examples and full test suite: refresh after outcome changes before completing
  step 2. Latest 36 leisure bot tests and lint/typechecks pass; the earlier complete
  suite passed 79 files / 1,539 tests, 21 skipped, before the final bot corrections.

After the full tuning budget, apply the plan's playability stop: careful under 15%
or over 55%, or any strategy over 70%. Other remaining target failures become open
issues with closest results and options. Step6 revisits open issues with its own
fresh two-round budget before the single full report.
