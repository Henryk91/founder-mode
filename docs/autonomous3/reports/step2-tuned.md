# Plan 3, step 2: retune long mode with office stages

## What changed

- **Bot (rule 1.7.1, first):** the careful bot moved too soon and too often (step 1: Kantino long careful 24.9%, O1 -17.8; Gratwanderung O1 -16.5). A careful move now also wants last month's surplus (revenue less fixed and living costs, as the screen shows it) to carry the added rent twice over, and a subscription company moves only when the desks (or the team's size) stop a hire its own rule wants. `packages/bots/src/office.ts`.
- **Kantino long, value:** three desks at the kitchen table and the coworking desk (spec: two). With two, the desks held a funded team to one hire and cost raise_on_traction 3.7 points (targets 32 and 33 worse than before office stages).
- **Report:** the never and always move variants run on the wide seeds for O1 and O2 (`TEAM_SPECS`).
- Rejected rounds (spec values kept): stronger Kantino office effects, a profitable solo founder moving, a cheaper courtyard, cheaper first tourism stages, a funded company moving on a year of rent in hand, four desks (restores the baseline but four people at a kitchen table is not believable, and no desk would ever bind). Details and numbers: `docs/decisions.md`, "Plan 3, step 2".

## Targets

Full gate (section 1.6). Before: the step 0 baseline (`plan3-baseline`, before office stages) and step 1 (`plan3-stages`). 1,000 report seeds, 10,000 wide seeds where the target says.

### Kantino, long mode

| Target | Baseline | Step 1 | Now | Status |
|---|---|---|---|---|
| 20 renting against hiring | burst +0.0, steady -2.4 | +0.1, +0.2 | +0.0, -2.4 | fail (open, as before) |
| 21 build_only, top | 0.0%, under 60 | | 0.0%, top 44.7% | pass |
| 22 careful 25 to 45% | 44.7% | 24.9% | 44.7% | pass |
| 23 losing runs end | week 33 | 38 | 35 | pass |
| 24 spread | 5.5 | 9.5 | 5.5 | pass |
| 25, 26, 30 | pass | pass | pass | pass |
| 27 blind inbox | effort +7.1 of +19.3 | | effort +7.1 of +19.4 (37%) | fail (open, as before; at the limit) |
| 28 year 2 | 74.9%, 55.3% | 46.1%, 31.6% | 74.9%, 55.3% | pass |
| 29 hiring | (a) +2.6, (b) +2.4 | +2.1, +1.9 | +2.6, +2.4 | pass |
| 31 both paths | 42.9%, 38.7% | 25.1%, 20.8% | 43.0%, 37.2% | pass |
| 32 neither dominates | -4.2, value 1.23x | -4.3 | -5.8, value 1.18x | fail (open; 1.6 points worse than baseline) |
| 33 raising early punished | +1.4 | +2.9 | +2.9 | fail (open; 1.5 points worse than baseline) |
| 34, 35, 37 | pass | pass | pass | pass |
| 36 updates | -0.5 | -1.0 | -0.2 | at the limit (pass) |
| O1 (38) careful beats never moving by 2 | | -17.8 | +0.0 | fail (open) |
| O2 (39) always moving loses 3 | | -24.9 | -42.8 | pass |
| O3 (40) no stage always right | | stage 3 in 92% | stage 3 in 0.4% of 4,295 wins, stage 4 in 5.6% of 18, stage 5 never offered | fail (open) |

### Gratwanderung

| Target | Baseline | Step 1 | Now | Status |
|---|---|---|---|---|
| T1 careful | 44.9% | 28.4% | 42.1% | pass |
| T2 | 0.0% | | 0.0%, top 47.5% | pass |
| T3 spread | 8.6 | 28.6 | 14.0 | pass (5.4 wider than the baseline: the careful bot still moves in a few school runs) |
| T6 | +16.4 / +7.5 | +14.3 / +3.5 | +15.8 / +5.6 | pass |
| T7 | +1.0 | +3.3 | +1.1 | at the limit |
| T13 naive | 33.9%, gap -11.0 | 20.2%, -8.2 | 30.5%, gap -11.6 | at the limit |
| T14 | open | | permanent -17.3, seasonal +0.5, part time -16.8 | fail (open, as before) |
| T4, T5, T8 to T12 | pass | | pass | pass |
| O1 (T19) | | -16.5 | -2.8 ±1.1 | fail (open) |
| O2 (T20) | | -22.6 | -36.3 | pass |
| O3 (T21) | | | stage 3 in 7.4% of 421, stage 4 in 20.0% of 30, stage 5 in 0% of 3 | fail (open) |

### Hinterhof

Every target within noise of the baseline: T1 26.3% (26.3), T2 no-tests 16.3% (16.6, open), T3 14.4 (15.0), T6 +3.4 / +0.7, T7 -0.2 ±1.9 (+0.0, open, fail within noise), T13 24.8% gap -1.5, T14 open, T15 to T18 (L1 to L4) pass. O1 +0.0 (fail, open), O2 -26.3 (pass), O3 stage 3 in 31.9% of 263, stage 4 in 23.1% of 65, stage 5 in 1 of 1 (fail, open).

### Seeblick

Every target within noise of the baseline: T1 27.3% (27.2), T3 8.5, T6 reading +7.8 / effort +5.7 (open), T7 -0.2 (open), T11 strict +1.7, project guests -2.8 ±2.2 (open), T13 27.9% gap +0.6, T14 open, L1 to L4 pass. O1 +0.1 (fail, open), O2 -27.3 (pass), O3 stage 3 in 2.9% of 273 (fail, open).

### O4 and O5

O4 passes by its test (offer texts and post-mortem lines). O5: every existing target passes or stays an open issue no worse than before office stages, apart from Kantino long 32 and 33 (about 1.5 points worse, beyond their margins of ±1.0 and ±1.1), recorded below.

## Open issues (new in plan 3)

1. **O1 and O3, all four scenarios.** Closest: Kantino long +0.0, Gratwanderung -2.8, Hinterhof +0.0, Seeblick +0.1. A careful company rarely needs a bigger place: the moves cost more than the room earns, so the careful rule's best play is to stay. Options: demand that grows into the capacity in year 2 so the bottleneck appears; stage effects that reach demand (reach, conversion) rather than capacity alone; or restate O1 as "moving at the wrong time loses and the careful rule loses nothing" (it would then reward restraint, which is what the rule shows).
2. **Kantino long 32 and 33 a little worse.** The desks limit a funded team (raise_on_traction 37.2% against 38.7%). Options: four desks at the first two stages (measured: back to the baseline, but four at a kitchen table); a funded bot that moves earlier and cheaper; the plan 2 restatement options for 32 and 33.

## Protected games

Kantino and Zollstock, 60 weeks: the full 60 week gate is identical to the step 1 report number for number apart from timings; fingerprints unchanged (`long.test.ts` green). Only long mode seeds changed in `docs/seeds.md`. From this step on, all long mode scenarios are protected.

Tests: 1,033 passed; lint clean. Tag: `plan3-tuned`.
