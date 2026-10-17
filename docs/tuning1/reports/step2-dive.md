# Tuning 1, step 2: Tiefgang

## What changed

- **Bots:** in the asset scenarios without held weeks (Tiefgang), the careful bot builds the website and calls its second kind of guest where they answer those channels. This was the whole of naive careful's lead (the channel table, measured by switching the naive differences on one at a time).
- **Report:** L2 is judged by plan section 1.5 (at the limit when 3 lies within the margin), like the other "at least" targets. No other scenario's judgement changes.
- **Content:** dive clubs pay 50 to 70 EUR a dive (listed at 54) and ask for 60 to 160 dives a week at peak (T3); the entry course costs 600 a month, the advanced course 300 and nitrox 300 whether booked or not (T2); the established look after 7 months covering all costs (E1).
- **Docs:** spec section 16 (values as built, D2 and D3 restated), decisions.

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario tiefgang --mode long --parts main` (main part, 1,000 seeds). Before is plan 4's committed result (D2 and D3 before also with the net measurement from step 1).

| # | Before | After | Status |
|---|---|---|---|
| T1 | 25.8% ±2.7 | 27.7% ±2.8 | pass |
| T2 | no tests 21.4% | no tests 5.8% ±1.4 | pass (at the limit) |
| T3 | 32.5 points (clubs 4.7%) | 18.9 points (certified 35.8%, clubs 16.9%, resort 31.0%) | **fail** (open) |
| T5 | 88.5%; 93.8% | 88.6%; 94.5% | pass |
| T6 | reading +1.0 ±1.6 | reading +2.7 ±1.6, blind effort +2.5 | **fail** (reading at the limit; blind effort misses by under 0.1) |
| T7 | +3.2 | +3.7 | pass |
| T11 | pass | strict ahead -2.2; certified -10.7, resort +11.5 | pass |
| T13 | gap +4.1 ±1.8 (naive ahead) | 29.1%, gap +1.4 ±1.9 | pass |
| T14 | pass | permanent +9.8, seasonal +9.2, part time +6.9 | pass |
| T16 L2 | -4.9 ±2.4 (judged fail) | -2.1 ±2.5 | pass (at the limit, section 1.5) |
| T17 | pass | gap +41.6 | pass |
| T22 E1 | 38.8% of wins | 65.0% of wins, 4.1% of losses, week 88 | pass |
| D1 | -7.1 | -9.6 | pass |
| D2 | buy 39.4%, lease 16.0%, share 44.6% (net) | buy 42.8%, lease 21.5%, share 35.7% | pass |
| D3 | buy 107,812 against share 108,838 (net) | failed 37.4% against 19.5% (gap +17.9 ±3.9); net in wins buy 106,663, lease 94,326, share 98,963 | pass |
| D4 | -5.9 | -2.7 ±2.6 | pass (at the limit) |

Event table (`--parts events`, 1,000 seeds) on the final values, to look for T6's cause: no single event explains blind effort's gain; the boat offers' "decide later" (18.3%) and "keep" (19.9%) are the costliest defaults, and the reader and the effort bot both take the boat by the careful rule.

## Decisions and open issues

`docs/decisions.md`, "Tuning 1, step 2: Tiefgang". Open: T3 (clubs 16.9% against about 33%), T6 (blind effort).

## Other scenarios unchanged

Main part on 1,000 seeds for Kantino and Zollstock (60 weeks) and, in long mode, Kantino, Gratwanderung, Hinterhof, Seeblick, Rückenwind (against `plan4-complete`) and Leinen los (against step 1's final run): Endings, Wins by viable market, Guests, Losing runs and Week the run ended tables identical row for row. The bot change is gated to scenarios with assets and no held weeks; the L2 rule change flips no other scenario's result.
