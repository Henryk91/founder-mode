# Plan 8 final report

Runs: main part, 1,000 seeds, careful bot and every strategy, all twelve scenarios (tourism ones with `--mode all`), once after steps 1 and 2 (engine 0.16.0). No full report (no win rate moved beyond its margin). Compared with `plan7-complete`.

## Findings

Reproduced = a test fails before the fix. "Not done" items stay in `docs/BACKLOG.md` section 0.

| Finding | Reproduced | Fixed | How |
|---|---|---|---|
| H-01 loan buys an item twice | yes | yes | A loan pays only for items not yet built or paid (`loan.ts`) |
| G-02, F-02 "two missed payments" | yes | yes | Cash below zero with one miss ends the run as before; the post-mortem now names the trigger |
| S-03 13 interest charges a year | yes | yes | Rate spread over 13 four-week periods. Rent and wages keep their stated per-period amounts (convention recorded) |
| P-01 (Henry) unaffordable expenses | yes | yes | `cannot_afford` in `validatePlan`; covers products, rooms, ad budgets; disabled controls with the amount missing; bots drop what does not fit. Not covered: trials, pre-sales, office moves, hires |
| 1, 2, 3, K18 report totals | yes (first test run used the new totals, the old UI sum omitted booking costs, loans, one-offs) | yes | `weekTotals(ledger)`; lines for customers, other, financing, transfers; paid in groups. Invariant test passes in every scenario and mode |
| 5, K1 (partly), K2, K3 forecast | yes | yes | One forward rule in `runwayWeeks`; tests for a financed buy, an agreed hire, deposits. K1: the worry note names an overdue payment only if it is worth a week of costs. The dated cash schedule is not shown |
| 4 cruise cancellation charge | yes | yes | Charge kept; itemised (deposits back, partner boat) in the report and the option's quote |
| 8 no refund when the company cancels | yes | yes | Deposit refunded, visible `deposits_refunded` line, all bookings scenarios |
| 17 terms at booking | yes | yes | Policy stored on each booking; guest cancellations settle by it. Price and deposit were already stored |
| 10, H-03 "covers costs" milestones | yes | yes | Based on earnings from guests served less shifts, ingredients and loan payments; the win test is unchanged |
| G-06 offers on turned-away guests of a closed hall | yes | yes | Counted from the opening week |
| G-03 "0 packed, 308 quiet" | yes | yes | No rows for services without capacity |
| G-04 stale visits on the failure screen | yes | yes | An ended run counts its last week |
| 6, 7, 23, F-05, S-04 loan form | yes | yes | Working capital up to its exact cap; an empty plan says so; "interest only" with the payout, first interest and first repayment weeks; live own-money share and largest loan that passes |
| 16, K16 (partly) | yes | partly | Intro sentences made count-neutral; "the gulet" mid-sentence; "inbox hours" sentence |
| 13, 18, 21, K11, K12, K13, K14, K23 | yes | yes (wording) | Labels |
| K1 schedule, 9, 11, 12, 14, 15, K4 to K10, K15, K17, K19 to K22, K24, G-05, G-07, G-08, F-03, F-04, F-06, R-02 to R-06, H-05, H-06, H-08, S-02, S-05, 20, 22, 25 | no | not done | Out of time. They need new engine view data and UI work. Listed for a next plan |

The step 3 UI checks (axe at four widths in two browsers, all UI stages) were **not run**.

## Step 3 continued (after plan8-complete)

`plan8-complete` was set before step 3 was finished; Henry then asked for the rest in batches. Batch 1 (full `pnpm test` and lint run; the browser tests, not run in the first pass, found four wording and layout slips, all fixed):

| Finding | Reproduced | Fixed | How |
|---|---|---|---|
| K17 Money preview | yes | yes | Money card adds this week's answers: more per month, to pay at week end |
| K6 demo count | yes | yes | Inbox counts only demos not yet booked in the plan |
| H-05 roster preview | yes (test) | yes | Contracts signed in the plan count towards what the roster covers |
| 9 deposits on the day | yes | yes | `guests_served.newDepositsCents`; text separates "paid on the day" from new deposits |
| 11, R-04 calendars | yes | yes | Cruise scenarios show the boat-week calendar only; products with no room of their own named in one line |
| 12 charter coverage | yes | yes | Bookings of products the shifts do not cover get their own roster line |
| K7 accepted hire | yes | yes | `hire_agreed` entry; team card shows the start week and pay |
| K10 deposit cards | yes | yes | `LeadView.deposit` (amount, refund week); "they may need more" |
| K21, K24 defaults | yes | yes | `MessageView.ifIgnored`: default answer, cost, hours lost; shown on open letters |
| S-02 steppers | yes | partly | Price steps scale with the amount; opening hours get a +4. Direct entry (the game is tap only) and apply-to-all (a feature) go to the backlog |

## Invariant test first results

Run after the new totals existed: no scenario failed (13 scenario/mode pairs, at least 50 runs each). The old report sum (`Numbers`) did not include booking costs, loan payments or one-offs, which is the cause of findings 1 to 3.

## Outcomes (careful bot, wins, 1,000 seeds; plan7-complete in brackets)

Kantino 35.0 (37.5), Zollstock 37.8 (41.0), Gratwanderung 44.8 (42.8), Hinterhof 36.9 (36.4), Seeblick 35.9 (36.2), Rückenwind 43.3 (45.2), Tiefgang 31.4 (35.9), Leinen los 43.9 (47.7), Ausgesperrt 46.3 (43.0), Fabriketage 38.0 (39.5), Schweißperle 55.0 (55.1, above range before too), Griffig 46.2 (46.3). No strategy over 60% except the old Schweißperle and Griffig `boulder_first` (70.2, was 71.3). Hinterhof and Leinen los still miss the "no tests under 5%" target (20.3, 9.8; were 19.7, 15.8). No tuning rounds were needed.

All scenarios' outcomes changed a little (forecast and loan fixes), so `docs/seeds.md` was rewritten.

## For Henry to review

- The forecast changes `runwayWeeks` for everyone (milestones, inbox conditions, funding read it). Numbers moved by 1 to 4 points at most.
- `cannot_afford` can stop a bot or player from starting a purchase they could finish later with income; trials and hires are not covered.
- Rent, wages and other "monthly" amounts are still charged every four weeks (13 times a year); only loan interest was converted.
- `docs/balancing.md` was not rewritten (no full report).
