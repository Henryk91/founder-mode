# Backlog

Everything planned or discussed that no plan builds yet. When a plan picks an item up, move it to that plan. When a plan leaves something out or opens an issue, add it here.

Last updated: 24 October 2026, at the end of plan 5.

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

### Plan 5 open targets (the leisure scenarios)

Left open by plan 5's first pass (values 2 rounds, formula 1 round per failing target). Henry chose not to revisit them in plan 5's step 6, so they wait for a later tuning plan with a fresh budget. Values are main only, 1,000 paired test seeds, at each scenario's final source. Details in `docs/autonomous5/reports/step2-escape.md`, `step3-venue.md`, `step4-fitness.md`, `step5-climbing.md` and each scenario's `FINAL_REVIEW.md`.

| Scenario | Target | Closest result | Options |
|---|---|---|---|
| Ausgesperrt | T2 (no-tests under 5%) | no tests 22.1% ±2.6 (lowest corrected); top 48.4% passes its cap | Broad-portfolio contribution and learnable theme preferences; keep the 5% threshold |
| Ausgesperrt | T3 (segments within 15 points) | 32.5 ±7.0 points (companies 27.7%, locals 60.2%, tourists 40.6%) | Corporate room-game demand and pricing; two-room plus meeting-space capital and cash timing |
| Ausgesperrt | T6 (reading the inbox) | reading +10.8, blind effort +8.9 ±2.8; round 1 +4.4 / +5.6 was closer to the blind limit | Use the event table to find choices where effort substitutes for reading |
| Ausgesperrt | T10 (reviews matter) | review-blind +4.7 ±2.1; corrected baseline +2.2 came with 75.8% careful wins | Separate the cost of spare roster shifts from repair and review benefits; no arbitrary review multiplier |
| Ausgesperrt | T11 (cancellation policy) | strict -3.4 ±2.7 overall; companies +3.8, locals -1.5, tourists -13.2; split not established | More evidence or a clearer observable commitment trade-off; keep the 5-point overall limit |
| Ausgesperrt | T14 (staff contracts) | seasonal +1.9 ±2.2 on signed seeds; permanent +8.6 and part time +10.7 pass | Seasonal coverage and idle-week decisions; 10,000 seeds only if tuning this smaller-than-margin effect |
| Ausgesperrt | T15 (later loan a real choice) | +16.5 ±2.8, taken in 98.7%; corrected baseline +12.5 came with 75.8% careful wins | Loan terms, grace and investment timing; no hidden borrowing penalty |
| Ausgesperrt | T17 (debt is dangerous) | reckless 42.6% vs careful 38.7% owing, gap +3.9 ±4.3; first value round gap 7.1 (careful 55.7%) | Debt service, grace exposure and actual owed endings; keep the 15-point target |
| Fabriketage | T3 (segments within 15 points) | 58.8 ±5.8 in round 1; final 62.2 (companies 72.0%, private parties 55.7%, weddings 9.7%) | Wedding long-lead cash, forward deposits and a viable mixed calendar; do not exclude weddings |
| Fabriketage | T6 (reading the inbox) | reading +15.4, blind effort +15.9 ±2.3 | More contextual choices with observable consequences; review reader decisions before values |
| Fabriketage | T11 (cancellation policy) | strict +1.0 ±1.5 overall; companies 0.0, private +3.2, weddings -0.3 | Real cancellation frequency, deposit and commitment trade-offs; small split signs are inconclusive |
| Fabriketage | T13 (naive player can win) | round 1 31.2%, gap -11.5 ±2.1 (at limit); final 32.4%, gap -14.2 ±2.2 | Teach bridge costs and forward calendars on screen; inspect default reader and channel behaviour |
| Fabriketage | T14 (staff contracts) | permanent 0 throughout; round 1 seasonal -0.3 ±1.4, part time -0.2 ±1.2 | Contract utilisation, idle periods and founder cover; do not call insignificant savings a win |
| Fabriketage | T15 (later loan a real choice) | +35.9 ±3.0 (corrected); final +40.6 ±3.1, taken in 100% | Initial financing scope and timing of AV and working capital; keep actual borrowing costs |
| Schweißperle | T3 (segments within 15 points) | 28.8 ±7.3 points (corporate 62.1%, yoga 33.3%, young professionals 37.8%) | Corporate reachable demand against the ordinary and specialist split |
| Schweißperle | T5 (decision news) | early 71.7% (closest 71.8%); year 2 92.9% | Genuine preparation decisions in pre-opening weeks 8 to 12; no relabelled routine news |
| Schweißperle | T6 (reading the inbox) | reading +13.8, blind effort +12.6 ±2.3 | Replies too often reward the same effort choice; review contextual trade-offs |
| Schweißperle | T7 (seasonal pricing) | hints -1.0 ±1.5; closest -0.8 ±1.1 | Confidence or observable price feedback; no hidden willingness or numeric sweeps |
| Schweißperle | T12 (speed) | slowest 462.1 s per 1,000; closest complete matrix 404.4 s | Profile membership-history costs; loads differ, so not controlled comparisons |
| Schweißperle | T14 (staff contracts) | permanent +1.2 ±1.4, seasonal +0.6 ±1.8, part time +3.3 ±1.5 | Schedule-aware contract selection and commitment, not implausible wages |
| Schweißperle | F3 (reformers a real choice) | -22.1 ±3.0; buy-only 34, no-buy-only 255, ties 711 | Affordability and forecast rules; keep actual equipment, teacher and seat costs |
| Schweißperle | F4 (instructor departure) | never match +0.1 ±1.6; 30,426 followers stopped in 945 runs; earlier -0.8 ±1.5 in a too-easy game | Retention persistence and its observable financial contribution |
| Griffig | T3 (segments within 15 points) | 31.1 ±6.4 points (committed 12.9%, families 34.4%, students 44.0%) | Actual first-wall selection and service income; keep rope-or-boulder alternatives |
| Griffig | T5 (decision news) | early 82.6%; year 2 100% | Genuine pre-opening preparation decisions; no relabelled routine news |
| Griffig | T6 (reading the inbox) | reading +2.6, blind effort +3.7 ±1.1; round 1 +2.0 / +2.7. Every event except the first wall moves outcomes by less than noise | Contextual trade-offs from the event table; no arbitrary effort penalties |
| Griffig | T7 (seasonal pricing) | -0.5 ±1.0; closest round 2 -0.1 ±0.9 | Confidence and observable price feedback before changing prices |
| Griffig | T9 (staffing) | over +1.1 ±1.5, under -4.9 passes; corrected round 1 over -2.1 ±1.5 passed at limit | Keep the real trade-off; no bot-specific cost |
| Griffig | T11 (cancellation policy) | strict -0.9 ±0.9 overall; committed -0.6, families -2.0, students 0 | Actual lead times, foregone bookings and cancellation exposure; refunds stay distinct from membership notice |
| Griffig | T12 (speed) | slowest 811.9 s per 1,000; closest 515.5 s (round 1) | The discarded cache gained only 1.1%; do not repeat it |
| Griffig | T14 (staff contracts) | permanent +4.5 ±1.5, seasonal +0.6 ±0.9, part time +1.2 ±1.0; round 2 all three passed | Utilisation and commitment; no pay cuts or relaxed threshold |
| Griffig | T15 (later loan a real choice) | +6.8 ±1.6, taken in 55.8%; round 1 +5.4 ±1.4 passed at limit | Timing and retained-cash bridge; no hidden borrowing penalty |
| Griffig | K1 (each first wall wins somewhere) | boulder 91.8%, rope 31.5%, both 0.9% of 425 differing seeds | Staged opening and mixed-market use; keep actual construction and funding costs |
| Griffig | K2 (route-setting hours matter) | half -1.4 ±0.9 (needs -3); double -1.4 ±1.0 passes; round 2 half -1.6 ±1.1 | Observed tired weeks and paid reset closure timing; no strategy-specific deduction |
| Griffig | K3 (quiet-slot aggregator access) | all slots +1.0 ±0.7, none -4.0 ±1.9; round 2 all +0.5 | Actual peak occupancy and paid visitor mix |

At the limit (pass): Ausgesperrt X1, Fabriketage V2, Schweißperle T1, F1 and T17, Griffig K5.

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

## Plan 5 first-pass adaptations

Fitness and climbing (from their step reports):

- Schweißperle: extra spin equipment for the annex; the recovery room's alternative-room exclusion.
- Griffig: two-hour average wall occupancy during longer courses, average café and rental baskets, and family-loan repayment after 104 weeks are simplifications to revisit with real data.

Venue:

- Fabriketage: collect guest balances before service (weddings four weeks, private one week) with cancellation/refund accounting; currently on-service settlement.
- Fabriketage: separately book the smaller 60-person room; currently the lower floor is conference breakout space only.
- Fabriketage: supplier quality/choice beyond authored incidents, and capital cost/refund timing beyond the existing cash-basis ending window.
