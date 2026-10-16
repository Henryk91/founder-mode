# Plan 4, step 4: Leinen los (gulet, Fethiye)

## What changed

- **Engine** (`packages/engine/src/systems/cruise.ts` and hooks; off unless a scenario names them): weeks held for whole-boat bookings; the minimum to sail, cancelled three weeks out with refunds or a paid move; friction on mixed cabin weeks, halved by themed weeks; the refit closing the boat and raising charters' willingness to pay; the purchase gated by the local company (in the plan and at the bank); local cost steps on the boat's crew and upkeep; a managed boat's share net of the platform's cut; and (the T1 formula round) groups whose week is out of season or full asking for the season's next weeks. The whole-week review effect with the sheltered route and the managed boat's peak-week rule come from steps 1 and 3. Tests: `packages/engine/test/cruise.test.ts`.
- **Content:** `packages/content/src/scenarios/leinenlos/` (id `leinenlos`, shown "Leinen los", tags Abroad and Boats): the route, cabins, charters and retreats sharing one boat, the gulet with manage, lease and buy, the local company, the refit, one sea state a day, local costs up 15% from week 53, the host role (the founder or a hired host, a whole week), the bank for owners only, 4 intro cards, 40 events, 10 quotes per bucket per segment.
- **Bots:** see `docs/decisions.md`, "Plan 4, step 4"; seven Leinen los bots for G1 to G4; G targets in the report.
- **UI:** the season, week by week (held, chartered, cabins sold of 8, not ours), with hold and release chips for the next eight weeks; the minimum to sail and the move option; the season calendar on the bookings screen; the boat card (from step 3) with a gulet drawing; results lines for cancelled cruises and friction; the scenario's words for all three stages; the harbour desk scene; the accent `#8A4B2A` (white on it 6.7:1). Browser tests include Leinen los at 375, 390, 430 and 1440 px in Chrome and WebKit; screenshots in `$TMPDIR/founder-mode-established/leinenlos-*.png`.
- **Research:** spec section 17 (charter and cabin prices from Fethiye listings, Turkish cabotage rules).

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario leinenlos --mode long --parts main` (main part, 1,000 seeds), in `docs/balancing.md`:

| # | Result | Status |
|---|---|---|
| T1 | 30.9% ±2.9 | pass |
| T2 | top gulet_lease 41.4%; no tests 0.0% | pass |
| T3 | 57.9 points (cabin 65.5, charters 19.2, retreats 7.6) | **fail** (open) |
| T4 | week 19 (the cruises start in May, week 18) | **fail** (by design of the season; open) |
| T5 | 80.7%; year 2 67.6% | **fail** (open) |
| T6 | reading -2.8 ±2.3 | **fail** (open) |
| T7 | +2.1 ±1.5 | pass |
| T8 | -20.7 | pass |
| T9 | over -9.5, under +0.0 (one host a week; nothing to understaff) | **fail** (not meaningful here) |
| T10 | -4.9 | pass |
| T11 | -0.8 overall; cabins +2.1, charters -3.1, retreats -1.5 (±2.1) | **fail** (open) |
| T12 | 67.6 s | pass |
| T13 | 32.2%, gap +1.3 | pass |
| T14 | no contracts | not applicable (the crew is a cost per week) |
| T15 to T18 | the careful bot never borrows (the bank lends only for buying) | not applicable as written |
| T19 to T21 | stage 1 only | not applicable |
| T22 E1 | 18.4% of wins, week 46 | **fail** (open) |
| G1 | buy 5.7%, lease 50.4%, manage 43.8% of 803 differing seeds | **fail** (open) |
| G2 | failed 60.3% against 23.8% (gap +36.5 ±4.0); median cash in wins buy 139,891, lease 134,045, manage 105,140 EUR | pass |
| G3 | hold every peak week -25.0, never hold +0.3 (±0.5) | **fail** (open) |
| G4 | six ahead by -9.1 overall, behind in every split | **fail** (open) |

Event table (`--parts events`, 1,000 seeds), in `docs/balancing.md`. Never arriving: `rough_week_review` (its gate of six booked places in a summer week), and the owner-only events (`water_maker`, `engine_failure`, `winter_maintenance_deal`) because the careful bot never buys.

The careful bot wins 30.9% and no strategy over 41.4%: not a hard stop (plan section 1.2, item 3).

## Protected games, Rückenwind and Tiefgang

Main part on 1,000 seeds, as in steps 2 and 3. The protected games and Rückenwind were identical. Tiefgang first differed in one figure (the mean dry weeks of the refit-loan bot): two careful-bot changes for the gulet (the lease's affordability, and counting turned-away guests when nothing was offered) also applied there. They now apply only where weeks can be held, and Tiefgang's main part on 1,000 seeds is identical to its step 3 section.
