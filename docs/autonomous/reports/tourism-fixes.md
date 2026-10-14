# Tourism fixes (after a browser review of the three tourism scenarios)

Written in plan 2, step 0: the fixes session was stopped while it ran its final bot reports, so this report and its gate were finished then. Commits "Tourism fixes A" to "Tourism fixes D 17-18"; details in `docs/decisions.md`, section "Tourism fixes".

## What each item changed

| Item | Change |
|---|---|
| A1 to A3 | Notebook writing and sub headings wrap onto whole ruled lines, no ellipsis (only a section summary beside its title on a phone). A browser test checks every scenario, mode, tab and section at 375, 390, 430 and 1440 px in Chromium and WebKit. |
| B4 | The monthly price control is gone from tourism (it moved trial odds and voucher sizes; no bot set it); invoice text fits tourism, the invoices card shows only where a group is invoiced. |
| B5 | The headline's fourth number is guests, covers or occupancy over four weeks (`servedByWeek`, view only). |
| B6 | The post-mortem uses each group's unit and final prices and names the scenario's experiments. |
| B7, B8 | A label voice per scenario (`labels.tourism.ts`): incidents, teething problems, snags; ready, not shipped; the two tests renamed per scenario. Gaps against the specs recorded (now plan 2 step 1a). |
| B9, B10 | Help rewritten per scenario; results say "You spoke to 3 people at Tourists". |
| B11 | An invoiced platform booking is invoiced net of the platform's cut; the results line names paid on the day, invoiced, and that the cut is off. |
| B12 | A browser test fails on subscription words in tourism screens, with an allow-list. |
| C13 | Who works rows stack label and controls when they do not fit; only staffed products in the roster summary. |
| C14, C15 | Price steps about 3% and 15% of the price in round euros; price buttons name the group and season. |
| C16 | The post-mortem offers "Choose another company". |
| D17 | Signals for what only the bots knew (how and how far ahead each group books, Seeblick's six months to summer, product costs and groups, months of fixed costs a loan covers); the naive careful bot. |
| D18 | The event table runs in tourism, forced answers on `tourism_careful`. |

Text and view only: the tourism games are unchanged (the reports below match the step 8 reports number for number).

## Item 17: naive careful (1000 report seeds, `docs/balancing.md`)

| Scenario | tourism_careful | tourism_naive_careful | Gap |
|---|---|---|---|
| Gratwanderung | 44.2% | 32.8% | -11.4 |
| Hinterhof | 24.4% | 20.9% | -3.5 |
| Seeblick | 31.4% | 15.3% | -16.1 |

One part at a time (2,000 seeds, fixes session): Gratwanderung's gap is the reader (-11.6); Seeblick's the loan bridge (-14.2) and the reader (-5.6); Hinterhof's the reader (-4.5). The channel table is worth nothing anywhere.

## Item 18: the tourism event table (1000 seeds, events seen in 150 seeds or more)

| Scenario | Events judged | Cheapest answer wins | Rule (a third) |
|---|---|---|---|
| Gratwanderung | 59 of 75 | 29 (49%) | pass |
| Hinterhof | 64 of 80 | 35 (55%) | pass |
| Seeblick | 57 of 76 | 39 (68%) | pass |

Events with a gap of 4 points or more between answers, or where the best fixed answer beats reading by 3 or more:

- Gratwanderung: `tourism_fair` (the stand, 12 h and 400 EUR, wins by +5.9 and reading misses it: effort that pays everywhere, the T6 problem); `town_base_offer`, `office_help_offer`, `guides_wages` (the costly answer loses by 7 to 9 everywhere; the reader declines).
- Hinterhof: `supplier_price_rise` (new menu +4.3, reader takes it); `own_fitout_offer` (refit -30, the loan trap; the reader declines); `apprentice_offer`, `dishwasher_minijob`, `cook_poached` (a monthly cost loses everywhere).
- Seeblick: `refresh_offer` (-55, a trap the reader declines); `preferred_partner_badge`, `caretaker_offer`, `minijob_student`, `laundry_service` (a monthly cost loses by 4 to 5 everywhere).

None is broken (every event resolves and no answer crashes a run). The monthly-cost hires are always wrong in every situation the bots meet: traps without a situation where they pay, input for plan 2 step 3. `tourism_fair` is the clearest dominant effortful answer.
