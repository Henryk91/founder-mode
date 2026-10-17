# Tuning 1, step 1: Leinen los

## What changed

- **Asset targets net of the boat** (bots): G1, G2, D2 and D3 compare money as final cash and savings plus the owned boat's resale value less the loans left (`netWealthCents`). A restatement (decisions).
- **The careful bot's boat choice** (bots): leases when the weeks it expects to fill cover the lease plus the year's company and living costs, else manages. Expected weeks come from what leased boats sailed in their first season, then from the boat's own last season.
- **October start** (content): week 1 is the first week of October. Seasons: weeks 32 to 57 and 84 to 104 (May to September). The opening offers stay open ten weeks, the winter offers start from the second winter; `sunset_post` and `snorkel_gear` wait for week 33.
- **Requests ahead** (engine, `requestsAhead`, Leinen los only): requests follow the season of the weeks they ask for. Without it nobody asked in winter and the October start only added dead months.
- **Values back to the spec** with requests ahead: cabin guests 8 to 30, charters 3.2 to 16 places, the lease 110,000 (15% on signing). Charters book 4 to 20 weeks ahead (T11).
- **G4 restated** as a trap with a lesson; the post-mortem lists each week cancelled below the minimum to sail (what its guests would have paid, what sailing would have cost, what cancelling cost) and the marginal cost lesson (engine state `cancelledWeeks`, web post-mortem lines, labels).
- **15 new events** for the winter selling months and year 2.
- **E1:** the established look after 10 months covering all costs (was 8).
- **T4 restated** for runs that start out of season (the first season's first month).
- **UI fix:** closed weeks in the Occupancy heat grid failed colour contrast.
- **Docs:** spec section 17 (values as built, money realism), section 16 (targets as built), schema, decisions, balancing tuning notes.

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario leinenlos --mode long --parts main` (main part, 1,000 seeds). Before is plan 4's committed result.

| # | Before | After | Status |
|---|---|---|---|
| T1 | 30.9% ±2.9 | 45.0% ±3.1 | pass (at the limit) |
| T2 | top lease 41.4%; no tests 0.0% | top lease 47.0%; no tests 5.9% ±1.5 | pass (no tests at the limit) |
| T3 | 57.9 points | 68.0 points (cabin 79.4%, charters 44.7%, retreats 11.4%) | **fail** (open) |
| T4 | week 19 (not applicable) | week 32, restated: by week 35 | pass |
| T5 | 80.7%; year 2 67.6% | 85.1%; year 2 82.0% | pass |
| T6 | reading -2.8 ±2.3 | reading +12.3, blind effort +3.2 (±2.2) | pass |
| T7 | +2.1 ±1.5 | -0.2 ±1.7 | **fail** (to step 4) |
| T8 | -20.7 | -25.1 | pass |
| T9 | over -9.5, under +0.0 | over -12.6, under +0.0 | not applicable |
| T10 | -4.9 | -4.1 | pass |
| T11 | -0.8 overall, no flexible split | +0.8 overall; cabins +4.7, charters -5.3 (±2.1) | pass |
| T13 | 32.2%, gap +1.3 | 44.7%, gap -0.3 | pass |
| T14 | not applicable | not applicable | not applicable |
| T15 to T18 | not applicable | not applicable | not applicable |
| T22 E1 | 18.4% of wins, week 46 | 48.9% of wins, 2.0% of losses, week 48 | **fail** on the week (open) |
| G1 | buy 5.7% (cash only) | buy 6.3%, lease 43.8%, manage 49.9% (net of the boat) | **fail** (open) |
| G2 | gap +36.5, buy highest | gap +30.2 ±3.9; net in wins buy 134,626, lease 117,162, manage 94,385 | pass |
| G3 | hold all -25.0, never +0.3 | hold all -27.4, never -0.3 (±0.9) | **fail** (open) |
| G4 | six ahead -9.1 (old wording) | always sailing ahead +6.3 ±1.8 (restated) | pass |

The careful bot is 2.0 points behind always leasing (was 10.5).

Event table (`--parts events`, 1,000 seeds) was run with the 15 new events at first strength (careful 47.0%). Every new event's answers differ by at most 4.6 points; the best fixed answers are the conditional ones where the screen shows they pay. Three events were then trimmed (decisions).

## Decisions and open issues

See `docs/decisions.md`, "Tuning 1, step 1: Leinen los". Open: T3, G1, G3, E1 (with their closest results and options there), and T7 (step 4).

## Protected games

Main part on 1,000 seeds (`--seed-prefix test`) for Kantino and Zollstock (60 weeks, `--parts main`) and, in long mode, Kantino, Gratwanderung, Hinterhof, Seeblick, Rückenwind and Tiefgang. Their Endings, Wins by viable market, Guests, Losing runs and Week the run ended tables match `docs/balancing.md` at `plan4-complete` row for row. Every engine addition (`requestsAhead`, `cancelledWeeks`) is off unless a scenario names it, and every bot change is gated to scenarios that hold weeks or ask ahead, so this is proof.

Tiefgang's games are unchanged; its D2 and D3 now read with the boat counted net of the loan: D2 buy 39.4%, lease 16.0%, share 44.6% of 668 seeds (pass); D3 failed 48.5% against 21.3% (gap +27.2 ±4.0), median net in wins buy 107,812, lease 91,882, share 108,838 EUR (fails by 1,026 EUR). Step 2 works on these.
