# Backlog

Everything planned or discussed that no plan builds yet. When a plan picks an item up, move it to that plan. When a plan leaves something out or opens an issue, add it here.

Last updated: 17 October 2026, at the end of tuning plan 1.

## 1. Left out of plan 4 (the abroad scenarios)

| Item | Notes |
|---|---|
| Office stages 3 to 5 for Rückenwind and Tiefgang | Specs have stages 1 and 2 only. Stage 3 is the cheapest to add next |
| Office stages beyond stage 1 for Leinen los | The boat options are its progression for now |
| A second boat | A fleet of gulets or two dive boats |
| Motorised watersports | Water skiing, towed rides, jet skis. Decided against for Rückenwind |
| A choice of base for the dive centre | Larnaca (near the wreck) or Protaras (near the hotels). Fixed on Larnaca |
| A currency system | Everything is in euros. Turkey's rising local costs are a flat step in year 2 |
| Package travel law for the gulet | Selling cruises from Germany may count as package travel, with insolvency insurance |
| New mockups or a new visual style for the abroad screens | Plan 4 reuses existing components |
| Tuning beyond the first-pass budget | Plan 4's open targets are in section 3 |
| Buying the rescue boat in Rückenwind | Leased in season only; the asset mechanic could carry it |
| Gear as a fleet in Rückenwind | Buying more boards and rigs is one purchase per product, not a growing fleet |
| A separate skipper and crew on the roster | Crew is a cost per week the boat is used; the roster cannot require several roles together |
| A shop and compressor help role in Tiefgang | An event's summer job instead |
| Three seasons of prices | The engine has peak and off season; the abroad specs have a shoulder |
| A tender for Tiefgang's harbour berth or Leinen los's mooring | Only Rückenwind's beach licence is tendered |
| A surf school in Portugal | Atlantic swell, a different business from wind sports. A possible fourth abroad scenario |

## 2. Left out of plan 5 (the leisure scenarios)

Plan 5 (`docs/AUTONOMOUS_PLAN_5.md`) builds the escape room, event venue, fitness studio and climbing gym in Munich, under a new "Leisure" tab. It runs after plan 4.

| Item | Notes |
|---|---|
| Office stages 3 to 5 for the leisure scenarios | Specs have stages 1 and 2 only |
| A second location for any of them | A second studio, a second gym |
| A full gym with machines | The fitness studio is classes only |
| Personal training, physiotherapy or a shop as products | |
| A real booking or access-control integration | |
| New mockups or a new visual style for the leisure screens | Plan 5 reuses existing components |

## 3. Open targets

Left open by tuning plan 1 (`docs/AUTONOMOUS_PLAN_TUNING_1.md`), with the closest result after its budget. Details and options in `docs/tuning1/reports/final.md` and `docs/decisions.md` (tuning 1 sections).

| Scenario | Target | Closest result | Options |
|---|---|---|---|
| Kantino long | 20 (renting against hiring) | burst +0.0 ±1.0, steady hire -2.4 ±0.9 | Not tuned again; Munich part-time economics do not support a 2-point gap either way |
| Kantino long | 32 (neither path dominates) | raise_on_traction -5.3 ±1.0, value 1.20 times | Funded founder's salary in the value (about 1.28 times); a stronger traction round |
| Gratwanderung, Hinterhof, Seeblick | T14 (staff contracts) | Gratwanderung permanent -20.6, part time -15.2; Hinterhof and Seeblick no effect beyond margins | Restate T14 for businesses whose work suits only some contract kinds; a German seasonal equivalent of the contract that sleeps |
| Seeblick | T6 (reading the inbox) | reading +9.1, blind effort +6.7 (±2.2) | Make the high-hours answers in the costliest events pay only where the screen shows it |
| Gratwanderung | School group demand | 5 to 8 groups a week, plausible by a derived estimate, not by a source | Ask DJH Bayern for school nights by hostel and month; or 2 to 4 groups with a better price per class |
| Rückenwind | T7 (seasonal pricing) | -0.7 ±1.7 | Its starting prices already sit at the market level; a price curve that rewards discounts below willingness to pay |
| Rückenwind | W2 (kite trips) | always -1.0 ±1.2, never +1.1 ±1.3 | A kite student earns little after a day of the scarce wing and kite instructor; cheaper instructor days for trips, or kite seekers as a larger own segment |
| Tiefgang | T3 (dive clubs) | 18.9 points (clubs 16.9%) | Club weeks priced per group; clubs needing the boat less |
| Leinen los | T3 (retreats and charters) | 68.0 points (retreats 11.4%) | Retreats pay their balance before sailing; a shoulder-season lease |
| Leinen los | G1 (buying best somewhere) | 6.3% of differing seeds | Owned crew at 3,000 a week passes (21.7%) but lets the no-tests bot win 12.9%; pair with upkeep for unasked-for products |
| Leinen los | G3 (holding weeks) | never holding -0.3 ±0.9 | Charters book the peak first with requests ahead; restate G3 or let cabin guests book further ahead |
| Leinen los | E1 (established look) | 48.9% of wins, median week 48 | Closed months not breaking the streak; restate the week rule for runs whose first season ends after week 52 |
| Leinen los | T7 (seasonal pricing) | -0.2 ±1.7 | Flat off-season prices give +3.0, but the careful bot then wins 48.2% (T1) |

Targets that do not apply as written: Leinen los T9, T14, T15 to T18; every abroad scenario T15, T20, T21 (one office stage, no second loan).

## 4. Features not in any plan

| Item | Notes |
|---|---|
| Zollstock long mode | With funding and office stages |
| The next batch of 60-week changes | Chasing invoices with a risk of chasing too early; automatic reminders |
| Summarised inbox reports in the established look | From the old established mockup |
| Cofounders | |
| A competitor | |
| VAT rules | |
| Prices per market | |
| The "a bit steep" price warning | |
| Sound | |
| Real illustration | |
| Cloud saves | |

## 5. Housekeeping

| Item | Notes |
|---|---|
| Stale worktree records | Four agent scratch worktrees under `/private/tmp` whose folders are gone. `git worktree prune` clears them when no agent is running |
| `packages/bots/scratch/` | Six local debug scripts, excluded in `.git/info/exclude`, so never committed. Delete when no longer useful |
| Split test command | `pnpm test` runs the web project, then the others, because one combined vitest 3.2.7 run ends with "Timeout calling onTaskUpdate" although every test passes. Revisit when vitest is upgraded: try one `vitest run` again |

## Plan 5 venue first-pass adaptations

- Fabriketage: collect guest balances before service (weddings four weeks, private one week) with cancellation/refund accounting; currently on-service settlement.
- Fabriketage: separately book the smaller 60-person room; currently the lower floor is conference breakout space only.
- Fabriketage: supplier quality/choice beyond authored incidents, and capital cost/refund timing beyond the existing cash-basis ending window.
