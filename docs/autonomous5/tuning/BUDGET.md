# Ausgesperrt tuning budget

The plan permits **up to two scenario-value rounds, then one formula round per
failing target**. A result within its own 95% margin of a target boundary passes
at the limit. Paired effects smaller than their margins are not evidence of a
strategy advantage. Every round must retain believable Munich money and record
its changed values in the spec and decisions log.

## Current allocation

| Targets | Value rounds used / allowed | Formula rounds used / allowed |
|---|---:|---:|
| T1–T18 | 1 / 2 | 0 / 1 |
| E1 | 1 / 2 | 0 / 1 |
| X1–X4 | 1 / 2 | 0 / 1 |

Round 1 is assigned to all applicable targets conservatively because recurring
costs and market opportunity can move every outcome. Formula budget is untouched.

Changed values: ordinary-room monthly upkeep EUR250 (was zero); flexible shift
EUR105 (was EUR90); weekly reachable enquiries locals 30–90 (was 40–120), visitors
9–34 (was 10–40), companies 3–12 (was 2–10). Spec section 15 labels each estimate.
The baseline contribution comparisons are preserved in main-4.

Measurement: main only, all 28 strategies, 1,000 `test` seeds, three workers,
`tuning/ausgesperrt-values-1.md`. No wide seeds, event table or full report.

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
