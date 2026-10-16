# Plan 3, step 1: office stages 3 to 5

## What was built

- **Engine (general):** office stages as scenario content (`OfficeStage`: one-off, deposit, moving weeks, desks, team size, and effects: energy, demo conversion, a shorter hire search, segment trust; in tourism seats or rooms, units per shift, waste, founder hours at reception, a bad weather plan, more contract staff, a stage that needs someone stationed there). Offers arrive as triggered inbox events in a long-mode-only file and come back after 12 weeks while their condition holds; accepting pays the one-off (or nothing if the bank's plan paid it), moves the rent and starts the move (founder hours each week until it completes); notice takes 13 weeks, gives the deposit back and drops one stage. Desks limit hires. Nine new condition paths read only what the player sees. View: `PlayerView.office`. Post-mortem: one line per stage (when, total cost, money and team or guests before and after).
- **Content:** Kantino long, Gratwanderung, Hinterhof and Seeblick each have stages 3 to 5 from `docs/office-stages.md` section 3 and three offer letters in their own voice, each naming the condition, the one-off and the rent (checked by a test, target O4). Figures are estimates, labelled in the YAML.
- **Drawings:** the twelve scenes of `docs/design/office-stages.html`, laid into the app's 732 x 330 scene with the usual figure labels (their few words left out, as screen words come from the labels table).
- **Bots:** the careful rule (move when the reason is real and the money covers it; tourism bots list the stage in the bank's plan when short), `never` and `always` variants for O1 and O2 (`validate_then_build_never_move`, `validate_then_build_always_move`, `tourism_never_move`, `tourism_always_move`). Bots that do not build on the careful bot decline offers.
- **UI:** the Office section of the Plan (facts, notice) and the Office card on the money tab (drawing, stage, rent, desks or occupancy), the stage in the bank's plan form, results lines. Screen test `office.browser.test.ts` at 375, 390, 430 and 1440 px in Chrome and WebKit; it found the phone's scroll area could not take keyboard focus on a tab with nothing to tap (fixed).
- **Tests:** offers and their recurrence, accepting, moving in, desks blocking a hire, notice and deposit, loan financing of a stage, replay, the post-mortem line, the 60 week game untouched, the offer texts (O4), bot variants.

Decisions: `docs/decisions.md`, plan 3 step 1.

## Targets before and after

Full gate (section 1.6) after step 1; before = the step 0 baseline. Only targets that moved, and the new office targets O1 to O3 (O4 passes by its test). 1,000 report seeds, 10,000 wide seeds where the target says.

**Kantino, long mode.** The desks hold the team to one hire until the company moves, and the careful bot takes the courtyard office in 92% of the wins where it was offered. That move costs far more than it gives:

| Target | Before | After | Status |
|---|---|---|---|
| 22 careful 25 to 45% | 44.7% | 24.9% | fail (just under) |
| 23 losing runs end | week 33 | week 38 | pass |
| 24 spread | 5.5 | 9.5 | pass |
| 27 blind inbox | effort +7.1 of +19.3 | effort +4.8 of +11.8 (41%) | fail (open before) |
| 28 year 2 matters | 74.9%, 55.3% | 46.1%, 31.6% | pass |
| 29 hiring | (a) +2.6, (b) +2.4 | (a) +2.1, (b) +1.9 | pass at the limit |
| 31 both paths 25 to 45% | 42.9%, 38.7% | 25.1%, 20.8% | fail |
| 33, 36 | +1.4; -0.5 | +2.9; -1.0 | fail; 36 now fails |
| 20 | burst +0.0, steady -2.4 | burst +0.1, steady +0.2 | fail (open) |
| O1 (38) careful beats never moving by 2 | | -17.8 | fail |
| O2 (39) always moving loses 3 | | -24.9 | pass |
| O3 (40) no stage always right | | stage 3 taken in 92%, stage 4 in 0%, stage 5 never offered | fail |

**Gratwanderung.** The careful bot moves often, and the moves cost it:

| Target | Before | After | Status |
|---|---|---|---|
| T1 careful | 44.9% | 28.4% | pass |
| T3 spread | 8.6 | 28.6 (schools 12.2%) | fail |
| T6 | +16.4 / +7.5 | +14.3 / +3.5 | pass |
| T7 | +1.0 | +3.3 | pass |
| T13 naive | 33.9%, gap -11.0 | 20.2%, gap -8.2 | pass at the limit |
| O1 (T19) | | -16.5 | fail |
| O2 (T20) | | -22.6 | pass |
| O3 (T21) | | stage 3 taken in 68%, stage 4 in 64%, stage 5 in 0% of 7 | fail |

**Hinterhof** and **Seeblick** barely move: their careful bots seldom take a stage (Hinterhof stage 3 in 32% of the wins offered it, Seeblick in 5%), so every other target is within noise of the baseline (Hinterhof T7 -0.2, Seeblick T7 and T11 as before). O1: +0.0 and +0.1 (fail); O2: -26.3 and -27.3 (pass); O3 fails in both (stages 4 and 5 hardly offered).

Every scenario stays inside the playable band (careful 15 to 55%, no strategy over 70%); step 1 does no more tuning. These are step 2's work.

Found while measuring and fixed (a bot bug, rule 1.7.1): the careful bot with "leave every message to its default" returned before its office rule, so it never moved while the reading bot did, and target 27 measured the office move instead of the inbox (reading +1.5). Every inbox policy now applies the same office rule; the Kantino long section was regenerated.

## Protected games

Kantino and Zollstock, 60 weeks: identical to the step 0 report number for number apart from timings (the full 60 week gate), and their fingerprints unchanged (locked by `long.test.ts`). Only long mode seeds changed in `docs/seeds.md`.

Tag: `plan3-stages`.
