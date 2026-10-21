# Ausgesperrt tuning budget

The plan permits **up to two scenario-value rounds, then one formula round per
failing target**. A result within its own 95% margin of a target boundary passes
at the limit. Paired effects smaller than their margins are not evidence of a
strategy advantage. Every round must retain believable Munich money and record
its changed values in the spec and decisions log.

## Current allocation

| Targets | Value rounds used / allowed | Formula rounds used / allowed |
|---|---:|---:|
| T1–T18 | 2 / 2 | 0 / 1 |
| E1 | 2 / 2 | 0 / 1 |
| X1–X4 | 2 / 2 | 0 / 1 |

Round 1 is assigned to all applicable targets conservatively because recurring
costs and market opportunity can move every outcome. Formula budget is untouched.

Changed values: ordinary-room monthly upkeep EUR250 (was zero); flexible shift
EUR105 (was EUR90); weekly reachable room-game units locals 30–90 (was 40–120), visitors
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

## Round 1 result

Main only, all 28 strategies, 1,000 `test` seeds each; 1,196 seconds wall time,
three workers. Careful 55.7% ±3.1, top review-blind 62.0% ±3.0, no-tests 43.1% ±3.1.
Market wins companies 33.2%, locals 76.7%, tourists 57.5%; spread 43.5 ±6.7 points.

Pass: T4, T5, T8, T9, T13, T18, E1, X3, X4. At the limit: T16 and X2.
Fail: T1, T2, T3, T6, T7, T10, T11, T12, T14, T15, T17, X1.
T2's top-strategy cap is within its margin, but its no-tests component fails.
T12 is 156.0 seconds per 1,000 runs in the slowest concurrent worker. No hard
stop applies: tuning remains available. Full target values and margins are in
[the round 1 report](ausgesperrt-values-1.md).

## Round 2 assignment

Second and last scenario-value round assigned conservatively to every applicable
target. Changed estimates and reasons are in spec section 15, second-round table.
Main only, all 28 strategies, 1,000 `test` seeds each, two workers; output
`tuning/ausgesperrt-values-2.md`, log `/tmp/plan5-ausgesperrt-values-2.log`.
No further value rounds are available before step 6. Formula allowance is unused;
assess a justified formula candidate only after the complete second-round table.
Do not assume remaining failures require inventing a new mechanic.

## Round 2 result and formula review

Main only, all 28 strategies, 1,000 `test` seeds each, two workers: 1,434 seconds
wall time. Careful 42.8% ±3.1, top part-time 48.4% ±3.1, no-tests 22.1% ±2.6.
Pass: T1, T4, T5, T7, T8, T9, T12, T13, T16, T18, E1, X2, X3, X4.
At the limit: X1 (quarterly -1.4 ±2.6 against a three-point required loss).
Fail/open: T2, T3, T6, T10, T11, T14, T15, T17. Full values/margins are in
[round 2](ausgesperrt-values-2.md). T14's seasonal gain 1.9 ±2.2 is inconclusive;
its criterion explicitly requires a gain beyond the paired margin. T11 likewise
needs demonstrated opposite segment advantages, not just noisy opposite signs.

Formula allowance: **unused by decision**, not exhausted. The scenario is playable.
The budget is an upper bound; no formula candidate is necessary for playability or
justified by the remaining evidence without changing a lesson. Do not manufacture
a borrowing penalty, amplify tiny rating differences or change a target's statistical
criterion to make it pass. Remaining issues and candidate investigations are recorded
in the step report for the mandatory step 6 revisit with its fresh budget.

Company base values count room-games, not team requests. At the final 4–14 units
and mean three per request, this is roughly 1.3–4.7 requests before demand factors.
Documentation is corrected to match the measured units; no third value round occurred.

## Step 2 event table, complete

Once only: parts events,1,000 test seeds,115 forced-answer strategies,two workers.
101,267/115,000 games played, the rest reused;6,492 seconds wall.47 judged events,
24 cheapest-answer point leaders and23 more-effort point leaders; no significance
claim from rankings. Raw report:ausgesperrt-events.md. Full report still reserved
for step6. No new value/formula round. Main outcomes remain the final round2 table.
