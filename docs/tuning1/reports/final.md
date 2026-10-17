# Tuning plan 1: final report

Plan: `docs/AUTONOMOUS_PLAN_TUNING_1.md`. Tags `tuning1-start` to `tuning1-complete`. Step reports in this folder; decisions in `docs/decisions.md`, "Tuning 1" sections.

## The full report (run once)

Every scenario, 1,000 seeds with 10,000 wide seeds and the event tables, in `docs/balancing.md`. Run one scenario at a time (as plan 4 did): a single process for every scenario ran out of memory in its event part after an hour and wrote nothing. Kantino long's section was then completed with its team and funding parts, which the default parts leave out (targets 20, 29, 31 to 37), so Kantino long ran twice. In all, about four hours. `pnpm seeds` found every seed still ending where `docs/seeds.md` says (no change).

- Kantino and Zollstock (60 weeks) and Kantino long: their games are identical to `plan4-complete`. Only the report rules changed: targets 11, 27 and 33 judged with their margins or restated, and O3 restated.
- Every tourism section matches the main-part runs of its step row for row.

| Scenario | Careful wins | Strongest bot | No tests |
|---|---|---|---|
| Gratwanderung | 44.8% | seasonal contracts 51.8% | 0.0% |
| Hinterhof | 23.0% | always strict 27.1% | 6.5% |
| Seeblick | 33.1% | naive careful 34.9% | 0.0% |
| Rückenwind | 44.5% | always strict 46.9% | 4.6% |
| Tiefgang | 27.7% | naive careful 29.1% | 5.8% |
| Leinen los | 45.0% | always lease 47.0% | 5.9% |

## Every target open at the start

| Scenario | Target | Before | After | Status |
|---|---|---|---|---|
| Leinen los | T3 | 57.9 points | 68.0 points (retreats 11.4%) | open |
| Leinen los | T4 | week 19, not applicable | week 32, restated: the first season's first month | pass (restated) |
| Leinen los | T5 | 80.7%; year 2 67.6% | 85.1%; 82.0% | pass |
| Leinen los | T6 | reading -2.8 | reading +12.3, blind effort +3.2 | pass |
| Leinen los | T11 | no flexible split | strict +4.7 for cabins, flexible -5.3 for charters | pass |
| Leinen los | E1 | 18.4% of wins, week 46 | 48.9% of wins, week 48 | open (fails on the week) |
| Leinen los | G1 | buy best 5.7% (cash) | buy 6.3% (net of the boat) | open |
| Leinen los | G2 | pass | pass (net of the boat) | pass |
| Leinen los | G3 | never hold +0.3 | never hold -0.3 ±0.9 | open |
| Leinen los | G4 | six cabins ahead -9.1 | restated as a trap: always sailing ahead +6.3 | pass (restated) |
| Leinen los | T9, T14, T15 to T18 | do not apply | recorded as not applicable | not applicable |
| Leinen los | careful against always lease | -10.5 | -2.0 | fixed |
| Tiefgang | T2 | no tests 21.4% | 5.8% ±1.4 | pass (at the limit) |
| Tiefgang | T3 | 32.5 points (clubs 4.7%) | 18.9 points (clubs 16.9%) | open |
| Tiefgang | D3 | cash: share highest | net: buy highest | pass (restated measurement) |
| Tiefgang | T6 | +1.0 ±1.6 | reading +2.7 ±1.6, blind effort +2.5 | open |
| Tiefgang | L2 | -4.9 ±2.4 judged fail | judged by section 1.5 | pass |
| Tiefgang | careful against naive careful | -4.1 | -1.4 | fixed |
| Rückenwind | W2 | never +4.7 | always -1.0, never +1.1 | open |
| Rückenwind | T7 | -2.1 | -0.7 ±1.7 | open |
| Rückenwind | T14 | permanent -8.5, part time -5.2 | +2.9, +4.2 (contracts that sleep) | pass |
| Rückenwind | careful against the strongest bot | -4.7 | -2.4 (always strict, within margin) | fixed |
| Hinterhof | T2 | no tests 16.3% | 6.5% ±1.5 | pass (at the limit) |
| Hinterhof | T7 | -0.2 | +5.5 | pass |
| Seeblick | T6 | reading +7.8, effort +5.7 | reading +9.1, effort +6.7 | open |
| Seeblick | T7 | -0.2 | +5.7 | pass |
| Seeblick | T11 | fail | strict +1.6; groups +6.1, project guests -6.3 | pass |
| Gratwanderung | T14 | permanent -17.0 | permanent -20.6, part time -15.2 | open |
| Hinterhof, Seeblick | T14 | no effect | no effect beyond margins | open |
| All four long modes | O3 | stage 5 never offered | restated: only stages offered in 5% of wins judged | pass (restated) |
| Kantino long | 20 | burst +0.0, steady -2.4 | unchanged | open |
| Kantino long | 27 | effort 37% of reading | judged with its margin | pass (at the limit) |
| Kantino long | 32 | -5.3, value 1.20 times | unchanged | open |
| Kantino long | 33 | +2.4 against traction | restated against bootstrap: -2.9 ±1.1 | pass (restated) |
| Gratwanderung | school demand | above the spec | plausible by a derived estimate, not established | open |

