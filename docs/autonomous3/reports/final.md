# Autonomous plan 3: final report

Plan 3 (`docs/AUTONOMOUS_PLAN_3.md`) added office stages 3 to 5 to every long mode scenario and the established UI stage. It started with an audit of plan 2 (`audit.md`). Step reports: `step0-baseline.md`, `step1-stages.md`, `step2-tuned.md`, `step3-established.md`; this report is step 4's. Tags: `plan2-audited`, `plan3-baseline`, `plan3-stages`, `plan3-tuned`, `plan3-established`, `plan3-complete`, and after Henry's review `plan3-final` (section "After the review").

## What was built

- **Plan 2 audit and fixes:** tests for plan 2 step 5's engine features and T14's bots, a general `shipped.<feature>` condition, fresh rounds on the open issues, docs, and a rewritten plan 2 final report (`docs/autonomous2/reports/final.md`).
- **Office stages (step 1):** stages as scenario content (one-off, deposit, moving weeks, rent, desks or capacity, effects), offers as inbox letters that name their condition, one-off and rent, notice with the deposit back, desks that limit hiring in Kantino long, a stage the bank's plan can finance, view and post-mortem lines, twelve scene drawings, the Office section of the Plan and the Office card. Bots: `careful`, `never` and `always` move rules. Targets O1 to O5.
- **Retune (steps 2 and 4):** the careful move rule (a real reason, the money in hand, and a surplus that carries twice the added rent: last month's for a subscription business, the last year's for a seasonal one; a subscription business moves only for a blocked hire); Kantino's first two stages hold three and four desks.
- **The established UI stage (step 3):** reached when a move into stage 4 completes; tokens and an accent per scenario, Bricolage Grotesque, every screen on phone and desktop, labels per scenario, a dev-only preview, screen tests at four widths in two browsers. The screens after the Start screen now load after its first paint: Start screen 2.28 s on the emulated mid range phone (it had reached 2.55 s with step 1's office screens).

## Every target, every scenario and mode

Status by the report's own test (pass includes "at the limit": within its own margin; named where it applies). Numbers from `docs/balancing.md`, the step 4 gate: 1,000 report seeds, 10,000 wide seeds where the target says. "Before" is the plan 3 baseline (`plan3-baseline`, before office stages).

### Kantino and Zollstock, 60 weeks

All targets 1 to 11 and 13 to 19 pass in both, identical to plan 1 and the plan 3 baseline apart from timings (protected; fingerprints locked by `long.test.ts`). At the limit as before: Kantino 17 and the books part of 13; Zollstock 11, 17's worst market and the landing part of 13.

### Kantino, long mode

| Target | Before | Now | Status |
|---|---|---|---|
| 20 renting against hiring | burst +0.0, steady -2.4 | +0.0, -2.4 | fail (open, from plan 2) |
| 21 build_only, top strategy | pass | 0.0%, top 44.7% | pass |
| 22 careful 25 to 45% | 44.7% | 44.7% | pass |
| 23 losing runs end | week 33 | week 35 | pass |
| 24 spread | 5.5 | 5.5 | pass |
| 25, 26 | pass | week 6, 95.8%; 100% and 97% | pass |
| 27 blind inbox | effort +7.1 of +19.3 | +7.1 of +19.4 (37%) | fail (open, from plan 2; at the limit of its margin) |
| 28 year 2 matters | 74.9%, 55.3% | 74.9%, 55.4% | pass |
| 29 hiring | (a) +2.6, (b) +2.4 | +2.6, +2.4 | pass |
| 30 speed | pass | 60.0 s | pass |
| 31 both paths | 42.9%, 38.7% | 43.0%, 37.7% | pass |
| 32 neither dominates | -4.2, 1.23x | -5.3, 1.20x | fail (open; about 1 point worse, at its margin) |
| 33 raising early punished | +1.4 | +2.4 | fail (open, from plan 2; change within its margin) |
| 34, 35, 37 | pass | pass | pass |
| 36 updates | -0.5 | -0.2 | at the limit |
| O1 (38) restated: moving costs at most 1 point | | +0.0 | pass |
| O2 (39) always moving loses 3 | | -42.8 | pass |
| O3 (40) no stage always right | | stage 3 taken in 0.3% of 4,295 wins, stage 4 in 0 of 11, stage 5 never offered | fail (open) |

### Gratwanderung

| Target | Before | Now | Status |
|---|---|---|---|
| T1 careful | 44.9% | 44.8% | pass (near the top) |
| T2 | 0.0% | 0.0%, top 51.7% | pass |
| T3 spread | 8.6 | 8.6 | pass |
| T4, T5 | pass | week 11; 96.0%, 95.0% | pass |
| T6 | +16.4 / +7.5 | +16.3 / +7.5 | at the limit |
| T7 seasonal pricing | +1.0 | +1.0 ±2.1 | at the limit |
| T8 to T12 | pass | pass | pass |
| T13 naive | 33.9%, gap -11.0 | 33.9%, gap -10.9 | at the limit |
| T14 contracts | open | permanent -17.0, seasonal -0.3, part time -15.4 | fail (open, from plan 2) |
| O1 (T19), restated | | -0.1 | pass |
| O2 (T20) | | -39.0 | pass |
| O3 (T21) | | stage 3 taken in 29.2% of 448, stage 4 in 41.2% of 51, stage 5 never offered | fail (open) |

### Hinterhof

| Target | Before | Now | Status |
|---|---|---|---|
| T1 | 26.3% | 26.4% | pass |
| T2 no-tests under 5% | 16.6% | 16.3% | fail (open, from plan 2) |
| T3 spread | 15.0 | 14.7 | pass |
| T4, T5, T6, T8 to T13 | pass | pass (T6 +3.8 / +0.9; T13 24.6%, gap -1.8) | pass |
| T7 seasonal pricing | +0.0 | -0.2 ±1.8 | fail within noise (open, from plan 2) |
| T14 | open | +0.0, +0.0, part time +1.6 | fail (open, from plan 2) |
| T15 to T18 (L1 to L4) | pass | +3.7; -19.9; gap +24.9, misses 0.8%; named | pass |
| O1 (T19), restated | | +0.1 | pass |
| O2 (T20) | | -26.4 | pass |
| O3 (T21) | | stage 3 taken in 28.8% of 264, stage 4 in 3.7% of 54, stage 5 never offered | fail (open) |

### Seeblick

| Target | Before | Now | Status |
|---|---|---|---|
| T1 | 27.2% | 27.3% | pass |
| T2, T3, T4, T5, T8, T9, T10, T12, T13 | pass | pass (T3 8.5; T13 27.9%, gap +0.6) | pass |
| T6 blind effort | +7.7 / +5.7 | +7.8 / +5.7 | fail (open, from plan 2) |
| T7 seasonal pricing | -0.2 | -0.2 ±1.8 | fail within noise (open, from plan 2) |
| T11 cancellation | +1.8, project guests -2.5 | +1.7, project guests -2.8 ±2.2 | fail within noise (open, from plan 2) |
| T14 | open | permanent and seasonal never signed, part time +3.4 | fail (open, from plan 2) |
| T15 to T18 (L1 to L4) | pass | -0.5; -22.5; gap +29.1, misses 1.2%; named | pass |
| O1 (T19), restated | | +0.1 | pass |
| O2 (T20) | | -27.3 | pass |
| O3 (T21) | | stage 3 taken in 4.8% of 273, stages 4 and 5 never offered | fail (open) |

### O4 and O5

O4 passes by its tests (offer texts name the condition, one-off and rent; the post-mortem names each stage's cost and what changed). O5: every existing target passes or stays an open issue no worse than before office stages, except Kantino long 32 (about 1 point worse, at its margin).

## Open issues

New in plan 3:

1. **O3, all four long modes** (O1 restated after the review and passing). The careful bot moves only in runs it already wins, and there the move costs money (median end wealth on moved seeds: Gratwanderung -15,400 EUR, Hinterhof -6,400, Seeblick -123,000), so few stages are taken and stage 5 is seldom offered. No demand formula changes, by decision.
2. **Kantino long 32, a little worse.** The desks limit a funded team: -5.3 against -4.2. Four desks at the kitchen table restore it but are not believable.

Carried from plan 2, no worse: tourism T14 (all three); Hinterhof T2 and T7; Seeblick T6, T7 and T11; Gratwanderung school demand above the spec; Kantino long T20, T27, T32, T33.

## For Henry to review, in priority order

1. O1's measure and the office values (open issue 1): whether offices should pay at these sizes (a formula change to demand), or whether "expansion seldom pays" is the lesson and O1 should be restated (decisions, plan 3 step 4).
2. Kantino's desks: three at the kitchen table and four at the coworking desk instead of two each (decisions, plan 3 steps 2 and 4).
3. The careful move rule: twice the added rent from last month's surplus, or from the last year's for tourism; a subscription business moves only for a blocked hire (decisions, plan 3 steps 2 and 4).
4. The first-load change: every screen after the Start screen loads after its first paint (decisions, plan 3 step 3).
5. Plan 2's items, still open: T14's measure, T32 and T33 restatements, the Hinterhof and Seeblick estimates, Gratwanderung's school day (`docs/autonomous2/reports/final.md`).

## After the review (tag `plan3-final`)

Henry's decisions (`docs/decisions.md`, "Plan 3 review"):

1. **The established look follows growth, not office stage 4:** revenue covering all costs for six months running and three people working, the founder included (hires in Kantino, staff on contracts in tourism). Never back. Measured on the report's runs (section "The established look" in `docs/balancing.md`):

   | Scenario | Careful bot: of all runs | Of winning runs | Median week (wins) |
   |---|---|---|---|
   | Kantino long | 2.0% | 4.5% | 71 |
   | Gratwanderung | 3.0% | 5.8% | 89 |
   | Hinterhof | 18.8% | 68.2% | 57 |
   | Seeblick | 0% | 0% | - |

   Only Hinterhof reaches it in a sensible share of winning runs. Kantino's careful bot makes one hire (the hiring targets show a second rarely pays), so three people are rare; its part time variant reaches it in 28.9% of wins (week 63). Gratwanderung and Seeblick seldom keep two staff on contracts (target T14: the careful bots sign contracts late, Seeblick almost never). Not changed: the trigger is Henry's. Options: two people instead of three in the tourism scenarios, counting weekly shift staff who worked in each of the last four weeks, or four months instead of six.
2. **O1 restated** ("moving at the right time costs at most 1 point against never moving"), reason with the targets in `docs/office-stages.md`: two-year runs cannot pay back a fixed-cost move. It passes in all four long modes (+0.0, -0.1, +0.1, +0.1). O2 stays and passes. The post-mortem's office lines say "It cost ..." and "What changed: money in over four weeks went from ... to ... (up or down ...)".
3. **Accepted:** the desks, the move rule and the first-load split. The browser check (production build, slow 4G, 4x CPU, 390 and 1440 px) found no flash on switching tabs, but a blank page for about a second when New run was tapped before the screens had arrived; New run now waits for them as it waits for the scenarios. No blank frame since; Start screen LCP 2.28 s.
4. No demand formula changes.

Gate after the review: every scenario and mode identical to `plan3-complete` apart from timings, O1's wording and status, and the new section. Kantino and Zollstock 60 weeks unchanged (fingerprints locked); the tourism fingerprints changed with the `establishedAt` content, so their old saves get the save notice. Tests: 1,068 passed; lint clean.

### For Henry to review after the review

1. The established trigger reaches only Hinterhof's winners often (table above); options listed there.
2. O3 stays open (offices rarely taken).
