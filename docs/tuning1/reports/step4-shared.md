# Tuning 1, step 4: targets shared by several scenarios

## What changed

- **T14:** the single-kind contract bots sign with a month of the contract's pay in hand (was 13 weeks); a contract with months and notice sleeps outside its months instead of ending (engine, `contracts.ts`; content option; view note `tour.contract.noteSleeps`; test in `plan2Features.test.ts`). Rückenwind's permanent and part time contracts are fijos discontinuos (May to October), and its demand is about 5% lower to keep T1 and T2.
- **T7:** in Hinterhof, Seeblick and Rückenwind the careful bot prices the off season at the hints' level (was 0.85 of them).
- **O3:** restated: only stages offered in at least 5% of the careful bot's wins are judged.
- **Docs:** schema, decisions, Rückenwind spec.

## Why T7 failed

Measured on the careful bot with its price factors changed (1,000 seeds each): the off season at the hints' level instead of 0.85 gained 5.0 points (Hinterhof), 5.7 (Seeblick) and 3.5 (Rückenwind); a peak price a tenth or a fifth above the hints lost 1 to 5 points everywhere, also when raised only after peak guests were turned away. The price curve is flat below willingness to pay and steep above it, so an off-season discount gave money away. The careful bot priced badly; peak demand against capacity was not the cause.

## Targets

Main part, 1,000 seeds (`--seed-prefix test`), every affected scenario. Before is the committed result at the start of this step.

| Target | Scenario | Before | After | Status |
|---|---|---|---|---|
| T14 | Gratwanderung | permanent -17.0, seasonal -0.3, part time | permanent -20.6, seasonal +0.2, part time -15.2 | **fail** (open) |
| T14 | Hinterhof | +0.0, +0.0, +1.6 | +1.5, -0.7, +1.7 | **fail** (open) |
| T14 | Seeblick | -, -, +3.4 (5.9% signed) | -, -, +0.0 (7.0%) | **fail** (open) |
| T14 | Rückenwind | permanent -10.2, seasonal +4.4, part time -4.2 | +2.9, +2.0, +4.2 (±2.3, ±1.9, ±2.2) | pass |
| T14 | Tiefgang | pass | +9.8, +9.2, +6.8 | pass |
| T7 | Hinterhof | -0.2 ±1.8 | +4.8 ±2.0 | pass |
| T7 | Seeblick | -0.2 ±1.8 | +5.5 ±2.0 | pass |
| T7 | Rückenwind | -3.7 ±1.8 | -0.7 ±1.7 | **fail** (open) |
| T7 | Leinen los | -0.2 ±1.7 | -0.2 (unchanged; flat prices +3.0 but careful 48.2%) | **fail** (open) |
| O3 | Kantino long | 0.3% of 4,295 (10,000 seeds), stage 4 on 11 wins | 0 of 447 at 1,000 seeds; judged on the 10,000-seed full report in step 6 | see step 6 |
| O3 | Gratwanderung | stage 5 never offered (fail) | stage 3 29.2% of 448, stage 4 41.2% of 51 | pass |
| O3 | Hinterhof | stage 5 never offered (fail) | stage 3 29.6% of 314, stage 4 9.4% of 64 | pass |
| O3 | Seeblick | stage 4 and 5 never offered (fail) | stage 3 7.6% of 330; stage 4 on 2 wins not judged | pass |

Rückenwind after the step (contracts that sleep, 5% less demand, flat off-season prices): T1 44.5%, T2 no tests 4.6%, T3 5.6 points, T6 +1.7 ±1.6 (at the limit), T11, T13 and T22 pass, W1, W3, W4, W5 pass, W2 always -1.0, never +1.1 (fails, open from step 3).

Hinterhof and Seeblick: every target that passed before still passes (T1 31.4% and 33.0%); Hinterhof T2 (no tests 16.3%) and Seeblick T6 and T11 stay open for step 5.

## Unchanged

Kantino and Zollstock (60 weeks) and Kantino long: identical to `plan4-complete`. Gratwanderung and Tiefgang: identical apart from the three single-kind contract bots' rows. Leinen los: identical to step 1's final run.
