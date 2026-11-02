# Plan 6: final report

Tags `plan6-price`, `plan6-engine`, `plan6-<scenario>` for the seven newer scenarios, `plan6-stages`, `plan6-complete`. Step reports are in this folder; the decisions log has the reasons.

## What was built

- **Price realism (step 1):** every segment of the ten bookings scenarios draws a hidden elasticity per run, so requests respond to price within a clamped range. The abroad scenarios gained a shoulder season. The post-mortem compares each season with the year before. The careful bot prices from interview hints.
- **Shared engine (step 2):** a second site at stage 5 (open while a manager works there or the founder does), second units of an asset with their own buy, lease or share option and breakdowns, and Rückenwind's fleet (a bought rescue boat, gear that wears out). UI on the Office card, asset cards and post-mortem. Bot rules `never_second` and `always_second`.
- **Stages (step 3):** stages 3 to 5 for Rückenwind, Tiefgang and the four leisure scenarios, stages 2 to 4 plus a second gulet for Leinen los, Tiefgang's second dive boat, offers, 21 drawings and tests. Summary in `docs/office-stages.md` section 7.
- **Fixed on the way:** `splitServed` let an untaken second unit serve guests for free (Leinen los never_move 75.3%); the careful bot leased second boats on a full peak alone; always_second never left stage 1; the first stage offer waited for a stage 2 that the careful bot declines.

## Tuned targets

1,000 test seeds, main part, long mode.

| Target | Status |
|---|---|
| O1 (a careful mover loses at most 1 point against never moving) | met in all seven |
| O2 (always moving loses at least 3) | met in all seven |
| E1 (established look) | met in all seven; Leinen los and Fabriketage after one round each |
| B1 (second boat) | met in Tiefgang and Leinen los (Leinen los at the edge, −3.0) |
| S1 (second site) | not shown: no careful player reaches stage 5 in two years. The year-1 part holds in Rückenwind |
| P1 (price is a lever) | partly met: small, capped by the 1.0 clamps; not shown in Leinen los |
| P2 / T7 (seasonal pricing pays 2 to 10 points) | not met anywhere (−7.9 to +1.2): starting prices already sit near the best price |
| Playability (careful 25 to 45%, no strategy over 60%) | careful in band in eight of ten; see below |

Careful bot at the end: Gratwanderung 42.8, Hinterhof 36.4, Seeblick 36.2, Rückenwind 45.2, Tiefgang 35.9, Leinen los 47.7, Ausgesperrt 43.0, Fabriketage 39.5, Schweißperle 55.1, Griffig 46.3.

## Other targets beyond their margin

- always_move wins 0% in Fabriketage and Schweißperle (the first stage offer can arrive around week 13 or 32, and taking it at once goes bankrupt). It is O2's extreme, but a harsh one.
- Ausgesperrt leisure_vr_first_year 33.4 to 25.7; Leinen los always_manage 32.4 to 23.9 and inbox_effort 38.0 to 29.5; Tiefgang always_buy 32.0 to 16.8 and no_tests 14.9 to 5.1 (both take the second boat by their own rules).

## Full report

Run once at `c5f832a`: 13 parts, one scenario and mode per process, 1,000 seeds, 10,000 wide seeds and event tables; Kantino long with `team` and `funding`. It was stopped once during Rückenwind and resumed from checkpoints, so no part ran twice. `docs/balancing.md` is regenerated.

- Kantino, Kantino long and Zollstock are identical to the previous report apart from timings.
- The ten bookings scenarios reproduce their step results: careful (T1), T7 and E1 match the step reports to the decimal.
- `pnpm seeds` found no change.

## Open issues

All in `docs/BACKLOG.md`, "Left open by plan 6".

## For Henry to review, in priority order

1. **T7 cannot pay** while starting prices sit at 86 to 99% of what guests pay. Lower or flatten the starting prices, or restate T7 against flat prices.
2. **S1 is out of reach for a careful player in two years.** Make the second site a year-3 option, or let the careful move rule look at less than a year of history.
3. **Moving early always goes bankrupt in Fabriketage and Schweißperle.** Consider a later floor for the first stage offer.
4. **Over the limits, all before plan 6 or near it:** Leinen los careful 47.7%; Schweißperle careful 55.1% and naive_careful 60.8%; Griffig boulder_first 71.3% and overstaffing 64.2%. None was treated as a plan 6 hard stop (decisions log).
5. **Unexplained drops:** Ausgesperrt leisure_vr_first_year and Leinen los always_manage.
6. **Process:** plan 6 measured scenario by scenario, and shared fixes found midway forced remeasuring. `CLAUDE.md` now asks future plans to build everything first, fix shared code before tuning, and tune in batches.
