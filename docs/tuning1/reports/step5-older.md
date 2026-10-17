# Tuning 1, step 5: older scenario targets

One sub-step per scenario; only that scenario changed in its sub-step. Main part on 1,000 seeds (`--seed-prefix test`) unless stated.

## Kantino long (report only, no game change)

| # | Before (committed, 10,000 seeds) | After | Status |
|---|---|---|---|
| 20 | burst +0.0 ±1.0; steady hire -2.4 ±0.9 | unchanged | **fail** (open) |
| 27 | effort +7.1 ±1.0 against a third of +19.4 | judged by section 1.5: 7.1 - 1.0 is within a third (6.5) | pass (at the limit) |
| 32 | raise_on_traction -5.3 ±1.0; value 1.20 times | unchanged | **fail** (open) |
| 33 | +2.4 against raise_on_traction, -2.9 ±1.1 against bootstrap; named in 100% | restated against bootstrap only | pass |

Target 11's rule now applies the margins in every scenario (no other judgement changes).

## Hinterhof

| # | Before | After | Status |
|---|---|---|---|
| T2 | no tests 16.3% | no tests 6.5% ±1.5 | pass (at the limit) |
| T7 | +4.8 (step 4) | +5.5 ±1.8 | pass |
| T1 | 31.4% | 23.0% ±2.6 | pass (at the limit of 25) |
| T6 | +3.8 | +2.0 ±1.4 | pass (at the limit) |
| T3, T11, T13, T15 to T17, T22 | pass | pass | |

Changes: monthly upkeep of services run whether or not guests come (Sundays, catering, the wine list, the delivery set-up).

## Seeblick

| # | Before | After | Status |
|---|---|---|---|
| T6 | reading +9.3, blind effort +7.3 | reading +9.1, blind effort +6.7 (±2.2) | **fail** (open) |
| T7 | +5.5 (step 4) | +5.7 | pass |
| T11 | no split for flexible beyond its margin | strict +1.6 overall; groups +6.1, leisure +4.4, project guests -6.3 | pass |
| T1 | 33.0% | 33.1% | pass |

Changes: project guests convert 0.8 under a strict policy, groups 1.0. Event table (`--parts events`, 1,000 seeds) for T6: the costliest defaults are answered right by the answer with the most hours (the lease rise, the fire inspection, the rate parity letter, the village festival, the dripping shower), so blind effort finds them. Options: make those answers pay only in situations the screen shows (the rate parity letter only while listed on the platform, the fire inspection only with the event room, and so on), or give some high-effort answers a visible cost in busy weeks.

## Gratwanderung school demand

No source counts school classes booking guided outdoor days in a Bavarian Alpine region. National youth hostel figures (about 9 million nights in 2024, 41% schools) and assumed Bavarian and Alpine shares make the game's 5 to 8 groups a week plausible but not established (spec section 17). Open, values unchanged.

## Unchanged

Only Hinterhof and Seeblick content changed (their fingerprints in `packages/engine/test/long.test.ts` updated). Report changes (targets 11 and 33) change no game. No other scenario was rerun; the full report in step 6 covers them all.
