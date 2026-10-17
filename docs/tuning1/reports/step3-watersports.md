# Tuning 1, step 3: Rückenwind

## What changed

- **Engine** (`ownDemand`, off unless a product names it): guests who come for one product alone, on top of the segment's own requests; the segment's other guests never pick it; they do not ask while it cannot sell. Test in `packages/engine/test/abroad.test.ts`.
- **Content:** kite trips get 12% of learners and wind regulars as their own guests (was appeal 0.25 among the course guests); a trip day's van and fuel 70 EUR (was 40).
- **Bots:** the second-segment website and calls (step 2) now apply in every abroad scenario without held weeks; the reader bids as before in the beach tender.
- **Docs:** spec section 17, schema, decisions.

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario rueckenwind --mode long --parts main` (main part, 1,000 seeds). Before is plan 4's committed result.

| # | Before | After | Status |
|---|---|---|---|
| T1 | 36.8% ±3.0 | 45.1% ±3.1 | pass (at the limit) |
| T2 | top trips_never 41.5%; no tests 3.1% | top price_blind 49.1%; no tests 5.7% ±1.4 | pass (no tests at the limit) |
| T3 | 3.6 points | 8.0 points | pass |
| T5 | 95.2%; 90.5% | 95.0%; 90.9% | pass |
| T6 | reading +2.2 ±1.7 | reading +2.3 ±1.7, blind effort -4.7 | pass (at the limit) |
| T7 | -2.1 ±1.7 | -4.0 ±1.8 | **fail** (step 4) |
| T11 | pass | strict ahead +1.4; learners +9.7, wind regulars -8.2 | pass |
| T13 | 41.0%, gap +4.2 (naive ahead) | 44.3%, gap -0.8 | pass |
| T14 | permanent -8.5, part time -5.2 | permanent -10.2, seasonal +4.4, part time -4.2 | **fail** (step 4) |
| T22 E1 | 39.9% of wins | 45.7% of wins, 2.7% of losses, week 90 | pass |
| W1 | pass | wind only -22.0, calm only -39.2 | pass |
| W2 | always -0.7, never +4.7 | always -0.9 ±1.2, never -0.3 ±1.5 | **fail** (always at the limit; never no longer ahead) |
| W3 | pass | no courses -23.9; returners direct 10,661, platform 1,364 | pass |
| W4 | pass | higher against as before -3.6; 10 and 46 seeds alone | pass |
| W5 | pass | -9.9 | pass |

**Item 3, the careful bot against the strongest bot:** the 4.7-point gap to never running trips came from trips that only moved guests between products (fixed by `ownDemand`), and the careful bot's lead over naive careful turned round once the website reached the second kind of guest and the tender rule bid as before. The strongest bot is now price-blind (49.1% against 45.1%): seasonal pricing, T7, step 4.

## Decisions and open issues

`docs/decisions.md`, "Tuning 1, step 3: Rückenwind". Open: W2 (never -0.3 ±1.5), T7 and T14 (step 4).

## Other scenarios unchanged

Main part on 1,000 seeds for Kantino and Zollstock (60 weeks) and, in long mode, Kantino, Gratwanderung, Hinterhof, Seeblick (against `plan4-complete`), Leinen los (step 1's final run) and Tiefgang (step 2's final run): the Endings, Wins by viable market, Guests, Losing runs and Week the run ended tables are identical. `ownDemand` is off unless a product names it, and the bot changes apply only to abroad scenarios without held weeks.