Leinen los T7 went from +2.1 to -0.2, a side effect of the careful bot's boat rule, and is open. Several results now pass only at their limits: Leinen los T1 45.0% ±3.1, Hinterhof T1 23.0% ±2.6, T2 in Hinterhof, Tiefgang and Leinen los.

## Restatements and why

1. **G1, G2, D2, D3: money counts net of the boat.** The old comparison counted cash only, so a boat worth most of its price at week 104 counted as nothing while its loan had already left the cash.
2. **G4: sailing half-empty beats cancelling.** The old wording asked a six-cabin minimum to lead somewhere, which rewards cancelling weeks whose guests pay far more than a sailing costs. It is now a trap; the post-mortem lists each cancelled week.
3. **T4 for runs that start out of season.** Week 12 measured nothing a player can do when no cruise sails before week 32.
4. **O3: stages offered in under 5% of wins are not judged.** "Never offered" failed the old wording by itself, and stage 4 was judged on 11 of 4,295 wins.
5. **Kantino long 33 against bootstrap only.** The early raiser almost never raises, so the 8 points against raise on traction measured target 32's weakness, not the cost of pitching early.

Also judged differently, without a restatement: L2 and target 11 (and so target 27) now apply plan section 1.5 (the limit within the result's own margin), as every other "at least" target already did.

## Engine and content additions (all off unless a scenario names them)

- `requestsAhead`: requests follow the season of the week they ask for (Leinen los).
- `ownDemand`: guests who come for one product alone (Rückenwind's kite trips).
- Contracts with months and notice sleep instead of ending (the fijo discontinuo; Rückenwind).
- `cancelledWeeks` in state and the post-mortem (Leinen los).
- No engine version bump: replaying any existing save gives the same game; changed scenarios have new fingerprints.

## For Henry to review, in priority order

1. **Leinen los now starts in October with requests ahead**, and its demand and lease went back to the spec (lease 110,000). It changes the scenario's feel most of anything here (decisions, tuning 1 step 1).
2. **The careful bot's off-season pricing** in Hinterhof, Seeblick and Rückenwind is a per-scenario bot parameter. The finding behind it applies everywhere: with this price curve, a discount below willingness to pay never pays, so seasonal pricing can only pay by raising the peak price, and raising it never helped. T7 may want a curve or a restatement (decisions, tuning 1 step 4).
3. **Five restatements** (above); the Kantino long 33 one is the most arguable.
4. **Contracts that sleep** in Rückenwind; T14 stays open in the German scenarios, where no such contract exists.
5. **Monthly upkeep on unbooked products** in Tiefgang and Hinterhof (estimates) to stop building everything blind from winning.
6. **Leinen los money realism** (spec section 17): the 30% for managing and the 200,000 gulet with 80% from the bank are kept for playability.
7. **Gratwanderung school demand**: a request to DJH Bayern would settle it.
8. The one-process full report runs out of memory; run it per scenario, with `--parts` including team and funding for Kantino long.

## Still open

See `docs/BACKLOG.md` section 3 for each open target with its closest result and options.
